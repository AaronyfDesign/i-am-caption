<div align="center">

# I AM CAPTION

### One yellow line that says what the photo never says.

Turn a photograph into a first-person statement. Inspired by the classic Nikon "I AM NIKON" campaign — the photo stays untouched, one yellow line tells the story beyond the frame.

[中文](README.md) · [Showcase](https://github.com/AaronyfDesign/i-am-caption/issues?q=label%3Ashowcase) · [LICENSE](LICENSE)

</div>

---

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
