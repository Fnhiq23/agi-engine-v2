# Gumroad 上架单（A 路线：美元版，全球可卖）

> 你的动作只有三件：**注册 → 建商品 → 把链接发我**。本文件里每一栏都可以直接复制。
> 时间预算：注册 5 分钟 + 建商品 10 分钟 + 等我回填 10 分钟。

## 0. 先决定定价结构（这一步决定你会不会被打差评）

不要直接写 "$19，原价 $39" 却不给凭据。正确做法是：

- **标准价设 $39**（这是真实价格，任何时候都能按 $39 买到）
- 建一个 **Offer code：`LAUNCH`，减 $20**，有效期到你卖出第 100 单
- 结算页显示 **$19**，用户看到的是"用码省 20"，不是"虚构原价"

这样写进条款、写进页面都站得住，也不会被 Gumroad 或支付渠道判定为虚假折扣。

## 1. 商品基础信息

| 字段 | 填什么 |
|---|---|
| Product name | `AGI Engine — Your AI memory as one portable file` |
| URL slug | `agi-engine`（最终链接形如 `https://你的名字.gumroad.com/l/agi-engine`） |
| Type | Digital product |
| Price | `$39`（配 `LAUNCH` 码后 $19） |
| Currency | USD |
| Call to action | `Buy this` |
| Category / Tags | `Education`、`Productivity`、`AI`、`developer tools` |

## 2. 商品描述（英文，整段复制）

```
Your context is scattered across ChatGPT, Claude, Gemini and local models. Every switch
means explaining yourself again.

AGI Engine turns the things you've already told an AI — your preferences, facts, goals,
and the phrasings you keep repeating — into ONE deterministic Markdown file (you.md).
Paste it at the top of any conversation and the model stops asking who you are.

What you get ($19 with code LAUNCH, regular $39):
• The app — a single HTML file, runs in your browser, no account, no server.
• Full context pack up to 1500 tokens (free tier previews 240).
• Encrypted backup export/import — PBKDF2 + AES-256-GCM, passphrase stays with you.
• 8 operator playbooks: weekly diff, model migration, team context, client delivery, backup drills, pricing.
• A real example of the output, not a mockup.
• Source code is MIT — read every line at github.com/Fnhiq23/agi-engine-v2

Why one-time instead of a subscription: there is no server to pay for. Sync would need
one, and sync is exactly what turns a $19 tool into a $15/month bill.

Honest limits:
• It does not call a model for you — bring your own API key, or run local Ollama.
• It does not invent facts about you; it compresses what you wrote.
• No cloud sync, by design. Backups are encrypted files you put in your own drive.

License: one key per buyer, verified offline on your device (no account, no device
fingerprint). Same key works on your other computers.
Refund: 14 days, no questions asked — reply to the receipt email.
Support: 80306495@qq.com
```

## 3. 内容文件（上传什么）

只上传一个文件：`you-md-starter.zip`（约 30 KB），里面是：

- `dist/index.html`（单文件应用，67 KB）
- `PLAYBOOKS.md`（8 个操作手册）
- `EXAMPLE-CONTEXT.md`（真实输出样例）
- `README.md` / `使用说明.txt`（上手步骤 + 退款说明 + 客服邮箱）

**不要**把授权码放进 zip——授权码一单一发，否则一份文件会被无限转发。

## 4. 收据备注（Gumroad → Settings → Receipt / Thank-you note）

```
Thanks for buying. Your license key arrives by email from 80306495@qq.com within a few
hours (usually minutes). If it doesn't, reply to this receipt and I'll resend.
14-day refund, no questions — just reply here.

中文：感谢购买。授权码会在几小时内（通常几分钟）发到你的邮箱。没收到就回这封邮件。
14 天无理由退款，回这封邮件即可。
```

## 5. 收款设置（第一次提现前完成即可）

- Gumroad 是 **merchant of record**：它代收并处理销售税/VAT，你不需要自己报海外税（中国境内收入仍需按你所在地规定申报，这一条要你自己处理）。
- Payouts：绑定银行账户或 PayPal。第一次提现通常有几天验证期，**不影响上架和收单**。
- 建议先上架、先卖，再去绑提现——不要卡在验证上不发商品。

## 6. 上架后的 60 秒动作（这是你要发给我的）

把商品链接发我，形如 `https://xxx.gumroad.com/l/agi-engine`。我收到后 10 分钟内做完：

1. 写进 `js/config.js` 的 `checkoutUrl`
2. `npm run build` 重建单文件版
3. 重新部署线上页 → 按钮变成 **Buy $19**
4. 同步更新交付包 zip（里面的说明会写上"购买后到 Pro 页激活"）

## 7. 上线后第一小时（不要发完就等）

| 时间 | 动作 | 用哪份文案 |
|---|---|---|
| T+0 | X 发 5 条线程 | `docs/LAUNCH.md §7` |
| T+30m | 发给 10 个同时在用多模型的人（一对一） | `docs/LAUNCH.md §8` |
| T+1h | 回所有评论，只答技术问题，每条 ≤3 行 | `docs/OPS.md §6` |
| 当晚 | 记四个数：访问 / 试编译 / 点购买 / 实际付款 | `docs/OPS.md §4` |

## 8. 三天内必须知道的两个数

- **试编译 → 点购买**：低于 5% 说明页面对"能带走什么"讲不清，改文案不改价格。
- **点购买 → 付款**：低于 50% 说明 Gumroad 页信息不足（多半是没写"14 天退款"和"离线授权"），补描述。

## 9. 我不做的事（写在这里，免得你误会）

- 不替你注册、不替你填银行卡、不替你点发布——这些需要你的实名身份。
- 不承诺销量。首页级流量才有上千访问，冷启动第一周大概率是 **0–3 单**，这是正常值，不是失败。
