'use strict';
// spec-index.test.js — the memory map's spec index and lesson tags (big goal 1, step 1, 2026-10-29).
// Every lesson of the ten classes with exam content has at least one code, every code is in the index,
// guesses are marked, and a few known lessons get the right sections. Needs planner-data.json and the
// exam library (skips without them).

const fs = require('fs');
const path = require('path');
const GRN = '\x1b[32m', RED = '\x1b[31m', YEL = '\x1b[33m', RST = '\x1b[0m';

function run() {
  let fails = 0;
  const check = (c, m) => { console.log(`  ${c ? GRN + '✓' : RED + '✗'}${RST} ${m}`); if (!c) fails++; };
  console.log('── Spec index and lesson tags (memory map)');
  const root = path.join(__dirname, '..'), dir = path.join(root, 'science-lesson', 'references', 'spec-points');
  if (!fs.existsSync(path.join(root, 'planner', 'planner-data.json')) || !fs.existsSync(path.join(dir, 'lesson-tags.json'))) {
    console.log(`  ${YEL}!${RST} planner data or spec-points missing here: not checked`); return { fails, warns: 1 };
  }
  const data = JSON.parse(fs.readFileSync(path.join(root, 'planner', 'planner-data.json'), 'utf8'));
  const index = JSON.parse(fs.readFileSync(path.join(dir, 'index.json'), 'utf8')).points;
  const tags = JSON.parse(fs.readFileSync(path.join(dir, 'lesson-tags.json'), 'utf8')).tags;
  const codes = new Set(index.map((e) => e.code));
  const id = (L) => L.rel || L.origKey || `${L.unit}|${L.title}`;
  const lessons = Object.values(data.classes).flatMap((c) => c.seq);
  const missing = lessons.filter((L) => !tags[id(L)]);
  check(!missing.length, `every lesson in planner-data.json has a tag entry (${lessons.length} lessons)` + (missing.length ? `; re-run spec-index.js: ${missing.slice(0, 3).map((L) => L.title).join(', ')}` : ''));
  const empty = Object.entries(tags).filter(([, t]) => !t.none && !(t.codes || []).length);
  check(!empty.length, 'every lesson with exam content has at least one code' + (empty.length ? ': ' + empty.slice(0, 3).map(([k]) => k).join(', ') : ''));
  check(Object.values(tags).every((t) => (t.codes || []).every((c) => codes.has(c))), 'every code is in the index');
  check(Object.values(tags).every((t) => typeof t.guess === 'boolean' || t.none), 'every tag says whether it was guessed');
  check(index.every((e) => e.code && e.title && e.unit && e.board), 'every index section has its code, title, unit and board');
  const t = (re) => (Object.entries(tags).find(([k]) => re.test(k)) || [])[1] || {};
  check((t(/P3 Particles\/Lesson 1 - Required Practical Measuring Density for a Regular/).codes || [])[0] === 'Physics: Changes of State and the Particle Model', 'density practical -> Physics: Changes of State and the Particle Model');
  check((t(/Specific Heat Capacity Theory/).codes || []).includes('Physics: Temperature Changes in a System and Specific Heat Capacity'), 'specific heat capacity -> its own section');
  check((t(/Chapter 27 - Medical Imagining\/Lesson 6 - Ultrasound/).codes || []).includes('OCR A: Using Ultrasound'), 'A level ultrasound -> OCR A: Using Ultrasound');
  check((t(/Earth in Space\/.*Seasons/).codes || [])[0] === 'KS3: Earth in Space', 'KS3 content GCSE does not cover gets its own KS3 section (seasons)');
  check(Object.values(tags).every((t) => !JSON.stringify(t).match(/@|pupil/i)), 'no pupil data in the tags');
  return { fails, warns: 0 };
}

module.exports = { run };
if (require.main === module) process.exit(run().fails ? 1 : 0);
