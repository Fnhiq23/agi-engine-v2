/* AGI Engine v2 — 应用层：状态、渲染、交互
 * 约束：无内联事件、无假数据、无假支付；所有动态内容经 escapeHtml。
 */
import { CONFIG } from './config.js';
import {
  KEYS, todayKey, nextStreak, canClaimDaily, levelFromXp, quotaFor, consumeQuota,
  entitlementState, escapeHtml, formatDate, loadJSON, saveJSON,
} from './core.js';
import { LLM, PRESETS } from './llm.js';
import { loadEntitlement, verifyLicenseKey, clearEntitlement } from './entitlement.js';

const DEFAULT_GAME = {
  createdAt: null,
  totalXp: 0,
  streak: 0,
  lastActive: null,
  lastClaim: null,
  memories: [],
  chats: [],
  quota: { date: null, used: 0 },
  achievements: {},
  onboarded: false,
};

const ACHIEVEMENTS = [
  { id: 'mem1', icon: '🧠', title: '第一条记忆', desc: '保存 1 条记忆', xp: 30, check: (g) => g.memories.length >= 1 },
  { id: 'mem5', icon: '💾', title: '记忆库成型', desc: '保存 5 条记忆', xp: 50, check: (g) => g.memories.length >= 5 },
  { id: 'chat1', icon: '💬', title: '第一次对话', desc: '完成 1 轮对话', xp: 20, check: (g) => g.chats.length >= 2 },
  { id: 'chat20', icon: '🗂️', title: '常用常新', desc: '累计 20 轮对话', xp: 60, check: (g) => g.chats.length >= 40 },
  { id: 'streak3', icon: '🔥', title: '三天不断', desc: '连续签到 3 天', xp: 30, check: (g) => g.streak >= 3 },
  { id: 'streak7', icon: '⚡', title: '一周不断', desc: '连续签到 7 天', xp: 100, check: (g) => g.streak >= 7 },
  { id: 'lv3', icon: '⭐', title: '等级 3', desc: '累计 XP 达到 Lv.3', xp: 40, check: (g) => levelFromXp(g.totalXp).level >= 3 },
  { id: 'pro', icon: '👑', title: 'Pro 会员', desc: '激活有效授权', xp: 100, check: () => isPro() },
];

let game = { ...DEFAULT_GAME };

/* ── 存储 ── */
function save() {
  saveJSON(localStorage, KEYS.game, game);
}

function loadGame() {
  const stored = loadJSON(localStorage, KEYS.game, {}) || {};
  game = { ...DEFAULT_GAME, ...stored };
  if (!Array.isArray(game.memories)) game.memories = [];
  if (!Array.isArray(game.chats)) game.chats = [];
  if (!game.quota || typeof game.quota !== 'object') game.quota = { date: null, used: 0 };
  if (!game.achievements || typeof game.achievements !== 'object') game.achievements = {};
  game.chats = game.chats.slice(-100);
  game.memories = game.memories.slice(-200);
}

/* ── 派生状态 ── */
function isPro() {
  return entitlementState(loadEntitlement()).active;
}

function getQuota() {
  const q = quotaFor(game.quota, todayKey(), CONFIG.freeDailyMessages);
  if (game.quota.date !== q.date) {
    game.quota = { date: q.date, used: q.used };
    save();
  }
  return q;
}

function addXp(amount) {
  game.totalXp += amount;
  save();
  renderHeader();
  renderHome();
  renderAchievements();
}

function applyDailyStreak() {
  const next = nextStreak({ streak: game.streak, lastActive: game.lastActive });
  game.streak = next.streak;
  game.lastActive = next.lastActive;
  save();
}

/* ── 埋点：默认只在本机计数，配置了 endpoint 才上报，且不发送任何记忆/对话内容 ── */
function track(event, props = {}) {
  const events = loadJSON(localStorage, 'agi_v2_events', {}) || {};
  events[event] = (events[event] || 0) + 1;
  saveJSON(localStorage, 'agi_v2_events', events);

  if (!CONFIG.analyticsEndpoint) return;
  try {
    fetch(CONFIG.analyticsEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ event, props, ts: new Date().toISOString() }),
      keepalive: true,
    }).catch(() => {});
  } catch (err) {
    /* 埋点失败不影响任何主流程 */
  }
}

/* ── 渲染：通用 ── */
const $ = (id) => document.getElementById(id);

function renderHeader() {
  const lv = levelFromXp(game.totalXp);
  $('lvBadge').textContent = `Lv.${lv.level}`;
  $('streakBadge').textContent = `🔥 ${game.streak} 天`;
  $('proBadge').textContent = isPro() ? '👑 Pro' : '免费版';
  $('proBadge').classList.toggle('on', isPro());
}

let toastTimer = null;
function toast(message) {
  const el = $('toast');
  el.textContent = message;
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), 2400);
}

/* ── 渲染：首页 ── */
function renderHome() {
  const lv = levelFromXp(game.totalXp);
  const q = getQuota();
  $('statMemories').textContent = game.memories.length;
  $('statChats').textContent = Math.floor(game.chats.length / 2);
  $('statLevel').textContent = lv.level;
  $('statStreak').textContent = game.streak;
  $('xpBar').style.width = `${Math.round(lv.progress * 100)}%`;
  $('xpText').textContent = `${lv.xpIntoLevel} / ${lv.xpForNext} XP`;

  const claimable = canClaimDaily(game.lastClaim);
  const claimBtn = $('claimBtn');
  claimBtn.disabled = !claimable;
  claimBtn.textContent = claimable ? '领取今日奖励' : '今天已领取';
  $('claimHint').textContent = claimable
    ? `连续 ${game.streak} 天 · 奖励 ${10 + Math.min(game.streak, 7) * 5} XP`
    : '明天再来，连击会继续累计。';

  $('quotaText').innerHTML = isPro()
    ? 'Pro 会员：对话不限条数。'
    : `今日剩余 <strong>${q.remaining}</strong> / ${q.limit} 条（每天 0 点重置）。`;

  const setupDone = game.memories.length > 0 && game.chats.length > 0 && LLM.status().hasKey;
  $('setupCard').hidden = setupDone;
}

/* ── 渲染：对话 ── */
function renderChat() {
  const log = $('chatLog');
  if (!game.chats.length) {
    log.innerHTML = '<p class="empty">还没有对话。连接你的模型后，在这里开始第一轮。</p>';
  } else {
    log.innerHTML = game.chats.map((m) => `
      <div class="bubble ${m.role === 'user' ? 'me' : 'ai'}">${escapeHtml(m.content)}</div>
    `).join('');
  }
  log.scrollTop = log.scrollHeight;

  const st = LLM.status();
  $('chatHint').textContent = st.hasKey
    ? `模型：${st.provider} · ${st.model}`
    : '尚未连接模型。请到「设置」填入自己的 API Key，或启动本地 Ollama。';
}

/* ── 渲染：记忆 ── */
function renderMemory() {
  const list = $('memoryList');
  if (!game.memories.length) {
    list.innerHTML = '<p class="empty">还没有记忆。写一条，之后对话会带上它（只在本机）。</p>';
  } else {
    list.innerHTML = game.memories.slice().reverse().map((m) => `
      <div class="mem">
        <div class="mem-body">${escapeHtml(m.content)}</div>
        <div class="mem-meta">${formatDate(m.createdAt)} · 本机存储 <button class="link danger" data-action="delMem" data-id="${m.id}">删除</button></div>
      </div>
    `).join('');
  }
  $('memoryHint').textContent = isPro()
    ? `已存 ${game.memories.length} 条 · Pro 不限条数`
    : `已存 ${game.memories.length} / ${CONFIG.freeMemoryLimit} 条（免费版上限）`;
}

/* ── 渲染：成就 ── */
function renderAchievements() {
  $('achvList').innerHTML = ACHIEVEMENTS.map((a) => {
    const got = Boolean(game.achievements[a.id]);
    return `
      <div class="achv ${got ? 'got' : ''}">
        <span class="achv-icon">${got ? a.icon : '🔒'}</span>
        <div>
          <div class="achv-title">${a.title}</div>
          <div class="achv-desc">${a.desc} · +${a.xp} XP</div>
        </div>
      </div>`;
  }).join('');
}

/* ── 渲染：Pro ── */
function renderPro() {
  const ent = entitlementState(loadEntitlement());
  const box = $('proStatus');

  if (ent.active) {
    box.innerHTML = `
      <div class="badge on">👑 Pro 已激活</div>
      <p class="muted">套餐 ${escapeHtml(ent.plan)} · 到期 ${formatDate(ent.expiresAt)}（还剩 ${ent.daysLeft} 天）</p>
      <p class="muted small">授权码只保存在这台设备；换设备需重新激活。</p>
      <button class="btn ghost" data-action="clearEnt">解除本机授权</button>`;
    $('planCards').hidden = true;
  } else {
    box.innerHTML = `
      <div class="badge">免费版</div>
      <p class="muted">专业版解锁：不限记忆条数、不限对话、优先模型建议。所有数据仍然只在本机。</p>`;
    $('planCards').hidden = false;
  }

  const configured = Boolean(CONFIG.checkoutUrl);
  const note = $('checkoutNote');
  if (configured) {
    note.textContent = '付款完成后，会由发码服务向你的邮箱发送授权码，在本页激活。';
    $('buyMonthly').disabled = false;
    $('buyAnnual').disabled = false;
    $('buyMonthly').textContent = `订阅月度 $${CONFIG.priceMonthly}`;
    $('buyAnnual').textContent = `订阅年度 $${CONFIG.priceAnnual}`;
  } else {
    note.textContent = '购买通道尚未接入（config.js 里 checkoutUrl 为空）。当前无法购买，也不会出现假按钮。';
    $('buyMonthly').disabled = true;
    $('buyAnnual').disabled = true;
    $('buyMonthly').textContent = '购买通道未接入';
    $('buyAnnual').textContent = '购买通道未接入';
  }
}

/* ── 渲染：设置 ── */
function renderSettings() {
  const st = LLM.status();
  const sel = $('provider');
  sel.innerHTML = Object.entries(PRESETS).map(([id, p]) =>
    `<option value="${id}" ${id === st.provider ? 'selected' : ''}>${escapeHtml(p.label)}</option>`).join('');
  $('model').value = st.model || '';
  $('baseUrl').value = st.baseUrl && st.baseUrl !== PRESETS[st.provider]?.baseUrl ? st.baseUrl : '';
  $('apiKey').value = '';
  $('apiKey').placeholder = st.hasKey ? `已保存 ${st.maskedKey}（留空保持不变）` : 'sk-...';
  $('persist').checked = st.persist;
  $('llmState').textContent = st.hasKey || !st.requiresKey
    ? `已连接：${st.provider} · ${st.model}`
    : '未连接（免费体验不含模型额度）';
  $('llmStats').innerHTML = `
    <div>调用次数：<strong>${st.usage.calls}</strong></div>
    <div>累计 tokens：<strong>${st.usage.tokens}</strong></div>
    <div>最近调用：${st.usage.lastAt ? formatDate(st.usage.lastAt) : '—'}</div>`;
  if (st.hasKey) {
    $('llmStats').insertAdjacentHTML('beforeend',
      '<button class="link danger" data-action="clearKey">清除本机 Key</button>');
  }
}

/* ── 渲染：全部 ── */
function renderAll() {
  renderHeader();
  renderHome();
  renderChat();
  renderMemory();
  renderAchievements();
  renderPro();
  renderSettings();
}

/* ── 视图切换 ── */
function showLanding() {
  $('view-landing').hidden = false;
  $('view-app').hidden = true;
}

function showApp() {
  $('view-landing').hidden = true;
  $('view-app').hidden = false;
  renderAll();
  setTab('home');
}

const TABS = ['home', 'chat', 'memory', 'achv', 'pro', 'settings'];
function setTab(tab) {
  if (!TABS.includes(tab)) tab = 'home';
  TABS.forEach((t) => {
    $(`panel-${t}`).classList.toggle('active', t === tab);
  });
  document.querySelectorAll('[data-tab]').forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.tab === tab);
  });
  if (tab === 'settings') renderSettings();
  if (tab === 'pro') renderPro();
}

/* ── 业务动作 ── */
function addMemory(text) {
  if (!isPro() && game.memories.length >= CONFIG.freeMemoryLimit) {
    toast(`免费版最多 ${CONFIG.freeMemoryLimit} 条记忆，可删除旧条目或升级 Pro。`);
    return false;
  }
  game.memories.push({ id: String(Date.now()) + Math.random().toString(36).slice(2, 6), content: text, createdAt: new Date().toISOString() });
  save();
  addXp(10);
  return true;
}

function deleteMemory(id) {
  const before = game.memories.length;
  game.memories = game.memories.filter((m) => m.id !== id);
  if (game.memories.length !== before) {
    save();
    renderMemory();
    renderHome();
  }
}

function claimDaily() {
  if (!canClaimDaily(game.lastClaim)) return;
  const xp = 10 + Math.min(game.streak, 7) * 5;
  game.lastClaim = todayKey();
  save();
  addXp(xp);
  renderHome();
  toast(`+${xp} XP 已到账`);
  track('daily_claim');
}

function buildSystemPrompt() {
  const base = '你是一个运行在用户浏览器里的个人助理。你只能看到用户主动保存在本机的记忆，没有其他数据来源。回答要简洁、具体、诚实；不确定就说不确定。';
  const mems = game.memories.slice(-8).map((m) => `- ${m.content}`).join('\n');
  return mems ? `${base}\n\n用户在本机保存的记忆：\n${mems}` : base;
}

async function sendChat(text) {
  const st = LLM.status();
  const quota = getQuota();

  if (!isPro() && quota.blocked) {
    toast('今天的免费额度用完了，明天 0 点重置。');
    return;
  }
  if (st.requiresKey && !st.hasKey) {
    toast('还没有连接模型：到「设置」填入自己的 API Key，或用本地 Ollama。');
    return;
  }

  game.chats.push({ role: 'user', content: text });
  game.chats = game.chats.slice(-100);
  if (!isPro()) {
    const next = consumeQuota(quota);
    game.quota = { date: next.date, used: next.used };
  }
  save();
  addXp(5);
  renderChat();
  renderHome();

  $('chatHint').textContent = '正在生成…';
  const history = game.chats.slice(-10).map((m) => ({ role: m.role, content: m.content }));
  const res = await LLM.chat([{ role: 'system', content: buildSystemPrompt() }, ...history]);

  if (res.error) {
    $('chatHint').textContent = res.message || '调用失败。';
    toast(res.message || '调用失败');
    track('llm_error', { code: res.error });
    return;
  }

  game.chats.push({ role: 'assistant', content: res.content });
  game.chats = game.chats.slice(-100);
  save();
  renderChat();
  renderHome();
  renderAchievements();
  track('llm_ok');
}

function checkAchievements() {
  let gained = 0;
  ACHIEVEMENTS.forEach((a) => {
    if (!game.achievements[a.id] && a.check(game)) {
      game.achievements[a.id] = true;
      game.totalXp += a.xp;
      gained += a.xp;
      toast(`成就解锁：${a.title} +${a.xp} XP`);
    }
  });
  if (gained) {
    save();
    renderHeader();
    renderHome();
    renderAchievements();
  }
}

function buyPlan(period) {
  const url = period === 'annual' ? (CONFIG.checkoutUrlAnnual || CONFIG.checkoutUrl) : CONFIG.checkoutUrl;
  if (!url) {
    toast('购买通道未接入。');
    return;
  }
  window.open(url, '_blank', 'noopener');
  track('checkout_open', { period });
}

/* ── 事件绑定 ── */
function bind() {
  $('enterBtn').addEventListener('click', () => {
    game.onboarded = true;
    save();
    showApp();
    track('app_open');
  });

  $('view-app').addEventListener('click', (e) => {
    const btn = e.target.closest('[data-action]');
    if (btn) {
      const action = btn.dataset.action;
      if (action === 'delMem') deleteMemory(btn.dataset.id);
      if (action === 'clearEnt') {
        clearEntitlement();
        renderPro();
        toast('已解除本机授权');
      }
      if (action === 'clearKey') {
        LLM.clear();
        renderSettings();
        renderChat();
        renderHome();
        toast('已清除本机 API Key');
      }
    }
    const tabBtn = e.target.closest('[data-tab]');
    if (tabBtn) setTab(tabBtn.dataset.tab);
  });

  $('claimBtn').addEventListener('click', claimDaily);
  $('buyMonthly').addEventListener('click', () => buyPlan('monthly'));
  $('buyAnnual').addEventListener('click', () => buyPlan('annual'));

  $('memoryForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const input = $('memoryInput');
    const text = input.value.trim();
    if (!text) return;
    if (addMemory(text)) {
      input.value = '';
      renderMemory();
      renderHome();
      checkAchievements();
      track('memory_add');
    }
  });

  $('chatForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const input = $('chatInput');
    const text = input.value.trim();
    if (!text) return;
    input.value = '';
    sendChat(text);
  });

  $('licenseForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const key = $('licenseInput').value.trim();
    const msg = $('licenseMsg');
    msg.textContent = '校验中…';
    const res = await verifyLicenseKey(key);
    if (res.ok) {
      msg.textContent = `已激活，有效期至 ${formatDate(res.entitlement.expiresAt)}`;
      $('licenseInput').value = '';
      renderPro();
      renderHeader();
      checkAchievements();
      track('license_activated');
    } else {
      msg.textContent = res.message;
    }
  });

  $('provider').addEventListener('change', () => {
    const preset = LLM.preset($('provider').value);
    $('model').value = preset.defaultModel || '';
    $('baseUrl').value = '';
    $('baseUrl').placeholder = preset.baseUrl || 'https://api.example.com/v1';
  });

  $('saveLlm').addEventListener('click', () => {
    const provider = $('provider').value;
    const preset = LLM.preset(provider);
    const typedKey = $('apiKey').value.trim();
    const existing = LLM.status().hasKey;
    const key = typedKey || (existing ? sessionStorage.getItem(KEYS.llmKey) || localStorage.getItem(KEYS.llmKey) || '' : '');
    if (preset.requiresKey && !key) {
      $('llmState').textContent = '请先填入 API Key。';
      return;
    }
    LLM.configure({
      provider,
      apiKey: key,
      model: $('model').value.trim() || preset.defaultModel,
      baseUrl: $('baseUrl').value.trim(),
      persist: $('persist').checked,
    });
    renderSettings();
    renderChat();
    renderHome();
    $('llmState').textContent = '已保存。建议点「测试连接」确认可用。';
    track('llm_configured', { provider });
  });

  $('testLlm').addEventListener('click', async () => {
    $('llmState').textContent = '测试中…';
    const res = await LLM.chat([{ role: 'user', content: '只回复四个字：连接成功。' }], { maxTokens: 32 });
    if (res.error) {
      $('llmState').textContent = `失败：${res.message}`;
    } else {
      $('llmState').textContent = `成功：${res.content.slice(0, 40)}`;
      renderSettings();
    }
  });
}

/* ── 启动 ── */
function init() {
  loadGame();
  applyDailyStreak();
  bind();
  if (game.onboarded) showApp();
  else showLanding();
  track('app_open');
}

document.addEventListener('DOMContentLoaded', init);
