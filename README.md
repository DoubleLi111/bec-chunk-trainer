# BEC Chunk Trainer

从意群记忆、快速测验、组装句子到 BEC 商务情境输出的学习工具。

## 本地运行

```bash
npm install
npm run dev
```

## Cloudflare Worker + D1

同一个 Worker 提供 Vite 静态资源和 `/api` 服务。D1 保存登录会话与学习进度，浏览器保留本地副本并在登录后自动同步。

部署前需要：

1. 创建名为 `doris-learning-dictionary` 的 D1 数据库，并把数据库 ID 写入 `wrangler.jsonc`。
2. 将登录密码写入 Worker Secret（仓库中不能出现密码值）：

```bash
npx wrangler secret put ACCOUNT_PASSWORD
```

3. 初始化数据库并部署：

```bash
npm run d1:migrate:remote
npm run deploy
```

账号通过 `LOGIN_USERNAME` 配置；密码只从 `ACCOUNT_PASSWORD` Secret 读取。当前发音仍使用浏览器自动生成的 `en-GB` 英式语音。
