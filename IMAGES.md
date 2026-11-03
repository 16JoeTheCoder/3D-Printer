# Printer images

Web-ready WebP versions of the source photos in `assets/` (read-only originals), stored in `public/img/`.
Conversion: max 1200 px wide (no upscaling), quality 80, alpha preserved where the source had transparency.

| Source file (`assets/`) | Printer | Output (`public/img/`) | Size (KB) | Background | What is visible | Combo or standard |
|---|---|---|---|---|---|---|
| `anycubic-kobra-s1-max.jpg` | Anycubic Kobra S1 Max | `kobra-s1-max.webp` | 33.7 | White, opaque (JPEG, no alpha channel) | Enclosed printer with glass door and top touchscreen; ANYCUBIC ACE multi-spool unit (red, yellow, white, blue spools) stacked on top | Multi-spool ACE unit attached; no "Combo" label visible |
| `creality-k2-pro.png` | Creality K2 Pro | `k2-pro.webp` | 30.5 | Transparent (about 54% of pixels fully transparent, corners transparent) | Enclosed printer with front glass door, top touchscreen and side panel; no spool holder visible | Unclear |
| `flashforge-creator-5-pro.png` | Flashforge Creator 5 Pro | `creator-5-pro.webp` | 69.4 | Transparent (about 44% of pixels fully transparent, corners transparent) | Enclosed printer with top glass cover, touchscreen and four spools on an external right-hand spool holder | External 4-spool holder visible; no "Combo" label visible |
| `qidi-max4.png` | QIDI Max4 | `qidi-max4.webp` | 18.5 | White, opaque (RGBA file, alpha 255 everywhere) | Enclosed printer with front door, top touchscreen, side window; no spool holder visible | Unclear |
| `qidi-plus4.png` | QIDI Plus5 (see note) | `qidi-plus5.webp` | 21.6 | White, opaque (RGBA file, alpha 255 everywhere) | Enclosed printer with front door, top touchscreen and side window; door badge appears to read "PLUS5" | Unclear |

## Note on `qidi-plus4.png`

The filename says **Plus4**, but the photo appears to show the **QIDI Plus5** (the door badge reads "PLUS5" in a stylised font). The file was mapped to the Plus5 slot (`qidi-plus5.webp`) because no other source file matches that slot. Verify the filename against the product before relying on it.

## Post-processing
`kobra`, `max4` and `plus5` had opaque white studio backgrounds. The white that connects to the image edge was made transparent (flood fill, 0.8 px feather) so the photos sit on the page's paper colour. Interior whites are untouched.
