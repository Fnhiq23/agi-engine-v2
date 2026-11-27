/* 上下文包编译器：把散落的记忆与对话，压成一份任何模型都能读的 Markdown。
 *
 * 设计约束：
 * - 纯函数、可单测、不联网、不调模型（离线也成立，不花一分钱）
 * - 结果确定：同样的输入 → 同样的输出，可 diff、可版本化
 * - 有 token 预算：超了就截断，并如实标记 truncated
 */

const CJK_RE = /[\u3400-\u9fff\u3040-\u30ff\uac00-\ud7af]/;

export function estimateTokens(text) {
  const str = String(text || '');
  let cjk = 0;
  let other = 0;
  for (const ch of str) {
    if (CJK_RE.test(ch)) cjk += 1;
    else other += 1;
  }
  return cjk + Math.ceil(other / 4);
}

export function normalizeText(text) {
  return String(text || '').replace(/\s+/g, ' ').trim();
}

/** 去重：规范化后完全相同的只留最新一条；一条完全包含另一条时留长的 */
export function dedupeItems(items) {
  const seen = new Map();
  for (const raw of items) {
    const content = normalizeText(typeof raw === 'string' ? raw : raw && raw.content);
    if (!content) continue;
    const key = content.toLowerCase();
    const item = typeof raw === 'string' ? { content, at: null } : { ...raw, content };
    const prev = seen.get(key);
    if (!prev) {
      seen.set(key, item);
      continue;
    }
    const prevAt = prev.at ? Date.parse(prev.at) : 0;
    const nextAt = item.at ? Date.parse(item.at) : 0;
    if (nextAt >= prevAt) seen.set(key, item);
  }
  const all = [...seen.values()];
  // 一条完全包含另一条时只留长的：避免"我不喝含糖饮料"和"我不喝含糖饮料，尤其是可乐"重复占预算
  return all.filter((item) => !all.some((other) => (
    other !== item
    && other.content.length > item.content.length
    && other.content.toLowerCase().includes(item.content.toLowerCase())
  )));
}

const STOPWORDS = new Set([
  'the', 'and', 'for', 'with', 'that', 'this', 'you', 'your', 'are', 'was', 'have', 'has', 'not', 'but', 'from', 'what', 'how', 'why',
  '我', '你', '他', '她', '它', '的', '了', '是', '在', '有', '和', '就', '都', '要', '也', '这', '那', '不', '吗', '呢', '吧', '啊',
  '一个', '什么', '怎么', '可以', '我们', '他们', '自己', '因为', '所以', '但是', '如果', '还是', '这个', '那个', '需要', '帮我', '现在',
]);

const STOP_CHARS = new Set('的了是在有和就都也要这那不就吗呢吧啊个我你他她它很把被给对从到与及或但而且还只再又更最'.split(''));

export function topKeywords(chats, limit = 8) {
  const counts = new Map();
  const bump = (word) => counts.set(word, (counts.get(word) || 0) + 1);

  for (const chat of chats) {
    if (!chat || chat.role !== 'user') continue; // 只统计用户自己关注的东西，不把模型的措辞当成偏好
    const text = normalizeText(chat.content || chat.text);
    if (!text) continue;

    for (const word of text.toLowerCase().match(/[a-z][a-z0-9+#.-]{2,}/g) || []) {
      if (!STOPWORDS.has(word)) bump(word);
    }
    // 中文按 2/4 字窗口统计：单字太泛，整句太长，词窗口最接近"这个人反复在提的那件事"
    for (const run of text.match(/[\u3400-\u9fff]{2,}/g) || []) {
      for (let size = 2; size <= 4; size += 2) {
        for (let i = 0; i + size <= run.length; i += 1) {
          const gram = run.slice(i, i + size);
          if (STOP_CHARS.has(gram[0]) || STOP_CHARS.has(gram[gram.length - 1])) continue;
          if (STOPWORDS.has(gram)) continue;
          bump(gram);
        }
      }
    }
  }

  // 去掉被同等或更高频长词包含的碎片：`度公` 这种切窗噪声不该出现在成品里
  const grams = [...counts.keys()];
  const meaningful = grams.filter((gram) => !grams.some((other) => (
    other !== gram && other.length > gram.length && other.includes(gram) && counts.get(other) >= counts.get(gram)
  )));

  return meaningful
    .filter((gram) => counts.get(gram) >= 2)
    .sort((a, b) => counts.get(b) - counts.get(a) || b.length - a.length || a.localeCompare(b))
    .slice(0, limit);
}

const PREFERENCE_RE = /喜欢|偏好|习惯|讨厌|反感|忌口|过敏|不吃|不喝|只喝|爱喝|常说|必须|不愿意|一般不|受不了/;
const GOAL_RE = /想要|计划|目标|打算|准备|正在学|希望|要做|上线|发布|赚钱|减肥|考试|面试|搬家|创业/;

function bucketOf(memory) {
  const text = memory.content;
  if (PREFERENCE_RE.test(text)) return 'pref';
  if (GOAL_RE.test(text)) return 'goal';
  return 'fact';
}

export function compileContext({ memories = [], chats = [], budgetTokens = 1200, now = new Date(), title = '我的上下文包', source = 'AGI Engine' } = {}) {
  const mems = dedupeItems(memories);
  const chatList = chats.filter((c) => c && (c.content || c.text));
  const facts = [];
  const prefs = [];
  const goals = [];
  for (const mem of mems) {
    const line = `- ${mem.content}`;
    const bucket = bucketOf(mem);
    if (bucket === 'pref') prefs.push(line);
    else if (bucket === 'goal') goals.push(line);
    else facts.push(line);
  }

  const keywords = topKeywords(chatList);
  const dateStr = now instanceof Date ? now.toISOString().slice(0, 10) : String(now).slice(0, 10);

  const header = [
    `# ${title}`,
    '',
    `> 生成于 ${dateStr} · 由 ${source} 在本机生成（无账号、无服务器，数据没有离开这台设备）`,
    `> 来源：记忆 ${mems.length} 条 · 对话 ${chatList.length} 条 · 预算约 ${budgetTokens} tokens`,
    '> 用法：整段粘贴到任意模型对话开头，它就知道这些；也可以随时改、随时删。',
    '',
  ].join('\n');

  const sections = [
    { title: '关于我', lines: facts, empty: '（还没有记录事实类记忆）' },
    { title: '偏好与习惯', lines: prefs, empty: '（还没有记录偏好类记忆）' },
    { title: '目标与计划', lines: goals, empty: '（还没有记录目标类记忆）' },
  ];

  const tail = [];
  if (keywords.length) {
    tail.push('', '## 最近在关注', '', keywords.map((k) => `\`${k}\``).join(' · '), '');
  }
  tail.push('', '<!-- 由 AGI Engine 生成 · MIT 开源 · 你可以把它扔进任何模型 -->');

  let body = '';
  let truncated = false;
  let usedTokens = estimateTokens(header);

  for (const section of sections) {
    const head = `\n## ${section.title}\n\n`;
    if (!section.lines.length) {
      if (usedTokens + estimateTokens(head + section.empty) > budgetTokens) {
        truncated = true;
        break;
      }
      body += head + section.empty + '\n';
      usedTokens += estimateTokens(head + section.empty);
      continue;
    }
    let sectionBody = '';
    for (const line of section.lines) {
      const candidate = `${sectionBody}${line}\n`;
      if (usedTokens + estimateTokens(head) + estimateTokens(candidate) > budgetTokens) {
        truncated = true;
        break;
      }
      sectionBody = candidate;
    }
    if (!sectionBody) break;
    body += head + sectionBody;
    usedTokens += estimateTokens(head + sectionBody);
    if (truncated) break;
  }

  let output = header + body;
  const tailText = tail.join('\n');
  if (usedTokens + estimateTokens(tailText) <= budgetTokens) {
    output += tailText;
    usedTokens += estimateTokens(tailText);
  } else {
    truncated = true;
  }

  return {
    markdown: output,
    stats: {
      memories: mems.length,
      chats: chatList.length,
      tokens: estimateTokens(output),
      budget: budgetTokens,
      truncated,
      keywords,
    },
  };
}
