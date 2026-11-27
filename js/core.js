/* AGI Engine v2 — 纯函数核心逻辑
 * 无副作用、无 DOM、无网络依赖，浏览器与 Node 测试共用。
 */

export const KEYS = {
  game: 'agi_v2_game',
  llmCfg: 'agi_v2_llm_cfg',
  llmKey: 'agi_v2_llm_key',
  entitlement: 'agi_v2_entitlement',
  usage: 'agi_v2_usage',
};

export const LEVEL_BASE_XP = 100;
export const LEVEL_GROWTH = 1.5;

/** 本地时区的 YYYY-MM-DD，用于签到/每日额度判断 */
export function todayKey(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** 两个日期键相差几天（to - from），非法输入返回 NaN */
export function dayDiff(fromKey, toKey) {
  const from = Date.parse(`${fromKey}T00:00:00Z`);
  const to = Date.parse(`${toKey}T00:00:00Z`);
  if (!Number.isFinite(from) || !Number.isFinite(to)) return NaN;
  return Math.round((to - from) / 86400000);
}

/**
 * 计算今日签到后的连击。
 * 同一天重复进入不改变连击（也不会重置领取状态，靠 lastClaim 单独控制）。
 */
export function nextStreak(prev = {}, today = todayKey()) {
  const streak = Number.isFinite(prev.streak) ? Math.max(0, prev.streak) : 0;
  const lastActive = typeof prev.lastActive === 'string' ? prev.lastActive : null;
  if (!lastActive) return { streak: 1, lastActive: today, isNewDay: true };
  const diff = dayDiff(lastActive, today);
  if (!Number.isFinite(diff) || diff <= 0) {
    return { streak: Math.max(1, streak), lastActive, isNewDay: false };
  }
  if (diff === 1) return { streak: streak + 1, lastActive: today, isNewDay: true };
  return { streak: 1, lastActive: today, isNewDay: true };
}

/** 每日奖励只能领一次：同日重复领取返回 false */
export function canClaimDaily(lastClaim, today = todayKey()) {
  return !lastClaim || lastClaim !== today;
}

/** 由累计 XP 推导等级（每级需求 ×1.5 增长） */
export function levelFromXp(totalXp = 0) {
  let level = 1;
  let need = LEVEL_BASE_XP;
  let rest = Math.max(0, Math.floor(Number(totalXp) || 0));
  while (rest >= need && level < 99) {
    rest -= need;
    level += 1;
    need = Math.round(need * LEVEL_GROWTH);
  }
  return { level, xpIntoLevel: rest, xpForNext: need, progress: need > 0 ? rest / need : 0 };
}

/** 每日额度：跨天自动归零 */
export function quotaFor(state = {}, today = todayKey(), limit = 20) {
  const used = state.date === today ? Math.max(0, Math.floor(Number(state.used) || 0)) : 0;
  return { date: today, used, limit, remaining: Math.max(0, limit - used), blocked: used >= limit };
}

export function consumeQuota(quota) {
  const used = quota.used + 1;
  return {
    ...quota,
    used,
    remaining: Math.max(0, quota.limit - used),
    blocked: used >= quota.limit,
  };
}

/** Pro 权益是否有效（以服务端签发的到期时间为准） */
export function entitlementState(ent, now = Date.now()) {
  const idle = { active: false, plan: null, expiresAt: null, daysLeft: 0, source: null };
  if (!ent || !ent.plan || !ent.expiresAt) return idle;
  const expiresMs = Date.parse(ent.expiresAt);
  if (!Number.isFinite(expiresMs)) return idle;
  const active = expiresMs > now;
  return {
    active,
    plan: ent.plan,
    expiresAt: ent.expiresAt,
    daysLeft: Math.max(0, Math.ceil((expiresMs - now) / 86400000)),
    source: ent.source || 'license',
  };
}

export function escapeHtml(input) {
  return String(input ?? '').replace(/[&<>"']/g, (c) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  }[c]));
}

export function maskKey(key) {
  const value = String(key || '');
  if (!value) return '';
  if (value.length <= 8) return '••••••';
  return `${value.slice(0, 4)}••••${value.slice(-4)}`;
}

export function formatDate(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function loadJSON(storage, key, fallback) {
  try {
    const raw = storage && storage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
    // 结构校验交给调用方，这里只保证不抛异常
  } catch (err) {
    return fallback;
  }
}

export function saveJSON(storage, key, value) {
  try {
    storage.setItem(key, JSON.stringify(value));
    return true;
  } catch (err) {
    return false; // 隐私模式 / 配额满时静默失败，不阻塞界面
  }
}
