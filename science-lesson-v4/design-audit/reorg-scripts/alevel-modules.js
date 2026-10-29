#!/usr/bin/env node
'use strict';
/* alevel-modules.js — ONE-OFF (approved by Patryk 2026-10-10): put the A-level chapter folders into
   OCR module folders, with no Physics level, and make the missing chapters of his Year 13 scheme.

     Year 12/Module 4 - Electrons, Waves and Photons/      Chapters 8-13
     Year 12/Module 5 - Newtonian World and Astrophysics/  Chapters 14-15
     Year 13/Module 5 - Newtonian World and Astrophysics/  Chapters 17, 19 + new 20 - Cosmology
     Year 13/Module 6 - Particles and Medical Physics/     Chapters 21, 22, 23, 27 + new 24, 25, 26

   Moves only (a rename inside G:, so Drive keeps every file and its sharing). Creates only the
   module folders and the four missing chapter folders. Never deletes. Every move and new folder
   is logged in upload-log.txt. Safe to run twice: anything already in place is skipped.

   node design-audit/reorg-scripts/alevel-modules.js --dry-run     (prints what it would do)
   node design-audit/reorg-scripts/alevel-modules.js               (does it)                    */

const fs = require('fs');
const path = require('path');

const LESSONS = 'G:\\My Drive\\Beechen Cliff Science\\Lessons';
const LOG = path.join(__dirname, '..', '..', 'upload-log.txt');
const M4 = 'Module 4 - Electrons, Waves and Photons';
const M5 = 'Module 5 - Newtonian World and Astrophysics';
const M6 = 'Module 6 - Particles and Medical Physics';
const PLAN = {
  'Year 12': { [M4]: [8, 9, 10, 11, 12, 13], [M5]: [14, 15] },
  'Year 13': { [M5]: [17, 19, 20], [M6]: [21, 22, 23, 24, 25, 26, 27] },
};
const NEW = { 20: 'Chapter 20 - Cosmology', 24: 'Chapter 24 - Particle Physics', 25: 'Chapter 25 - Radioactivity', 26: 'Chapter 26 - Nuclear Physics' };

const dry = process.argv.includes('--dry-run');
const stamp = new Date().toISOString().slice(0, 16).replace('T', ' ');
const say = (what) => { console.log((dry ? '[dry-run] ' : '') + what); if (!dry) fs.appendFileSync(LOG, `${stamp}  A-level modules  ${what}\n`); };
const dirs = (p) => fs.readdirSync(p, { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => d.name);

if (!fs.existsSync(LESSONS)) { console.error('Drive not mounted: ' + LESSONS); process.exit(1); }
let problems = 0;
for (const [year, mods] of Object.entries(PLAN)) {
  const yDir = path.join(LESSONS, year);
  for (const [mod, chapters] of Object.entries(mods)) {
    const mDir = path.join(yDir, mod);
    if (!fs.existsSync(mDir)) { say(`create folder ${path.join(year, mod)}`); if (!dry) fs.mkdirSync(mDir); }
    for (const n of chapters) {
      const isCh = (d) => new RegExp(`^Chapter ${n}\\b`).test(d);
      const loose = dirs(yDir).filter(isCh);
      const placed = fs.existsSync(mDir) ? dirs(mDir).filter(isCh) : [];
      if (loose.length > 1) { console.error(`  ${year}: more than one Chapter ${n} folder (${loose.join(' | ')}): left alone`); problems++; continue; }
      if (loose.length && placed.length) { console.error(`  ${year}: Chapter ${n} is both loose and in ${mod}: left alone`); problems++; continue; }
      if (loose.length) {
        say(`move ${path.join(year, loose[0])}  ->  ${path.join(year, mod, loose[0])}`);
        if (!dry) fs.renameSync(path.join(yDir, loose[0]), path.join(mDir, loose[0]));
      } else if (!placed.length) {
        if (!NEW[n]) { console.error(`  ${year}: Chapter ${n} not found and not one to create: skipped`); problems++; continue; }
        say(`create folder ${path.join(year, mod, NEW[n])}`);
        if (!dry) fs.mkdirSync(path.join(mDir, NEW[n]));
      }
    }
  }
}
// anything still loose at year level that is a chapter: report, never touch
for (const year of Object.keys(PLAN)) {
  const left = dirs(path.join(LESSONS, year)).filter((d) => /^Chapter \d+/.test(d));
  if (left.length && !dry) { console.error(`  ${year}: still loose: ${left.join(' | ')}`); problems++; }
}
console.log(problems ? `\n${problems} thing(s) left alone: see above.` : '\ndone.');
