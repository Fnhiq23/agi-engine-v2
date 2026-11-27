/* 运行时配置：改这里即可接入真实收款 / 授权 / 埋点。
 * 留空 = 该能力自动降级为"未开通"，界面不会出现假按钮。
 *
 * 定价口径（v2 起改为买断，不再做月付）：
 * 本地工具没有持续的服务成本，按月收费既不合理也卖不动。
 * 一次性买断 + 可选年度支持，才配得上"零基础设施"的产品形态。
 */
export const CONFIG = {
  productId: 'agi-engine-pro',

  // 收款：Lemon Squeezy / Paddle / Gumroad / 支付宝当面付 均可
  // 关键要求：付款后必须能"看到订单号 → 人工/自动发一张签名授权码"
  checkoutUrl: '',
  checkoutUrlAnnual: '',

  // 可选后端授权服务（见 server/license-worker.js）。默认离线校验，不用它。
  licenseApi: '',

  // 埋点上报地址（留空 = 只在本机统计，不上报任何数据）
  analyticsEndpoint: '',

  // 免费额度
  freeMemoryLimit: 10,
  freeDailyMessages: 20,

  // 价格（仅用于界面展示，以 checkout 页实际价格为准）
  priceOneTime: 19,      // 首发价（前 100 份）
  priceRegular: 39,      // 标准价

  repoUrl: 'https://github.com/Fnhiq23/agi-engine-v2',
};
