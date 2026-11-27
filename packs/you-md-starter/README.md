# Starter Kit：你的 AI 记忆资产（$19 买断版交付物）

这个包里没有服务器、没有账号、没有订阅。你拿到的是四个文件：

| 文件 | 用途 |
|---|---|
| `dist/index.html` | 主程序。双击打开就能用（也可放到任意静态托管） |
| `PLAYBOOKS.md` | 8 个操作手册：建包、周复盘、换模型、团队共享、客户交付、加密备份、提示词骨架、定价 |
| `EXAMPLE-CONTEXT.md` | 一份真实的 `you.md` 样例（310 tokens），先看它长什么样 |
| `使用说明.txt` | 三步上手 + 授权激活 + 常见问题 |

## 三步上手

1. 双击 `dist/index.html`（Chrome / Edge / Safari 均可）。
2. 写 10 条记忆，点「生成上下文包」，复制粘到任何 AI 对话的第一条。
3. 想带走全量包和加密备份，填授权码激活 Pro。

## Pro 包含什么

- 记忆不限条数（免费版 10 条）
- 上下文包 1500 tokens（免费版给 240 tokens 预览）
- 加密备份导出 / 恢复（PBKDF2 + AES-256-GCM，口令只在你自己手里）
- 授权**离线校验**：不联网、不登录、不绑定设备，一次激活长期有效

## 我们不做什么（写在这里，免得你误会）

- 不做云同步：同步需要服务器，服务器需要钱，钱会让买断变成订阅。
- 不替你调用模型：你自己带 API Key，或用本地 Ollama。
- 不承诺"AI 自动帮你赚钱"：它只整理你写下的东西，不生产事实。
- 不做排行榜、不做每日签到、不做"邀请送会员"——v1 有，全部删了。

## 授权码

格式 `AGIP1.xxxxx.yyyyy`，在「Pro」页填入即可。离线签名校验（ECDSA P-256），
所以**不需要联网**，也无法远程吊销——退款按 14 天无理由处理。

> 注意：WebCrypto 需要安全上下文。用 `https://` 或 `localhost` 打开最稳；
> 个别浏览器直接双击本地文件会提示不支持加密校验，换 Chrome 打开即可。

## 目录

```
dist/index.html        单文件主程序（约 67 KB）
docs/EXAMPLE-CONTEXT.md 真实样例
packs/you-md-starter/  本包（PLAYBOOKS.md）
tools/build.mjs        重新构建单文件版（需 npm i --no-save esbuild）
tools/license.mjs      发码工具（keygen / issue / verify）
```

源码 MIT，仓库：https://github.com/Fnhiq23/agi-engine-v2
