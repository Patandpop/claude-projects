'use strict';
// smoke-tools.test.js — smoke tests for the lesson and homework tools that had none (workplan 2.13, 2026-10-29):
// extension-pick, homework-booklet, paper-snippets and the planner's lesson MCQ collector (lessonMcqs).
// Everything is written to a temp folder; nothing touches Drive or the "never repeat a question" record.
// Needs the exam library on this PC (skips with a warning without it).

const fs = require('fs');
const os = require('os');
const path = require('path');
const cp = require('child_process');
const GRN = '\x1b[32m', RED = '\x1b[31m', YEL = '\x1b[33m', RST = '\x1b[0m';

async function run() {
  let fails = 0, warns = 0;
  const check = (c, m) => { console.log(`  ${c ? GRN + '✓' : RED + '✗'}${RST} ${m}`); if (!c) fails++; };
  const warn = (m) => { console.log(`  ${YEL}!${RST} ${m}`); warns++; };
  console.log('── Smoke tests: extension-pick, homework-booklet, paper-snippets, lessonMcqs');
  const root = path.join(__dirname, '..'), refs = path.join(root, 'science-lesson', 'references');
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'smoke-tools-'));
  try {
    if (!fs.existsSync(path.join(root, 'exam-library', 'catalogue.json'))) { warn('exam library missing here: extension-pick and homework-booklet not checked'); }
    else {
      // extension-pick: real parts, 2-4 marks, words only, with their mark scheme; reading never records
      const ep = require(path.join(refs, 'extension-pick.js'));
      const usageFile = path.join(root, 'exam-usage.json');
      const before = fs.existsSync(usageFile) ? fs.readFileSync(usageFile, 'utf8') : null;
      const ext = ep.pick([{ subtopic: 'Density', pages: '', from: ['Changes of State and the Particle Model'], match: 'densit' }], ['SMOKETEST'], { per: 2 });
      const qs = (ext[0] || {}).questions || [];
      check(qs.length >= 1 && qs.every((q) => q.q && q.a && q.marks >= 2 && q.marks <= 4 && /#Q\d/.test(q.ref) && !/\[FIG|\[TABLE/.test(q.q + q.a)),
        `extension-pick: ${qs.length} real density question(s), 2 to 4 marks, words only, each with its mark scheme`);
      const after = fs.existsSync(usageFile) ? fs.readFileSync(usageFile, 'utf8') : null;
      check(before === after, 'extension-pick: picking without --record changes nothing in exam-usage.json');

      // homework-booklet: both files made, into the temp folder only
      const hb = require(path.join(refs, 'homework-booklet.js'));
      const log = console.log; console.log = () => {};
      let r = null, err = '';
      try { r = await hb.build({ subject: 'Physics', topic: 'Atomic Structure', out: tmp }); } catch (e) { err = e.message; }
      console.log = log;
      check(r && fs.existsSync(r.bookletPath) && fs.existsSync(r.answersPath) && fs.statSync(r.bookletPath).size > 5000 && r.qs.length > 0,
        'homework-booklet: booklet and answers made for Physics / Atomic Structure' + (err ? ' (' + err.split('\n')[0] + ')' : r ? ` (${r.qs.length} questions)` : ''));
    }

    // paper-snippets.py: a made-up two-question PDF gives one picture per part and the map file
    const py = process.platform === 'win32' ? 'python' : 'python3';
    const mk = cp.spawnSync(py, ['-c', [
      'import pymupdf, sys',
      'd = pymupdf.open(); p = d.new_page()',
      'y = 80',
      'for t in ["Q1. Atoms are tiny.", "(a) State what is in the nucleus.", "(b) Name the particle that orbits.", "Q2. Waves carry energy.", "(a) Define frequency."]:',
      '    p.insert_text((40, y), t, fontsize=11); y += 90',
      'd.save(sys.argv[1])'].join('\n'), path.join(tmp, 'paper.pdf')], { encoding: 'utf8' });
    if (mk.status !== 0) warn('paper-snippets: pymupdf not available here, not checked');
    else {
      const out = path.join(tmp, 'snips');
      const rs = cp.spawnSync(py, [path.join(refs, 'paper-snippets.py'), path.join(tmp, 'paper.pdf'), out], { encoding: 'utf8' });
      let map = {}; try { map = JSON.parse(fs.readFileSync(path.join(out, 'snippets.json'), 'utf8')); } catch (e) { /* none */ }
      const keys = Object.keys(map).filter((k) => !k.endsWith('*'));
      check(rs.status === 0 && ['1(a)', '1(b)', '2(a)'].every((k) => keys.includes(k)) && keys.every((k) => fs.existsSync(path.isAbsolute(map[k]) ? map[k] : path.join(out, path.basename(map[k])))),
        'paper-snippets: one picture per question part (1(a), 1(b), 2(a)) and snippets.json' + (rs.status ? ' (' + String(rs.stderr).trim().split('\n').pop() + ')' : ''));
    }

    // lessonMcqs: every lesson's multiple choice reaches the phone voter as { q, 4 options, answer A-D }
    const pc = require(path.join(refs, 'planner-catalogue.js'));
    const m = pc.lessonMcqs();
    const all = Object.values(m).flat();
    check(Object.keys(m).length > 0 && all.length > 0, `lessonMcqs: ${Object.keys(m).length} built lessons carry their multiple-choice questions`);
    check(all.every((q) => q.q && Array.isArray(q.o) && q.o.length === 4 && /^[A-D]$/.test(q.a)), 'lessonMcqs: every question has its text, four options and an answer A to D');
    check(Object.keys(m).every((k) => /^Year \d+\//.test(k)), 'lessonMcqs: every lesson is keyed by its Drive address from "Year N/"');
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
  return { fails, warns };
}

module.exports = { run };
if (require.main === module) run().then((r) => process.exit(r.fails ? 1 : 0));
