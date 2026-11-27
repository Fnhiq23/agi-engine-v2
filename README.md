# AGI Engine

**Your AI memory, compiled into one portable file.**

Every chat starts with re-introducing yourself: who you are, how you write, what you're working on.
AGI Engine does one thing about it — it compiles your saved memories and your own prompts into a
single Markdown file (`you.md`), token-budgeted, that you paste at the top of any model.

- **Local only.** No account, no backend, no telemetry by default. Compilation runs in your browser.
- **Deterministic.** Same input → same output, so you can diff last week's `you.md` against this week's.
- **Honest budget.** 1500 tokens by default; when it truncates, it says so.
- **Encrypted backup.** PBKDF2 + AES-256-GCM, passphrase only you hold.
- **One-time license.** ECDSA-signed key verified offline — no subscription, no license server.
- **MIT.** Read the code, fork it, compile it yourself.

Example of the real compiler output: [docs/EXAMPLE-CONTEXT.md](./docs/EXAMPLE-CONTEXT.md)

**Not** a chatbot replacement, **not** a model reseller (bring your own API key or local Ollama),
**not** a sync service (sync needs a server, and a server needs a subscription).

Free tier: 10 memories, 20 messages/day. Pro: **$19 one-time** during launch ($39 after), 14-day refund.

```bash
npx serve .            # or: python3 -m http.server 8080
npm test              # 23 tests, no dependencies
npm run check         # syntax check on every module
```

---

# 中文说明

把你和 AI 说过的话，编译成一份任何模型都能读、加密可带走的记忆资产。

## 它是什么

纯静态 Web App，无构建步骤：

1. **记忆**：本机保存的偏好与事实；免费版 10 条，Pro 不限。
2. **对话**：填入自己的 OpenAI / Anthropic / OpenRouter / 阶跃 Key，或本地 Ollama；免费版每天 20 条。
3. **资产工具箱**：把记忆 + 你自己的提问编译成 `you.md`（可复制 / 下载），以及导出、恢复加密备份。
4. **Pro**：买断制，授权码在本机用 ECDSA 公钥离线校验，不联网、不需要账号。

## 它不是什么

- 不是"加密上链"的产品：v1 的 encrypted / on-chain / 去中心化表述没有任何实现，v2 已全部删除（见 [docs/AUDIT.md](./docs/AUDIT.md)）。
- 不代售模型额度，不做云同步，不做排行榜与邀请奖励。

## 配置（js/config.js）

| 字段 | 作用 | 留空时 |
| --- | --- | --- |
| `checkoutUrl` | 收款链接（Gumroad / Lemon Squeezy / Paddle 均可） | 购买按钮禁用，显示"购买通道未接入"，不出现假按钮 |
| `licenseApi` | 可选在线校验兜底（见 `server/license-worker.js`） | 只用离线校验，无需任何服务器 |
| `analyticsEndpoint` | 匿名事件上报（仅事件名，无对话内容） | 不发送任何数据 |

价格只在 `priceOneTime` / `priceRegular` 里改，以 checkout 页实际价格为准。

## 卖第一单之前（三件事）

1. `node tools/license.mjs keygen` 生成你自己的密钥对；把打印的公钥贴进 `js/license-pubkey.js`。
2. **删掉 `demo/` 目录**——里面的演示私钥是公开的，只能用来体验，不能用来卖。
3. 收款链接填进 `config.js`；每单用 `node tools/license.mjs issue --order <订单号> --email <邮箱>` 签一张票发给买家。

完整流程、定价理由、渠道与 90 天计划：[docs/STRATEGY.md](./docs/STRATEGY.md)。
发布文案与演示脚本：[docs/LAUNCH.md](./docs/LAUNCH.md)。

## 安全模型（含已知局限）

- Key 默认存 `sessionStorage`，勾选"记住"才写 `localStorage`，可一键清除；状态接口只回掩码。
- CSP `script-src 'self'`，无内联脚本；所有动态内容经 `escapeHtml`。
- 备份加密使用 Web Crypto（PBKDF2 210k 次 + AES-256-GCM），口令不上传、不落盘。
- **局限**：浏览器直连模型 API，Key 必然存在于页面上下文，任何同源脚本都能读；介意就用本地 Ollama 或自建代理。Anthropic 直连还需 `anthropic-dangerous-direct-browser-access`，风险更高。离线授权无法远程吊销，退款按条款人工处理。

## 目录结构

```
index.html                落地页 + 应用（无内联事件）
assets/app.css            样式
assets/toolkit.css        工具箱局部样式
js/core.js                纯函数：等级/连击/额度/授权状态/转义（可单测）
js/compiler.js            记忆+对话 → you.md（去重、分类、token 预算）
js/vault.js               PBKDF2 + AES-GCM 加密备份
js/license.js             ECDSA P-256 授权码校验（离线）
js/license-pubkey.js      公钥（正式发售前替换掉演示密钥）
js/entitlement.js         授权落盘 + 可选在线兜底
js/toolkit.js             资产工具箱（编译 / 导出 / 恢复）
js/app.js                 应用壳：对话、记忆、成就、Pro、设置
js/llm.js                 多厂商连接器，Key 分级存储
tools/license.mjs         发码 CLI：keygen / issue / verify
server/license-worker.js  可选：在线吊销/多设备校验
supabase/schema.sql       可选：在线校验用的授权表
test/                     单测：core / compiler / vault / license（23 例）
docs/AUDIT.md             v1 逐条审计与处理结果
docs/STRATEGY.md          策略、定价、单位经济、渠道、90 天计划
docs/LAUNCH.md            发布文案与 30 秒演示脚本
docs/DEPLOY.md            Pages 部署与自定义域名
```

## 路线图

- [x] 上下文包编译器（确定性、token 预算、可 diff）
- [x] 加密备份导出 / 恢复
- [x] 离线签名授权码（无需服务器）
- [ ] 用客户自己的 WebDAV / 网盘做同步（不经我们的服务器）
- [ ] 每周 `you.md` diff 视图
- [ ] 英文版编译器输出模板

## License

MIT，见 [LICENSE](./LICENSE)。

---

## 🎁 Side project: GitWrapped

Ever wondered how much code you actually shipped in the last 90 days?
GitHub knows, but it won't tell you — it just shows a grid of green squares.

I built **GitWrapped**: type a GitHub username, and your browser draws a
1080×1350 card — commit count, most active repo, active days, longest streak.
No login, no token, no backend, nothing stored. Runs entirely client-side,
so it costs $0 no matter how many people use it.

- 🔗 **[Generate your GitWrapped card](https://fnhiq23.github.io/gitwrapped/)**
- ⭐ [Open source (MIT)](https://github.com/Fnhiq23/gitwrapped)

*(Free cards carry a small watermark with my URL — that's how this spreads.)*
