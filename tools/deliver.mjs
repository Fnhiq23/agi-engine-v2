#!/usr/bin/env node
/**
 * 一条命令完成「发码 + 交付邮件 + 记账」
 *
 *   node tools/deliver.mjs --email buyer@x.com --order GUM-0001 [--name Alex] [--days 3650]
 *
 * 输出：
 *   1) 一张授权码（ECDSA 签名，离线校验）
 *   2) 中英双语交付邮件全文（直接复制进邮箱）
 *   3) 追加一行到 orders.csv（订单号 / 邮箱 / 签发时间 / 到期 / 授权码）
 *
 * 私钥只在 keys/private.jwk（已 gitignore）。orders.csv 也已被 gitignore。
 */
import { createPrivateKey, sign } from 'node:crypto';
import { readFileSync, appendFileSync, existsSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const PRIVATE_PATH = resolve(ROOT, 'keys/private.jwk');
const LEDGER = resolve(ROOT, 'orders.csv');
const PREFIX = 'AGIP1';
const PRODUCT = 'agi-engine-pro';
const b64u = (buf) => Buffer.from(buf).toString('base64url');

function flags() {
  const raw = process.argv.slice(2);
  const out = {};
  for (let i = 0; i < raw.length; i += 1) {
    if (raw[i].startsWith('--')) {
      const k = raw[i].slice(2);
      const v = raw[i + 1] && !raw[i + 1].startsWith('--') ? raw[i + 1] : 'true';
      out[k] = v;
      if (v !== 'true') i += 1;
    }
  }
  return out;
}

const f = flags();
if (!f.order || !f.email) {
  console.error('用法：node tools/deliver.mjs --order GUM-0001 --email buyer@x.com [--name Alex] [--days 3650]');
  process.exit(1);
}
if (!existsSync(PRIVATE_PATH)) {
  console.error('找不到私钥 keys/private.jwk，先运行 node tools/license.mjs keygen 并更新 js/license-pubkey.js');
  process.exit(1);
}

const days = Number(f.days || 3650);
const expMs = Date.now() + days * 86400000;
const payload = {
  v: 1,
  product: PRODUCT,
  plan: 'pro',
  exp: new Date(expMs).toISOString(),
  order: f.order,
  email: String(f.email).toLowerCase(),
  seats: Number(f.seats || 1),
  iat: new Date().toISOString(),
};
const payloadB64u = b64u(Buffer.from(JSON.stringify(payload), 'utf8'));
const signed = `${PREFIX}.${payloadB64u}`;
const priv = JSON.parse(readFileSync(PRIVATE_PATH, 'utf8'));
const keyObject = createPrivateKey({ key: priv, format: 'jwk' });
const signature = b64u(sign('sha256', Buffer.from(signed, 'utf8'), { key: keyObject, dsaEncoding: 'ieee-p1363' }));
const license = `${signed}.${signature}`;
const name = f.name || 'there';
const expHuman = new Date(expMs).toISOString().slice(0, 10);
const site = 'https://mcp.edgeone.site/share/xyRAoxBBCj0U6i-poPm2w';

const cn = `主题：【AGI Engine】你的授权码 + 安装步骤（订单号 ${f.order}）

你好：

这是你购买 AGI Engine Pro 的授权码（订单号 ${f.order}，有效期至 ${expHuman}）：

${license}

三步用起来：
1) 打开 ${site} 或附件里的 dist/index.html（双击即可，推荐 Chrome / Edge）；
2) 进入「Pro」页，把上面的授权码粘贴进去 → 点激活 → 右上角徐章变 Pro；
3) 到「记忆 → 资产工具箱」：生成完整上下文包（1500 tokens）、导出加密备份（口令自己设，12 位以上）。

说明：
· 授权在本机离线校验，不联网、不需要账号、不上传设备信息；换电脑用同一张码即可；
· 数据只存在你的浏览器里，我们看不到你的记忆和对话；
· 14 天内不满意直接回这封邮件退款，不用说明原因。

—— AGI Engine`;

const en = `Subject: [AGI Engine] Your license key + setup (order ${f.order})

Hi ${name},

Here is your AGI Engine Pro license key (order ${f.order}, valid until ${expHuman}):

${license}

Three steps:
1) Open ${site} or the attached dist/index.html (double-click; Chrome / Edge recommended);
2) Go to the "Pro" tab, paste the key, click activate — the badge turns Pro;
3) In "Memory → Asset Toolkit": compile the full context pack (1500 tokens) and export an encrypted backup (set your own passphrase, 12+ chars).

Notes:
- The key is verified offline on your device: no network, no account, no device fingerprint. Same key works on your other computers.
- Your memories and chats never leave your browser.
- 14-day refund, no questions asked — just reply to this email.

— AGI Engine`;

console.log(`\n=== 授权码 ===\n${license}\n`);
console.log(`=== 中文邮件 ===\n${cn}\n`);
console.log(`=== English email ===\n${en}\n`);

if (!existsSync(LEDGER)) writeFileSync(LEDGER, 'order,email,issued_at,expires_at,license\n');
const row = [f.order, payload.email, payload.iat, payload.exp, license]
  .map((v) => `"${String(v).replace(/"/g, '""')}"`)
  .join(',');
appendFileSync(LEDGER, `${row}\n`);
console.log('已追加一行到 orders.csv（本地台账，已 gitignore，勿提交）');
