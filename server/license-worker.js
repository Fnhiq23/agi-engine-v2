/**
 * AGI Engine v2 — 授权码校验 Worker（Cloudflare Workers）
 *
 * POST /  { key: "AGI-XXXX-XXXX-XXXX", product: "agi-engine-pro" }
 * 200 { valid: true, plan: "pro", expiresAt: "2027-01-01T00:00:00Z", orderId: "..." }
 * 200 { valid: false, message: "授权码无效或已过期。" }
 *
 * 环境变量（Settings → Variables）：
 *   SUPABASE_URL          https://xxx.supabase.co
 *   SUPABASE_SERVICE_KEY  service_role key（只在 Worker 侧使用，绝不发给前端）
 *   LICENSE_PEPPER        随机长字符串，用于对授权码做不可逆哈希
 *   ALLOWED_ORIGIN        允许的前端来源，如 https://fnhiq23.github.io
 *
 * 数据库里只存 key 的 SHA-256，不存明文；因此库被拖走也无法直接使用授权码。
 */

const json = (body, status = 200, origin = '*') =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'access-control-allow-origin': origin,
      'access-control-allow-headers': 'content-type',
      'access-control-allow-methods': 'POST, OPTIONS',
      'cache-control': 'no-store',
      vary: 'Origin',
    },
  });

async function sha256Hex(text) {
  const bytes = new TextEncoder().encode(text);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

function normalizeKey(input) {
  return String(input || '').trim().toUpperCase().replace(/\s+/g, '');
}

export default {
  async fetch(request, env) {
    const origin = env.ALLOWED_ORIGIN || '*';

    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: {
          'access-control-allow-origin': origin,
          'access-control-allow-headers': 'content-type',
          'access-control-allow-methods': 'POST, OPTIONS',
        },
      });
    }
    if (request.method !== 'POST') return json({ valid: false, message: 'Method not allowed' }, 405, origin);

    // 简单的按 IP 限速：60 次 / 小时（需要绑定 KV，命名空间 RATE；未绑定则跳过）
    if (env.RATE) {
      const ip = request.headers.get('cf-connecting-ip') || 'unknown';
      const bucket = `rl:${ip}:${new Date().toISOString().slice(0, 13)}`;
      const hits = Number((await env.RATE.get(bucket)) || 0);
      if (hits >= 60) return json({ valid: false, message: '尝试过于频繁，请稍后再试。' }, 429, origin);
      await env.RATE.put(bucket, String(hits + 1), { expirationTtl: 3600 });
    }

    let payload;
    try {
      payload = await request.json();
    } catch (err) {
      return json({ valid: false, message: '请求格式错误。' }, 400, origin);
    }

    const key = normalizeKey(payload?.key);
    if (!key) return json({ valid: false, message: '缺少授权码。' }, 400, origin);

    const product = String(payload?.product || 'agi-engine-pro');
    const keyHash = await sha256Hex(`${env.LICENSE_PEPPER}:${key}`);

    try {
      const url = `${env.SUPABASE_URL}/rest/v1/licenses?select=plan,status,expires_at,order_id&key_hash=eq.${keyHash}&product=eq.${encodeURIComponent(product)}&limit=1`;
      const res = await fetch(url, {
        headers: {
          apikey: env.SUPABASE_SERVICE_KEY,
          Authorization: `Bearer ${env.SUPABASE_SERVICE_KEY}`,
          Accept: 'application/json',
        },
      });

      if (!res.ok) {
        // 不向客户端泄露上游细节
        return json({ valid: false, message: '校验服务暂时不可用，请稍后再试。' }, 200, origin);
      }

      const rows = await res.json();
      const row = Array.isArray(rows) ? rows[0] : null;
      const expiresMs = row ? Date.parse(row.expires_at) : NaN;

      if (!row || row.status !== 'active' || !Number.isFinite(expiresMs) || expiresMs <= Date.now()) {
        return json({ valid: false, message: '授权码无效或已过期。' }, 200, origin);
      }

      return json(
        {
          valid: true,
          plan: row.plan || 'pro',
          expiresAt: new Date(expiresMs).toISOString(),
          orderId: row.order_id || null,
        },
        200,
        origin,
      );
    } catch (err) {
      return json({ valid: false, message: '校验服务暂时不可用，请稍后再试。' }, 200, origin);
    }
  },
};
