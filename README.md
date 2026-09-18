<div align="center">

# I AM CAPTION

### 黄字宣言 · 一句 I AM，说出画外的事

把一张照片，变成一句第一人称的宣言。

[English](README.en.md) · [两种渲染路径](#两种渲染路径) · [文案引擎](#文案引擎) · [作品档案](#作品档案) · [开始使用](#开始使用)

</div>

![I AM STILL BLOOMING：阴影里仍在开放的月季](assets/brand/i-am-caption-cover.jpg)

> EVERY PHOTO HAS ONE SENTENCE IT NEVER SAYS.

I AM Caption 是一个生图排版 Skill，灵感来自尼康经典广告《I AM NIKON》。它先阅读照片：辨认主体、动作、光线与画面没说完的情绪，替画面里的人（或物、或在场者）提炼一句 **"I AM …"** 第一人称宣言，再以黄字字幕样式精确排版压在照片上。

照片保持原样，一句话说出照片之外的故事。

---

## 我们如何读一张照片

```text
一张照片  →  建故事卡  →  提炼一句宣言  →  中心优先排版  →  一句千言
```

我们不让文案复述画面——「一个人站在山顶」不是宣言，「I AM ALMOST THERE」才是。宣言必须基于画面可见的事实，但指向画面之外：定格前后一秒发生了什么、这个人是谁、他不会对镜头说什么。

这套样式建立在五条原则上：

- **真图为底**：照片原样保留，不重绘、不调色、不加滤镜，只叠加一层字幕。
- **宣言为魂**：第一人称、全大写、2–6 个单词、无标点，一句话揭示画外的故事。
- **黄字成链**：尼康黄 `#FFE000` 双块结构——左块黄底黑字 "I AM"，右块黄框白字宣言，两块无缝相接。
- **中心为锚**：字幕默认压画面几何中心；只有中心遮挡主体时，才做最小幅度的上下调整。
- **一句千言**：换一张照片就重写一句，不套模板；好宣言让读者看到第二眼时，读出照片没拍到的部分。

![I AM YOUR NEW NEIGHBOR：望京SOHO与老居民楼](assets/brand/i-am-caption-manifesto.jpg)

## 两种渲染路径

| | 精确排版 · Python（默认） | AI 生成 · 融合模式（备用） |
| --- | --- | --- |
| **适合** | 绝大多数场景：零拼错、颜色精确 | 需要文字与画面光影融合的质感 |
| **照片的角色** | 像素级原样保留，仅叠加字幕 | 随提示词重新生成（有改动风险） |
| **文字可靠性** | 100% 逐字正确 | 需逐字校验拼写 |
| **附赠** | 同步产出 HTML 后编辑器 | 无 |
| **调用** | `scripts/render_i_am_caption.py` | `references/i-am-caption-prompt.zh-CN.md` |

### 01 · 精确排版（默认）

PIL 按精确规格排版：尼康黄、双块结构、EXIF 方向保真、横竖幅分档缩放，照片其余像素一律不动。每次渲染同时产出一个独立 HTML 编辑器，可在浏览器里改文字、调位置、导出全尺寸 PNG。

```bash
python3 scripts/render_i_am_caption.py photo.jpg -t "STILL BLOOMING" -o result.jpg --html editor.html
```

常用参数：`--y 0.42` 垂直位置 · `--fill 0.75` 按目标宽度缩放 · `--backing 0.35` 深色衬底 · `--zh` 中文模式。

### 02 · AI 生成（备用）

需要文字融进画面光影时，读取 [references/i-am-caption-prompt.zh-CN.md](references/i-am-caption-prompt.zh-CN.md) 编译提示词，随原图送图像生成服务，并按 Quality Gate 逐字校验拼写。

## 文案引擎

视角按画面内部判断：有主体就代入主体本人，无主体则代入在场者或场景拟人。内容从五个方向里选最有张力的一个：

| 方向 | 画面事实 | 宣言示例 |
| --- | --- | --- |
| **身份宣言** | 孩子骑车 | I AM THE FUN CAVALRY |
| **瞬间放大** | 宇航员漂向地球 | I AM HOME |
| **画外故事** | 凌空跳跃 | I AM ALMOST FLYING |
| **反差幽默** | 猫端坐沙发 | I AM IN CHARGE HERE |
| **关系宣言** | 两人背影 | I AM STILL HERE WITH YOU |

硬性规则：以 "I AM" 开头，全大写英文，含 "I AM" 共 2–6 个单词，无标点；禁止直接复述画面（"I AM A BOY ON A BIKE" ✗）、品牌腔（"I AM NIKON" ✗）和空泛大词单独成句（"I AM MOMENT" ✗）。

## 位置策略：中心优先

1. 所有图默认水平居中 + 垂直 50%（几何中心）；
2. 渲染后回看：中心遮挡主体（面部、关键部位）→ **只做上下调整**，水平永远居中，幅度最小、永不贴边；
3. 中心不挡主体就不动——有时中心正是画面叙事的枢纽（见 [03 · 没有颠倒](examples/03-not-upside-down/)）。

尺寸按方向分档：竖幅块高约为短边 12%，横幅约为短边 10.5%；长文案自动缩到 86% 画宽以内，绝不换行。

## 作品档案

每个案例保存「原始照片 → 观察记录 → 最终作品」，说明代入的视角、画面事实与画外的故事。

### 01 · 仍在开放 · Still Blooming

| 原始照片 | 最终作品 |
| :---: | :---: |
| <img src="examples/01-still-blooming/source.jpg" alt="侧逆光月季原照" width="440"> | <img src="examples/01-still-blooming/result.jpg" alt="I AM STILL BLOOMING 成品" width="440"> |

四周全沉在阴影里，只有它被一束侧光照亮——季节已经晚了、周围都谢了，它还在开。[查看档案](examples/01-still-blooming/)

### 02 · 新邻居 · Your New Neighbor

| 原始照片 | 最终作品 |
| :---: | :---: |
| <img src="examples/02-your-new-neighbor/source.jpg" alt="望京SOHO原照" width="300"> | <img src="examples/02-your-new-neighbor/result.jpg" alt="I AM YOUR NEW NEIGHBOR 成品" width="300"> |

曲线塔楼站在两排老居民楼背后，一句话说出画外的城市变迁。[查看档案](examples/02-your-new-neighbor/)

### 03 · 没有颠倒 · Not Upside Down

| 原始照片 | 最终作品 |
| :---: | :---: |
| <img src="examples/03-not-upside-down/source.jpg" alt="积水倒影原照" width="440"> | <img src="examples/03-not-upside-down/result.jpg" alt="I AM NOT UPSIDE DOWN 成品" width="440"> |

照片其实是积水里的倒影。一本正经的否认，反而让观者开始怀疑到底哪边才是正的。[查看档案](examples/03-not-upside-down/)

### 04 · 给你留了座位 · Saving You a Seat

| 原始照片 | 最终作品 |
| :---: | :---: |
| <img src="examples/04-saving-you-a-seat/source.jpg" alt="露台空座原照" width="300"> | <img src="examples/04-saving-you-a-seat/result.jpg" alt="I AM SAVING YOU A SEAT 成品" width="300"> |

水壶已摆上桌、两把椅子面对着面——宣言里的「你」就是画外的故事。[查看档案](examples/04-saving-you-a-seat/)

[浏览完整作品档案](examples/)

## 开始使用

### 安装

把 Skill 目录复制到你的 Agent Skills 目录：

```bash
git clone https://github.com/AaronyfDesign/i-am-caption.git
mkdir -p ~/.catpaw/skills   # 或 ~/.codex/skills
cp -R i-am-caption ~/.catpaw/skills/
```

### 使用

1. 上传一张照片；
2. 说「给这张照片加一句 I AM 宣言」——视角、文案、位置全部自动完成；
3. 也可以指定方向（如「幽默一点」「代人说话」）或参数（如「fill 到 0.7」）。

输出为成品图 + 一句创作说明（视角 / 画面事实 / 画外故事），同时附带 HTML 后编辑器。

## 仓库结构

```text
i-am-caption/
├── README.md
├── README.en.md
├── SKILL.md                          # Skill 主文件：文案引擎 + 样式规格 + Quality Gate
├── LICENSE
├── assets/brand/                     # 品牌位
├── references/
│   └── i-am-caption-prompt.zh-CN.md  # AI 生成模式提示词
├── scripts/
│   └── render_i_am_caption.py        # PIL 精确排版 + HTML 编辑器生成
└── examples/                         # 作品档案（4 个案例）
```

## 关于照片

Skill 只把用户提供的照片作为当前任务的输入，除字幕条外不修改任何像素。除非用户明确要求，不应浏览、分享、另行上传或保存原始照片。

## License

**仅限个人、非商业使用。** 不允许销售、收费生成、订阅服务、代做、咨询、培训、SaaS/API、公司或客户项目及其他商业化用途。任何商业使用均须事先获得作者明确书面许可。详见 [LICENSE](LICENSE)。

<div align="center">

**每一张照片，都有一句它没说出口的话。**

I AM CAPTION · 2026

</div>
