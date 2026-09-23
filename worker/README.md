# 作者免费代理（Cloudflare Worker）

让 Web 版访问者**零 Key、零安装**就能全自动配文：前端把配文请求发到这个 Worker，Worker 用只存在 Cloudflare Secret 里的 OpenRouter Key 转发上游。**Key 不进仓库、不进前端，浏览器永远拿不到。**

## 泄漏与滥用防护（两层）

**第一层：OpenRouter 账号侧（务必设置，两分钟）**

在 [openrouter.ai/settings/keys](https://openrouter.ai/settings/keys) 专门为这个代理新建一个 Key（别复用你自己的主力 Key），并设置：

1. **Model restrictions**：限定免费模型（至少限定 `:free` 系列）——付费模型直接调不动；
2. **Spend limit**：设 $1（或更低）——即使 Key 以任何方式泄漏，可扣金额趋近于零，随时可删旧建新（轮换成本 = 一条命令）。

**第二层：Worker 服务端强制**

写死在 `worker.js` 里，前端改参数也绕不过：CORS 锁定 GitHub Pages 源；模型白名单（只放行 `:free` 后缀）；必须带图、消息 ≤ 4 条、body ≤ 5MB；`max_tokens` 封顶 2000；每 IP 每 5 分钟 ≤ 10 次（尽力而为的内存限速）。

**兜底天花板**：免费模型不扣费，且 OpenRouter 对账号有每日请求上限（未充值 50 次/天，充 $10 后 1000 次/天）——被刷爆的最坏结果是「当天大家没得用」，而不是「扣钱」。

## 部署（约 5 分钟，只需一次）

```bash
cd worker
npx wrangler login          # 浏览器授权 Cloudflare（免费账号即可）
npx wrangler secret put OPENROUTER_API_KEY   # 粘贴上面建好的受限 Key
npx wrangler deploy
```

部署完终端会输出 `https://i-am-caption-proxy.<你的子域>.workers.dev`。把这个 URL 告诉维护者（或自己改 `web/index.html` 里的 `PROXY_URL` 常量）并提交，Web 版的「作者免费代理」选项即生效。Worker 免费额度 10 万请求/天，远超本场景需要。

## 隐私声明（需要诚实面对的代价）

启用代理后，访问者的照片（压缩副本）会经过这台 Cloudflare Worker 转发——项目从「纯前端、无服务器」变成「前端 + 一跳代理」。Worker 不落盘、不记录图片内容，但 README 已向用户如实标注。

## 轮换 / 撤回

- 换 Key：`npx wrangler secret put OPENROUTER_API_KEY`（秒生效，前端无感）；
- 停服：`npx wrangler delete --name i-am-caption-proxy`，页面自动退回「自带 Key / 中继」模式。
