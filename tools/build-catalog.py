#!/usr/bin/env python3
"""Turn catalog/catalog.json + the images on disk into site/js/catalog.js.

Emits window.REWORN so pages work from file:// as well as a web server.
Editorial (AI) images are picked up automatically once they land in
site/assets/img/editorial/<id>-1.jpg etc.
"""
import json, os, re

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SITE = os.path.join(ROOT, "site")

def shots(folder, pid):
    d = os.path.join(SITE, "assets", "img", folder)
    if not os.path.isdir(d):
        return []
    hits = [f for f in os.listdir(d) if re.fullmatch(rf"{re.escape(pid)}-\d+\.(jpg|jpeg|png|webp)", f)]
    hits.sort(key=lambda f: int(re.search(r"-(\d+)\.", f).group(1)))
    return [f"assets/img/{folder}/{f}" for f in hits]

with open(os.path.join(ROOT, "catalog", "catalog.json")) as fh:
    data = json.load(fh)

for p in data["products"]:
    p["photos"] = shots("products", p["id"])
    p["editorial"] = shots("editorial", p["id"])

os.makedirs(os.path.join(SITE, "js"), exist_ok=True)
with open(os.path.join(SITE, "js", "catalog.js"), "w") as fh:
    fh.write("window.REWORN = ")
    json.dump(data, fh, ensure_ascii=False, indent=1)
    fh.write(";\n")

n_ed = sum(len(p["editorial"]) for p in data["products"])
print(f"{len(data['products'])} products · "
      f"{sum(len(p['photos']) for p in data['products'])} real photos · "
      f"{n_ed} editorial images")
