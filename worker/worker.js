/* I AM Caption · OpenRouter 免费代理
 *
 * 目的：让 Web 版访问者零 Key 全自动配文，Key 只存在 Cloudflare 的
 *      Worker Secret 里，前端永远拿不到。
 *
 * 防泄漏 / 防滥用措施（全部在服务端强制）：
 *   1. Key 只存 env.OPENROUTER_API_KEY（wrangler secret），不进仓库、不进前端；
 *   2. CORS 锁定：仅允许 GitHub Pages 站点与本地调试源调用；
 *   3. 模型白名单：强制 model 以 ':free' 结尾（免费池模型），付费模型一律拒绝；
 *   4. body 形状校验：messages 1–4 条、必须含图片、body ≤ 5MB；
 *   5. max_tokens 上限 2000、禁流式；
 *   6. 每 IP 每 5 分钟最多 10 次（单实例内存计数，尽力而为）；
 *   7. 上游滥用天花板由 OpenRouter 账号级限额兜底（免费模型不扣费，
 *      未充值账号 50 次/天、充 $10 后 1000 次/天，烧光也零经济损失）。
 *
 * 建议在 OpenRouter 后台给这个 Key 再加两道锁（双重保险）：
 *   - Key 的 Model restrictions 限定免费模型；
 *   - Key 的 Spend limit 设 $1（即使 Key 泄漏，损失≈0，随时可轮换）。
 */

const ALLOWED_ORIGINS = [
  'https://aaronyfdesign.github.io',
  'http://localhost',
  'http://127.0.0.1'
];
const DEFAULT_MODEL = 'inclusionai/ling-3.0-flash-vl:free';
const MAX_BODY_BYTES = 5 * 1024 * 1024;
const MAX_TOKENS = 2000;
const RATE_WINDOW_MS = 5 * 60 * 1000;
const RATE_MAX = 10;

const hits = new Map(); // ip -> [timestamps]，单实例内存，尽力而为

function corsHeaders(origin) {
  const ok = ALLOWED_ORIGINS.some(p => origin.startsWith(p));
  return {
    'Access-Control-Allow-Origin': ok ? origin : ALLOWED_ORIGINS[0],
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Vary': 'Origin'
  };
}
function json(status, obj, origin) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders(origin) }
  });
}
function rateLimited(ip) {
  const now = Date.now();
  const arr = (hits.get(ip) || []).filter(t => now - t < RATE_WINDOW_MS);
  if (arr.length >= RATE_MAX) { hits.set(ip, arr); return true; }
  arr.push(now);
  hits.set(ip, arr);
  if (hits.size > 5000) { // 防内存膨胀
    for (const [k, v] of hits) if (v.every(t => now - t >= RATE_WINDOW_MS)) hits.delete(k);
  }
  return false;
}

export default {
  async fetch(request, env) {
    const origin = request.headers.get('Origin') || '';

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders(origin) });
    }
    if (request.method !== 'POST') return json(405, { error: { message: 'method not allowed' } }, origin);
    if (!ALLOWED_ORIGINS.some(p => origin.startsWith(p))) {
      return json(403, { error: { message: 'origin not allowed' } }, origin);
    }

    const apiKey = env.OPENROUTER_API_KEY;
    if (!apiKey) return json(500, { error: { message: 'proxy not configured: OPENROUTER_API_KEY secret missing' } }, origin);

    const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
    if (rateLimited(ip)) {
      return json(429, { error: { message: '请求太频繁：每 5 分钟最多 10 次' } }, origin);
    }

    const len = Number(request.headers.get('Content-Length') || 0);
    if (len > MAX_BODY_BYTES) return json(413, { error: { message: '图片太大' } }, origin);

    let body;
    try { body = await request.json(); } catch (e) {
      return json(400, { error: { message: 'bad json' } }, origin);
    }

    // 形状校验：1–4 条消息，必须含 image_url（配文任务必吃图）
    if (!Array.isArray(body.messages) || body.messages.length < 1 || body.messages.length > 4) {
      return json(400, { error: { message: 'messages 形状不合法' } }, origin);
    }
    const flat = JSON.stringify(body.messages);
    if (!flat.includes('image_url')) {
      return json(400, { error: { message: '缺少图片' } }, origin);
    }

    // 模型白名单：只放行免费池（:free 后缀），否则一律用默认免费视觉模型
    const model = (typeof body.model === 'string' && /^[\w.\/-]+:free$/.test(body.model))
      ? body.model
      : DEFAULT_MODEL;

    const upstream = {
      model,
      messages: body.messages,
      max_tokens: Math.min(Number(body.max_tokens) || 1200, MAX_TOKENS)
      // 不透传 stream / temperature / 其它字段
    };

    const r = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + apiKey,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://aaronyfdesign.github.io/i-am-caption/web/',
        'X-Title': 'I AM Caption'
      },
      body: JSON.stringify(upstream)
    });

    const text = await r.text();
    return new Response(text, {
      status: r.status,
      headers: { 'Content-Type': 'application/json', ...corsHeaders(origin) }
    });
  }
};
