#!/usr/bin/env python3
"""I AM Caption — Nikon-style yellow statement caption, rendered compositionally.

Keeps the source photo pixel-truthful and overlays one caption band:
  [ solid yellow block | bold black "I AM" ][ yellow outline block | white uppercase statement ]

The two blocks TOUCH: the left block's right edge is exactly the right block's
left edge; both share identical top/bottom (height perfectly aligned).

Layout spec derived from the "I AM NIKON" film frames:
  band height ~12% of min(W,H), total width <= 86% of W, centered at 50% height.

Orientation: EXIF orientation is baked in first, so a portrait photo stays
portrait and a landscape photo stays landscape — same as what you see.

HTML editor: pass --html out.html to also emit a standalone, self-contained
editor page (edit text / position / scale / colors in a browser, export PNG).
"""
import argparse
import html
import json
import os
import sys

from PIL import Image, ImageDraw, ImageFont, ImageOps

NIKON_YELLOW = (255, 224, 0)      # #FFE000
CAPTION_BLACK = (17, 17, 17)      # #111111
CAPTION_WHITE = (255, 255, 255)

BOLD_CANDIDATES = [
    ("/System/Library/Fonts/HelveticaNeue.ttc", 1),   # Helvetica Neue Bold
    ("/System/Library/Fonts/Supplemental/Arial Bold.ttf", 0),
    ("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 0),
]
REGULAR_CANDIDATES = [
    ("/System/Library/Fonts/HelveticaNeue.ttc", 0),   # Helvetica Neue Regular
    ("/System/Library/Fonts/Supplemental/Arial.ttf", 0),
    ("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", 0),
]
CJK_CANDIDATES = [
    ("/System/Library/Fonts/PingFang.ttc", 0),
    ("/System/Library/Fonts/Hiragino Sans GB.ttc", 1),
    ("/System/Library/Fonts/STHeiti Light.ttc", 0),
]

HTML_TEMPLATE = r"""<!DOCTYPE html>
<html lang="__LANG__">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>I AM Caption Editor</title>
<style>
  :root { --yellow: #FFE000; }
  body { margin:0; background:#141414; color:#eee;
         font:14px/1.5 -apple-system, "Helvetica Neue", Arial, sans-serif; }
  header { padding:10px 16px; background:#1d1d1d; display:flex; gap:14px;
           align-items:center; flex-wrap:wrap; border-bottom:1px solid #333; }
  header b { color:var(--yellow); letter-spacing:.04em; }
  label { display:flex; gap:6px; align-items:center; white-space:nowrap; }
  input[type=range] { width:110px; }
  input[type=color] { width:34px; height:24px; border:none; padding:0; background:none; }
  button { background:var(--yellow); color:#111; border:0; font-weight:700;
           padding:6px 14px; cursor:pointer; border-radius:2px; }
  #stage { position:relative; margin:18px auto; max-width:min(94vw,1100px);
           box-shadow:0 6px 30px rgba(0,0,0,.5); }
  #stage img { display:block; width:100%; height:auto; }
  #band { position:absolute; display:flex; align-items:stretch; transform:translate(-50%,-50%);
          left:50%; }
  #left { background:var(--yellow); color:#111; font-weight:800;
          display:flex; align-items:center; white-space:nowrap; }
  #right { border-style:solid; border-color:var(--yellow); color:#fff;
           display:flex; align-items:center; white-space:nowrap; outline:none; }
  #right.backing { background:rgba(0,0,0,__BACKING__); }
  [contenteditable]:focus { box-shadow:0 0 0 2px rgba(255,224,0,.55) inset; }
  #hint { text-align:center; opacity:.55; padding:8px 0 30px; }
</style>
</head>
<body>
<header>
  <b>I AM CAPTION</b>
  <label>左块 <span id="leftText" contenteditable="true" spellcheck="false">I AM</span></label>
  <label>宣言 <span id="rightText" contenteditable="true" spellcheck="false">__STATEMENT__</span></label>
  <label>大小 <input id="scale" type="range" min="40" max="160" value="__SCALE100__"></label>
  <label>高度 <input id="ypos" type="range" min="5" max="95" value="__Y100__"></label>
  <label>黄色 <input id="yellow" type="color" value="__YELLOW__"></label>
  <label>衬底 <input id="backing" type="checkbox"__BACKING_CHECKED__></label>
  <button id="export">导出 PNG</button>
</header>
<div id="stage">
  <img id="photo" src="__IMG_SRC__" crossorigin="anonymous">
  <div id="band">
    <div id="left" contenteditable="true" spellcheck="false"></div>
    <div id="right" contenteditable="true" spellcheck="false"></div>
  </div>
</div>
<div id="hint">直接点击图上的色块或顶部输入框编辑文字 · 拖动滑杆调整 · 导出 PNG 与预览像素一致</div>
<script>
const stage=document.getElementById('stage'), img=document.getElementById('photo'),
      band=document.getElementById('band'), left=document.getElementById('left'),
      right=document.getElementById('right');
const $=id=>document.getElementById(id);
let geo=null, syncing=false;
const BACKING_A=__BACKING__; /* backing opacity preset from CLI */

function measure(text, fontPx, weight){
  const c=measure.ctx||(measure.ctx=document.createElement('canvas').getContext('2d'));
  c.font=`${weight} ${fontPx}px "Helvetica Neue", "PingFang SC", Arial, sans-serif`;
  const m=c.measureText(text);
  return {w:m.width, asc:m.actualBoundingBoxAscent||fontPx*.72, desc:m.actualBoundingBoxDescent||0};
}

function layout(){
  const W=img.naturalWidth, H=img.naturalHeight;
  if(!W) return;
  /* all band geometry lives in natural-pixel space, then is scaled by k for display */
  const k=img.getBoundingClientRect().width/W;
  const scale=+$('scale').value/100, yFrac=+$('ypos').value/100;
  const lt=($('leftText').textContent.trim()||'I AM').replace(/\s+/g,' ');
  const raw=($('rightText').textContent.trim()).replace(/\s+/g,' ');
  const zh=/[\u4e00-\u9fff]/.test(lt+raw);
  const rt=zh?raw:raw.toUpperCase();
  const yellow=$('yellow').value;
  const backing=$('backing').checked?BACKING_A:0;
  right.classList.toggle('backing', backing);

  let bandH=(W>H ? Math.min(W*.12,H*.105) : Math.min(W*.12,H*.125))*scale,
      padX=bandH*.30, border=Math.max(2,bandH*.035);
  const TRACK=.045;
  let fL=bandH*.66*1.04, fR=bandH*.66;
  const mR=measure(rt,fR,400);
  let rw=mR.w+TRACK*fR*(Math.max(rt.length-1,0));
  const lw=measure(lt,fL,800).w;
  let total=lw+2*padX+rw+2*padX;
  if(total>W*.86){ const s=W*.86/total;
    bandH*=s; padX=bandH*.30; border=Math.max(2,bandH*.035);
    fL=bandH*.66*1.04; fR=bandH*.66;
    rw=measure(rt,fR,400).w+TRACK*fR*(Math.max(rt.length-1,0));
    total=measure(lt,fL,800).w+2*padX+rw+2*padX; }

  band.style.width=(total*k)+'px'; band.style.height=(bandH*k)+'px';
  band.style.top=(H*yFrac*k)+'px'; band.style.left='50%';

  syncing=true;
  left.textContent=lt; right.textContent=rt;
  $('rightText').textContent=rt; $('leftText').textContent=lt;
  syncing=false;
  left.style.width=(lw*k+2*padX*k)+'px';
  left.style.fontSize=(fL*k)+'px'; left.style.padding='0 '+(padX*k)+'px';
  right.style.width=(rw*k+2*padX*k)+'px';
  right.style.borderWidth=(border*k)+'px';
  right.style.fontSize=(fR*k)+'px'; right.style.padding='0 '+(padX*k)+'px';
  right.style.letterSpacing=(TRACK*fR*k)+'px'; right.style.textTransform='none';

  geo={W,H,scale,yFrac,lt,rt,yellow,backing,bandH,padX,border,fL,fR,rw,total,zh};
}
function centerOffset(text,fontPx,weight,boxH){
  const m=measure(text,fontPx,weight);
  return (boxH-(m.asc+m.desc))/2;
}
function exportPNG(){
  if(!geo) return; const g=geo;
  const cv=document.createElement('canvas'); cv.width=g.W; cv.height=g.H;
  const x=cv.getContext('2d');
  x.drawImage(img,0,0,g.W,g.H);
  const top=g.H*g.yFrac-g.bandH/2, L=(g.W-g.total)/2;
  x.fillStyle=g.yellow;
  x.fillRect(L,top,g.total-g.rw-2*g.padX,g.bandH);
  x.lineWidth=g.border; x.strokeStyle=g.yellow;
  x.strokeRect(L+g.total-g.rw-2*g.padX+g.border/2, top+g.border/2,
               g.rw+2*g.padX-g.border, g.bandH-g.border);
  if(g.backing){ x.fillStyle=`rgba(0,0,0,${g.backing})`;
    x.fillRect(L+g.total-g.rw-2*g.padX+g.border, top+g.border,
               g.rw+2*g.padX-2*g.border, g.bandH-2*g.border); }
  x.fillStyle='#111'; x.font=`800 ${g.fL}px "Helvetica Neue", "PingFang SC", Arial`;
  x.textBaseline='alphabetic';
  const lw=measure(g.lt,g.fL,800).w;
  x.fillText(g.lt, L+g.padX, top+centerOffset(g.lt,g.fL,800,g.bandH)+measure(g.lt,g.fL,800).asc);
  x.fillStyle='#fff'; x.font=`400 ${g.fR}px "Helvetica Neue", "PingFang SC", Arial`;
  const roff=centerOffset(g.rt,g.fR,400,g.bandH);
  const rLeft=L+g.total-g.rw-g.padX;
  if(g.zh||!g.rt){ x.fillText(g.rt, rLeft, top+roff+measure(g.rt,g.fR,400).asc); }
  else { let cx=rLeft;
    for(const ch of g.rt){ x.fillText(ch,cx,top+roff+measure(ch,g.fR,400).asc);
      cx+=measure(ch,g.fR,400).width+g.fR*.045; } }
  const a=document.createElement('a');
  a.download='iam_caption.png'; a.href=cv.toDataURL('image/png'); a.click();
}
function bindEditable(el, mirror){
  el.addEventListener('input',()=>{ if(!syncing) mirror.textContent=el.textContent; layout(); });
  el.addEventListener('keydown',e=>{ if(e.key==='Enter'){e.preventDefault();}});
}
bindEditable($('leftText'), left); bindEditable(left, $('leftText'));
bindEditable($('rightText'), right); bindEditable(right, $('rightText'));
['scale','ypos','yellow','backing'].forEach(id=>$(id).addEventListener('input',layout));
$('export').addEventListener('click',exportPNG);
window.addEventListener('resize',layout);
img.complete?layout():img.addEventListener('load',layout);
</script>
</body>
</html>
"""


def save_capped(img, out, max_mb=2.0, start_quality=90, min_quality=55):
    """Save JPEG, lowering quality (then gently downscaling) until <= max_mb."""
    cap = max_mb * 1024 * 1024
    q = start_quality
    while True:
        img.save(out, quality=q, optimize=True)
        if os.path.getsize(out) <= cap or q <= min_quality:
            break
        q -= 5
    while os.path.getsize(out) > cap:
        w, h = img.size
        img = img.resize((int(w * 0.85), int(h * 0.85)), Image.LANCZOS)
        img.save(out, quality=start_quality, optimize=True)


def load_font(candidates, size):
    for path, index in candidates:
        if not os.path.exists(path):
            continue
        try:
            return ImageFont.truetype(path, size, index=index)
        except Exception:
            continue
    return ImageFont.load_default()


def measure(draw, text, font, tracking=0.0):
    """Return (width, bbox) of text with optional per-char tracking (fraction of size)."""
    if tracking <= 0:
        bbox = draw.textbbox((0, 0), text, font=font)
        return bbox[2] - bbox[0], bbox
    total = 0.0
    for ch in text:
        b = draw.textbbox((0, 0), ch, font=font)
        total += (b[2] - b[0]) + tracking * font.size
    total -= tracking * font.size  # no trailing tracking
    bbox = draw.textbbox((0, 0), text, font=font)
    return total, bbox


def geometry(W, H, statement, left_text, scale=1.0, max_width_frac=0.86, zh=False):
    """Compute band geometry (pure function, shared by raster + HTML defaults)."""
    # landscape captions run one notch smaller than portrait ones
    if W > H:
        band_h = min(W * 0.12, H * 0.105) * scale
    else:
        band_h = min(W * 0.12, H * 0.125) * scale
    pad_x = band_h * 0.30
    border = max(2, round(band_h * 0.035))
    tracking = 0.0 if zh else 0.045

    probe = ImageDraw.Draw(Image.new("RGBA", (8, 8)))
    bold = load_font(CJK_CANDIDATES if zh else BOLD_CANDIDATES, int(band_h * 0.66 * 1.04))
    regular = load_font(CJK_CANDIDATES if zh else REGULAR_CANDIDATES, int(band_h * 0.66))

    def widths():
        lw, _ = measure(probe, left_text, bold)
        rw, _ = measure(probe, statement, regular, tracking)
        return lw, rw

    lw, rw = widths()
    total = lw + 2 * pad_x + rw + 2 * pad_x
    if total > W * max_width_frac:
        k = W * max_width_frac / total
        band_h *= k
        pad_x = band_h * 0.30
        border = max(2, round(band_h * 0.035))
        bold = load_font(CJK_CANDIDATES if zh else BOLD_CANDIDATES, int(band_h * 0.66 * 1.04))
        regular = load_font(CJK_CANDIDATES if zh else REGULAR_CANDIDATES, int(band_h * 0.66))
        lw, rw = widths()
        total = lw + 2 * pad_x + rw + 2 * pad_x

    return {
        "band_h": band_h, "pad_x": pad_x, "border": border, "tracking": tracking,
        "font_left": bold, "font_right": regular, "lw": lw, "rw": rw, "total": total,
    }


def render(src, statement, out, pos="center", y_frac=None, scale=1.0,
           backing=None, zh=False, left_text=None, max_width_frac=0.86, opacity=1.0,
           fill=None, max_mb=2.0):
    left_text = left_text or ("我是" if zh else "I AM")
    statement = statement.upper() if not zh else statement

    img = Image.open(src)
    img = ImageOps.exif_transpose(img)          # bake orientation: portrait stays portrait
    img = img.convert("RGBA")
    W, H = img.size

    # --fill: scale the band so its total width hits a target fraction of W
    # (short statements grow, long ones shrink); still capped by max_width_frac.
    if fill:
        g1 = geometry(W, H, statement, left_text, 1.0, 10.0, zh)
        scale = max(0.15, min(4.0, (W * fill) / g1["total"]))

    g = geometry(W, H, statement, left_text, scale, max_width_frac, zh)
    band_h, pad_x, border = g["band_h"], g["pad_x"], g["border"]

    if y_frac is None:
        y_frac = {"upper": 0.33, "center": 0.50, "lower": 0.62}.get(pos, 0.50)
    # default is the strict geometric center of the frame
    top = H * y_frac - band_h / 2
    left = (W - g["total"]) / 2

    overlay = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(overlay)

    # left block: solid yellow, bold black — its right edge touches the right block
    lx1 = left + g["lw"] + 2 * pad_x
    d.rectangle([left, top, lx1, top + band_h], fill=NIKON_YELLOW)
    lb = d.textbbox((0, 0), left_text, font=g["font_left"])
    d.text((left + pad_x - lb[0], top + (band_h - (lb[3] - lb[1])) / 2 - lb[1]),
           left_text, font=g["font_left"], fill=CAPTION_BLACK)

    # right block: yellow outline — left edge exactly at lx1 (touching), same top/bottom
    rx0, rx1 = lx1, lx1 + g["rw"] + 2 * pad_x
    for i in range(border):
        d.rectangle([rx0 + i, top + i, rx1 - i, top + band_h - i], outline=NIKON_YELLOW)
    if backing:
        d.rectangle([rx0 + border, top + border, rx1 - border, top + band_h - border],
                    fill=(0, 0, 0, int(255 * backing)))
    white = tuple(list(CAPTION_WHITE) + [int(255 * opacity)]) if opacity < 1 else CAPTION_WHITE
    rb = d.textbbox((0, 0), statement, font=g["font_right"])
    rty = top + (band_h - (rb[3] - rb[1])) / 2 - rb[1]
    if g["tracking"] > 0:
        cx = rx0 + pad_x
        for ch in statement:
            d.text((cx, rty), ch, font=g["font_right"], fill=white)
            cb = d.textbbox((0, 0), ch, font=g["font_right"])
            cx += (cb[2] - cb[0]) + g["tracking"] * g["font_right"].size
    else:
        d.text((rx0 + pad_x - rb[0], rty), statement, font=g["font_right"], fill=white)

    result = Image.alpha_composite(img, overlay).convert("RGB")
    save_capped(result, out, max_mb)
    print(f"saved: {out}  {W}x{H}  band_h={band_h:.0f}px  total_w={g['total']:.0f}px"
          f" ({g['total'] / W:.0%} of W)")
    return {"W": W, "H": H, "y_frac": y_frac, "scale": scale, "statement": statement,
            "left_text": left_text, "zh": zh, "band_w_frac": g["total"] / W,
            "fill": fill, "backing": backing or 0}


def write_html(path, img_path, info):
    """Emit the standalone browser editor for post-generation text editing."""
    src = os.path.abspath(img_path)
    out_dir = os.path.dirname(os.path.abspath(path))
    try:
        img_src = os.path.relpath(src, out_dir)
    except ValueError:
        img_src = src
    page = (HTML_TEMPLATE
            .replace("__LANG__", "zh" if info["zh"] else "en")
            .replace("__STATEMENT__", html.escape(info["statement"]))
            .replace("__SCALE100__", str(int(info["scale"] * 100)))
            .replace("__Y100__", str(int(info["y_frac"] * 100)))
            .replace("__YELLOW__", "#FFE000")
            .replace("__BACKING__", str(round(info["backing"], 2)))
            .replace("__BACKING_CHECKED__", " checked" if info["backing"] else "")
            .replace("__IMG_SRC__", html.escape(img_src)))
    with open(path, "w", encoding="utf-8") as f:
        f.write(page)
    print(f"editor: {path}")


def main():
    ap = argparse.ArgumentParser(description="Nikon-style I AM caption overlay (+ HTML editor)")
    ap.add_argument("src")
    ap.add_argument("-t", "--text", required=True,
                    help="statement after 'I AM'; in --zh mode the full text after 「我是」")
    ap.add_argument("-o", "--out", required=True)
    ap.add_argument("--html", dest="html_out", default=None,
                    help="also write a standalone HTML editor to this path")
    ap.add_argument("--left", default=None, help="override left block text (default: I AM / 我是)")
    ap.add_argument("--pos", choices=["upper", "center", "lower"], default="center")
    ap.add_argument("--y", type=float, default=None, help="custom vertical center as fraction of H")
    ap.add_argument("--scale", type=float, default=1.0)
    ap.add_argument("--fill", type=float, default=None,
                    help="scale the band so its width hits this fraction of W (e.g. 0.75); "
                         "short statements grow, long ones shrink")
    ap.add_argument("--backing", nargs="?", const=0.18, type=float, default=None, metavar="A",
                    help="dark backing inside the outline block, opacity 0-1 (default 0.18 with flag)")
    ap.add_argument("--max-mb", type=float, default=2.0,
                    help="max output file size in MB (quality-then-size compression)")
    ap.add_argument("--zh", action="store_true", help="Chinese mode")
    ap.add_argument("--opacity", type=float, default=1.0)
    a = ap.parse_args()
    if not os.path.exists(a.src):
        sys.exit(f"source not found: {a.src}")
    info = render(a.src, a.text, a.out, a.pos, a.y, a.scale, a.backing, a.zh,
                  a.left, opacity=a.opacity, fill=a.fill, max_mb=a.max_mb)
    if a.html_out:
        write_html(a.html_out, a.src, info)


if __name__ == "__main__":
    main()
