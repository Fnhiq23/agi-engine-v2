# 发布包：一次点击就能贴出去的文案 + 30 秒演示脚本

> 原则：不吹 AGI、不买票、不群发。**每个帖子里必须有一个别人能立即验证的东西**（样例文件或仓库链接），否则就是垃圾信息。

## 0. 发布前 5 件事（缺一件就别发）

1. 站点能开：GitHub → Settings → Pages → **Deploy from a branch** → `main` / `/ (root)`。仓库 token 建不了 Pages，只能你手点。
2. 记录真实转化：`docs/STRATEGY.md §5` 的四个数（访问 / 编译 / 导出尝试 / 付款）用一张纸记，别靠感觉。
3. 收款链接进 `js/config.js` 的 `checkoutUrl`；先用 Gumroad $19 试水。
4. `node tools/license.mjs keygen` → 公钥贴进 `js/license-pubkey.js` → **删掉 `demo/`**（演示私钥在仓库里，谁都能签票）。
5. 录好 30 秒 GIF/竖屏视频，先传到 GitHub README 或帖子首图。

## 1. 30 秒演示脚本（一镜到底，不剪辑也能看）

| 秒 | 画面 | 字幕 |
|---|---|---|
| 0–4 | 空白的记忆列表，逐条敲 | "我用了 6 个 AI，每次都要重新自我介绍" |
| 5–12 | 连敲 5 条：不喝可乐 / 写东西要短句 / 周会纪要三条结论 / 做咖啡店小程序 / 英文一般 | —— |
| 13–18 | 点「生成上下文包」，右侧滚出 `you.md` | "它把我散在各处的话压成一份" |
| 19–24 | 复制 → 切到 ChatGPT → 粘贴 → 问"帮我写灰度公告" | "同一个问题，答案突然像认识我" |
| 25–30 | 切回来点「导出加密备份」 | "本机生成，加密可带走。没有账号，没有服务器。" |

要点：**不要出现"AGI""智能体""去中心化"**。观众只会记住"粘贴之后它认识我了"。

## 2. Show HN（英文，周二/周三 21:00–23:00 CST 发）

标题（选一个，不要标题党）：

```
Show HN: A local tool that compiles your AI chats into a portable you.md
```

正文：

```
I kept re-introducing myself to every model I use — ChatGPT for drafts, Claude for
long docs, a local Llama for anything private. Every switch reset the context.

So I built a small local-first app that does exactly one thing: turn your saved
memories + your own messages into a single Markdown file (a "context pack") you
paste at the top of any conversation.

- Runs entirely in the browser. No account, no backend, no analytics by default.
- Compilation is deterministic: same input → same output, so you can diff it weekly.
- Token budgeted (default 1500), truncates honestly instead of silently blowing
  your context window.
- Encrypted backup (PBKDF2 + AES-256-GCM) with a passphrase only you hold.
- Pro is a one-time signed license (ECDSA, verified offline) — no subscription,
  no license server. Free tier keeps 10 memories and 20 messages/day.

Honest limits: it is not a chatbot replacement, it does not call a model for you
(BYO API key or local Ollama), and there is no sync — by design, sync needs a
server and I don't want one.

Example of the real output: <link to docs/EXAMPLE-CONTEXT.md>
Code (MIT): <repo link>

Happy to hear where the compiler gets it wrong — that's the part I'm least sure about.
```

不要在 HN 正文里放价格。评论区被问到再答，附一句"$19 one-time during launch, refundable 14 days"。

## 3. Reddit r/LocalLLaMA（英文，先潜水看版规，标题别带 emoji）

```
[P] Made a deterministic compiler: memories + your own messages → one you.md you can paste anywhere
```

正文取 Show HN 的前 4 段，加一句本社区关心的点：

```
Everything is local: the compiler is plain JS, the vault is WebCrypto, no network calls
unless you configure them. Works with Ollama out of the box (no API key needed).
```

r/ChatGPTPro 版本把标题换成：`I stopped re-explaining myself to ChatGPT — here's the file I paste instead`。

## 4. Product Hunt（英文）

- Tagline（60 字符内）：`Compile your AI memory into a portable you.md`
- Description：

```
Your context is scattered across ChatGPT, Claude and local models. AGI Engine turns
your saved preferences and your own prompts into one deterministic Markdown context
pack you paste at the top of any chat. Local-only, no account, encrypted backup,
one-time license instead of a subscription.
```

- 首图用演示脚本第 18 秒的画面（左记忆右 you.md）。第一评论自己写：说明"为什么是买断不是订阅"。

## 5. V2EX（中文，发「分享创造」节点）

标题：`做了个本地小工具：把我和 AI 说过的话编译成一份 you.md`

```
背景：我同时用 ChatGPT、Claude、本地 Ollama。每次换模型都要重新交代一遍"我是谁、我要什么风格"，
这件事一年重复几百次。

所以我做了个纯前端的小东西，只干一件事：
把你在本机存的记忆 + 你自己的提问，编译成一份 1500 tokens 以内的 Markdown。
粘到任何模型开头，它就知道你的偏好、事实、正在推进的事。

几个刻意的设计：
- 无账号、无后端、无埋点（默认只在本机计数）
- 编译是确定性的：同样输入同样输出，可以每周 diff 看自己变了什么
- 有 token 预算，超了截断并明说，不会偷偷塞满上下文
- 加密备份（PBKDF2 + AES-GCM），口令在你自己手里
- 授权码是离线签名校验的，不做订阅、不养服务器

真实输出样例（不是示意图）：<链接>
代码 MIT：<链接>

想听两件事：1) 这个编译结果里，哪一类信息你觉得最没用？2) 你换模型的频率有多高？
```

回帖纪律：**只回答技术问题**；被问价格就直说"首发 $19 买断，14 天可退"；被说"这不就是 prompt 拼接"就承认"是，但确定性 + 预算 + 可 diff 是它存在的理由"。

## 6. 即刻 / 小红书（中文，短，第一人称）

即刻（发「一起做产品」圈子）：

```
我把"每次换 AI 都要重新自我介绍"这件事做成了一个小工具。
它不聊天，只负责把你散在各处的偏好和事实，压成一份 you.md。
复制 → 粘到任何模型开头 → 它突然就认识你了。
纯本地，没有账号，数据不出浏览器。买断 $19，不做订阅。
```

小红书（标题 + 正文 + 3 张图）：

标题：`我把用过的 AI 记忆，做成了一份能带走的文件`
正文：同上，末尾加"评论区发'模板'，我把空模板发你"（**不要用私信自动回复工具，手动发**）。
图片：① 记忆列表 ② 生成的 you.md ③ 粘进模型前后的回答对比截图。

## 7. X / Twitter 线程（英文，5 条）

```
1/ Every AI chat starts with me explaining myself again. Six models, zero memory
   portability.

2/ So I built a compiler, not a chatbot. It turns my saved memories + my own prompts
   into one Markdown file: you.md

3/ It's deterministic. Same input, same output. So every Sunday I can diff last
   week's you.md and see what actually changed in my life.

4/ 1500 token budget, honest truncation, PBKDF2+AES-GCM backup, ECDSA license
   verified offline. No account. No server. MIT.

5/ Real output, not a mockup: <link>
```

## 8. 一对一 DM（转化率最高的渠道，一天 5 条，别群发）

中文（发给"同时用多个模型"的熟人/群友）：

```
看到你之前提过同时用 ChatGPT 和 Claude。
我做了个小工具，能把你的偏好和常用说法编译成一份 you.md，粘到任何模型开头都管用。
给你一份免费的（不用注册）：<链接>
要是你愿意，把你觉得"它理解错了"的地方截给我，我按你的场景改编译器。
```

英文版同结构。**结尾不要放付款链接**，等对方回第二句再给。

## 9. 五个必被问到的问题，先想好答案

| 质疑 | 回答（照圣，别辩解） |
|---|---|
| "这不就是 system prompt 拼接？" | "是。区别是它确定、有 token 预算、可 diff、可加密带走。手写 prompt 做不到这四点。" |
| "为什么不做云同步？" | "同步要服务器，服务器要钱，收费就得变订阅。我宁可让你用自己的网盘传加密文件。" |
| "免费版为什么只有 10 条记忆？" | "10 条够你判断它有没有用，不够你依赖它。付费墙在导出，不在保存。" |
| "凭什么收 $19？" | "买断，不续费，14 天可退，源码 MIT 可自己编译。你付的是我把它做出来的时间。" |
| "AI 生成的记忆可靠吗？" | "编译器不生成事实，只整理你写下的东西；它不会替你想出'你喜欢什么'。" |

## 10. 发布日流程（4 小时，不要发完就等）

1. T-0：站点自检（无痕窗口打开 → 演示码激活 → 编译 → 导出 → 恢复）。
2. T+0：Show HN 一条；30 分钟后 V2EX 一条；再 30 分钟即刻一条。**同一天不要发第 4 个平台**。
3. T+1h 到 T+4h：每 20 分钟刷一次评论，只回技术问题，每条不超过 3 行。
4. 当晚记录：访问数、编译次数（本机 localStorage 里 `agi_v2_events` 的 `pack_compiled`）、付款数。
5. 第二天：把最扎心的那条评论贴进 `docs/STRATEGY.md §10`，作为下一轮的唯一改进目标。
