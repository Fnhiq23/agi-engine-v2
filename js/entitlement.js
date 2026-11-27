/* AGI Engine v2 — Pro 授权校验
 * 只在配置了 CONFIG.licenseApi 时可用；校验通过后保存服务端签发的到期时间。
 * 没有服务端 = 没有 Pro，界面明确显示"购买通道未接入"，而不是假按钮。
 */
import { CONFIG } from './config.js';
import { KEYS, loadJSON, saveJSON } from './core.js';

export function loadEntitlement() {
  return loadJSON(localStorage, KEYS.entitlement, null);
}

export function clearEntitlement() {
  try {
    localStorage.removeItem(KEYS.entitlement);
  } catch (err) {
    /* ignore */
  }
}

export async function verifyLicenseKey(key) {
  const trimmed = String(key || '').trim();
  if (!trimmed) return { ok: false, message: '请输入授权码。' };
  if (!CONFIG.licenseApi) {
    return { ok: false, message: '授权服务尚未接入，当前无法激活 Pro。' };
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15000);

  try {
    const res = await fetch(CONFIG.licenseApi, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key: trimmed, product: CONFIG.productId }),
      signal: controller.signal,
    });

    if (!res.ok) {
      return { ok: false, message: `校验失败（HTTP ${res.status}），请稍后再试。` };
    }

    const data = await res.json();
    if (!data || data.valid !== true || !data.expiresAt) {
      return { ok: false, message: data?.message || '授权码无效或已过期。' };
    }

    const ent = {
      plan: data.plan || 'pro',
      expiresAt: data.expiresAt,
      source: 'license',
      activatedAt: new Date().toISOString(),
      orderId: data.orderId || null,
    };
    saveJSON(localStorage, KEYS.entitlement, ent);

    // 授权码本身只留在本机，用于后续续期核对
    try {
      localStorage.setItem('agi_v2_license_key', trimmed);
    } catch (err) {
      /* ignore */
    }

    return { ok: true, entitlement: ent };
  } catch (err) {
    if (err.name === 'AbortError') return { ok: false, message: '校验超时，请检查网络。' };
    return { ok: false, message: '网络错误，无法连接授权服务。' };
  } finally {
    clearTimeout(timer);
  }
}
