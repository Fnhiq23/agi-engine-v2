/* AGI Engine v2 — 离线授权码（ECDSA P-256 签名，无需服务器）
 *
 * 格式：AGIP1.<base64url(payload JSON)>.<base64url(signature)>
 * 签名覆盖：`AGIP1.<payloadB64u>` 的 UTF-8 字节
 * payload：{ v:1, product, plan, exp, order, seats, iat }
 *
 * 为什么离线：本地工具不该为了"验证一张票"养一台服务器。
 * 代价是：无法远程吊销。退款靠人工换新公钥或人工补发，写进条款即可。
 */

export const LICENSE_PREFIX = 'AGIP1';
const enc = new TextEncoder();

function bytesToB64u(bytes) {
  let binary = '';
  for (let i = 0; i < bytes.length; i += 1) binary += String.fromCharCode(bytes[i]);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function b64uToBytes(str) {
  const padded = str.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(str.length / 4) * 4, '=');
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

export function encodePayload(payload) {
  return bytesToB64u(enc.encode(JSON.stringify(payload)));
}

export function parseLicenseKey(input) {
  const raw = String(input || '').trim().replace(/\s+/g, '');
  const parts = raw.split('.');
  if (parts.length !== 3 || parts[0] !== LICENSE_PREFIX) return null;
  let payload;
  try {
    payload = JSON.parse(new TextDecoder().decode(b64uToBytes(parts[1])));
  } catch (err) {
    return null;
  }
  if (!payload || typeof payload !== 'object') return null;
  return { payload, signature: parts[2], signed: `${parts[0]}.${parts[1]}` };
}

/** 返回 {ok, plan, expiresAt, orderId, seats} 或 {ok:false, reason} */
export async function verifySignedKey(input, publicJwk, { now = Date.now(), product = 'agi-engine-pro' } = {}) {
  const parsed = parseLicenseKey(input);
  if (!parsed) return { ok: false, reason: 'FORMAT', message: '授权码格式不正确。' };
  if (!publicJwk || !publicJwk.x || !publicJwk.y) {
    return { ok: false, reason: 'NO_PUBKEY', message: '本应用还未配置授权公钥，无法激活。' };
  }
  // WebCrypto 只在安全上下文可用（https / localhost / file: 的部分浏览器）。
  // 缺失时给出明确原因，而不是让用户看到"签名无效"这种误导性错误。
  if (typeof crypto === 'undefined' || !crypto.subtle) {
    return {
      ok: false,
      reason: 'NO_CRYPTO',
      message: '当前打开方式不支持 WebCrypto，授权码无法校验。请用 https 地址或 localhost 打开（不要用 http 或内嵌预览）。',
    };
  }

  let ok = false;
  try {
    const key = await crypto.subtle.importKey('jwk', publicJwk, { name: 'ECDSA', namedCurve: 'P-256' }, false, ['verify']);
    ok = await crypto.subtle.verify(
      { name: 'ECDSA', hash: 'SHA-256' },
      key,
      b64uToBytes(parsed.signature),
      enc.encode(parsed.signed),
    );
  } catch (err) {
    return { ok: false, reason: 'VERIFY_ERROR', message: '授权码校验过程出错。' };
  }

  if (!ok) return { ok: false, reason: 'BAD_SIGNATURE', message: '授权码签名无效（可能被改动过）。' };

  const p = parsed.payload;
  if (p.v !== 1) return { ok: false, reason: 'VERSION', message: '授权码版本不受支持。' };
  if (product && p.product !== product) return { ok: false, reason: 'WRONG_PRODUCT', message: '授权码不属于本产品。' };
  if (!p.exp) return { ok: false, reason: 'NO_EXPIRY', message: '授权码缺少有效期。' };

  const expMs = Date.parse(p.exp);
  if (!Number.isFinite(expMs)) return { ok: false, reason: 'BAD_DATE', message: '授权码有效期格式错误。' };
  if (expMs <= now) return { ok: false, reason: 'EXPIRED', message: '授权码已过期。' };

  return {
    ok: true,
    plan: p.plan || 'pro',
    expiresAt: new Date(expMs).toISOString(),
    orderId: p.order || null,
    seats: Number(p.seats) || 1,
  };
}
