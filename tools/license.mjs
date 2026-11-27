#!/usr/bin/env node
/**
 * AGI Engine v2 — 离线授权码签发工具（无需任何服务器）
 *
 * 用法：
 *   node tools/license.mjs keygen                    # 生成密钥对，私钥写入 keys/private.jwk，打印公钥 JWK
 *   node tools/license.mjs issue --plan lifetime --exp 2099-01-01 --order LS-1234 --email a@b.c
 *   node tools/license.mjs verify <key>             # 用公钥自检一张授权码
 *
 * 私钥只在你的电脑上，永远不要提交进仓库（keys/ 已 gitignore）。
 */

import { generateKeyPairSync, createPrivateKey, createPublicKey, sign, verify } from 'node:crypto';
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const KEYS_DIR = resolve(ROOT, 'keys');
const PRIVATE_PATH = resolve(KEYS_DIR, 'private.jwk');
const PUBLIC_PATH = resolve(KEYS_DIR, 'public.jwk');
const PREFIX = 'AGIP1';
const PRODUCT = 'agi-engine-pro';

const b64u = (buf) => Buffer.from(buf).toString('base64url');

function args() {
  const raw = process.argv.slice(2);
  const cmd = raw[0];
  const flags = {};
  for (let i = 1; i < raw.length; i += 1) {
    if (raw[i].startsWith('--')) {
      const name = raw[i].slice(2);
      const value = raw[i + 1] && !raw[i + 1].startsWith('--') ? raw[i + 1] : 'true';
      flags[name] = value;
      if (value !== 'true') i += 1;
    } else if (!flags._positional) {
      flags._positional = raw[i];
    }
  }
  return { cmd, flags };
}

function keygen() {
  mkdirSync(KEYS_DIR, { recursive: true });
  if (existsSync(PRIVATE_PATH) && !process.env.FORCE) {
    console.error('私钥已存在：', PRIVATE_PATH);
    console.error('确实要重新生成（会让所有已发授权码失效），请加 FORCE=1。');
    process.exit(1);
  }
  const { privateKey, publicKey } = generateKeyPairSync('ec', { namedCurve: 'P-256' });
  const priv = privateKey.export({ format: 'jwk' });
  const pub = publicKey.export({ format: 'jwk' });
  writeFileSync(PRIVATE_PATH, JSON.stringify(priv, null, 2), { mode: 0o600 });
  writeFileSync(PUBLIC_PATH, JSON.stringify(pub, null, 2));
  console.log('私钥已写入（勿提交、勿上传）：', PRIVATE_PATH);
  console.log('\n把下面这一行公钥贴进 js/license-pubkey.js：\n');
  console.log(`export const LICENSE_PUBLIC_JWK = ${JSON.stringify(pub)};`);
}

function issue(flags) {
  if (!existsSync(PRIVATE_PATH)) {
    console.error('找不到私钥，先运行：node tools/license.mjs keygen');
    process.exit(1);
  }
  const priv = JSON.parse(readFileSync(PRIVATE_PATH, 'utf8'));
  const keyObject = createPrivateKey({ key: priv, format: 'jwk' });

  const plan = flags.plan || 'pro';
  const exp = flags.exp || '2099-01-01T00:00:00.000Z';
  if (plan === 'lifetime' && !flags.exp) {
    // lifetime 也写一个极远到期日：前端不接受"无到期时间"，这是刻意的
  }
  const payload = {
    v: 1,
    product: PRODUCT,
    plan,
    exp: new Date(exp).toISOString(),
    order: flags.order || null,
    email: flags.email ? String(flags.email).toLowerCase() : null,
    seats: Number(flags.seats || 1),
    iat: new Date().toISOString(),
  };
  const payloadB64u = b64u(Buffer.from(JSON.stringify(payload), 'utf8'));
  const signed = `${PREFIX}.${payloadB64u}`;
  const signature = b64u(sign('sha256', Buffer.from(signed, 'utf8'), { key: keyObject, dsaEncoding: 'ieee-p1363' }));

  console.log(`\n授权码（发给客户）：\n\n${signed}.${signature}\n`);
  console.log('载荷：', JSON.stringify(payload));
}

function verifyKey(input) {
  if (!existsSync(PUBLIC_PATH)) {
    console.error('找不到公钥，先 keygen。');
    process.exit(1);
  }
  const pub = JSON.parse(readFileSync(PUBLIC_PATH, 'utf8'));
  const keyObject = createPublicKey({ key: pub, format: 'jwk' });
  const parts = String(input || '').split('.');
  if (parts.length !== 3 || parts[0] !== PREFIX) {
    console.error('格式错误');
    process.exit(1);
  }
  const signed = `${parts[0]}.${parts[1]}`;
  const ok = verify('sha256', Buffer.from(signed, 'utf8'), { key: keyObject, dsaEncoding: 'ieee-p1363' }, Buffer.from(parts[2], 'base64url'));
  const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8'));
  console.log(ok ? '✅ 签名有效' : '❌ 签名无效');
  console.log(payload);
  if (ok && payload.exp && Date.parse(payload.exp) < Date.now()) console.log('⚠️ 已过期');
}

const { cmd, flags } = args();
if (cmd === 'keygen') keygen();
else if (cmd === 'issue') issue(flags);
else if (cmd === 'verify') verifyKey(flags._positional || process.argv[3]);
else {
  console.log(`用法：
  node tools/license.mjs keygen
  node tools/license.mjs issue --plan lifetime --exp 2099-01-01 --order LS-1234 --email a@b.c
  node tools/license.mjs verify <key>`);
  process.exit(cmd ? 1 : 0);
}
