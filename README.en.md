<div align="center">

# I AM CAPTION

### One yellow line that says what the photo never says.

Turn a photograph into a first-person statement.

[中文](README.md) · [Two Rendering Paths](#two-rendering-paths) · [Copywriting Engine](#copywriting-engine) · [Archive](#archive) · [Getting Started](#getting-started)

</div>

![I AM STILL BLOOMING: a rose in raking light](assets/brand/i-am-caption-cover.jpg)

> EVERY PHOTO HAS ONE SENTENCE IT NEVER SAYS.

I AM Caption is an image-captioning Skill inspired by the classic Nikon "I AM NIKON" campaign. It reads the photograph first — subject, action, light, and the emotion the frame left unsaid — distills one first-person **"I AM …"** statement spoken by the person (or object, or bystander) inside the frame, then sets it on the photo in the iconic yellow caption style.

The photograph stays untouched. One line tells the story beyond the frame.

---

## How we read a photograph

```text
a photo  →  build a story card  →  distill one statement  →  set it dead center  →  one line, a whole story
```

We never let the caption describe the picture — "a man standing on a summit" is not a statement; "I AM ALMOST THERE" is. The line must be grounded in visible facts yet point beyond the frame: what happened one second before or after, who this person is, what they would never say to the camera.

Five principles:

- **Truthful photo**: the image is kept pixel-identical — no repainting, no filters, only the caption band.
- **Statement as soul**: first person, uppercase, 2–6 words, no punctuation — one line that reveals the story outside the frame.
- **Yellow chain**: Nikon yellow `#FFE000`, two flush blocks — solid yellow with bold black "I AM", then a yellow-outlined block with the white statement.
- **Center as anchor**: the band defaults to the geometric center; it only shifts vertically when the center occludes the subject.
- **One line, a whole story**: every photo gets its own line, never a template.

![I AM YOUR NEW NEIGHBOR: Wangjing SOHO behind old blocks](assets/brand/i-am-caption-manifesto.jpg)

## Two rendering paths

| | Precise typesetting · Python (default) | AI generation · blended (fallback) |
| --- | --- | --- |
| **Best for** | Almost everything: zero typos, exact colors | When text must melt into the scene's light |
| **Photo's role** | Kept pixel-identical, caption overlaid | Regenerated with the prompt (risk of drift) |
| **Text reliability** | 100% verbatim | Must be spell-checked by eye |
| **Bonus** | Emits a standalone HTML editor | — |
| **Invoked via** | `scripts/render_i_am_caption.py` | `references/i-am-caption-prompt.zh-CN.md` |

### 01 · Precise typesetting (default)

PIL lays out the band to exact spec: Nikon yellow, flush double blocks, EXIF orientation fidelity, orientation-aware scaling — every pixel outside the band untouched. Each render also emits a standalone HTML editor for editing text, position and colors in the browser, with full-resolution PNG export.

```bash
python3 scripts/render_i_am_caption.py photo.jpg -t "STILL BLOOMING" -o result.jpg --html editor.html
```

Common flags: `--y 0.42` vertical position · `--fill 0.75` target-width scaling · `--backing 0.35` dark backing · `--zh` Chinese mode.

### 02 · AI generation (fallback)

When the type must blend into the scene's light, compile the prompt from [references/i-am-caption-prompt.zh-CN.md](references/i-am-caption-prompt.zh-CN.md) and send it with the original photo to an image model, then verify spelling word by word against the Quality Gate.

## Copywriting engine

The viewpoint is chosen from inside the frame: a clear subject speaks in the first person; empty scenes speak through the bystander or the place itself. Pick the direction with the most tension:

| Direction | Visible fact | Statement |
| --- | --- | --- |
| **Identity** | a kid on a bike | I AM THE FUN CAVALRY |
| **A moment, enlarged** | an astronaut drifting home | I AM HOME |
| **Beyond the frame** | mid-air jump | I AM ALMOST FLYING |
| **Deadpan humor** | a cat on the sofa | I AM IN CHARGE HERE |
| **Relationship** | two silhouettes | I AM STILL HERE WITH YOU |

Hard rules: starts with "I AM", uppercase English, 2–6 words total, no punctuation. Forbidden: describing the picture ("I AM A BOY ON A BIKE" ✗), brand-speak ("I AM NIKON" ✗), empty abstractions ("I AM MOMENT" ✗).

## Positioning: center first

1. Every photo starts dead center — horizontally and vertically (50%).
2. After rendering, review: if the band occludes the subject, shift **vertically only** — the band stays horizontally centered, moves the smallest possible distance, never hugs an edge.
3. If the center is clean, don't touch it — sometimes the center *is* the story (see [03 · Not Upside Down](examples/03-not-upside-down/)).

Band size is orientation-aware: portrait ≈ 12% of the short side, landscape ≈ 10.5%; long lines auto-shrink to fit 86% of the width, never wrapping.

## Archive

Each case keeps "source photo → observation notes → final work", recording the chosen viewpoint, the visible facts, and the story beyond the frame.

| # | Case | Statement |
| --- | --- | --- |
| 01 | [Still Blooming](examples/01-still-blooming/) — a rose in raking light | I AM STILL BLOOMING |
| 02 | [Your New Neighbor](examples/02-your-new-neighbor/) — Wangjing SOHO behind old blocks | I AM YOUR NEW NEIGHBOR |
| 03 | [Not Upside Down](examples/03-not-upside-down/) — a puddle reflection | I AM NOT UPSIDE DOWN |
| 04 | [Saving You a Seat](examples/04-saving-you-a-seat/) — an empty patio set | I AM SAVING YOU A SEAT |

## Getting started

### Install

Copy the skill into your agent's skills directory:

```bash
git clone https://github.com/AaronyfDesign/i-am-caption.git
mkdir -p ~/.catpaw/skills   # or ~/.codex/skills
cp -R i-am-caption ~/.catpaw/skills/
```

### Use

1. Upload a photo.
2. Say "add an I AM statement to this photo" — viewpoint, copy and placement are handled automatically.
3. Optionally steer the direction ("make it funny") or parameters ("fill to 0.7").

Output: the finished image plus a one-line creative note (viewpoint / visible fact / story beyond the frame), together with the HTML editor.

## Repository structure

```text
i-am-caption/
├── README.md
├── README.en.md
├── SKILL.md                          # the Skill: copy engine + style spec + quality gate
├── LICENSE
├── assets/brand/
├── references/
│   └── i-am-caption-prompt.zh-CN.md  # AI-generation prompt
├── scripts/
│   └── render_i_am_caption.py        # precise PIL typesetting + HTML editor
└── examples/                         # 4 archived cases
```

## About photographs

The Skill treats the user's photo as input for the current task only and modifies nothing outside the caption band. Do not browse, share, re-upload or store the original photo unless explicitly asked.

## License

**Personal, non-commercial use only.** Selling, paid generation, subscription services, client work, training, SaaS/API and any other commercial use require prior written permission. See [LICENSE](LICENSE).

<div align="center">

**Every photo has one sentence it never says.**

I AM CAPTION · 2026

</div>
