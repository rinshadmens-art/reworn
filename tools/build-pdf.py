#!/usr/bin/env python3
"""Build the REWORN lookbook: catalog -> pdf/lookbook.html -> pdf/REWORN-Archive-01.pdf

  python3 tools/build-pdf.py            # html + pdf
  python3 tools/build-pdf.py --html     # html only

Uses headless Chrome for the PDF so the CSS is rendered exactly as designed.
"""
import html as H
import json, os, subprocess, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SITE = os.path.join(ROOT, "site")
PDF  = os.path.join(ROOT, "pdf")
CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"

def e(s):  return H.escape(str(s))
def inr(n): return "₹" + format(n, ",d")

CACHE = os.path.join(PDF, ".img")

def press(src):
    """Downsample a copy for print — keeps the PDF shareable over WhatsApp."""
    os.makedirs(CACHE, exist_ok=True)
    dst = os.path.join(CACHE, os.path.basename(os.path.dirname(src)) + "-" + os.path.basename(src))
    if not os.path.exists(dst) or os.path.getmtime(dst) < os.path.getmtime(src):
        subprocess.run(["sips", "-Z", "1100", src, "--setProperty", "formatOptions", "48",
                        "--out", dst], check=True,
                       stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    return os.path.join(".img", os.path.basename(dst))


def pics(p):
    """Editorial shots first, then real photos — same rule as the site."""
    out = []
    for folder in ("editorial", "products"):
        d = os.path.join(SITE, "assets", "img", folder)
        if not os.path.isdir(d):
            continue
        hits = sorted((f for f in os.listdir(d) if f.startswith(p["id"] + "-")),
                      key=lambda f: f)
        out += [press(os.path.join(d, f)) for f in hits]
    return out


def main():
    with open(os.path.join(ROOT, "catalog", "catalog.json")) as fh:
        data = json.load(fh)
    B = data["brand"]
    items = [p for p in data["products"] if pics(p)]

    # cover image: brand campaign shot if generated, else the strongest product frame
    brand_cover = os.path.join(SITE, "assets", "img", "brand", "cover.jpg")
    cover = (press(brand_cover) if os.path.exists(brand_cover)
             else pics([p for p in items if p["id"] == "jinlong-carcoat"][0])[0])

    P = []

    # 1 — cover
    P.append(f'''
<section class="page page--flush cover">
  <div class="cover__img"><img src="{e(cover)}" alt=""></div>
  <div class="cover__top micro"><span>Archive 01</span><span>Pre-owned · One of each</span></div>
  <h1 class="cover__mark serif">REWORN<span class="dot">.</span></h1>
  <p class="cover__sub micro">{e(B["slogan"])}</p>
</section>''')

    # 2 — statement + index
    rows = "".join(
        f'<div class="index__row"><span>{e(p["brand"])} — {e(p["name"])}</span>'
        f'<span>{inr(p["price_inr"])}</span></div>' for p in items)
    P.append(f'''
<section class="page">
  <div class="statement">
    <div>
      <p class="micro faint" style="margin-bottom:6mm">The idea</p>
      <h2 class="serif">Clothes don't die.<br>They change hands.</h2>
    </div>
    <div>
      <p>Most second-hand clothing is sold badly — a flat photo on a bed, a brand name, a price.
         Nothing about how the thing feels to wear, or what it does to everything else you own.</p>
      <p>This archive is the opposite. Every piece was chosen one at a time, styled into a full
         outfit, and listed with its real size, its real material and its real flaws. Some are
         current branded stock. Some are archive — a 1990s Shanghai factory harrington, a Tokyo
         jacket with a red quilted lining nobody sees until you open it.</p>
      <p>There is one of each. No size run, no restock, no second colourway.
         That isn't scarcity marketing. That's just what second-hand means.</p>
    </div>
    <div>
      <p class="micro faint" style="margin-bottom:5mm">The archive</p>
      <div class="index">{rows}</div>
    </div>
  </div>
</section>''')

    # 3..n — product spreads, with a full-bleed plate after every third
    for i, p in enumerate(items, 1):
        im = pics(p)
        wear = "".join(f"<li>{e(x)}</li>" for x in (p.get("outfit") or {}).get("pieces", []))
        low = " low" if p["condition"] < 90 else ""
        P.append(f'''
<section class="page">
  <div class="spread">
    <figure class="spread__img">
      <span class="spread__no">{i:02d}</span>
      <img src="{e(im[0])}" alt="">
    </figure>
    <div class="spread__body">
      <p class="spread__brand micro faint">{e(p["brand"])}</p>
      <h2 class="spread__name serif">{e(p["name"])}</h2>
      <p class="spread__price">{inr(p["price_inr"])}</p>
      <p class="spread__story">{e(p["story"])}</p>

      <p class="micro">Product health · {p["condition"]}%</p>
      <div class="health__bar"><div class="health__fill{low}" style="width:{p["condition"]}%"></div></div>
      <p class="faint" style="font-size:7.5pt;margin-bottom:6mm">{e(p["condition_note"])}</p>

      <table class="sp"><tbody>
        <tr><th>Size</th><td>{e(p["size"])}</td></tr>
        <tr><th>Material</th><td>{e(p["material"])}</td></tr>
        <tr><th>Category</th><td>{e(p["category"])}</td></tr>
        <tr><th>Pieces</th><td>1 of 1 — no restock</td></tr>
      </tbody></table>

      <div class="wear">
        <p class="micro" style="margin-bottom:2mm">How we'd wear it</p>
        <ul>{wear}</ul>
      </div>
    </div>
  </div>
  <span class="edge">{e(p["brand"])} · Archive 01 · {p['id']}</span>
</section>''')

        if i % 3 == 0 and len(im) > 1:
            P.append(f'''
<section class="page page--flush plate">
  <img src="{e(im[1])}" alt="">
  <p class="plate__cap micro">{i:02d} — {e(p["brand"])} · {e(p["name"])}</p>
</section>''')

    # closing
    P.append(f'''
<section class="page page--dark">
  <div class="close">
    <div>
      <p class="micro" style="color:var(--signal);margin-bottom:6mm">Take the piece. Or take the website.</p>
      <h2 class="serif">Everything here<br>was made by<br>one person.</h2>
    </div>
    <div class="close__grid">
      <div>
        <p class="micro" style="color:var(--linen);margin-bottom:3mm">The clothes</p>
        <p>Message me and the piece is yours. Steamed, checked and folded properly before it
           travels. No cart, no checkout — we just talk.</p>
      </div>
      <div>
        <p class="micro" style="color:var(--linen);margin-bottom:3mm">The design</p>
        <p>This document, the brand and the website behind it were designed and built from
           nothing. If you want the same for your label or your startup, that's the second
           thing I sell.</p>
      </div>
    </div>
    <div>
      <p class="micro" style="color:var(--linen);margin-bottom:3mm">Contact</p>
      <p><strong>WhatsApp</strong> +39 389 433 8878<br>
         <strong>Email</strong> {e(B["contact"]["email"])}</p>
      <p class="micro" style="margin-top:10mm;color:rgba(242,241,234,0.4)">
         REWORN. — Archive 01 — {e(B["slogan"])}</p>
    </div>
  </div>
</section>''')

    doc = f'''<!doctype html>
<html lang="en"><head><meta charset="utf-8">
<title>REWORN. — Archive 01</title>
<link rel="stylesheet" href="lookbook.css">
</head><body>
{"".join(P)}
</body></html>'''

    os.makedirs(PDF, exist_ok=True)
    out_html = os.path.join(PDF, "lookbook.html")
    with open(out_html, "w") as fh:
        fh.write(doc)
    print(f"html  → {out_html}  ({len(P)} pages)")

    if "--html" in sys.argv:
        return
    out_pdf = os.path.join(PDF, "REWORN-Archive-01.pdf")
    subprocess.run([CHROME, "--headless", "--disable-gpu", "--no-pdf-header-footer",
                    "--print-to-pdf=" + out_pdf, "--virtual-time-budget=25000",
                    "file://" + out_html], check=True,
                   stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    mb = os.path.getsize(out_pdf) / 1e6
    print(f"pdf   → {out_pdf}  ({mb:.1f} MB)")


if __name__ == "__main__":
    main()
