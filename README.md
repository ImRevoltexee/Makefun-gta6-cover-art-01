# Vice Cover Lab

[![make.fun](https://make.fun/badge/gta6-cover-art-01.svg)](https://make.fun/bounty/gta6-cover-art-01)
[![rank](https://make.fun/badge/gta6-cover-art-01/ImRevoltexee/Makefun-gta6-cover-art-01/rank.svg)](https://make.fun/bounty/gta6-cover-art-01)
[![reward](https://make.fun/badge/gta6-cover-art-01/ImRevoltexee/Makefun-gta6-cover-art-01/reward.svg)](https://make.fun/bounty/gta6-cover-art-01)

An offline web app that turns your photos and a caption into GTA-style cover art: a multi-panel poster with a sunset or neon colour grade, big condensed title lettering, a neon subtitle and a corner ribbon — exported as a PNG to share.

## How it works

1. **Add photos** — pick your own from your machine (they never leave it), or try the two built-in samples.
2. **Pick a layout** — Key Art 3×3, Hero + Three, Full Bleed, or Tilted Collage. One photo can fill every panel, or each panel can take its own.
3. **Crop each panel** — click a panel in the live preview, drag to reposition, zoom with the slider.
4. **Pick a grade** — Vice Sunset, Neon Night, Palm Dusk, Hot Pink Heat, Teal Noir, Gold Hour — plus film grain and vignette toggles.
5. **Write the words** — title (Anton), subtitle (Bebas Neue, neon glow), ribbon text, all live.
6. **Export** — one click per size, or all three at once: 1080 × 1080, 1080 × 1350, 1920 × 1080. Undo/redo included.

## Run it

```sh
node serve.ts
# open http://localhost:8080
```

No build step, no network: every script, font and image is a file under `app/`. Fonts are Anton and Bebas Neue, both under the SIL Open Font License (see `app/fonts/`).

## Entry

`main.ts` (Node 22, standard library only) copies `app/` and `screenshots/` to the output directory and writes `dossier.json` via the vendored make.fun library:

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```
