/* 资产工具箱：上下文包编译 + 加密备份导出/恢复
 *
 * 这是"卖点"所在：把本机记忆编译成一份任何模型都能读的 Markdown，
 * 以及把全部数据加密带走。免费版给预览（截断），Pro 给完整包与加密文件。
 * 不依赖 app.js 内部状态，直接读写同一个 localStorage 键，避免两套真相。
 */
import { CONFIG } from './config.js';
import { KEYS, loadJSON, escapeHtml, entitlementState, formatDate } from './core.js';
import { compileContext } from './compiler.js';
import { encryptVault, decryptVault } from './vault.js';
import { loadEntitlement } from './entitlement.js';

const FREE_BUDGET = 240;
const PRO_BUDGET = 1500;
let lastPack = '';

const $ = (id) => document.getElementById(id);

function readState() {
  const g = loadJSON(localStorage, KEYS.game, {}) || {};
  return {
    game: g,
    memories: Array.isArray(g.memories) ? g.memories : [],
    chats: Array.isArray(g.chats) ? g.chats : [],
  };
}

function isPro() {
  return entitlementState(loadEntitlement()).active;
}

function setMsg(text, kind = '') {
  const el = $('tkMsg');
  if (!el) return;
  el.textContent = text;
  el.className = `hint ${kind}`;
}

function download(name, text, type = 'application/json') {
  const blob = new Blob([text], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

function renderShell() {
  const host = $('toolkitCard');
  if (!host) return;
  const pro = isPro();
  host.innerHTML = `
    <div class="card">
      <h2>资产工具箱</h2>
      <p class="hint">${pro
    ? 'Pro 已解锁：完整上下文包 + 加密备份（AES-256-GCM，口令只在你的设备上）。'
    : `免费版可预览前 ${FREE_BUDGET} tokens；<strong>Pro</strong> 解锁完整包（${PRO_BUDGET} tokens 预算）与加密备份导出/恢复。`}</p>
      <div class="row">
        <button class="btn" id="tkCompile">生成上下文包</button>
        <button class="btn ghost" id="tkExport" ${pro ? '' : 'disabled'}>导出加密备份</button>
        <button class="btn ghost" id="tkImport" ${pro ? '' : 'disabled'}>从备份恢复</button>
      </div>
      <input type="password" id="tkPass" placeholder="备份口令（至少 8 位，自己记住）" autocomplete="new-password" />
      <textarea id="tkPreview" readonly rows="10" placeholder="生成后在这里预览，可复制或下载 .md"></textarea>
      <div class="row">
        <button class="btn ghost" id="tkCopy" disabled>复制</button>
        <button class="btn ghost" id="tkDownload" disabled>下载 .md</button>
      </div>
      <p class="hint" id="tkMsg"></p>
      ${pro ? '' : '<p class="hint">想解锁？到「Pro」页用授权码激活，或点上面的购买入口（如已接入）。</p>'}
    </div>`;

  $('tkCompile').addEventListener('click', doCompile);
  $('tkCopy').addEventListener('click', doCopy);
  $('tkDownload').addEventListener('click', doDownloadMd);
  if (pro) {
    $('tkExport').addEventListener('click', doExport);
    $('tkImport').addEventListener('click', doImport);
  }
}

function doCompile() {
  const state = readState();
  const pro = isPro();
  if (!state.memories.length && !state.chats.length) {
    setMsg('还没有记忆或对话，先存一条再来编译。', 'warn');
    return;
  }
  const pack = compileContext({
    memories: state.memories,
    chats: state.chats,
    budgetTokens: pro ? PRO_BUDGET : FREE_BUDGET,
    title: '我的上下文包',
  });
  lastPack = pack.markdown;
  $('tkPreview').value = pack.markdown;
  $('tkCopy').disabled = false;
  $('tkDownload').disabled = false;
  const stats = pack.stats;
  setMsg(`约 ${stats.tokens} tokens · 记忆 ${stats.memories} 条 · 对话 ${stats.chats} 条${stats.truncated ? '（已按预算截断）' : ''}${pro ? '' : ' · 免费版预览，升级后可生成完整包'}`);
  if (typeof window.__agiTrack === 'function') window.__agiTrack('pack_compiled', { tokens: stats.tokens, pro });
}

async function doCopy() {
  try {
    await navigator.clipboard.writeText(lastPack);
    setMsg('已复制。粘到任何模型的开头就行。');
  } catch (err) {
    $('tkPreview').select();
    setMsg('自动复制被浏览器拦了，已全选，按 Ctrl/Cmd+C 复制。', 'warn');
  }
}

function doDownloadMd() {
  download(`agi-context-${today()}.md`, lastPack, 'text/markdown');
  setMsg('已下载 .md。');
}

async function doExport() {
  const pass = $('tkPass').value;
  try {
    const state = readState();
    const blob = await encryptVault({ app: 'agi-engine-v2', exportedAt: new Date().toISOString(), game: state.game }, pass);
    download(`agi-backup-${today()}.agi.json`, JSON.stringify(blob, null, 2));
    setMsg('已导出加密备份。口令丢了就打不开，请自己留好。');
  } catch (err) {
    setMsg(err.message || '导出失败。', 'warn');
  }
}

async function doImport() {
  const pass = $('tkPass').value;
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.json,.agi,.agi.json';
  input.addEventListener('change', async () => {
    const file = input.files && input.files[0];
    if (!file) return;
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      const data = await decryptVault(parsed, pass);
      if (!data || !data.game || !Array.isArray(data.game.memories)) throw new Error('备份内容不完整。');
      const current = readState().game;
      if (current && Array.isArray(current.memories) && current.memories.length) {
        const ok = window.confirm(`当前本机有 ${current.memories.length} 条记忆，恢复会覆盖。继续？`);
        if (!ok) return;
      }
      localStorage.setItem(KEYS.game, JSON.stringify(data.game));
      setMsg('已恢复，正在刷新…');
      setTimeout(() => window.location.reload(), 400);
    } catch (err) {
      setMsg(err.message || '恢复失败。', 'warn');
    }
  });
  input.click();
}

function init() {
  if (!$('toolkitCard')) return;
  renderShell();
  document.addEventListener('click', (e) => {
    const tab = e.target.closest('[data-tab]');
    if (tab && tab.dataset.tab === 'memory') {
      const stamp = isPro();
      if (stamp !== init._pro) {
        init._pro = stamp;
        renderShell();
      }
    }
  });
}

document.addEventListener('DOMContentLoaded', init);
