# BEC Chunk Trainer

从意群记忆、快速测验、组装句子到 BEC 商务情境输出的学习工具。

## 本地运行

```bash
npm install
npm run dev
```

## Cloudflare Pages

- Framework preset: `Vite`
- Build command: `npm run build`
- Build output directory: `dist`
- Root directory: `/`

Cloudflare Pages 连接本仓库后，每次推送到 `main` 都会自动构建并发布。

当前发音使用浏览器自动生成的 `en-GB` 英式语音，不需要保存音频文件或运行后端服务。
