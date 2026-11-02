// Run in a terminal inside this folder: node build-svg.mjs
// Writes svg/<id>.svg (default view) and svg/<id>-xray.svg for no-JS <img> fallbacks.
import { writeFileSync, mkdirSync } from 'node:fs';
import { PRINTERS, renderSVG, DEFAULT_ON } from './printer-models.js';
mkdirSync('svg', { recursive: true });
for (const id of Object.keys(PRINTERS)) {
  writeFileSync(`svg/${id}.svg`, renderSVG(id, { on: { ...DEFAULT_ON, volume: 1 } }));
  writeFileSync(`svg/${id}-xray.svg`, renderSVG(id, { on: { ...DEFAULT_ON, chamber: 1 }, xray: true, yaw: 28 }));
}
console.log('wrote', Object.keys(PRINTERS).length * 2, 'svg files');
