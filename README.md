# REWORN. — Archive 01

Brand, website and lookbook for a curated pre-owned menswear archive.

    site/      static site (open site/index.html, or deploy this folder)
    catalog/   catalog.json — the single source of truth for site + PDF
    pdf/       lookbook build (REWORN-Archive-01.pdf)
    tools/     build + generation scripts

## Rebuild after changing catalog.json or adding images

    python3 tools/build-catalog.py     # refresh site/js/catalog.js
    python3 tools/build-pdf.py         # refresh the lookbook PDF

## Editorial photoshoot

    export GEMINI_API_KEY=...          # needs a billing-enabled project
    python3 tools/generate.py models
    python3 tools/generate.py identity            # approve the model sheet first
    python3 tools/generate.py shoot --all --tier hero
    python3 tools/generate.py campaign

Images land in `site/assets/img/editorial/<id>-N.jpg`; both builds pick them up
automatically and prefer them over the original product photos.
