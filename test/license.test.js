import test from 'node:test';
import assert from 'node:assert/strict';
import { generateKeyPairSync, createPrivateKey, sign } from 'node:crypto';
import { parseLicenseKey, verifySignedKey } from '../js/license.js';

function makeSigner() {
  const { privateKey, publicKey } = generateKeyPairSync('ec', { namedCurve: 'P-256' });
  const privJwk = privateKey.export({ format: 'jwk' });
  const pubJwk = publicKey.export({ format: 'jwk' });
  const issuer = (payload) => {
    const payloadB64u = Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
    const signed = `AGIP1.${payloadB64u}`;
    const sig = sign('sha256', Buffer.from(signed, 'utf8'), {
      key: createPrivateKey({ key: privJwk, format: 'jwk' }),
      dsaEncoding: 'ieee-p1363',
    }).toString('base64url');
    return `${signed}.${sig}`;
  };
  return { pubJwk, issuer };
}

const basePayload = (over = {}) => ({
  v: 1,
  product: 'agi-engine-pro',
  plan: 'pro',
  exp: '2099-01-01T00:00:00.000Z',
  order: 'TEST-1',
  seats: 1,
  iat: '2026-11-27T00:00:00.000Z',
  ...over,
});

test('授权码：合法签名可通过，且返回套餐与到期日', async () => {
  const { pubJwk, issuer } = makeSigner();
  const key = issuer(basePayload());
  const res = await verifySignedKey(key, pubJwk);
  assert.equal(res.ok, true);
  assert.equal(res.plan, 'pro');
  assert.equal(res.orderId, 'TEST-1');
});

test('授权码：改载荷就失效（不能自己给自己续期/发 Pro）', async () => {
  const { pubJwk, issuer } = makeSigner();
  const key = issuer(basePayload({ exp: '2027-01-01T00:00:00.000Z' }));
  const parts = key.split('.');
  const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8'));
  payload.exp = '2099-01-01T00:00:00.000Z'; // 偷偷改到期日
  const forged = `AGIP1.${Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url')}.${parts[2]}`;
  const res = await verifySignedKey(forged, pubJwk);
  assert.equal(res.ok, false);
  assert.equal(res.reason, 'BAD_SIGNATURE');
});

test('授权码：到期即失效', async () => {
  const { pubJwk, issuer } = makeSigner();
  const key = issuer(basePayload({ exp: '2026-01-01T00:00:00.000Z' }));
  const res = await verifySignedKey(key, pubJwk, { now: Date.parse('2026-06-01T00:00:00Z') });
  assert.equal(res.ok, false);
  assert.equal(res.reason, 'EXPIRED');
});

test('授权码：换产品名不能用', async () => {
  const { pubJwk, issuer } = makeSigner();
  const key = issuer(basePayload({ product: 'other-app' }));
  const res = await verifySignedKey(key, pubJwk);
  assert.equal(res.ok, false);
  assert.equal(res.reason, 'WRONG_PRODUCT');
});

test('授权码：格式错误给明确原因，而不是崩', async () => {
  assert.equal(parseLicenseKey('hello'), null);
  assert.equal(parseLicenseKey('AGIP1.!!!.bbb'), null);
  const res = await verifySignedKey('AGIP1.eyJ2IjoxfQ.bbb', null);
  assert.equal(res.ok, false);
  assert.equal(res.reason, 'NO_PUBKEY');
});
