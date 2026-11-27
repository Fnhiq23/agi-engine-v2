/* 加密备份：AES-256-GCM + PBKDF2（Web Crypto，本地运算，无服务器）
 *
 * 口令不上传、不落盘；密文文件可以丢到任何网盘 / U 盘 / Git 私有库。
 * 这不是营销词：真的加密，口令丢了就真的打不开。
 */

const encoder = new TextEncoder();
const decoder = new TextDecoder();
const ITERATIONS = 210000;
const MAGIC = 'AGI-ENGINE-VAULT';
const VERSION = 1;

function toB64(bytes) {
  let binary = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode.apply(null, bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

function fromB64(str) {
  const binary = atob(str);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

async function deriveKey(passphrase, salt) {
  const material = await crypto.subtle.importKey('raw', encoder.encode(passphrase), 'PBKDF2', false, ['deriveKey']);
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations: ITERATIONS, hash: 'SHA-256' },
    material,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  );
}

export function assertPassphrase(passphrase) {
  const value = String(passphrase || '');
  if (value.length < 8) throw new Error('口令至少 8 位（建议一整句话，好记且长）。');
  return value;
}

export async function encryptVault(data, passphrase) {
  const pass = assertPassphrase(passphrase);
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveKey(pass, salt);
  const plaintext = encoder.encode(JSON.stringify(data));
  const cipher = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, plaintext);
  return {
    magic: MAGIC,
    v: VERSION,
    kdf: 'PBKDF2-SHA256',
    iterations: ITERATIONS,
    cipher: 'AES-256-GCM',
    createdAt: new Date().toISOString(),
    salt: toB64(salt),
    iv: toB64(iv),
    payload: toB64(new Uint8Array(cipher)),
  };
}

export async function decryptVault(blob, passphrase) {
  if (!blob || blob.magic !== MAGIC || blob.v !== VERSION) throw new Error('这不是 AGI Engine 的备份文件。');
  const pass = String(passphrase || '');
  if (!pass) throw new Error('请输入备份口令。');
  const salt = fromB64(blob.salt);
  const iv = fromB64(blob.iv);
  const key = await deriveKey(pass, salt);
  let plaintext;
  try {
    plaintext = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, fromB64(blob.payload));
  } catch (err) {
    throw new Error('口令不正确，或文件已损坏。');
  }
  return JSON.parse(decoder.decode(plaintext));
}
