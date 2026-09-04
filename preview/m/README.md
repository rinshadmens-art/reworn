# site/m — the mobile site

**This folder and `site/` are two separate sites. Keep them that way.**

Rinshad works on them independently: *"make a change in the website"* means
`site/*.html` + `site/css` + `site/js`. *"okey lets cook"* means this folder.

## The rule

No CSS or JS file is ever loaded by both sites. The only things shared are:

| Shared | Why |
|---|---|
| `../js/catalog.js` | one source of truth for products, prices, photos — they can never drift |
| `../css/tokens.css` | one palette and type scale |
| `../assets/fonts`, `../assets/vendor` | no reason to ship them twice |
| `../assets/img/**` | the photography itself |

Everything else here is mobile-only. If you find yourself wanting to edit a
file in `site/css` or `site/js` to fix something on mobile, that is the signal
that the thing belongs in `m/css/m.css` instead.

## Why it exists at all

On a phone the desktop site loses its four best components — they are gated
behind `hover: hover` and `min-width: 1000px`:

- the WebGL sticky showcase (`js/webgl/index.js`)
- the spotlight scroll (`js/spotlight.js`)
- the hover grid (`js/hovergrid.js`)
- the folder tabs

A phone was getting two lists and nothing else. Rather than invent touch
equivalents for effects that only make sense with a cursor, this is built for
thumbs: scroll-snap carousels, a two-up grid, and a WhatsApp bar always within
reach.

No GSAP, no three.js, no ScrollTrigger. Scroll-snap and a few CSS transitions.

## Images

`tools/mobile-images.py` writes a phone-weight twin of every image the catalog
references, at two widths (600 card / 1080 view) in WebP. `build-catalog.py`
puts the paths on `product.m`, so nothing here builds a filename by hand.

The collection page pulls **0.5MB instead of 21MB**.
