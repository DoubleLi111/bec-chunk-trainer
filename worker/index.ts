/// <reference types="@cloudflare/workers-types" />

interface Env {
  DB: D1Database;
  ASSETS: Fetcher;
  LOGIN_USERNAME: string;
  ACCOUNT_PASSWORD: string;
}

type Session = {
  tokenHash: string;
  username: string;
};

const SESSION_COOKIE = "bec_session";
const SESSION_SECONDS = 60 * 60 * 24 * 30;
const LOGIN_WINDOW_SECONDS = 15 * 60;
const LOGIN_ATTEMPT_LIMIT = 10;
const MAX_STATE_BYTES = 1_000_000;

function json(body: unknown, status = 200, headers: HeadersInit = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Cache-Control": "no-store",
      "Content-Type": "application/json; charset=utf-8",
      ...headers,
    },
  });
}

function parseCookies(request: Request) {
  const cookies = new Map<string, string>();
  for (const entry of (request.headers.get("Cookie") ?? "").split(";")) {
    const separator = entry.indexOf("=");
    if (separator === -1) continue;
    cookies.set(entry.slice(0, separator).trim(), decodeURIComponent(entry.slice(separator + 1).trim()));
  }
  return cookies;
}

function createToken() {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function hashHex(value: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

function constantTimeEqual(left: string, right: string) {
  const a = new TextEncoder().encode(left);
  const b = new TextEncoder().encode(right);
  const length = Math.max(a.length, b.length);
  let difference = a.length ^ b.length;
  for (let index = 0; index < length; index += 1) {
    difference |= (a[index] ?? 0) ^ (b[index] ?? 0);
  }
  return difference === 0;
}

function mutationAllowed(request: Request) {
  const origin = request.headers.get("Origin");
  return !origin || origin === new URL(request.url).origin;
}

async function getSession(request: Request, env: Env): Promise<Session | null> {
  const token = parseCookies(request).get(SESSION_COOKIE);
  if (!token) return null;

  const tokenHash = await hashHex(token);
  const now = Math.floor(Date.now() / 1000);
  const row = await env.DB.prepare(
    "SELECT username, expires_at FROM sessions WHERE token_hash = ?",
  ).bind(tokenHash).first<{ username: string; expires_at: number }>();

  if (!row) return null;
  if (row.expires_at <= now) {
    await env.DB.prepare("DELETE FROM sessions WHERE token_hash = ?").bind(tokenHash).run();
    return null;
  }
  return { tokenHash, username: row.username };
}

async function isRateLimited(request: Request, env: Env) {
  const source = request.headers.get("CF-Connecting-IP") ?? "unknown";
  const key = await hashHex(source);
  const now = Math.floor(Date.now() / 1000);
  const row = await env.DB.prepare(
    "SELECT attempts, window_start FROM login_attempts WHERE key = ?",
  ).bind(key).first<{ attempts: number; window_start: number }>();

  if (!row || now - row.window_start >= LOGIN_WINDOW_SECONDS) {
    await env.DB.prepare(
      "INSERT INTO login_attempts (key, attempts, window_start) VALUES (?, 1, ?) " +
      "ON CONFLICT(key) DO UPDATE SET attempts = 1, window_start = excluded.window_start",
    ).bind(key, now).run();
    return { limited: false, key };
  }

  if (row.attempts >= LOGIN_ATTEMPT_LIMIT) return { limited: true, key };
  await env.DB.prepare("UPDATE login_attempts SET attempts = attempts + 1 WHERE key = ?").bind(key).run();
  return { limited: false, key };
}

async function handleLogin(request: Request, env: Env) {
  if (!mutationAllowed(request)) return json({ error: "请求来源无效" }, 403);
  if (!env.ACCOUNT_PASSWORD) return json({ error: "登录服务尚未完成 Secret 配置" }, 503);
  const rateLimit = await isRateLimited(request, env);
  if (rateLimit.limited) {
    return json({ error: "尝试次数过多，请稍后再试" }, 429, { "Retry-After": String(LOGIN_WINDOW_SECONDS) });
  }

  const body = await request.json().catch(() => null) as { username?: unknown; password?: unknown } | null;
  const username = typeof body?.username === "string" ? body.username : "";
  const password = typeof body?.password === "string" ? body.password : "";
  const valid = constantTimeEqual(username, env.LOGIN_USERNAME) && constantTimeEqual(password, env.ACCOUNT_PASSWORD);
  if (!valid) return json({ error: "账号或密码不正确" }, 401);

  await env.DB.prepare("DELETE FROM login_attempts WHERE key = ?").bind(rateLimit.key).run();
  const token = createToken();
  const tokenHash = await hashHex(token);
  const now = Math.floor(Date.now() / 1000);
  const expiresAt = now + SESSION_SECONDS;
  await env.DB.batch([
    env.DB.prepare("DELETE FROM sessions WHERE expires_at <= ?").bind(now),
    env.DB.prepare(
      "INSERT INTO sessions (token_hash, username, expires_at, created_at) VALUES (?, ?, ?, ?)",
    ).bind(tokenHash, username, expiresAt, now),
  ]);

  return json(
    { username },
    200,
    { "Set-Cookie": `${SESSION_COOKIE}=${encodeURIComponent(token)}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=${SESSION_SECONDS}` },
  );
}

async function handleLogout(request: Request, env: Env) {
  if (!mutationAllowed(request)) return json({ error: "请求来源无效" }, 403);
  const session = await getSession(request, env);
  if (session) await env.DB.prepare("DELETE FROM sessions WHERE token_hash = ?").bind(session.tokenHash).run();
  return json(
    { ok: true },
    200,
    { "Set-Cookie": `${SESSION_COOKIE}=; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=0` },
  );
}

async function handleProgress(request: Request, env: Env, session: Session) {
  if (request.method === "GET") {
    const row = await env.DB.prepare(
      "SELECT state, version, updated_at FROM user_state WHERE username = ?",
    ).bind(session.username).first<{ state: string; version: number; updated_at: string }>();
    if (!row) return json({ state: null, version: 0, updatedAt: null });
    try {
      return json({ state: JSON.parse(row.state), version: row.version, updatedAt: row.updated_at });
    } catch {
      return json({ error: "云端进度数据损坏" }, 500);
    }
  }

  if (request.method !== "PUT") return json({ error: "不支持的请求方法" }, 405, { Allow: "GET, PUT" });
  if (!mutationAllowed(request)) return json({ error: "请求来源无效" }, 403);

  const text = await request.text();
  if (new TextEncoder().encode(text).byteLength > MAX_STATE_BYTES) return json({ error: "学习进度数据过大" }, 413);
  const body = (() => {
    try { return JSON.parse(text) as { state?: unknown }; } catch { return null; }
  })();
  if (!body || !body.state || typeof body.state !== "object" || Array.isArray(body.state)) {
    return json({ error: "学习进度格式无效" }, 400);
  }

  await env.DB.prepare(
    "INSERT INTO user_state (username, state, version, updated_at) VALUES (?, ?, 1, CURRENT_TIMESTAMP) " +
    "ON CONFLICT(username) DO UPDATE SET state = excluded.state, version = user_state.version + 1, updated_at = CURRENT_TIMESTAMP",
  ).bind(session.username, JSON.stringify(body.state)).run();
  const saved = await env.DB.prepare(
    "SELECT version, updated_at FROM user_state WHERE username = ?",
  ).bind(session.username).first<{ version: number; updated_at: string }>();
  return json({ ok: true, version: saved?.version ?? 1, updatedAt: saved?.updated_at ?? null });
}

function secureAssetResponse(response: Response) {
  const secured = new Response(response.body, response);
  secured.headers.set("X-Content-Type-Options", "nosniff");
  secured.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  secured.headers.set("Permissions-Policy", "camera=(), geolocation=(), microphone=()");
  secured.headers.set(
    "Content-Security-Policy",
    "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'",
  );
  return secured;
}

export default {
  async fetch(request, env): Promise<Response> {
    const url = new URL(request.url);
    if (!url.pathname.startsWith("/api/")) return secureAssetResponse(await env.ASSETS.fetch(request));

    if (url.pathname === "/api/login" && request.method === "POST") return handleLogin(request, env);
    if (url.pathname === "/api/logout" && request.method === "POST") return handleLogout(request, env);

    const session = await getSession(request, env);
    if (!session) return json({ error: "请先登录" }, 401);
    if (url.pathname === "/api/session" && request.method === "GET") return json({ username: session.username });
    if (url.pathname === "/api/progress") return handleProgress(request, env, session);
    return json({ error: "接口不存在" }, 404);
  },
} satisfies ExportedHandler<Env>;
