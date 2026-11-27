# AGI Engine v2

[![ci](https://github.com/Fnhiq23/agi-engine-v2/actions/workflows/ci.yml/badge.svg)](https://github.com/Fnhiq23/agi-engine-v2/actions/workflows/ci.yml)

本地优先的个人 AI 工作台。自带模型 Key，记忆和对话只存在你的浏览器里；没有账号，没有服务器，也没有"帮你训练"的隐藏用途。

- 上游：`Fnhiq23/agi-engine`（v1，单文件 86 KB 原型，存在问题见 [docs/AUDIT.md](./docs/AUDIT.md)）
- 本仓库：由 AI 全量重构的 v2，逐条修复记录见同一份审计文档

## 它是什么

一个纯静态 Web App，没有构建步骤：

1. **对话**：填入自己的 OpenAI / Anthropic / OpenRouter / 阶跃 或本地 Ollama Key，直接调用；免费版每天 20 条。
2. **记忆**：本机保存的偏好条目，以 system prompt 形式带进对话；免费版 10 条。
3. **进度**：XP、等级、连续签到、8 个成就，全部基于本地记录，没有排行榜、没有虚构社会证明。
4. **Pro**：授权码激活后解除条数限制；授权与否由服务端校验，不由前端说了算。

## 它不是什么

- 不是"加密上链"的产品：v1 的 encrypted / on-chain / 去中心化表述没有任何实现，v2 已全部删除。
- 不代售模型额度：调用费用由你自己的 Key 承担。
- 不是多设备同步服务：换设备就是新用户，Pro 授权也需重新激活。

## 快速开始

```bash
npx serve .        # 或 python3 -m http.server 8080
```

打开 `http://localhost:8080`。不要用 `file://` 打开——ES module 与 CSP 都需要 http 源。

## 配置（js/config.js）

| 字段 | 作用 | 留空时 |
| --- | --- | --- |
| `checkoutUrl` / `checkoutUrlAnnual` | 月度 / 年度收款链接 | 购买按钮禁用，显示"购买通道未接入" |
| `licenseApi` | 授权码校验接口（见 `server/license-worker.js`） | 无法激活 Pro，输入框明确提示 |
| `analyticsEndpoint` | 匿名事件上报地址（只有事件名，无对话内容） | 不发送任何数据 |

## 接入真实收款与授权（三步）

1. **建表**：在 Supabase 执行 [`supabase/schema.sql`](./supabase/schema.sql)。
2. **发码服务**：部署 [`server/license-worker.js`](./server/license-worker.js) 到 Cloudflare Workers，绑定 `SUPABASE_URL`、`SUPABASE_SERVICE_KEY`、`LICENSE_PEPPER`、`ALLOWED_ORIGIN`。
3. **接支付**：Lemon Squeezy / Paddle / Stripe 任一，在支付成功 webhook 里写入 `licenses` 表并邮件发码，再把 checkout 链接填进 `config.js`。

关键点：**授权码只在服务端校验，前端拿到的是套餐 + 到期日，不是 `isPro = true`。** 数据库只存授权码的 SHA-256，不存明文。

## 安全模型（含已知局限）

- Key 默认存 `sessionStorage`（关标签页失效），显式勾选"记住"才写 `localStorage`，可一键清除。
- CSP `script-src 'self'`，无内联脚本；所有动态内容经 `escapeHtml`。
- **局限**：浏览器直连模型 API，Key 必然存在于页面上下文，任何同源脚本都能读。介意就用本地 Ollama 或自建代理。Anthropic 官方直连还需 `anthropic-dangerous-direct-browser-access`，风险更高。

## 测试与部署

```bash
npm test        # node --test，8 个纯逻辑用例，无第三方依赖
npm run check   # node --check 语法校验
```

`ci.yml` 每次 push 跑语法检查 + 单测（GitHub Actions 上已验证通过）。站点发布走 Pages 分支模式，一次性设置见 [docs/DEPLOY.md](./docs/DEPLOY.md)。

## 目录结构

```
index.html                落地页 + 应用（无内联事件）
assets/app.css            样式
js/core.js                纯函数：等级/连击/额度/授权/转义（可单测）
js/config.js              收款、授权、埋点、额度开关
js/llm.js                 多厂商连接器，Key 分级存储
js/entitlement.js         授权码校验
js/app.js                 状态、渲染、交互
server/license-worker.js  Cloudflare Worker：授权码校验
supabase/schema.sql       授权表（仅 service_role 可读写）
test/core.test.js         纯逻辑测试
docs/AUDIT.md             v1 逐条审计与处理结果
docs/DEPLOY.md            Pages 部署与自定义域名
```

## 路线图

- [ ] 记忆加密（Web Crypto AES-GCM + 口令派生，密钥不出内存）
- [ ] 授权多设备（邮箱 + 设备数上限）
- [ ] 服务端代理额度（给不想自带 Key 的用户）
- [ ] 加密备份导出 / 导入

## License

MIT，见 [LICENSE](./LICENSE)。
