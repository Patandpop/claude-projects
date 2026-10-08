// node planner/test-homework-quiz.js — runs the school planner's "Homework quizzes" (Code.gs makeHomework)
// against fake Google Forms, Classroom, Drive and the mailbox, so it is checked before he deploys it.
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');

let fails = 0;
const check = (c, m) => { console.log((c ? '  ✓ ' : '  ✗ ') + m); if (!c) fails++; };

const hw = { cls: '10C2', due: '2026-10-16', title: '10C2 homework: P1 Energy (due 16/10)', intro: 'Answer every question.', board: 'AQA', questions: [
  { type: 'mcq', text: 'Why did the student insulate the beaker?', options: ['To increase energy transfer.', 'To reduce energy transfer.'], answer: 1, points: 1, feedback: 'Many chose increase.' },
  { type: 'written', text: 'Calculate the kinetic energy.', marks: 2, scheme: 'Ek = 270 (J)' },
] };
const files = { 'homework-10C2-2026-10-16.json': JSON.stringify(hw) };
const posted = [];

// fake Forms: records items
const items = [];
const feedback = () => { const f = { setText(t) { f.t = t; return f; }, build() { return { text: f.t }; } }; return f; };
const item = (kind) => { const it = { kind, choices: [] }; const self = new Proxy(it, { get(o, k) {
  if (k in o) return o[k];
  if (k === 'createChoice') return (v, ok) => ({ v, ok });
  if (k === 'setChoices') return (c) => { o.choices = c; return self; };
  return (v) => { o[k] = v; return self; };
} }); items.push(it); return self; };
const form = { id: 'F1', setIsQuiz() { return form; }, setDescription() { return form; }, setCollectEmail() { return form; }, setProgressBar() { return form; },
  addMultipleChoiceItem: () => item('mcq'), addParagraphTextItem: () => item('written'), getId: () => 'F1', getEditUrl: () => 'https://forms/edit', getPublishedUrl: () => 'https://forms/view' };
let coursework = null;
const ctx = vm.createContext({
  JSON, Date, String, Object, Error, Number, Math,
  PropertiesService: { getScriptProperties: () => ({ getProperty: (k) => ({ PLANNER_KEY: 'pk', MAILBOX_URL: 'u', MAILBOX_KEY: 'mk' }[k] || null) }) },
  FormApp: { create: () => form, createFeedback: feedback },
  DriveApp: { getFoldersByName: () => ({ hasNext: () => false }), createFolder: () => ({}), getFileById: () => ({ moveTo() {} }) },
  Classroom: { Courses: { list: () => ({ courses: [{ id: 'C9', name: 'Science 10C2' }, { id: 'C1', name: '9XS Science' }] }), CourseWork: { create: (body, id) => { coursework = { body, id }; return {}; } } } },
  UrlFetchApp: { fetch(url, opt) {
    let res;
    if (opt && opt.method === 'post') { const b = JSON.parse(opt.payload); posted.push(b); res = { ok: true }; }
    else {
      const q = Object.fromEntries(new URL('https://x/?' + url.split('?')[1]).searchParams);
      if (q.op === 'list') res = { ok: true, names: Object.keys(files).filter((n) => /^homework-[A-Za-z0-9]+-\d{4}/.test(n)) };
      else res = { ok: true, found: q.name in files, text: files[q.name] || null };
    }
    return { getContentText: () => JSON.stringify(res) };
  } },
  SpreadsheetApp: { getActiveSpreadsheet: () => ({ getSheetByName: () => ({ appendRow() {}, getLastRow: () => 1 }) }) },
});
vm.runInContext(fs.readFileSync(path.join(__dirname, 'Code.gs'), 'utf8'), ctx);

console.log('── homework quizzes');
const out = ctx.makeHomework('pk');
check(out.length === 1 && out[0].draft === true, 'one quiz made, with a Classroom draft');
const mcq = items.find((i) => i.kind === 'mcq'), wr = items.find((i) => i.kind === 'written');
check(mcq && mcq.choices.length === 2 && mcq.choices[1].ok === true && mcq.choices[0].ok === false, 'multiple choice: the right answer is set, so it marks itself');
check(wr && wr.setPoints === 0 && /Ek = 270/.test(wr.setGeneralFeedback.text), 'written question: 0 points (no marking for him), mark scheme shown after submitting');
check(coursework && coursework.id === 'C9' && coursework.body.state === 'DRAFT' && coursework.body.dueDate.day === 16, 'Classroom: a DRAFT in the 10C2 class, due 16 Oct');
const madeWrite = posted.find((b) => b.op === 'write' && b.name === 'homework-made.json');
check(madeWrite && JSON.parse(madeWrite.text)['homework-10C2-2026-10-16.json'], 'remembered as made (never made twice)');
files['homework-made.json'] = madeWrite.text;
check(ctx.makeHomework('pk').length === 0, 'second click: nothing made again');
console.log(fails ? `FAILED ${fails}` : 'homework quizzes: all checks pass');
process.exit(fails ? 1 : 0);
