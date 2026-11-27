/* 授权公钥（仅公钥，可公开）
 *
 * 已于 2026-11-27 轮换为正式密钥（私钥在 keys/private.jwk，仅本机、已 gitignore）。
 * 轮换原因：此前的演示私钥曾随仓库公开，任何人都能自行签票。
 *
 * 再轮换：node tools/license.mjs keygen → 把打印的那一行公钥贴到这里 → npm run build
 * 注意：轮换后旧授权码全部失效，已售出的码需要重发。
 */
export const LICENSE_PUBLIC_JWK = {
  kty: 'EC',
  x: '2L0Mh_pJ10kloauYPdxi-fwMnFQsKNsudnABO7gKF-Y',
  y: 'NXsuWTuxGGPp-uSAf2fEkp16ecBG5WI9ozTxwI-CaR4',
  crv: 'P-256',
};
