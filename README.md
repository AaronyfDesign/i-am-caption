<div align="center">

# I AM CAPTION

### 黄字宣言 · 一句 I AM，说出画外的事

把一张照片，变成一句第一人称的宣言。灵感来自尼康经典广告《I AM NIKON》——照片保持原样，只压上一句黄字，说出照片没拍到的故事。

[English](README.en.md) · [作品档案](https://github.com/AaronyfDesign/i-am-caption/issues?q=label%3Ashowcase) · [LICENSE](LICENSE)

</div>

---

## Web 版（免安装）

不用装 Skill 也能用：打开 [Web 版](https://aaronyfdesign.github.io/i-am-caption/web/)，上传照片即可。

- **免 Key 手动中继（默认）**：点「用 DeepSeek 网页版生成」，提示词自动复制并打开 chat.deepseek.com——把照片拖进对话、粘贴提示词发送，再把 DeepSeek 回复的 JSON 贴回本页，排版与导出自动完成。免费，用的就是 DeepSeek 网页版本尊；
- **全自动（可选）**：装了 [Tampermonkey](https://www.tampermonkey.net/) 的话，点[这个 jsDelivr 链接](https://cdn.jsdelivr.net/gh/AaronyfDesign/i-am-caption@main/relay/i-am-caption-relay.user.js)（国内可达；raw 直链[在此](https://raw.githubusercontent.com/AaronyfDesign/i-am-caption/main/relay/i-am-caption-relay.user.js)）即可一键安装中继脚本，AI 配文变成一键完成——照片自动上传、宣言自动生成回填，详见 [relay/README](relay/README.md)（含 Chrome 开发者模式必读项）。脚本调用 DeepSeek 网页版未公开接口，有账号风险，自行评估；
- **API Key（下下策）**：在高级选项里粘贴自己的 DeepSeek API Key，浏览器直连官方 API，Key 只存本地；
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
