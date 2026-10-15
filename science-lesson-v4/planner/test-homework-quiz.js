// node planner/test-homework-quiz.js — runs the school planner's "Homework quizzes" (Code.gs makeHomework)
// against fake Google Forms, Classroom, Drive and the mailbox, so it is checked before he deploys it.
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');

let fails = 0;
const check = (c, m) => { console.log((c ? '  ✓ ' : '  ✗ ') + m); if (!c) fails++; };

const hw = { cls: '10C2', due: '2026-10-16', title: '10C2 homework: P1 Energy (due 16/10)', intro: 'Answer every question.', board: 'AQA', questions: [
  { type: 'mcq', text: 'Why did the student insulate the beaker?', options: ['To increase energy transfer.', 'To reduce energy transfer.'], answer: 1, points: 1, feedback: 'Many chose increase.', images: [{ name: 'f1.png', mime: 'image/png', data: 'iVBORw0K' }] },
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
  addMultipleChoiceItem: () => item('mcq'), addImageItem: () => item('image'), addParagraphTextItem: () => item('written'), getId: () => 'F1', getEditUrl: () => 'https://forms/edit', getPublishedUrl: () => 'https://forms/view' };
let coursework = null;
const ctx = vm.createContext({
  JSON, Date, String, Object, Error, Number, Math, Utilities: { newBlob: (d, m, n) => ({ d, m, n }), base64Decode: (s) => s },
  PropertiesService: { getScriptProperties: () => ({ getProperty: (k) => ({ PLANNER_KEY: 'pk', MAILBOX_URL: 'u', MAILBOX_KEY: 'mk' }[k] || null) }) },
  FormApp: { create: () => form, createFeedback: feedback },
  DriveApp: { getFoldersByName: () => ({ hasNext: () => false }), createFolder: () => ({}), getFileById: () => ({ moveTo() {} }) },
  Classroom: { Courses: { list: () => ({ courses: [{ id: 'C9', name: 'Science 10C2' }, { id: 'C1', name: '9XS Science' }, { id: 'C13', name: '2026-Ph-13D' }, { id: 'C7', name: '2026-Sc-7Ml' }] }), CourseWork: { create: (body, id) => { coursework = { body, id }; return {}; } } } },
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
const res = ctx.makeHomework('pk'), out = res.made;
check(res.seen === 1 && out.length === 1 && out[0].draft === true, 'one quiz made, with a Classroom draft');
const mcq = items.find((i) => i.kind === 'mcq'), wr = items.find((i) => i.kind === 'written');
check(items[0].kind === 'image' && items[0].setImage && items[0].setImage.n === 'f1.png' && items[1].kind === 'mcq', 'a picture goes into the Form just above its question');
check(mcq && mcq.choices.length === 2 && mcq.choices[1].ok === true && mcq.choices[0].ok === false, 'multiple choice: the right answer is set, so it marks itself');
check(wr && wr.setPoints === 0 && /Ek = 270/.test(wr.setGeneralFeedback.text), 'written question: 0 points (no marking for him), mark scheme shown after submitting');
check(coursework && coursework.id === 'C9' && coursework.body.state === 'DRAFT' && coursework.body.dueDate.day === 16, 'Classroom: a DRAFT in the 10C2 class, due 16 Oct');
const madeWrite = posted.find((b) => b.op === 'write' && b.name === 'homework-made.json');
check(madeWrite && JSON.parse(madeWrite.text)['homework-10C2-2026-10-16.json'], 'remembered as made (never made twice)');
files['homework-made.json'] = madeWrite.text;
const again = ctx.makeHomework('pk');
check(again.made.length === 0 && again.seen === 1 && again.already === 1, 'second click: nothing made again, and it says it found 1 file, 1 already made');
// Classroom spells 7MLA as "7Ml": it must still find the class
files['homework-7MLA-2026-10-16.json'] = JSON.stringify({ ...hw, cls: '7MLA', title: '7MLA homework' });
coursework = null;
const r7 = ctx.makeHomework('pk');
check(r7.made.length === 1 && r7.made[0].draft && coursework.id === 'C7', 'the Classroom class called 7Ml is found for 7MLA');
files['homework-made.json'] = posted.filter((b) => b.name === 'homework-made.json').pop().text;   // the receipt the mailbox would now hold
files['homework-9ZZ-2026-10-16.json'] = JSON.stringify({ ...hw, cls: '9ZZ', title: '9ZZ homework' });
const r9 = ctx.makeHomework('pk');
check(r9.made.length === 1 && !r9.made[0].draft && /no Classroom class.*found: .*2026-Ph-13D/.test(r9.made[0].note), 'a class not in Classroom is reported with the names it did find');
const mailFail = ctx.UrlFetchApp.fetch;
ctx.UrlFetchApp.fetch = () => ({ getContentText: () => JSON.stringify({ ok: false, error: 'Unknown request' }) });
let msg = ''; try { ctx.makeHomework('pk'); } catch (e) { msg = e.message; }
check(/Step 1 of 4 failed/.test(msg) && /Unknown request/.test(msg) && /paste Mailbox.gs again/.test(msg), 'an old mailbox gives a plain-English message saying what to do');
ctx.UrlFetchApp.fetch = mailFail;
// the Homework tab: every quiz from home with its questions, and whether it has been made
const list = ctx.homeworkList('pk');
check(list.length >= 1 && list.every((x) => x.hw && Array.isArray(x.hw.questions)) && list.some((x) => x.made && x.made.form) , 'Homework tab: lists each quiz with its questions and which are made');
files['homework-made.json'] = posted.filter((b) => b.name === 'homework-made.json').pop().text;   // the mailbox now holds the latest receipt
const one = ctx.makeHomework('pk', 'homework-9ZZ-2026-10-16.json');
check(one.made.length === 0, 'making one quiz from the tab never remakes others (already made: nothing new)');
// exam practice homework: a Core and a Challenge Form for the same class and day (test-paper.js, 2026-10-10)
files['homework-made.json'] = posted.filter((b) => b.name === 'homework-made.json').pop().text;
files['homework-10C2-2026-10-20-core.json'] = JSON.stringify({ ...hw, title: '10C2 exam practice (Core)' });
files['homework-10C2-2026-10-20-challenge.json'] = JSON.stringify({ ...hw, title: '10C2 exam practice (Challenge)' });
const ep = ctx.makeHomework('pk');
check(ep.made.length === 2 && ep.made.some((m) => /Core/.test(m.title)) && ep.made.some((m) => /Challenge/.test(m.title)), 'exam practice Core and Challenge quiz files are both made');
console.log(fails ? `FAILED ${fails}` : 'homework quizzes: all checks pass');
process.exit(fails ? 1 : 0);
