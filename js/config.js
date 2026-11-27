/* 运行时配置：改这里即可接入真实收款 / 授权 / 埋点。
 * 留空 = 该能力自动降级为"未开通"，界面不会出现假按钮。
 */
export const CONFIG = {
  productId: 'agi-engine-pro',

  // 收款：Lemon Squeezy / Paddle / Stripe Payment Link 均可，必须带 license 交付
  checkoutUrl: '',
  checkoutUrlAnnual: '',

  // 授权校验服务（见 server/license-worker.js）
  licenseApi: '',

  // 埋点上报地址（留空 = 只在本机统计，不上报任何数据）
  analyticsEndpoint: '',

  // 免费额度
  freeMemoryLimit: 10,
  freeDailyMessages: 20,

  // 展示用价格（以 checkout 页实际价格为准）
  priceMonthly: 15,
  priceAnnual: 100,

  repoUrl: 'https://github.com/Fnhiq23/agi-engine-v2',
};
