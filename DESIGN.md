# DESIGN.md: STJBS 3D printer proposal

Principle: document first, showpiece second. A calm, honest briefing for a principal, teachers and parents. School-appropriate, human, trustworthy. Every token below exists in `public/styles.css`; if the two disagree, the CSS is wrong.

## Fonts
Self-hosted WOFF2 (from `@fontsource-variable`, copied into `public/fonts/`), `font-display: swap`, both preloaded.
- Headings: **Fraunces** variable (`fraunces.woff2`).
- Body and UI: **Inter** variable (`inter.woff2`).

## Type scale (ratio 1.25)
`--t-14` 14 · `--t-16` 16 · `--t-18` 18 (body) · `--t-22` 22 · `--t-28` 28 · `--t-36` 36 · `--t-48` 48 · `--t-64` 64 · `--t-96` display max, carousel name only.
Body 18 px / 1.6, measure 60 to 70ch (`--measure: 66ch`). Nothing below 14 px. Uppercase micro-labels at 14 px, +0.06em tracking, never the only label. Numbers use `font-variant-numeric: tabular-nums`.

## Colour (light only, `color-scheme: light`)
| Token | Value | Use |
|---|---|---|
| `--paper` | #FAF8F4 | page background |
| `--surface` | #FFFFFF | cards, table, tray |
| `--ink` | #16181C | text (16.9:1 on paper) |
| `--ink-2` | #4A4F57 | secondary text (7.9:1 on paper) |
| `--rule` | #D9D5CC | hairlines (decorative, not a UI boundary) |
| `--brand` | #1F3A5F | primary button, dark section (11.4:1 with paper text) |
| `--accent` | #E4571E | active state, focus ring, key figure, Recommended badge. Never body text (3.4:1 on paper: large/UI only) |
| `--ok` | #2F6B4F | Local tag (6.3:1) |
| `--warn` | #9A5B00 | Retired / Out of stock / Limited tags (5.0:1) |

## Spacing
Tokens only: 4 · 8 · 12 · 16 · 24 · 32 · 48 · 64 · 96 · 128 (`--s-4` … `--s-128`). Sections 96 desktop / 64 phone. Component inner spacing 16 or 24. Max width 1200, gutters 24 phone / 48 desktop.

## Components
- Buttons: primary (filled `--brand`) and secondary (outline). Min 44 px. Focus: 3 px `--accent` ring, 3 px offset, on every focusable element.
- Tags: text + icon glyph, 14 px. One Recommended tag on the whole site (Kobra S1 Max).
- Printer list: real `<table>`, 64 to 72 px rows, hairlines only, no zebra, whole row is a link, "View more →" always visible.
- Model viewer: sits on a `--brand` panel because the vendor viewer is dark-themed.

## Motion
Transform and opacity only, 200 to 400 ms, one easing `--ease: cubic-bezier(.2,.7,.2,1)`, all gated on `prefers-reduced-motion: no-preference`. The pinned carousel uses a CSS scroll timeline (no JS scroll handling). No count-ups, pulsing, parallax, tilt, ghost numerals, or hover-only affordances.

## Removed from v1
Race, Pick quiz, hotspot pins and tooltips, filter chips on cards, counters, gyro tilt, ghost numeral, 3-column card grid, sticky filter bar, Libre Franklin and Caladea, "Standout" superlatives without a criterion.
