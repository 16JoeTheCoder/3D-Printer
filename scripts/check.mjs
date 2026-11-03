// Fails if specs.json and public/models/printer-specs.js disagree on build volume,
// chamber or hotend temperature for the modelled printers. Run by render.mjs.
import { readFileSync } from 'node:fs';
// printer-specs.js is browser ESM with no package.json "type"; load it as a data URL so any Node version accepts it.
const src = readFileSync(new URL('../public/models/printer-specs.js', import.meta.url), 'utf8');
export const { PRINTERS, FEATURES } = await import(`data:text/javascript,${encodeURIComponent(src)}`);

export function check(specs) {
  const errors = [], notes = [];
  for (const p of specs.printers.filter((p) => p.model)) {
    const m = PRINTERS[p.model];
    if (!m) { errors.push(`${p.slug}: no vector model "${p.model}"`); continue; }
    const b = p.build;
    if ([b.x, b.y, b.z].join() !== m.build.join()) errors.push(`${p.slug}: build ${b.x}x${b.y}x${b.z} vs model ${m.build.join('x')}`);
    const temps = (m.info.chamber.match(/\d+(?= °C)/g) || []).map(Number);
    if (p.chamberC !== temps[0]) errors.push(`${p.slug}: chamber ${p.chamberC} °C vs model ${temps[0]} °C`);
    if (p.hotendC == null) notes.push(`${p.slug}: hotend "not confirmed" in specs.json; model text says ${temps.at(-1)} °C`);
    else if (!temps.includes(p.hotendC)) errors.push(`${p.slug}: hotend ${p.hotendC} °C not in model text "${m.info.chamber}"`);
  }
  return { errors, notes };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const { errors, notes } = check(JSON.parse(readFileSync(new URL('../specs.json', import.meta.url))));
  notes.forEach((n) => console.log('note:', n));
  errors.forEach((e) => console.error('error:', e));
  process.exit(errors.length ? 1 : 0);
}
