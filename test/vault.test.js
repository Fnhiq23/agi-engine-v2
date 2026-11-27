import test from 'node:test';
import assert from 'node:assert/strict';
import { encryptVault, decryptVault } from '../js/vault.js';

test('加密备份：往返一致', async () => {
  const data = { app: 'agi-engine-v2', game: { memories: [{ content: '我不喝含糖饮料' }] } };
  const blob = await encryptVault(data, '一句很长的口令 abc123');
  assert.equal(blob.cipher, 'AES-256-GCM');
  assert.ok(blob.payload.length > 20);
  const back = await decryptVault(blob, '一句很长的口令 abc123');
  assert.deepEqual(back, data);
});

test('加密备份：口令错误就打不开（不是可选项）', async () => {
  const blob = await encryptVault({ a: 1 }, 'correct horse battery');
  await assert.rejects(() => decryptVault(blob, 'wrong horse battery'), /口令不正确/);
});

test('加密备份：密文被改动就解开失败', async () => {
  const blob = await encryptVault({ a: 1 }, 'correct horse battery');
  const broken = { ...blob, payload: blob.payload.slice(0, -4) + 'AAAA' };
  await assert.rejects(() => decryptVault(broken, 'correct horse battery'), /口令不正确|损坏/);
});

test('加密备份：口令太短直接拒绝', async () => {
  await assert.rejects(() => encryptVault({ a: 1 }, '123'), /至少 8 位/);
});
