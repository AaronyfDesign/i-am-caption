<div align="center">

# I AM CAPTION

### 黄字宣言 · 一句 I AM，说出画外的事

把一张照片，变成一句第一人称的宣言。灵感来自尼康经典广告《I AM NIKON》——照片保持原样，只压上一句黄字，说出照片没拍到的故事。

[English](README.en.md) · [作品档案](https://github.com/AaronyfDesign/i-am-caption/issues?q=label%3Ashowcase) · [LICENSE](LICENSE)

</div>

---

## Web 版（免安装）

不用装 Skill 也能用：打开 [Web 版](https://aaronyfdesign.github.io/i-am-caption/web/)，上传照片即可。

- **作者免费代理（默认，已上线）**：打开页面即默认开启，无需任何 Key——请求经作者的 Deno Deploy 代理（[neat-whale-5101.aaronyfdesign.deno.net](https://neat-whale-5101.aaronyfdesign.deno.net)，国内可达）转发到智谱 BigModel 多模态模型 **GLM-5.3-Flash**（付费模型：输入 0.8 元/百万 tokens、输出 2.8 元/百万，单张图约 0.004 元）。Key 只存在代理端，浏览器永远拿不到；代理端固定模型 + 限速（每 IP 30 次/5 分钟）。代价：照片压缩副本会经代理一跳（不落盘），介意可换其它模式；
- **免 Key 手动中继（备用）**：点「用 DeepSeek 网页版生成」，提示词自动复制并打开 chat.deepseek.com——先把照片上传/拖进对话（必须，AI 需要看图）、再粘贴提示词发送，然后把 DeepSeek 回复的 JSON 贴回本页，排版与导出自动完成。免费，用的就是 DeepSeek 网页版本尊；
- ~~**全自动插件中继**~~（已移除）：原先通过 Tampermonkey 中继脚本实现的一键全自动已从本仓库移除，未来不再支持插件转发。零 Key 全自动请直接用上方的作者免费代理；
- **API Key 全自动（可选免费）**：页面底部「高级」里选服务商贴自己的 Key——**OpenRouter（推荐）**：注册即免费生成 Key，用带 `:free` 的视觉模型（默认 `nex-agi/nex-n2.5-mini:free`，未充值限 50 次/天，充过 $10 放宽到 1000 次/天；免费池会流动，模型 404 时前端会自动降级备用模型，仍失败则去 OpenRouter 模型页筛「Free + 图片输入」换一个 ID）；或 **DeepSeek 官方**（按量付费，每张照片不到 0.1 分钱）。两种模式 Key 都只存浏览器本地、直连官方接口，不经过任何服务器。⚠️ 免费模型的数据条款通常允许厂商用你的输入训练，介意请用 DeepSeek 网页中继；
- **手动模式**：跳过 AI，上传后自己写字、拖滑杆排版；
- 纯前端单页，无服务器、无账号，照片仅在浏览器里处理（AI 模式下压缩副本发往你自己选择的目标）。

## How to Use

把 Skill 目录复制到你的 Agent Skills 目录：

```bash
git clone https://github.com/AaronyfDesign/i-am-caption.git
cp -R i-am-caption ~/.codex/skills/
```

然后上传一张照片，说一句：

> 给这张照片加一句 I AM 宣言

视角、文案、位置全部自动完成。输出为成品图 + 一句创作说明，同时附带一个 HTML 编辑器（可在浏览器里改文字、调位置、导出全尺寸 PNG）。

也可以直接用排版脚本：

```bash
python3 scripts/render_i_am_caption.py photo.jpg -t "STILL BLOOMING" -o result.jpg --html editor.html
```

## Showcase

| I AM STILL BLOOMING | I AM YOUR NEW NEIGHBOR |
| :---: | :---: |
| <img src="examples/01-still-blooming/result.jpg" alt="Still Blooming" width="440"> | <img src="examples/02-your-new-neighbor/result.jpg" alt="Your New Neighbor" width="300"> |
| **I AM NOT UPSIDE DOWN** | **I AM SAVING YOU A SEAT** |
| <img src="examples/03-not-upside-down/result.jpg" alt="Not Upside Down" width="440"> | <img src="examples/04-saving-you-a-seat/result.jpg" alt="Saving You a Seat" width="300"> |

更多案例与完整档案（原图 → 观察 → 成品）见 [Showcase 议题区](https://github.com/AaronyfDesign/i-am-caption/issues?q=label%3Ashowcase)——也欢迎你用 [showcase 模板](https://github.com/AaronyfDesign/i-am-caption/issues/new?template=showcase.yml)晒出你自己的作品。

---

<div align="center">

**每一张照片，都有一句它没说出口的话。**

仅限个人、非商业使用，详见 [LICENSE](LICENSE)。 · I AM CAPTION · 2026

</div>
