'use strict';
// test-paper.test.js — the exam practice homework builder (test-paper.js). Reads the exam library; skips
// (as a warning) if the library has not been built on this PC.

const fs = require('fs');
const path = require('path');
const GRN = '\x1b[32m', RED = '\x1b[31m', YEL = '\x1b[33m', RST = '\x1b[0m';

function run() {
  let fails = 0, warns = 0;
  const check = (c, m) => { console.log(`  ${c ? GRN + '✓' : RED + '✗'}${RST} ${m}`); if (!c) fails++; };
  console.log('── real-style test papers');
  if (!fs.existsSync(path.join(__dirname, '..', 'exam-library', 'catalogue.json'))) {
    console.log(`  ${YEL}!${RST} exam library not built here: test papers not checked`); return { fails, warns: 1 };
  }
  const tp = require('../science-lesson/references/test-paper.js');
  // the Forms writer loads (2026-10-15: a comment swallowed a line on 12 Oct and broke every exam practice Form)
  let hfOk = true; try { require('../science-lesson/references/homework-forms.js'); } catch (e) { hfOk = false; }
  check(hfOk, 'the Google Forms writer (homework-forms.js) loads');
  const usage = path.join(__dirname, '..', 'exam-usage.json');
  const before = fs.existsSync(usage) ? fs.readFileSync(usage, 'utf8') : null;

  const k4 = tp.choose({ cls: '10C2', topics: ['P1 Energy'], size: 'full' });
  const [core, chal] = k4.papers;
  const sum = (p) => p.questions.reduce((n, q) => n + q.marks, 0);
  const ease = (q) => (q.passRate != null ? q.passRate : 100 - q.difficulty);
  const avg = (p) => p.questions.reduce((n, q) => n + ease(q), 0) / p.questions.length;
  check(core.tier === 'core' && chal.tier === 'challenge' && Math.abs(sum(core) - 45) <= 3 && Math.abs(sum(chal) - 45) <= 3, `GCSE: a Core and a Challenge paper, each about 45 marks (${sum(core)}, ${sum(chal)})`);
  check(avg(core) > avg(chal) + 15, `Challenge is clearly harder than Core (average pass rate ${Math.round(avg(core))}% vs ${Math.round(avg(chal))}%)`);
  check(!core.questions.some((q) => chal.questions.some((c) => c.id === q.id)), 'no question on both papers');
  const txt = (p) => p.questions.map((q) => q.parts.map((x) => x.text).join(' ')).join(' ');
  check(!/\btable\b|draw (one|a) line from each/i.test(txt(core) + txt(chal)), 'no question built on a table (tables were read as plain text)');
  check(core.questions.every((q) => q.lesson && q.lesson.startsWith('P1 Energy /')), 'GCSE "P1 Energy": every question is about one of the P1 Energy lessons (lesson-match.js; specific heat and work done questions may come from where the library files them)');
  check(core.questions.slice(1).every((q, i) => ease(q) <= ease(core.questions[i]) + 0.001), 'the paper ramps from easiest to hardest');

  const k5 = tp.choose({ cls: '12C', topics: ['Stars', 'Cosmology'], size: 'mini' });   // 12C: OCR like 13D, but 13D's real record has used up the astrophysics multiple choice (2026-10-19)
  const p5 = k5.papers[0];
  check(p5.tier === null && p5.sectionA.length >= 4 && p5.sectionA.every((q) => q.options && q.options.length === 4 && /^[A-D]$/.test(q.answer)),
    `A-level: one paper, Section A multiple choice with 4 lettered options and a known answer (${p5.sectionA.length} questions)`);
  check([...p5.sectionA, ...p5.questions].every((q) => q.board === 'OCR A'), 'A-level papers are OCR A only, never AQA');
  check(!p5.questions.some((q) => /\b(satellite|geostationary)\b/i.test(q.parts.map((x) => x.text).join(' '))), 'satellite questions filed under "Stars" are left out of astrophysics tests');
  const p5all = [...p5.sectionA, ...p5.questions];
  check(p5all.some((q) => q.parts.some((x) => (x.figureFiles || []).length)) && p5all.every((q) => q.parts.every((x) => !x.figuresMissing)),
    'A-level questions with pictures are used now (the pictures are taken from the exports), never one with a picture missing');
  const ocr = tp.ocrQuestions(['Stars', 'Cosmology', 'Electromagnetic Radiation from Stars']);
  check(ocr.some((q) => q.parts.some((x) => (x.tables || []).length && x.tables[0].rows.length >= 2)), 'A-level tables are kept as rows and cells, not run-together words');
  check(ocr.filter((q) => q.mcq).every((q) => q.options.length === 4 && /^[A-D]$/.test(q.answer)), 'every A-level multiple choice question has 4 options and a letter answer');
  check(!p5.sectionA.some((q) => /\?\s*\S/.test(q.options[0]) || /\?\s*[0-9]/.test(q.parts[0].text.split('\n').find((l) => /\?/.test(l)) || '')), 'a first option glued onto the question line is split off');

  const k3 = tp.choose({ cls: '8XP', topics: ['Respiration', 'Photosynthesis'], size: 'mini' });
  check(k3.papers.length === 2 && k3.papers.every((p) => Math.abs(sum(p) - 20) <= 3 && p.questions.every((q) => /Respiration|Photosynthesis/.test(q.subtopic))),
    'KS3: Core and Challenge mini tests (~20 marks) from the matching GCSE subtopics, spelling slips forgiven');

  // the Forms copy of an A-level paper: every Section A answer is a real option, every question is there
  const quiz = tp.formsQuiz(p5, k5, { cls: '12C', due: '2026-10-20' }, 'Stars');
  check(quiz.file === 'homework-12C-2026-10-20.json' && quiz.questions.length === p5.sectionA.length + p5.questions.length &&
    quiz.questions.filter((q) => q.type === 'mcq').every((q) => q.answer >= 0 && q.answer < q.options.length), 'the Forms copy has every question, multiple choice answers point at a real option');
  const qc = tp.formsQuiz(core, k4, { cls: '10C2', due: '2026-10-20' }, 'P1 Energy');
  check(qc.file === 'homework-10C2-2026-10-20-core.json' && qc.questions.every((q) => (q.type === 'written' || q.type === 'number') && q.scheme), 'Core and Challenge get their own Forms file; written questions carry the real mark scheme');
  // quiz file schema 2 (2026-10-18): labels, mark points that add up, no due date in the title, minutes, intro
  const pts = (q) => (q.markPoints || []).reduce((n, p) => n + p.marks, 0);
  for (const [nm, qz] of [['10C2 Core', qc], ['13D', quiz]]) {
    const self = qz.questions.filter((q) => q.type !== 'mcq');
    check(qz.schema === 2 && qz.questions.every((q) => /^Question \d+(\([^)]+\))?$/.test(q.label) && !/^Question \d/.test(q.text)) && Array.isArray(qz.left),
      `${nm}: schema 2, every question has its label ("Question 3(b)") and its text without it`);
    check(self.length > 0 && self.every((q) => q.markPoints.length && pts(q) === q.marks && q.markPoints.every((p) => p.says && p.id)), `${nm}: every written or number question's mark points add up to its marks (${self.length} questions)`);
    check(!/due|\d\d\/\d\d/.test(qz.title) && qz.minutes > 0 && qz.topic && /about \d+ minutes\. Do it in one go\./.test(qz.intro) && !/—/.test(qz.intro + JSON.stringify(qz.questions.map((q) => q.markPoints || []))),
      `${nm}: title "${qz.title}" has no due date; intro gives the number of questions and minutes; no em dashes`);
  }
  check(qc.minutes === Math.max(5, Math.round(require('../science-lesson/references/homework-forms.js').totalPoints(qc))), 'minutes: about one per mark at GCSE');
  // a calculation with one numeric answer and a unit becomes a number question
  const calcQ = tp.formsQuiz({ sectionA: [], questions: [{ board: 'AQA', id: 'c', subtopic: 's', marks: 2, parts: [
    { part: '', marks: 2, text: 'The power of the kettle is 2000 W. Calculate the energy transferred in 12 s.', ms: { text: 'E = 2000 × 12 1 E = 24 000 (J) 1', notes: [] } }] }] }, { ks: 'ks4' }, { cls: '10C2', due: '2026-10-30' }, 'P1 Energy');
  const cq = calcQ.questions[0];
  check(cq.type === 'number' && cq.unit === 'J' && cq.markPoints.map((p) => p.kind).join() === 'method,answer' && /number/.test(calcQ.intro), 'a calculation with one numeric answer becomes a number question (unit J), working mark then final answer');
  const saved = process.env.NO_UPLOAD; process.env.NO_UPLOAD = '1';
  check(/homework-out[\\/]exam-practice[\\/]10C2$/.test(tp.outFolder({ cls: '10C2' }, k4, 'P1 Energy').dir), 'with NO_UPLOAD the papers stay on this PC (homework-out), never in tests/');
  if (saved === undefined) delete process.env.NO_UPLOAD; else process.env.NO_UPLOAD = saved;

  const after = fs.existsSync(usage) ? fs.readFileSync(usage, 'utf8') : null;
  check(before === after, 'choosing questions (a dry run) never marks them as used');

  // Forms (Patryk 2026-10-16): "Put a tick next to your answer" parts become multiple choice / tick-boxes
  const tc1 = tp._tickChoice({ marks: 1, text: 'Which kettle costs the most to use? Put a tick ([FIG:1]) next to your answer. X [FIG:2] Y [FIG:3] Z [FIG:4]', ms: { text: 'Y 1' } });
  check(tc1 && tc1.options.join() === 'X,Y,Z' && tc1.answers.join() === '1' && /Choose one answer\.$/.test(tc1.stem), 'tick parts: "Put a tick next to your answer. X Y Z" becomes multiple choice, Y right');
  const tc2 = tp._tickChoice({ marks: 2, text: 'Which two of the following statements are true? Tick ([FIG:1]) two boxes. A is true. [FIG:2] B is false. [FIG:3] C is true. [FIG:4] D is false. [FIG:5]', ms: { text: 'A is true 1 C is true 1' } });
  check(tc2 && tc2.answers.join() === '0,2' && /Choose two answers\.$/.test(tc2.stem), 'tick parts: "Tick two boxes" gives both right answers');
  const tc3 = tp._tickChoice({ marks: 1, text: 'Why? Tick one box. Alpha is ionising. [FIG:1] Alpha is penetrating. [FIG:2] The figure below shows the mass. [FIG:3]', ms: { text: 'Alpha is ionising 1' } });
  check(tc3 === null, 'tick parts: a figure caption after the boxes is never taken as an option (left as written)');
  const hwd = tp.formsQuiz({ sectionA: [], questions: [{ board: 'AQA', id: 'x', subtopic: 's', marks: 3, parts: [
    { part: 'a', marks: 2, text: 'Draw arrows on the diagram to show the water moving.', ms: { text: 'arrows' } },
    { part: 'b', marks: 1, text: 'Which metal heats up most? Draw a ring around the correct answer. iron lead', ms: { text: 'lead' } }] }] }, { ks: 'ks4' }, { cls: '10S2', due: '2026-10-30' }, 'test');
  check(hwd.questions.length === 1 && /Write down the correct answer/.test(hwd.questions[0].text), 'Forms: a "draw on the diagram" part is left out; "draw a ring around" is reworded to "write down"');
  check(hwd.left.length === 1 && hwd.left[0].why === 'it needs drawing' && hwd.left[0].label === 'Question 1(a)', 'questions left out are listed with the reason');
  // the weekly quiz (homework-forms.js, a dry run: nothing written): the same schema 2 fields
  if (fs.existsSync(path.join(__dirname, '..', 'planner', 'planner-data.json'))) {
    const hf = require('../science-lesson/references/homework-forms.js');
    const wk = hf.choose('10C2', { due: '2026-10-26' });
    const self = wk.questions.filter((q) => q.type !== 'mcq');
    check(wk.schema === 2 && wk.kind === 'weekly' && wk.questions.every((q, i) => q.label === 'Question ' + (i + 1)) && self.every((q) => q.markPoints.length && pts(q) === q.marks),
      `weekly quiz: schema 2, labelled, every written answer's mark points add up (${self.length} written)`);
    check(!/after you submit/.test(wk.intro) && /On the last page you mark your written answers/.test(wk.intro) && /^Homework quiz on /.test(wk.intro) && !/due/.test(wk.title), 'weekly quiz: the new page 1 wording (no "mark scheme appears after you submit"), no due date in the title');
  }
  // the planner's test builder controls (2026-10-19): 6-mark questions and leaving lessons out
  {
    const six = (p) => p.papers[0].questions.filter((q) => q.parts.some((x) => x.marks === 6)).length;
    const base = { cls: '10C2', topics: ['P1 Energy'], minutes: 25, tier: 'core' };
    check(six(tp.choose({ ...base, long: 2 })) === 2 && six(tp.choose({ ...base, long: 0 })) === 0, '--long 2 gives exactly two 6-mark questions, --long 0 none');
    const L = tp.longList();
    check(L.length > 50 && L.every((x) => x.id && /^[BCP]\d+$/.test(x.code) && x.text), `the 6-mark list for the planner: ${L.length} questions, each with its topic code`);
    const pick = L.find((x) => x.code === 'P1');
    check(!!pick && tp.choose({ ...base, withIds: [pick.id], long: 1 }).papers[0].questions.some((q) => q.id === pick.id), 'a 6-mark question picked in the planner (--with) is in the paper');
    const skip = ['Power', 'Efficiency', 'Kinetic Energy'];
    const left = tp.choose({ ...base, minutes: 45, skip }).papers[0].questions.map((q) => String(q.lesson).split(' / ').pop());
    check(left.length > 3 && !left.some((x) => skip.includes(x)), '--skip leaves those lessons out of the paper');
  }
  return { fails, warns };
}

// The written paper: no feedback grid (Patryk 2026-10-10), says it is homework.
async function runDocx() {
  let fails = 0;
  const check = (c, m) => { console.log(`  ${c ? GRN + '✓' : RED + '✗'}${RST} ${m}`); if (!c) fails++; };
  if (!fs.existsSync(path.join(__dirname, '..', 'exam-library', 'catalogue.json'))) return { fails, warns: 0 };
  const os = require('os'), AdmZip = require('adm-zip');
  const tp = require('../science-lesson/references/test-paper.js');
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'exam-practice-'));
  const saved = process.env.NO_UPLOAD; process.env.NO_UPLOAD = '1';
  try { await tp.build({ cls: '10C2', topics: ['P1 Energy'], size: 'mini', tier: 'core', out: dir, noRecord: true, noForm: true }); }
  finally { if (saved === undefined) delete process.env.NO_UPLOAD; else process.env.NO_UPLOAD = saved; }
  const f = fs.readdirSync(dir).find((x) => /exam practice Core\.docx$/.test(x));
  const xml = f ? new AdmZip(path.join(dir, f)).readAsText('word/document.xml') : '';
  check(!!f && /Homework: exam practice/.test(xml), 'the paper is labelled as homework exam practice');
  check(!!xml && !/>EBI<|>WWW<|Next: |Extension: |Grade achieved/.test(xml), 'no feedback grid on exam practice (no EBI, WWW, Next or Extension)');
  fs.rmSync(dir, { recursive: true, force: true });
  return { fails, warns: 0 };
}

module.exports = { run, runDocx };
if (require.main === module) runDocx().then((d) => process.exit(run().fails || d.fails ? 1 : 0));
