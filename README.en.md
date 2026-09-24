<div align="center">

# I AM CAPTION

### One yellow line that says what the photo never says.

Turn a photograph into a first-person statement. Inspired by the classic Nikon "I AM NIKON" campaign — the photo stays untouched, one yellow line tells the story beyond the frame.

[中文](README.md) · [Showcase](https://github.com/AaronyfDesign/i-am-caption/issues?q=label%3Ashowcase) · [LICENSE](LICENSE)

</div>

---

## Web App (no install)

Use it without installing the skill: open the [web app](https://aaronyfdesign.github.io/i-am-caption/web/) and drop a photo.

- **Author-hosted free proxy (default, live)**: enabled by default when you open the page — no key needed. Requests relay through the author's Deno Deploy proxy ([neat-whale-5101.aaronyfdesign.deno.net](https://neat-whale-5101.aaronyfdesign.deno.net), reachable from mainland China) to Zhipu BigModel's officially free vision model **GLM-4.6V-Flash** (free input/output/cache, no risk of the model going paid). The key lives only in the proxy's environment variables and never reaches the browser; the proxy pins the model, disables thinking mode, and enforces per-IP rate limiting (10 req / 5 min). Trade-off: a compressed copy of your photo passes through the proxy (nothing is stored); use another mode if that matters;
- **No-key manual relay (fallback)**: click "Generate via DeepSeek web" — the prompt is copied and chat.deepseek.com opens; upload/drag the photo into the chat first (required, the AI needs to see it), paste the prompt, send, then paste DeepSeek's JSON reply back. Free, powered by the DeepSeek web app itself;
- ~~**Fully automatic relay userscript**~~ (removed): the old Tampermonkey one-click relay script has been removed from this repo; plugin-based forwarding will not be supported going forward. For zero-key fully-automatic mode, use the author-hosted proxy above;
- **API key (free option)**: under Advanced, pick a provider and paste your own key — **OpenRouter (recommended)**: sign up for free, use a `:free` vision model (defaults to `nex-agi/nex-n2.5-mini:free`; 50 requests/day uncredited, 1000/day after a one-time $10 top-up; the free pool rotates — on a 404 the frontend auto-falls-back to backup models, and if those fail too, pick another Free + image-input model ID from the OpenRouter models page); or **DeepSeek official** (pay-as-you-go, under 0.001 RMB per photo). In both modes the key lives only in your browser's local storage and requests go browser-direct to the official API. ⚠️ Free-model terms typically allow providers to train on your inputs — use the DeepSeek web relay if that matters to you;
- **Manual mode**: skip AI entirely and write your own line with the sliders;
- Pure client-side single page — no server, no account; photos stay in your browser (AI modes send a compressed copy to the target you chose).

## How to Use

Copy the skill into your agent's skills directory:

```bash
git clone https://github.com/AaronyfDesign/i-am-caption.git
cp -R i-am-caption ~/.codex/skills/
```

Then upload a photo and say:

> Add an I AM statement to this photo

Viewpoint, copy and placement are handled automatically. You get the finished image plus a one-line creative note, together with an HTML editor (edit text and position in the browser, export full-resolution PNG).

Or use the typesetting script directly:

```bash
python3 scripts/render_i_am_caption.py photo.jpg -t "STILL BLOOMING" -o result.jpg --html editor.html
```

## Showcase

| I AM STILL BLOOMING | I AM YOUR NEW NEIGHBOR |
| :---: | :---: |
| <img src="examples/01-still-blooming/result.jpg" alt="Still Blooming" width="440"> | <img src="examples/02-your-new-neighbor/result.jpg" alt="Your New Neighbor" width="300"> |
| **I AM NOT UPSIDE DOWN** | **I AM SAVING YOU A SEAT** |
| <img src="examples/03-not-upside-down/result.jpg" alt="Not Upside Down" width="440"> | <img src="examples/04-saving-you-a-seat/result.jpg" alt="Saving You a Seat" width="300"> |

More cases and the full archive (source → observation → result) live in the [Showcase issues](https://github.com/AaronyfDesign/i-am-caption/issues?q=label%3Ashowcase) — you're welcome to share your own via the [showcase template](https://github.com/AaronyfDesign/i-am-caption/issues/new?template=showcase.yml).

---

<div align="center">

**Every photo has one sentence it never says.**

Personal, non-commercial use only — see [LICENSE](LICENSE). · I AM CAPTION · 2026

</div>
