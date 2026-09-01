#!/usr/bin/env python3
"""REWORN — editorial photoshoot generator (Google Gemini image models).

No third-party packages: talks to the REST API with urllib.

  export GEMINI_API_KEY=...            # from https://aistudio.google.com/apikey
  python3 tools/generate.py models     # what this key can actually use
  python3 tools/generate.py identity   # step 1 — the model sheet, approve before batching
  python3 tools/generate.py shoot rl-linen-olive          # one product
  python3 tools/generate.py shoot --all --tier hero       # the hero pieces
  python3 tools/generate.py campaign   # hero / about / PDF-cover imagery

Output lands in site/assets/img/editorial/<id>-N.jpg, which build-catalog.py
picks up automatically — the site starts using it with no code change.
"""

import base64, json, mimetypes, os, re, sys, time, urllib.error, urllib.request

ROOT   = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
STORE  = os.path.dirname(ROOT)                      # .../Online store
SITE   = os.path.join(ROOT, "site")
EDIT   = os.path.join(SITE, "assets", "img", "editorial")
IDENT  = os.path.join(ROOT, "identity")
API    = "https://generativelanguage.googleapis.com/v1beta"

PREFERRED_MODELS = [
    "gemini-3-pro-image",             # Nano Banana Pro — best face + garment fidelity
    "gemini-3-pro-image-preview",
    "gemini-3.1-flash-image",
    "gemini-2.5-flash-image",         # Nano Banana
]

# --- the person -------------------------------------------------------------
# Best face/hair references. me 5 = 3/4 face, me 1 = profile, me 3 = back of hair.
FACE_REFS = [
    os.path.join(STORE, "Me and inspos", "me 5.jpg"),
    os.path.join(STORE, "Me and inspos", "me 1.jpg"),
    os.path.join(STORE, "Me and inspos", "me 3.jpg"),
]

# --- house art direction ----------------------------------------------------
LOOK = (
 "Shot on a Hasselblad-style medium-format digital back, 80mm lens, f/4. "
 "Seamless warm off-white paper backdrop (#F2F1EA) that fills the frame edge to edge. "
 "One large softbox slightly camera-left and above, plus a subtle white bounce on the "
 "shadow side: soft directional light, gentle falloff, a real contact shadow on the floor. "
 "Natural skin with visible pores and micro-texture, no plastic smoothing, no beauty filter. "
 "Fine natural film grain. Neutral-warm colour grade, blacks slightly lifted, no HDR, "
 "no vignette, no lens flare. Editorial fashion photography, calm and expensive. "
 "Absolutely photorealistic: this must read as an actual photograph from a studio shoot, "
 "not a render or an illustration."
)

SUBJECT = (
 "The SAME young man as in the reference photographs — a South Asian man in his early "
 "twenties, wavy black hair worn slightly long with volume on top, dark eyes, moustache "
 "and light stubble, slim build. Keep his face unmistakably his: same bone structure, "
 "same nose, same brow, same hairline, same moustache. "
 "Grooming is elevated for the shoot — hair styled with definition and shine, beard "
 "cleanly shaped, skin even-toned and healthy with a clear complexion, well-rested. "
 "He looks like a working fashion model: relaxed shoulders, long neck, confident, "
 "never stiff, never smiling at the camera."
)

NEGATIVE = (
 "Do not distort or invent brand logos, labels or text on the garment. "
 "Do not add extra fingers or malformed hands. Do not change the garment's colour, "
 "buttons, collar shape, pockets or proportions from the product photograph. "
 "No watermark, no text overlay, no collage, no border."
)


# --- plumbing ---------------------------------------------------------------
def key():
    k = os.environ.get("GEMINI_API_KEY") or os.environ.get("GOOGLE_API_KEY")
    if not k:
        sys.exit("Set GEMINI_API_KEY first — get one free at https://aistudio.google.com/apikey")
    return k


def call(path, payload=None, method="GET"):
    req = urllib.request.Request(
        API + path, method=method,
        data=json.dumps(payload).encode() if payload else None,
        headers={"x-goog-api-key": key(), "Content-Type": "application/json"})
    try:
        with urllib.request.urlopen(req, timeout=300) as r:
            return json.loads(r.read())
    except urllib.error.HTTPError as e:
        body = e.read().decode()[:900]
        raise SystemExit(f"\nAPI {e.code} on {path}\n{body}\n")


def image_models():
    out = []
    data = call("/models")
    for m in data.get("models", []):
        name = m["name"].split("/")[-1]
        if "image" in name and "generateContent" in m.get("supportedGenerationMethods", []):
            out.append(name)
    return out


def pick_model():
    if os.environ.get("REWORN_MODEL"):
        return os.environ["REWORN_MODEL"]
    have = image_models()
    for want in PREFERRED_MODELS:
        if want in have:
            return want
    if have:
        return have[0]
    sys.exit("No image-capable model available on this key. Run: generate.py models")


def part_image(path):
    with open(path, "rb") as fh:
        blob = base64.b64encode(fh.read()).decode()
    mime = mimetypes.guess_type(path)[0] or "image/jpeg"
    return {"inline_data": {"mime_type": mime, "data": blob}}


def generate(model, prompt, refs, dest, tries=3):
    parts = [part_image(p) for p in refs if os.path.exists(p)] + [{"text": prompt}]
    body = {"contents": [{"role": "user", "parts": parts}],
            "generationConfig": {"responseModalities": ["IMAGE"]}}
    for attempt in range(1, tries + 1):
        try:
            res = call(f"/models/{model}:generateContent", body, "POST")
        except SystemExit as e:
            if attempt == tries:
                raise
            print(f"    retry {attempt} ({str(e).splitlines()[1] if len(str(e).splitlines())>1 else e})")
            time.sleep(6 * attempt)
            continue
        for cand in res.get("candidates", []):
            for p in cand.get("content", {}).get("parts", []):
                blob = p.get("inline_data") or p.get("inlineData")
                if blob:
                    os.makedirs(os.path.dirname(dest), exist_ok=True)
                    with open(dest, "wb") as fh:
                        fh.write(base64.b64decode(blob["data"]))
                    return dest
        fin = (res.get("candidates") or [{}])[0].get("finishReason", "?")
        print(f"    no image back (finishReason={fin}), attempt {attempt}/{tries}")
        time.sleep(4 * attempt)
    return None


def catalog():
    with open(os.path.join(ROOT, "catalog", "catalog.json")) as fh:
        return json.load(fh)


def product_photo(p):
    """The clearest photo of the actual garment, to anchor colour and cut."""
    d = os.path.join(SITE, "assets", "img", "products")
    hits = sorted(f for f in os.listdir(d) if f.startswith(p["id"] + "-"))
    return os.path.join(d, hits[0]) if hits else None


# --- step 1: identity kit ---------------------------------------------------
IDENTITY_SHOTS = [
    ("front", "Head-and-shoulders portrait, square to camera, eyes to the lens, "
              "neutral expression, wearing a plain black crew-neck t-shirt."),
    ("three-quarter", "Three-quarter portrait turned about 30 degrees to his right, "
              "chin level, looking just past the lens, plain black crew-neck t-shirt."),
    ("full", "Full-length standing shot, arms relaxed at his sides, plain black "
              "crew-neck t-shirt and plain black trousers, feet in plain black leather shoes."),
]


def cmd_identity(argv):
    model = pick_model()
    print(f"model: {model}")
    for i, (tag, framing) in enumerate(IDENTITY_SHOTS, 1):
        dest = os.path.join(IDENT, f"model-sheet-{i}-{tag}.jpg")
        prompt = (f"Create a professional model-casting photograph.\n\n"
                  f"SUBJECT: {SUBJECT}\n\nFRAMING: {framing}\n\nLOOK: {LOOK}\n\n{NEGATIVE}")
        print(f"[{i}/{len(IDENTITY_SHOTS)}] {tag} …")
        ok = generate(model, prompt, FACE_REFS, dest)
        print("    " + (ok or "FAILED"))
    print(f"\nModel sheet in {IDENT} — check it before running `shoot`.")


# --- step 2: the shoot ------------------------------------------------------
FRAMES = [
    ("full body, standing, weight on his back foot, one hand in his trouser pocket, "
     "head turned slightly away from the lens", "vertical 4:5"),
    ("three-quarter length from the thigh up, body angled, hand adjusting his cuff, "
     "looking down and to the side", "vertical 4:5"),
    ("full body walking towards the camera mid-stride, the garment moving with him", "vertical 4:5"),
    ("close detail of the garment on the body — collar, buttons and shoulder line — "
     "cropped from chin to chest, face partly out of frame", "vertical 4:5"),
]


def shoot_product(model, p, frames=None):
    ref = product_photo(p)
    if not ref:
        print(f"  ! no product photo for {p['id']}")
        return
    outfit = p.get("outfit") or {}
    pieces = "; ".join(outfit.get("pieces", []))
    made = 0
    for i, (framing, ratio) in enumerate(FRAMES[:frames or len(FRAMES)], 1):
        dest = os.path.join(EDIT, f"{p['id']}-{i}.jpg")
        if os.path.exists(dest):
            print(f"  [{i}] exists, skipping")
            made += 1
            continue
        prompt = (
          f"Editorial fashion photograph for a menswear lookbook.\n\n"
          f"SUBJECT: {SUBJECT}\n\n"
          f"THE GARMENT: he is wearing the exact garment shown in the second reference "
          f"image — a {p['brand']} {p['name']} ({p['material']}). Reproduce that garment "
          f"faithfully: same colour, same weave, same collar, same buttons, same pockets, "
          f"same proportions. Tailor it so it fits him perfectly — clean shoulder seams, "
          f"correct sleeve length, the drape a well-fitting garment has. "
          f"It must look like it was made for him.\n\n"
          f"STYLING ({outfit.get('concept','relaxed luxury')}): {pieces}. "
          f"Everything fits impeccably. The whole outfit reads quietly expensive.\n\n"
          f"FRAMING: {framing}. Composition {ratio}, generous negative space, "
          f"the figure placed off-centre.\n\n"
          f"LOOK: {LOOK}\n\n{NEGATIVE}"
        )
        print(f"  [{i}/{len(FRAMES)}] {p['id']} …")
        ok = generate(model, prompt, FACE_REFS[:2] + [ref], dest)
        print("      " + (ok or "FAILED"))
        made += bool(ok)
        time.sleep(2)
    return made


def cmd_shoot(argv):
    data = catalog()
    if "--all" in argv:
        tier = None
        if "--tier" in argv:
            tier = argv[argv.index("--tier") + 1]
        items = [p for p in data["products"] if not tier or p.get("tier") == tier]
    else:
        ids = [a for a in argv if not a.startswith("-")]
        items = [p for p in data["products"] if p["id"] in ids]
    if not items:
        sys.exit("Nothing matched. Give an id, or --all [--tier hero].")
    model = pick_model()
    print(f"model: {model}  ·  {len(items)} product(s)\n")
    for p in items:
        print(f"{p['brand']} — {p['name']}")
        shoot_product(model, p)
        print()


# --- step 3: campaign imagery ----------------------------------------------
CAMPAIGN = [
  ("hero", "Full-bleed campaign image for the top of a website. He stands in an empty "
           "warm off-white studio, full length, seen slightly from below, wearing a long "
           "charcoal wool car coat over a black knit and black trousers, collar up, hands "
           "at his sides. Wide composition with a lot of empty backdrop above him for a "
           "large wordmark to sit over the lower third."),
  ("portrait", "Waist-up portrait for an About page. Cream linen shirt, sleeves rolled "
               "once, arms folded loosely, calm and direct, looking at the lens."),
  ("cover", "Cover image for a printed lookbook. He is seated on a plain wooden stool, "
            "leaning forward with forearms on his knees, wearing an olive linen shirt "
            "and ecru wide-leg trousers, looking away from the lens. Vertical, with "
            "clean empty backdrop in the upper third for a title."),
]


def cmd_campaign(argv):
    model = pick_model()
    print(f"model: {model}")
    brand = os.path.join(SITE, "assets", "img", "brand")
    for tag, framing in CAMPAIGN:
        dest = os.path.join(brand, f"{tag}.jpg")
        prompt = (f"Editorial campaign photograph for a menswear label.\n\n"
                  f"SUBJECT: {SUBJECT}\n\nSCENE: {framing}\n\nLOOK: {LOOK}\n\n{NEGATIVE}")
        print(f"[{tag}] …")
        ok = generate(model, prompt, FACE_REFS, dest)
        print("    " + (ok or "FAILED"))


def cmd_models(argv):
    for m in image_models():
        print(m)


CMDS = {"identity": cmd_identity, "shoot": cmd_shoot,
        "campaign": cmd_campaign, "models": cmd_models}

if __name__ == "__main__":
    if len(sys.argv) < 2 or sys.argv[1] not in CMDS:
        sys.exit(__doc__)
    CMDS[sys.argv[1]](sys.argv[2:])
