# STJBS 3D printer proposal

Static proposal site for Saint Johannes Berchmans School's first 3D printer. Plain HTML, CSS and vanilla JS, with no framework and no npm dependencies.

- Data: `specs.json` is the single source of truth (12 printers plus `meta`).
- Build: `node scripts/render.mjs` runs `scripts/check.mjs`, then writes `public/index.html`, `public/printers/<slug>/`, `public/compare/`, `public/data/specs.json` and `public/sitemap.xml`. The check fails the build if specs drift from the vector models.
- Preview: `npx serve public`, then open http://localhost:3000.
- Deploy: `npx wrangler deploy` (Cloudflare Workers static assets, `./public`).
- Design tokens: `DESIGN.md`. Choices and trade-offs: `decision.md`. Photos: `IMAGES.md`. Vector models: `public/models/README.md`.
