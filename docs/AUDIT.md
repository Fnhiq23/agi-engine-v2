# v1 审计与 v2 处理结果

对象：[Fnhiq23/agi-engine](https://github.com/Fnhiq23/agi-engine)（单文件 `index.html`，2 278 行，1 个 commit）。
结论：产品漏斗完整，但**付款后无法交付、宣传与实现不符、数据全是本地假象**。以下逐条给出状态。

## P0：会让产品直接收不到钱 / 收错钱

| # | v1 问题 | 证据 | v2 处理 |
| --- | --- | --- | --- |
| 1 | Pro 永远打不开：全仓唯一 `isPro` 赋值是 `false`，付款后无任何激活路径 | `index.html:1257` | `js/entitlement.js` 走服务端校验，签发套餐与到期日；`core.js:entitlementState` 判定有效性。无服务端时按钮禁用并提示，不出假按钮 |
| 2 | 收款与交付断开：PayPal 直链跳转，无订单号、无邮箱、无 webhook、无授权码 | `index.html:882-883` | `config.js` 的 checkout 链接必须配合发码服务；README 给出 webhook → 发码流程；`server/license-worker.js` 负责校验 |
| 3 | 漏斗与收入数据全部存在访客本地：每人只统计自己那 1 次访问，"8pm 日报 / $10 000 目标"是模拟值；没有任何代码触发 `track('payment')` | `index.html:1726-1776` | 删除仪表盘与虚假目标；埋点默认只在本地计数，配置 endpoint 后才上报**匿名事件名**，不含对话内容（`js/app.js:track`） |
| 4 | 邀请奖励是空承诺：`referral_success` 从未触发，"双方 +1 个月免费"无法兑现 | `index.html:1816` | 移除邀请奖励模块；要做得先有服务端核销，已列入路线图 |
| 5 | 宣传与实现不符：无任何加密实现却宣传 encrypted；无 web3 代码却卖"on-chain"；"去中心化/无服务器"实为 localStorage 明文 | `index.html:871,904,1026,1341` | 文案改为"本机存储、无账号、无服务器"；删除 on-chain 与 Polygon 收款地址表述；加密列入路线图而非卖点 |

## P1：转化与安全

| # | v1 问题 | 证据 | v2 处理 |
| --- | --- | --- | --- |
| 6 | 免费额度是终身：`GAME.chats` 不按天重置，第 20 条后永久拦截，文案却写"today's limit" | `index.html:1391` | `core.js:quotaFor` 按 `date` 跳天归零，`consumeQuota` 原子扣减；Pro 不限 |
| 7 | API Key 明文落 `localStorage`，公开 API 对象还暴露 `apiKey` 属性 | `index.html:2042,2169` | 默认 `sessionStorage`，勾选后才持久化；`status()` 只回掩码；可一键清除（`js/llm.js`） |
| 8 | 用一个 86 KB HTML 承载全部逻辑，无 CSP、无转义规范 | 全文件 | 拆分为 `js/core|config|llm|entitlement|app`；CSP `script-src 'self'`；统一 `escapeHtml`，移除全部内联 `onclick` |
| 9 | 无 README / LICENSE / 隐私 / 退款条款，却在收美元并索取 Key | 仓库根 | 补齐 `README.md`、`LICENSE`、`PRIVACY.md`、`TERMS.md` |
| 10 | 聊天是 8 条硬编码 "AI 回复"，未接模型时也假装在对话 | `index.html:1004-1013` | 未连接模型时明确提示去设置，不发假消息；接模型后走真实调用 |

## P2：代码缺陷（已全部修复）

| # | 问题 | 证据 | 处理 |
| --- | --- | --- | --- |
| 11 | 重复的 `#tab-settings` 段落，DOM id 冲突 | `index.html:787,826` | 重写为单一 `#panel-settings` |
| 12 | `customUrlRow` 写了两个 `style` 属性，第二个被忽略，该行永远显示 | `index.html:808,848` | 改为 class + JS 显隐 |
| 13 | 同日刷新页面会重置 `dailyClaimed`，每日奖励可无限刷 | `index.html:1052-1055` | 独立的 `lastClaim` 日期字段，`canClaimDaily` 判定 |
| 14 | 残留 `<script type="module" src="./src/index-v3.js">`，仓库中无此文件，每次 404 | `index.html:934` | 删除，改为单一入口 `js/app.js` |
| 15 | 排行榜为硬编码的 Alex / Sam / Jordan，属虚构社会证明 | `index.html:1563` | 删除排行榜 |
| 16 | onboarding 结束直接送 `XP.subscribe`（本应订阅才给） | `index.html:1256` | 改为按真实行为发放 XP |
| 17 | 记忆超限仍保存（注释自认），额度形同虚设 | `index.html:1345-1348` | 超限直接阻断并提示删除或升级 |
| 18 | 无任何测试；升级/额度/授权逻辑不可回归 | — | `test/core.test.js` 8 个用例，CI 先测后发布 |

## 未做（需要产品或外部条件，不假装已完成）

- 记忆加密：需要设计密钥派生与找回流程，直接上 AES 会带来"忘密码即丢数据"的坑。
- 多设备授权：依赖账号体系或邮箱验证。
- 真实发码：需要有支付账号与 webhook 部署，代码骨架已给，密钥与商户号需你本人配置。
- 模型额度代售：涉及模型厂商条款与成本风险，不建议默认做。
