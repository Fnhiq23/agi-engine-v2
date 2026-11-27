import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  todayKey, dayDiff, nextStreak, canClaimDaily, levelFromXp,
  quotaFor, consumeQuota, entitlementState, escapeHtml, maskKey,
} from '../js/core.js';

test('todayKey 使用本地日期，格式固定', () => {
  assert.equal(todayKey(new Date(2026, 10, 27)), '2026-11-27');
  assert.equal(todayKey(new Date(2026, 0, 5)), '2026-01-05');
  assert.equal(dayDiff('2026-11-26', '2026-11-27'), 1);
});

test('连续签到：同日不重复计数，隔天 +1，断签归 1', () => {
  const first = nextStreak({ streak: 0, lastActive: null }, '2026-11-27');
  assert.equal(first.streak, 1);
  assert.equal(first.isNewDay, true);

  const sameDay = nextStreak({ streak: 4, lastActive: '2026-11-27' }, '2026-11-27');
  assert.equal(sameDay.streak, 4);
  assert.equal(sameDay.isNewDay, false);

  const next = nextStreak({ streak: 4, lastActive: '2026-11-26' }, '2026-11-27');
  assert.equal(next.streak, 5);

  const broken = nextStreak({ streak: 9, lastActive: '2026-11-20' }, '2026-11-27');
  assert.equal(broken.streak, 1);
});

test('每日奖励同一天只能领一次', () => {
  assert.equal(canClaimDaily(null, '2026-11-27'), true);
  assert.equal(canClaimDaily('2026-11-26', '2026-11-27'), true);
  assert.equal(canClaimDaily('2026-11-27', '2026-11-27'), false);
});

test('等级换算边界', () => {
  assert.deepEqual(
    { level: levelFromXp(0).level, next: levelFromXp(0).xpForNext },
    { level: 1, next: 100 },
  );
  assert.equal(levelFromXp(99).level, 1);
  assert.equal(levelFromXp(100).level, 2);
  assert.equal(levelFromXp(250).level, 3);
  assert.ok(levelFromXp(100).progress === 0);
});

test('每日额度跳天归零，命中上限后阻断', () => {
  const fresh = quotaFor({ date: '2026-11-26', used: 18 }, '2026-11-27', 20);
  assert.equal(fresh.used, 0);
  assert.equal(fresh.remaining, 20);
  assert.equal(fresh.blocked, false);

  const today = quotaFor({ date: '2026-11-27', used: 19 }, '2026-11-27', 20);
  assert.equal(today.remaining, 1);
  const after = consumeQuota(today);
  assert.equal(after.used, 20);
  assert.equal(after.blocked, true);
  assert.equal(after.remaining, 0);
});

test('授权状态：无到期时间视为无效，过期即失效', () => {
  const none = entitlementState(null);
  assert.equal(none.active, false);

  const expired = entitlementState({ plan: 'pro', expiresAt: '2026-10-01T00:00:00Z' }, Date.parse('2026-11-27T00:00:00Z'));
  assert.equal(expired.active, false);
  assert.equal(expired.daysLeft, 0);

  const active = entitlementState({ plan: 'pro', expiresAt: '2027-01-01T00:00:00Z' }, Date.parse('2026-11-27T00:00:00Z'));
  assert.equal(active.active, true);
  assert.ok(active.daysLeft > 30);

  const noExpiry = entitlementState({ plan: 'pro' }, Date.now());
  assert.equal(noExpiry.active, false);
});

test('转义覆盖五种危险字符', () => {
  assert.equal(escapeHtml(`<script>"x"&'y'</script>`), '&lt;script&gt;&quot;x&quot;&amp;&#39;y&#39;&lt;/script&gt;');
  assert.equal(escapeHtml(null), '');
});

test('Key 掩码不泄露完整内容', () => {
  assert.equal(maskKey(''), '');
  assert.equal(maskKey('sk-abc'), '••••••');
  const masked = maskKey('sk-1234567890abcdef');
  assert.ok(masked.startsWith('sk-1'));
  assert.ok(masked.endsWith('cdef'));
  assert.ok(!masked.includes('....'));
});
