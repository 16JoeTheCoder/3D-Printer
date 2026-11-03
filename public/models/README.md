# printer-models

Zero-dependency 3D printer models (SVG, true rotation) for the STJBS printer showcase. Five printers, 11 selectable features, no build step.

## Files
- `printer-specs.js`: geometry and verified facts per printer. Edit specs and callout text here.
- `printer-models.js`: engine. `renderSVG(id, state)`, `mountPrinter(el, id)`, `mountAll()`.
- `printer-models.css`: viewer styles. Retheme with the `--pm-*` variables.
- `svg/`: static fallbacks, `<id>.svg` (build volume shown) and `<id>-xray.svg` (heated chamber, x-ray).
- `demo.html`: all five printers, for preview.
- `build-svg.mjs`: regenerates `svg/` after you change a spec.

## Add to the Cloudflare build
1. Copy this whole folder into the repo as `public/models/`.
2. In each printer card, add: `<div data-printer="ID"><img src="models/svg/ID.svg" alt="NAME schematic model"></div>` (the `<img>` is the no-JS fallback and is replaced on load).
3. In the page `<head>`: `<link rel="stylesheet" href="models/printer-models.css">`
4. Before `</body>`: `<script type="module">import { mountAll } from './models/printer-models.js'; mountAll();</script>`

IDs: `kobra-s1-max`, `k2-pro`, `creator-5-pro`, `qidi-max4`, `qidi-plus5`.

## Run it
- Preview: open a VS Code terminal in this folder, run `python -m http.server 8000`, then open http://localhost:8000/demo.html in your browser. (ES modules do not load from `file://`.)
- Regenerate SVGs: same terminal, run `node build-svg.mjs`.

## Features (chips)
Build volume, heated chamber (warm glass and heat lines), toolhead, multi-colour unit, camera, air filter, touchscreen, spool holder, discharge chute (Kobra), door sensors (Creator 5 Pro), footprint and power. View controls: drag or arrow keys to rotate, X-ray, turntable, rotate buttons, reset. Tapping a part highlights it and shows its verified spec. Turntable is disabled under reduced motion.

## What is verified and what is schematic
Verified (manufacturer pages): build volume, temperatures, speeds, chamber, camera, filter, screen size, weights, power, colour system names. Outer sizes come from maker figures where stated (K2 Pro, Creator 5 Pro, QIDI Max4, Plus5); the Kobra S1 Max outer size is estimated and labelled so.
Schematic (not from photos): casing colours, which panels are glass, and the positions of the screen, camera, filter, spools and chute. The QIDI Box is drawn as a ghosted optional add-on. The Kobra and K2 Pro show one toolhead, which the makers do not state. Do not present these as likenesses of the real machines.
