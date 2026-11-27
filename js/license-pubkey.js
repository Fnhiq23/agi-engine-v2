/* 授权公钥（仅公钥，可公开）
 *
 * 当前是【演示密钥】：仓库内 demo/demo-private.jwk 是它的私钥，
 * 仅用于让你立刻体验 Pro 与授权流程，到期 2026-12-31。
 *
 * 正式发售前必须替换：
 *   node tools/license.mjs keygen          # 生成你自己的密钥对（私钥在 keys/，已 gitignore）
 * 把命令打印出来的那一行公钥贴到下面，再删掉 demo/ 目录。
 */
export const LICENSE_PUBLIC_JWK = {
  kty: 'EC',
  x: 'AtvBnoDy84o8nBwepDbxHgwCzvHdZKN8lI2Cs0f0Yr0',
  y: 'y8nBY36rxSYgPAeipZoJUjpvgew3XmaeMP5n9pT8pxw',
  crv: 'P-256',
};
