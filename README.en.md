<div align="center">

# I AM CAPTION

### One yellow line that says what the photo never says.

Turn a photograph into a first-person statement. Inspired by the classic Nikon "I AM NIKON" campaign — the photo stays untouched, one yellow line tells the story beyond the frame.

[中文](README.md) · [Showcase](https://github.com/AaronyfDesign/i-am-caption/issues?q=label%3Ashowcase) · [LICENSE](LICENSE)

</div>

---

## Web App (no install)

Use it without installing the skill: open the [web app](https://aaronyfdesign.github.io/i-am-caption/web/) and drop a photo.

- **No-key manual relay (default)**: click "Generate via DeepSeek web" — the prompt is copied and chat.deepseek.com opens; drop the photo into the chat, paste the prompt, send, then paste DeepSeek's JSON reply back. Free, powered by the DeepSeek web app itself;
- **Fully automatic (optional)**: with [Tampermonkey](https://www.tampermonkey.net/) installed, click [this jsDelivr link](https://cdn.jsdelivr.net/gh/AaronyfDesign/i-am-caption@main/relay/i-am-caption-relay.user.js) (raw link [here](https://raw.githubusercontent.com/AaronyfDesign/i-am-caption/main/relay/i-am-caption-relay.user.js)) to install the relay userscript in one click — the photo is uploaded and the statement filled in automatically. See [relay/README](relay/README.md) (Chrome users must enable Developer Mode in chrome://extensions; it also has a 30-second self-check if the ⚡ button doesn't light up). The script drives DeepSeek's undocumented web APIs; account risk is yours to evaluate;
- **API key (last resort)**: paste your own DeepSeek API key under Advanced; the browser calls the official API directly and the key never leaves local storage;
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
