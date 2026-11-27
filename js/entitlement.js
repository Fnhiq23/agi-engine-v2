/* AGI Engine v2 — Pro 授权：默认离线校验（ECDSA 签名），无需服务器
 *
 * 授权码 = 创始人私钥签名的票据。应用内只放公钥，所以：
 * - 不需要数据库、不需要 Worker、不需要联网，激活 0 成本、0 延迟
 * - 代价是无法远程吊销：退款/滥用靠人工（见 docs/STRATEGY.md 的条款）
 *
 * 可选后端模式：若 CONFIG.licenseApi 配了地址，离线校验失败时再问一次服务端
 * （给需要吊销名单/多设备的买家留个口子，默认不用）。
 */
import { CONFIG } from './config.js';
import { KEYS, loadJSON, saveJSON } from './core.js';
import { verifySignedKey } from './license.js';
import { LICENSE_PUBLIC_JWK } from './license-pubkey.js';

const LICENSE_KEY_SLOT = 'agi_v2_license_key';

export function loadEntitlement() {
  return loadJSON(localStorage, KEYS.entitlement, null);
}

export function clearEntitlement() {
  try {
    localStorage.removeItem(KEYS.entitlement);
    localStorage.removeItem(LICENSE_KEY_SLOT);
  } catch (err) {
    /* ignore */
  }
}

async function verifyOnline(key) {
  if (!CONFIG.licenseApi) return null;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15000);
  try {
    const res = await fetch(CONFIG.licenseApi, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key, product: CONFIG.productId }),
      signal: controller.signal,
    });
    if (!res.ok) return null;
    const data = await res.json();
    if (!data || data.valid !== true || !data.expiresAt) return null;
    return { plan: data.plan || 'pro', expiresAt: data.expiresAt, orderId: data.orderId || null };
  } catch (err) {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

export async function verifyLicenseKey(key) {
  const trimmed = String(key || '').trim().replace(/\s+/g, '');
  if (!trimmed) return { ok: false, message: '请输入授权码。' };

  const local = await verifySignedKey(trimmed, LICENSE_PUBLIC_JWK, { product: CONFIG.productId });
  const online = local.ok ? null : await verifyOnline(trimmed);

  if (!local.ok && !online) {
    return { ok: false, message: local.message || '授权码无效或已过期。' };
  }

  const seat = local.ok ? local : online;
  const ent = {
    plan: seat.plan || 'pro',
    expiresAt: seat.expiresAt,
    source: local.ok ? 'license-offline' : 'license-online',
    activatedAt: new Date().toISOString(),
    orderId: seat.orderId || null,
  };
  saveJSON(localStorage, KEYS.entitlement, ent);

  try {
    // 授权码只留在本机，用于续期/换设备时核对
    localStorage.setItem(LICENSE_KEY_SLOT, trimmed);
  } catch (err) {
    /* ignore */
  }

  return { ok: true, entitlement: ent };
}
