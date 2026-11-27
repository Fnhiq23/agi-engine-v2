import test from 'node:test';
import assert from 'node:assert/strict';
import { estimateTokens, dedupeItems, compileContext, topKeywords } from '../js/compiler.js';

test('estimateTokens：中文按字、英文按 4 字母', () => {
  assert.ok(estimateTokens('你好世界') >= 4);
  assert.ok(estimateTokens('abcdefgh') >= 2);
  assert.equal(estimateTokens(''), 0);
});

test('dedupeItems：规范化去重，并丢掉被包含的短条目', () => {
  const items = [
    { content: '我不喝含糖饮料', at: '2026-01-01' },
    { content: '  我不喝含糖饮料 ', at: '2026-02-01' },
    { content: '我不喝含糖饮料，尤其是可乐', at: '2026-03-01' },
  ];
  const out = dedupeItems(items);
  assert.equal(out.length, 1);
  assert.equal(out[0].content, '我不喝含糖饮料，尤其是可乐');
});

test('compileContext：同样的输入得到同样的输出（可 diff）', () => {
  const memories = [{ content: '我叫小林，在南宁做产品', createdAt: '2026-11-01T00:00:00Z' }];
  const chats = [{ role: 'user', content: '帮我写一个发布文案' }, { role: 'assistant', content: '好的' }];
  const a = compileContext({ memories, chats, now: new Date('2026-11-27T00:00:00Z') });
  const b = compileContext({ memories, chats, now: new Date('2026-11-27T00:00:00Z') });
  assert.equal(a.markdown, b.markdown);
  assert.match(a.markdown, /# 我的上下文包/);
  assert.match(a.markdown, /关于我/);
});

test('compileContext：不会超出 token 预算，并如实标记截断', () => {
  const memories = Array.from({ length: 80 }, (_, i) => ({ content: `第 ${i} 条记忆：这是一段用来占预算的比较长的中文内容，用来验证截断逻辑是否可靠。` }));
  const pack = compileContext({ memories, budgetTokens: 120 });
  assert.ok(pack.stats.tokens <= 130, `tokens=${pack.stats.tokens}`);
  assert.equal(pack.stats.truncated, true);
});

test('compileContext：空数据也给一份可用的空包，而不是报错', () => {
  const pack = compileContext({});
  assert.match(pack.markdown, /还没有记录/);
  assert.equal(pack.stats.memories, 0);
});

test('topKeywords：只统计用户发言，且至少出现两次', () => {
  const chats = [
    { role: 'user', content: '发布文案 发布文案 帮我写发布文案' },
    { role: 'assistant', content: '发布文案' },
  ];
  const kws = topKeywords(chats);
  assert.ok(kws.includes('发布文案') || kws.some((k) => k.includes('发布')));
});
