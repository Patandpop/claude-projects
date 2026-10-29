// node planner/test-homework-quiz.js: runs the school planner's homework quizzes (Code.gs makeHomework,
// setHomework, buildQuiz_, classroomDraft_) against fake Google Forms, Classroom, Drive, Sheets and the
// mailbox, so it is checked before he deploys it.
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
const fetched = []; let oldMailbox = false;   // 4.6: which mailbox calls were made
const posted = [];
const props = { PLANNER_KEY: 'pk', MAILBOX_URL: 'u', MAILBOX_KEY: 'mk' };

// fake Forms: records items
const items = [];
const feedback = () => { const f = { setText(t) { f.t = t; return f; }, build() { return { text: f.t }; } }; return f; };
const item = (kind) => { const it = { kind, choices: [] }; const self = new Proxy(it, { get(o, k) {
  if (k in o) return o[k];
  if (k === 'createChoice') return (v, ok) => ({ v, ok });
  if (k === 'setChoices') return (c) => { o.choices = c; return self; };
  return (v) => { o[k] = v; return self; };
} }); items.push(it); return self; };
const settings = {};
const form = { id: 'F1', addPageBreakItem: () => item('page'), addSectionHeaderItem: () => item('header'), addMultipleChoiceItem: () => item('mcq'), addCheckboxItem: () => item('checkbox'),
  addImageItem: () => item('image'), addParagraphTextItem: () => item('written'), addTextItem: () => item('text'), getItems: () => [], deleteItem() {},
  getId: () => 'F1', getEditUrl: () => 'https://forms/edit', getPublishedUrl: () => 'https://forms/view' };
['setIsQuiz', 'setDescription', 'setCollectEmail', 'setProgressBar', 'setConfirmationMessage', 'setLimitOneResponsePerUser', 'setAllowResponseEdits', 'setShowLinkToRespondAgain', 'setPublishingSummary', 'setTitle']
  .forEach((m) => { form[m] = (v) => { settings[m] = v; return form; }; });
const calls = { create: 0, copy: [], openById: 0, openByUrl: 0, moved: 0 };
let coursework = null, cwN = 0;
const allCoursework = [];
// fake Sheets: tabs that keep their rows. A typed 'YYYY-MM-DD' becomes a Date at midnight, as in real Sheets
// (work plan 0.2, 2026-10-29: the homework id clash only shows once the fake does this).
const sheets = {};
const asSheets = (v) => (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v)) ? new Date(+v.slice(0, 4), +v.slice(5, 7) - 1, +v.slice(8, 10)) : v;
const day = (v) => (v instanceof Date ? `${v.getFullYear()}-${String(v.getMonth() + 1).padStart(2, '0')}-${String(v.getDate()).padStart(2, '0')}` : String(v || ''));
const sheet = (name) => {
  const rows = [];
  return { rows, appendRow(r) { rows.push(r.map(asSheets)); }, getLastRow: () => rows.length,
    getRange: (r, c, nr, nc) => ({ getValues: () => rows.slice(r - 1, r - 1 + (nr || 1)).map((x) => x.slice(c - 1, c - 1 + (nc || 1))), setValue: (v) => { rows[r - 1][c - 1] = asSheets(v); } }) };
};
const ss = { getSheetByName: (n) => sheets[n] || null, insertSheet: (n) => (sheets[n] = sheet(n)) };
// London time, as Apps Script's Utilities would give it
const londonOffset = (d) => { const s = new Date(d).toLocaleString('en-GB', { timeZone: 'Europe/London', timeZoneName: 'short' }); return /BST/.test(s) ? 60 : 0; };
const Utilities = { sleep() {}, newBlob: (d, m, n) => ({ d, m, n }), base64Decode: (s) => s,
  formatDate(d, tz, fmt) {
    const off = londonOffset(d), x = new Date(d.getTime() + off * 6e4), p = (n) => String(n).padStart(2, '0');
    if (fmt === 'Z') return off ? '+0100' : '+0000';
    return fmt.replace('yyyy', x.getUTCFullYear()).replace('MM', p(x.getUTCMonth() + 1)).replace('dd', p(x.getUTCDate())).replace('HH', p(x.getUTCHours())).replace('mm', p(x.getUTCMinutes()));
  },
  parseDate(s, tz) { const [a, b] = String(s).split('T'); const [y, m, d] = a.split('-').map(Number); const [h, mi] = (b || '00:00').split(':').map(Number);
    const guess = Date.UTC(y, m - 1, d, h, mi); return new Date(guess - londonOffset(guess) * 6e4); },
};
let lockTaken = 0;
const cache = {};
let resForm = null;   // the Form read by homeworkResults (made near the end)
const ctx = vm.createContext({
  JSON, Date, String, Object, Error, Number, Math, Array, Utilities,
  PropertiesService: { getScriptProperties: () => ({ getProperty: (k) => props[k] || null, setProperty: (k, v) => { props[k] = v; } }) },
  LockService: { getScriptLock: () => ({ tryLock: () => { lockTaken++; return true; }, waitLock() { lockTaken++; }, releaseLock() {} }) },
  FormApp: { create: () => { calls.create++; return form; }, openById: (id) => { calls.openById++; return id === 'RES' ? resForm : form; }, openByUrl: () => { calls.openByUrl++; return form; }, createFeedback: feedback,
    createTextValidation: () => { const v = { steps: [] }; const b = { setHelpText(t) { v.help = t; return b; }, requireNumber() { v.steps.push('requireNumber'); return b; }, build: () => v }; return b; } },
  DriveApp: { getFoldersByName: () => ({ hasNext: () => false }), createFolder: () => ({ name: 'Planner homework quizzes' }),
    getFileById: (id) => ({ moveTo() { calls.moved++; }, makeCopy: (title, folder) => { calls.copy.push({ id, title, folder }); return { getId: () => 'COPY1' }; } }) },
  Classroom: { Courses: { list: () => ({ courses: [{ id: 'C9', name: 'Science 10C2' }, { id: 'C1', name: '9XS Science' }, { id: 'C13', name: '2026-Ph-13D' }, { id: 'C7', name: '2026-Sc-7Ml' }] }),
    CourseWork: { create: (body, id) => { coursework = { body, id }; allCoursework.push(coursework); return { id: 'CW' + (++cwN) }; },
      get: (cid, id) => { calls.cwGet = (calls.cwGet || 0) + 1; return { state: id === 'CW1' ? 'PUBLISHED' : 'DRAFT', alternateLink: 'https://classroom/' + id }; },
      StudentSubmissions: { list: () => ({ studentSubmissions: [{ state: 'TURNED_IN' }, { state: 'CREATED' }, { state: 'RETURNED' }] }) } },
    Students: { list: () => ({ students: [{ profile: { emailAddress: 'amy@school', name: { fullName: 'Amy Able' } } }, { profile: { emailAddress: 'ben@school', name: { fullName: 'Ben Brief' } } }, { profile: { emailAddress: 'cal@school', name: { fullName: 'Cal Absent' } } }] }) } } },
  CacheService: { getScriptCache: () => ({ get: (k) => cache[k] || null, put: (k, v) => { cache[k] = v; }, remove: (k) => { delete cache[k]; } }) },
  UrlFetchApp: { fetch(url, opt) {   // the home link (Mailbox.gs), in memory
    let res;
    if (opt && opt.method === 'post') { const b = JSON.parse(opt.payload); posted.push(b); if (b.op === 'write') files[b.name] = b.text; res = { ok: true }; }
    else {
      const q = Object.fromEntries(new URL('https://x/?' + url.split('?')[1]).searchParams);
      fetched.push(q.op);
      if (q.op === 'list') res = { ok: true, names: Object.keys(files).filter((n) => /^homework-[A-Za-z0-9]+-\d{4}/.test(n)) };
      else if (q.op === 'readMany' && !oldMailbox) res = { ok: true, files: Object.fromEntries(q.names.split(',').map((n) => [n, { found: n in files, text: files[n] || null }])) };
      else if (q.op === 'readMany') res = { ok: false, error: 'Unknown request' };
      else res = { ok: true, found: q.name in files, text: files[q.name] || null };
    }
    return { getContentText: () => JSON.stringify(res) };
  } },
  SpreadsheetApp: { getActiveSpreadsheet: () => ss },
});
vm.runInContext(fs.readFileSync(path.join(__dirname, 'Code.gs'), 'utf8'), ctx);
const lastReceipt = () => JSON.parse(posted.filter((b) => b.name === 'homework-made.json').pop().text);

console.log('── homework quizzes (the menu: Forms only)');
const res = ctx.makeHomework('pk'), out = res.made;
check(res.seen === 1 && out.length === 1 && out[0].draft === false && coursework === null, 'one quiz made from the menu, and no Classroom draft (drafts come from the Homework tab now)');
const mcq = items.find((i) => i.kind === 'mcq'), wr = items.find((i) => i.kind === 'written');
check(items[0].kind === 'image' && items[0].setImage && items[0].setImage.n === 'f1.png' && items[1].kind === 'mcq', 'a picture goes into the Form just above its question');
check(mcq && mcq.choices.length === 2 && mcq.choices[1].ok === true && mcq.choices[0].ok === false, 'multiple choice: the right answer is set, so it marks itself');
const page = items.find((i) => i.kind === 'page'), head = items.find((i) => i.kind === 'header'), selfMarks = items.filter((i) => i.kind === 'mcq' && /^Question 2, mark/.test(i.setTitle));
check(wr && wr.setPoints === undefined && !wr.setGeneralFeedback && items.indexOf(wr) < items.indexOf(page), 'written question: on page 1, no hidden feedback');
check(page && /Mark your own answers/.test(page.setTitle) && /Do not change them now/.test(page.setHelpText) && head && /Ek = 270/.test(head.setHelpText) && items.indexOf(page) < items.indexOf(head), 'page 2 shows the mark scheme, with the new marking wording');
check(selfMarks.length === 2 && selfMarks.every((m) => m.setPoints === 1 && m.choices.map((c) => c.v).join() === 'Yes,No' && m.choices[0].ok === true && m.choices[1].ok === false), 'old (v1) file: one Yes/No per mark (2 for a 2-mark question), each worth 1 point');
check(settings.setLimitOneResponsePerUser === true && settings.setAllowResponseEdits === false && settings.setShowLinkToRespondAgain === false && settings.setPublishingSummary === false && settings.setCollectEmail === true && settings.setIsQuiz === true,
  'one response per pupil, no editing afterwards, no "submit another", no public summary, emails collected, a quiz');
check(calls.create === 1 && calls.copy.length === 0 && /Made without the template/.test(out[0].note) && /TEMPLATE_FORM_ID/.test(out[0].note), 'no TEMPLATE_FORM_ID: a new Form, and the note says so');
check(/Done, thank you\. Click View score/.test(settings.setConfirmationMessage), 'confirmation message in the new wording');
const madeWrite = posted.find((b) => b.op === 'write' && b.name === 'homework-made.json');
check(madeWrite && JSON.parse(madeWrite.text)['homework-10C2-2026-10-16.json'], 'remembered as made (never made twice)');
const again = ctx.makeHomework('pk');
check(again.made.length === 0 && again.seen === 1 && again.already === 1, 'second click: nothing made again, and it says it found 1 file, 1 already made');
const mailFail = ctx.UrlFetchApp.fetch;
ctx.UrlFetchApp.fetch = () => ({ getContentText: () => JSON.stringify({ ok: false, error: 'Unknown request' }) });
let msg = ''; try { ctx.makeHomework('pk'); } catch (e) { msg = e.message; }
check(/Step 1 of 4 failed/.test(msg) && /Unknown request/.test(msg) && /paste Mailbox.gs again/.test(msg), 'an old mailbox gives a plain-English message saying what to do');
ctx.UrlFetchApp.fetch = mailFail;
// the Homework tab: every quiz from home with its questions, and whether it has been made
const list = ctx.homeworkList('pk');
check(list.length >= 1 && list.every((x) => x.hw && Array.isArray(x.hw.questions)) && list.some((x) => x.made && x.made.form) && list.every((x) => x.name !== 'homework-made.json'), 'Homework tab: lists each quiz with its questions and which are made (not the receipt)');
{   // 4.6 (2026-10-29): the quiz list comes home in one trip; an older mailbox without readMany still works
  fetched.length = 0; const l1 = ctx.homeworkList('pk');
  check(fetched.filter((x) => x === 'readMany').length === 1 && !fetched.includes('read'), 'Homework tab: the quizzes come from home in one trip (' + fetched.join(', ') + ')');
  oldMailbox = true; fetched.length = 0; const l2 = ctx.homeworkList('pk'); oldMailbox = false;
  check(JSON.stringify(l2) === JSON.stringify(l1) && fetched.includes('read'), 'Homework tab: an older home link without it still gives the same list, one file at a time');
}
// exam practice homework: a Core and a Challenge Form for the same class and day (test-paper.js, 2026-10-10)
files['homework-10C2-2026-10-20-core.json'] = JSON.stringify({ ...hw, title: '10C2 exam practice (Core)' });
files['homework-10C2-2026-10-20-challenge.json'] = JSON.stringify({ ...hw, title: '10C2 exam practice (Challenge)' });
const ep = ctx.makeHomework('pk');
check(ep.made.length === 2 && ep.made.some((m) => /Core/.test(m.title)) && ep.made.some((m) => /Challenge/.test(m.title)), 'exam practice Core and Challenge quiz files are both made');
// Patryk 2026-10-16 ("Unexpected token '<'"): a Google error PAGE from the mailbox is retried, then explained in words
const realFetch = ctx.UrlFetchApp.fetch;
let busy = 1;
ctx.UrlFetchApp.fetch = (u, o) => (busy-- > 0 ? { getContentText: () => '<!DOCTYPE html><html><title>Error</title><body>Service unavailable</body></html>', getResponseCode: () => 503 } : realFetch(u, o));
let ok = true; try { ctx.homeworkList('pk'); } catch (e) { ok = false; }
check(ok, 'one Google error page from the mailbox: tried again and worked');
ctx.UrlFetchApp.fetch = () => ({ getContentText: () => '<!DOCTYPE html><html><body><p>Exceeded maximum execution time</p></body></html>', getResponseCode: () => 500 });
msg = ''; try { ctx.makeHomework('pk'); } catch (e) { msg = e.message; }
check(!/Unexpected token/.test(msg) && /Google error page/.test(msg) && /Exceeded maximum execution time/.test(msg), "a mailbox that keeps failing gives a plain message in Google's words, not 'Unexpected token <'");
ctx.UrlFetchApp.fetch = realFetch;
// the Homework tab never carries the pictures (12C/13D are over 1 MB of them)
check(ctx.homeworkList('pk').every((x) => x.hw.questions.every((q) => !q.images)), 'Homework tab: words only, pictures left behind');
// 12C question 7: Google Forms refuses odd symbols (×, 10⁸, ✓, long dashes): it goes in as plain text
files['homework-12C-2026-10-22.json'] = JSON.stringify({ ...hw, cls: '12C', title: '12C quiz', questions: [
  { type: 'written', text: 'Question 7\nRadio waves and X–rays: state one difference. [1]', marks: 1, scheme: '✓ 1 mark: wavelength / 3.0 × 10⁸ m s⁻¹' },
  { type: 'written', text: 'Question 8\nDraw arrows on the diagram to show the movement of the water. [2]', marks: 2, scheme: 'convection current' }] });
const fussy = (make) => () => { const it = make(); const outer = new Proxy(it, { get(o, k) {
  if (k === 'setTitle' || k === 'setHelpText') return (t) => { if (/[^\n\x20-\x7E]/.test(t)) throw new Error('Invalid data updating form.'); o[k](t); return outer; };
  return typeof o[k] === 'function' ? (...a) => (o[k](...a), outer) : o[k]; } }); return outer; };
const realAdd = form.addParagraphTextItem, realHead = form.addSectionHeaderItem;
form.addParagraphTextItem = fussy(realAdd); form.addSectionHeaderItem = fussy(realHead);
items.length = 0; coursework = null;
const r12 = ctx.makeHomework('pk', 'homework-12C-2026-10-22.json');
const w12 = items.filter((i) => i.kind === 'written').pop(), h12 = items.filter((i) => i.kind === 'header').pop();
check(r12.made.length === 1 && /X-rays/.test(w12.setTitle) && h12.setHelpText.includes('3.0 x 10^8 m s^-1'), 'odd symbols refused: question and mark scheme go in as plain text (X-rays, 3.0 x 10^8 m s^-1)');
check(items.filter((i) => i.kind === 'written' && i.setTitle).length === 1 && !items.some((i) => /Draw arrows/.test(i.setTitle || '')) && /1 question left out because they need drawing/.test(r12.made[0].note), 'a "draw arrows on the diagram" question is left out of the Form, and the note says so');
form.addParagraphTextItem = realAdd; form.addSectionHeaderItem = realHead;
// replica-test 2026-10-19: an old file with "marks": null (10S2 22 Oct, question 1) never says "null marks"
files['homework-10S2-2026-10-23.json'] = JSON.stringify({ ...hw, cls: '10S2', title: '10S2 null marks', questions: [{ type: 'written', text: 'Which three appliances?', marks: null, scheme: 'fan, drill, washing machine' }] });
items.length = 0;
ctx.makeHomework('pk', 'homework-10S2-2026-10-23.json');
check(!items.some((i) => /null|undefined/.test(String(i.setTitle || ''))) && items.some((i) => /^Question 1, mark 1 of 1:/.test(i.setTitle || '')), 'marks missing in an old file: no "null marks" or "of null" in any title');
// "Tick two boxes": tick-boxes with both right answers set
files['homework-10S2-2026-10-24.json'] = JSON.stringify({ ...hw, title: '10S2 tick two', questions: [{ type: 'mcq', text: 'Which two are true? Choose two answers.', options: ['a', 'b', 'c', 'd'], answer: 0, answers: [0, 2], points: 2 }] });
items.length = 0;
ctx.makeHomework('pk', 'homework-10S2-2026-10-24.json');
const cb = items.find((i) => i.kind === 'checkbox');
check(cb && cb.setPoints === 2 && cb.choices.map((c) => c.ok).join() === 'true,false,true,false', '"tick two boxes" becomes tick-boxes with both right answers set, worth 2');
// four formula pictures that ARE the options A-D are titled with their letters
const pic = (name, label) => ({ name, mime: 'image/png', data: 'x', ...(label ? { label } : {}) });
files['homework-13D-2026-10-25.json'] = JSON.stringify({ ...hw, title: '13D letters', questions: [
  { type: 'mcq', text: 'Which expression?', options: ['A', 'B', 'C', 'D'], answer: 2, points: 1, images: [pic('stem'), pic('a'), pic('b'), pic('c'), pic('d')] },
  { type: 'mcq', text: 'Which graph?', options: ['A', 'B'], answer: 0, points: 1, images: [pic('g1', 'A'), pic('g2', 'B')] }] });
items.length = 0;
ctx.makeHomework('pk', 'homework-13D-2026-10-25.json');
const titles = items.filter((i) => i.kind === 'image').map((i) => i.setTitle || '-');
check(titles.join('|') === 'Question 1|Question 1, option A|Question 1, option B|Question 1, option C|Question 1, option D|Question 2, option A|Question 2, option B', 'option pictures are titled A, B, C, D (got: ' + titles.join(' | ') + ')');

console.log('── schema 2 quiz files (mark points, number answers, template copy)');
// a v2 file: a split point, a calculation (number box), a 6-mark level question and a multi-part OCR-style question
const v2 = { schema: 2, cls: '10C2', due: '2026-10-26', kind: 'exam-practice', tier: 'core', board: 'AQA', topic: 'P1 Energy', title: '10C2 P1 Energy exam practice (Core)', minutes: 14,
  intro: 'Exam practice on P1 Energy. 4 questions, about 14 minutes. Do it in one go.', left: [], questions: [
    { type: 'mcq', label: 'Question 1', text: 'Why did the student insulate the beaker?', options: ['To increase energy transfer.', 'To reduce energy transfer.'], answer: 1, points: 1, feedback: '' },
    { type: 'number', label: 'Question 2', text: 'The power of the kettle is 2000 W. Calculate the energy transferred in 12 s.', unit: 'J', marks: 2, scheme: '✓ 1 mark: E = 2000 × 12\n✓ 1 mark: E = 24 000 (J)',
      markPoints: [{ id: 'q2-1', kind: 'method', marks: 1, says: 'E = 2000 × 12' }, { id: 'q2-2', kind: 'answer', marks: 1, says: 'E = 24 000 (J)', also: ['24 kJ'] }] },
    { type: 'written', label: 'Question 3(b)', text: 'Give one reason the temperature rise was smaller than calculated.', marks: 1, scheme: '✓ 1 mark: the block transfers energy to the surroundings',
      markPoints: [{ id: 'q3b-1', kind: 'point', marks: 1, says: 'the block transfers energy to the surroundings', also: ['heat lost to the surroundings'], no: ['heat escapes'] }] },
    { type: 'written', label: 'Question 4', text: 'Describe how to measure the specific heat capacity of a metal block.', marks: 6, scheme: 'Level 3 (5-6 marks): ...',
      markPoints: [1, 2, 3].map((L) => ({ id: 'q4-' + L, kind: 'level', marks: 2, level: L, from: L * 2 - 1, to: L * 2, says: 'level ' + L + ' description' })), levels: [] },
    { type: 'written', label: 'Question 5', text: '(a) State Wien law. [1]\n(b) Calculate T. [2]', marks: 3, scheme: '...',
      markPoints: [{ kind: 'point', marks: 1, part: '(a)', says: 'λT = constant' }, { kind: 'mark', marks: 1, k: 1, of: 2, part: '(b)', says: '550 × 5800 = 370 × T; T = 8600 (K)' }, { kind: 'mark', marks: 1, k: 2, of: 2, part: '(b)', says: '550 × 5800 = 370 × T; T = 8600 (K)' }] },
  ] };
files['homework-10C2-2026-10-26-core.json'] = JSON.stringify(v2);
props.TEMPLATE_FORM_ID = 'TPL';
items.length = 0; calls.create = 0; calls.copy.length = 0; calls.openById = 0; Object.keys(settings).forEach((k) => delete settings[k]);
const rv2 = ctx.makeHomework('pk', 'homework-10C2-2026-10-26-core.json');
check(calls.copy.length === 1 && calls.copy[0].id === 'TPL' && calls.copy[0].title === v2.title && calls.openById === 1 && calls.create === 0 && settings.setTitle === v2.title && !/without the template/.test(rv2.made[0].note),
  'TEMPLATE_FORM_ID set: the template is copied into the quiz folder, opened, retitled; no "without the template" note');
check(settings.setLimitOneResponsePerUser === true, 'template copy: one response per pupil is still switched on');
const pg = items.filter((i) => i.kind !== 'image');
const txt = items.find((i) => i.kind === 'text'), work = items.find((i) => i.kind === 'written' && /Your working/.test(i.setTitle || ''));
check(txt && txt.setTitle === '2. The power of the kettle is 2000 W. Calculate the energy transferred in 12 s. Give your answer in J.' && txt.setValidation && txt.setValidation.steps.join() === 'requireNumber' && /Type a number only/.test(txt.setValidation.help) && txt.setRequired === true,
  'number question: a number box ("numbers only" checking) titled with the unit');
check(work && work.setTitle === '2. Your working (not required)' && work.setRequired === false && pg.indexOf(work) === pg.indexOf(txt) + 1 && txt.setPoints === undefined, 'number question: an optional working box straight after it; neither box scores');
const yn = items.filter((i) => i.kind === 'mcq' && /^Question \d/.test(i.setTitle || ''));
check(yn.length === 9 && yn.every((i) => i.choices.map((c) => c.v).join() === 'Yes,No' && i.choices[0].ok && !i.choices[1].ok && i.setRequired === true), 'marking page: one Yes/No per mark point (2 + 1 + 3 levels + 3), Yes is the "correct" answer, all required');
const byT = (re) => yn.find((i) => re.test(i.setTitle));
const p3 = byT(/^Question 3\(b\), mark 1/);
check(p3 && p3.setTitle === 'Question 3(b), mark 1: did you say the block transfers energy to the surroundings?' && p3.setPoints === 1 && p3.setFeedbackForIncorrect.text === 'You missed: the block transfers energy to the surroundings'
  && /Also accepted: heat lost to the surroundings/.test(p3.setHelpText) && /No mark for: heat escapes/.test(p3.setHelpText), 'a point: the scheme\'s own words in the title, "You missed" on a No, also accepted / no mark for under it');
const m2 = byT(/^Question 2, working mark/), a2 = byT(/^Question 2, final answer/);
check(m2 && m2.setTitle === 'Question 2, working mark: did your working show E = 2000 × 12?' && a2 && a2.setTitle === 'Question 2, final answer: did you get E = 24 000 (J)?' && /Also accepted: 24 kJ/.test(a2.setHelpText), 'a calculation: a working mark, then "did you get" the final answer');
const h2 = items.find((i) => i.kind === 'header' && /^Question 2 \(2 marks\)/.test(i.setTitle));
check(h2 && /A correct final answer gets all the marks/.test(h2.setHelpText) && /E = 24 000/.test(h2.setHelpText), 'calculation block: the whole scheme plus "a correct final answer gets all the marks"');
const lv = yn.filter((i) => /Level/.test(i.setTitle));
check(lv.length === 3 && lv.every((i) => i.setPoints === 2) && /^Question 4, Level 1 \(1 to 2 marks\)/.test(lv[0].setTitle) && !/level before/.test(lv[0].setHelpText) && /level before/.test(lv[1].setHelpText)
  && /Start at Level 1/.test(items.find((i) => i.kind === 'header' && /^Question 4/.test(i.setTitle)).setHelpText), 'a 6-mark level question: Level 1 first, 2 points each, "Yes only if the level before"');
const p5 = yn.filter((i) => /^Question 5/.test(i.setTitle));
check(p5.length === 3 && /^Question 5\(a\), mark 1: did you say λT = constant\?$/.test(p5[0].setTitle) && /^Question 5\(b\), mark 1 of 2: did your answer earn this mark\?$/.test(p5[1].setTitle) && /T = 8600/.test(p5[1].setHelpText),
  'a multi-part question: each item names its part; an unsplit 2-marker is "mark 1 of 2" with the whole point under it');
const formTotal = items.filter((i) => typeof i.setPoints === 'number').reduce((n, i) => n + i.setPoints, 0);
check(formTotal === 13 && ctx.totalPoints_(v2) === 13 && lastReceipt()['homework-10C2-2026-10-26-core.json'].points === 13, 'Form total = multiple choice + every mark point (1 + 2 + 1 + 6 + 3 = 13) = the points the planner records');
const mcq1 = yn.length && items.find((i) => i.kind === 'mcq' && /^1\. Why/.test(i.setTitle));
check(mcq1 && items.some((i) => i.kind === 'written' && /^3\(b\)\. Give one reason.*\[1 mark\]$/.test(i.setTitle)), 'page 1 numbers come from the labels ("1.", "3(b).")');
// the template copy failing: made from scratch, and said
const realCopy = ctx.DriveApp.getFileById;
ctx.DriveApp.getFileById = (id) => (id === 'TPL' ? { makeCopy() { throw new Error('File not found: TPL'); } } : realCopy(id));
files['homework-10C2-2026-10-27-core.json'] = JSON.stringify({ ...v2, due: '2026-10-27' });
calls.create = 0;
const rbad = ctx.makeHomework('pk', 'homework-10C2-2026-10-27-core.json');
check(calls.create === 1 && /template Form could not be copied \(File not found: TPL\)/.test(rbad.made[0].note) && /Made without the template/.test(rbad.made[0].note), 'template deleted: the Form is still made, and the note says why pupils may not see their score');
ctx.DriveApp.getFileById = realCopy;

console.log('── due times and Classroom drafts');
const t = (d) => { const x = ctx.ukToUtc_(d, 8, 0); return x.hours + ':' + String(x.minutes).padStart(2, '0'); };
check(t('2026-10-23') === '7:00' && t('2026-10-24') === '7:00', '8:00 UK before the clocks go back (Fri 23 Oct 2026) is 07:00 UTC');
check(t('2026-10-26') === '8:00' && t('2026-10-25') === '8:00', '8:00 UK after the clocks go back (Mon 26 Oct 2026) is 08:00 UTC');
check(t('2027-03-29') === '7:00' && t('2027-03-26') === '8:00', '8:00 UK after the clocks go forward (Mon 29 Mar 2027) is 07:00 UTC again');
coursework = null;
const dr = ctx.classroomDraft_(v2, form, { due: '2026-10-23', message: 'Hello 10C2' });
check(dr.ok && dr.courseWorkId && coursework.body.dueTime.hours === 7 && coursework.body.dueTime.minutes === 0 && coursework.body.dueDate.day === 23 && !('scheduledTime' in coursework.body)
  && coursework.body.description === 'Hello 10C2' && coursework.body.title === 'P1 Energy exam practice' && coursework.body.maxPoints === 13 && coursework.body.state === 'DRAFT',
  'draft: due 23 Oct at 07:00 UTC (8am UK), the message as its text, titled "P1 Energy exam practice", out of 13, no post time');
const ds = ctx.classroomDraft_(v2, form, { due: '2026-11-02', postAt: '2026-10-26T15:10' });
check(ds.ok && ds.scheduled && coursework.body.dueTime.hours === 8 && coursework.body.scheduledTime === '2026-10-26T15:10:00.000Z' && coursework.body.state === 'DRAFT', '"Schedule it": due 2 Nov 08:00 UTC, posts itself at 15:10 UK on 26 Oct');
const ds2 = ctx.classroomDraft_(v2, form, { due: '2026-10-21', postAt: '2026-10-19T15:10' });
check(coursework.body.scheduledTime === '2026-10-19T14:10:00.000Z' && ds2.dueUtc === '2026-10-21T07:00Z', 'post time in summer time: 15:10 UK is 14:10 UTC');

console.log('── set homework (the Homework tab)');
allCoursework.length = 0; calls.create = 0; calls.copy.length = 0; lockTaken = 0;
files['homework-10C2-2026-11-02-core.json'] = JSON.stringify({ ...v2, due: '2026-11-02' });
const item1 = { cls: '10C2', kind: 'exam-practice', file: 'homework-10C2-2026-11-02-core.json', setOn: '2026-10-19', dueOn: '2026-10-21', post: 'draft', message: 'This is exam practice on P1 Energy.' };
const s1 = ctx.setHomework('pk', item1);
const s2 = ctx.setHomework('pk', item1);
check(s1.ok && s1.draft && !s1.already && s1.formUrl && s2.ok && s2.already && /Already made on Mon 19 Oct|Already made on/.test(s2.why) && s2.formUrl === s1.formUrl,
  'set homework: the second click for the same class and quiz is refused ("Already made"), with the links');
check(calls.copy.length === 1 && allCoursework.length === 1 && lockTaken === 2, 'two clicks make ONE Form and ONE Classroom draft (lock + receipt + Homework tab)');
const hrows = sheets.Homework.rows;
check(hrows.length === 2 && hrows[0][0] === 'id' && hrows[1][0] === '10C2-2026-10-19-1' && hrows[1][1] === '10C2' && hrows[1][4] === item1.file && hrows[1][5] === 'core' && hrows[1][9] === s1.courseWorkId && day(hrows[1][12]) === '2026-10-21' && hrows[1][13] === '2026-10-21T07:00Z' && hrows[1][14] === 13 && hrows[1][15] === 'drafted',
  'one row in the Homework sheet tab: id, class, file, tier, Classroom id, due, due in UTC, points, "drafted"');
check(lastReceipt()[item1.file].courseWorkId === s1.courseWorkId, 'the receipt (homework-made.json) keeps the Classroom id');
// bug 1.1 (audit 28 Oct): a second homework for the same class on the same day must get id -2. Sheets stores the
// "set on" column as a Date, so a string comparison never matched and every id ended in -1.
files['homework-10C2-2026-11-09-core.json'] = JSON.stringify({ ...v2, due: '2026-11-09' });
const s1b = ctx.setHomework('pk', { ...item1, file: 'homework-10C2-2026-11-09-core.json', dueOn: '2026-11-09' });
const hwIds = sheets.Homework.rows.slice(1).map((r) => r[0]);
check(s1b.ok && !s1b.already && hwIds.join() === '10C2-2026-10-19-1,10C2-2026-10-19-2', `a second homework for the same class on the same day gets id -2, never a repeat (${hwIds.join(', ')})`);
// the one-off repair for rows written before the fix: only the clashing row is renumbered, and the Log tab says so
sheets.Homework.rows[2][0] = '10C2-2026-10-19-1';
const fixMsg = ctx.fixHomeworkIds();
const fixedIds = sheets.Homework.rows.slice(1).map((r) => r[0]);
check(/Renumbered 1 homework id/.test(fixMsg) && fixedIds.join() === '10C2-2026-10-19-1,10C2-2026-10-19-2' && sheets.Log.rows.some((r) => /homework id renumbered: 10C2-2026-10-19-1 -> 10C2-2026-10-19-2/.test(r[1])),
  'fixHomeworkIds (one-off, run from the editor) renumbers a clashing old row and logs it');
check(/Nothing changed/.test(ctx.fixHomeworkIds()) && sheets.Homework.rows.slice(1).map((r) => r[0]).join() === fixedIds.join(), '...and a second run changes nothing');
// a quiz already made from the menu (Form, no draft): only the draft is made, with the same Form
allCoursework.length = 0; calls.create = 0; calls.copy.length = 0; calls.openByUrl = 0;
const s3 = ctx.setHomework('pk', { cls: '10C2', file: 'homework-10C2-2026-10-26-core.json', setOn: '2026-10-20', dueOn: '2026-10-27', post: 'schedule', postAt: '2026-10-20T15:10' });
check(s3.ok && s3.draft && s3.scheduled && calls.openByUrl === 1 && calls.copy.length === 0 && calls.create === 0 && allCoursework.length === 1 && sheets.Homework.rows.slice(-1)[0][15] === 'scheduled', 'a Form made earlier from the menu: only the Classroom item is made (scheduled), the Form is reused');
// an old receipt that already has a menu-made draft (before 2026-10-18): never a second draft
const rc = lastReceipt(); rc['homework-13D-2026-10-25.json'].draft = true; files['homework-made.json'] = JSON.stringify(rc);
allCoursework.length = 0;
const s4 = ctx.setHomework('pk', { cls: '13D', file: 'homework-13D-2026-10-25.json', setOn: '2026-10-20', dueOn: '2026-10-27' });
check(s4.already && allCoursework.length === 0, 'a quiz the old menu already drafted is not drafted again');
// a class Classroom does not have: the Form is made, the row says so, in plain words
files['homework-9ZZ-2026-11-02.json'] = JSON.stringify({ ...v2, cls: '9ZZ', title: '9ZZ quiz' });
const s5 = ctx.setHomework('pk', { cls: '9ZZ', file: 'homework-9ZZ-2026-11-02.json', setOn: '2026-10-20', dueOn: '2026-10-27' });
check(s5.ok && !s5.draft && /^No Classroom class with 9ZZ in its name\. The Form was made: link it by hand\./.test(s5.why) && /2026-Ph-13D/.test(s5.why) && sheets.Homework.rows.slice(-1)[0][15] === 'form only', 'no Classroom class: "No Classroom class with 9ZZ in its name. The Form was made: link it by hand."');
// replica-test 2026-10-19: the Classroom part failed (class missing, Classroom off, a refused post time);
// once fixed, a second click must make the draft with the SAME Form, not answer "Already made"
const realList = ctx.Classroom.Courses.list;
ctx.Classroom.Courses.list = () => ({ courses: realList().courses.concat([{ id: 'C99', name: '9ZZ Science' }]) });
allCoursework.length = 0; calls.create = 0; calls.copy.length = 0; calls.openByUrl = 0;
const s5b = ctx.setHomework('pk', { cls: '9ZZ', file: 'homework-9ZZ-2026-11-02.json', setOn: '2026-10-20', dueOn: '2026-10-27' });
check(s5b.ok && !s5b.already && s5b.draft && allCoursework.length === 1 && coursework.id === 'C99' && calls.create === 0 && calls.copy.length === 0 && calls.openByUrl === 1 && s5b.formUrl === s5.formUrl
  && sheets.Homework.rows.slice(-1)[0][15] === 'drafted', 'Classroom part failed first time: the next click makes the draft, reusing the same Form');
const s5c = ctx.setHomework('pk', { cls: '9ZZ', file: 'homework-9ZZ-2026-11-02.json', setOn: '2026-10-20', dueOn: '2026-10-27' });
check(s5c.already && allCoursework.length === 1, '...and a third click is refused as already made');
ctx.Classroom.Courses.list = realList;
// Classroom spells 7MLA as "7Ml": it must still find the class
files['homework-7MLA-2026-11-02.json'] = JSON.stringify({ ...hw, cls: '7MLA', title: '7MLA homework' });
const s6 = ctx.setHomework('pk', { cls: '7MLA', file: 'homework-7MLA-2026-11-02.json', setOn: '2026-10-19', dueOn: '2026-11-02' });
check(s6.draft && coursework.id === 'C7' && coursework.body.title === '7MLA homework' && coursework.body.maxPoints === 3 && coursework.body.dueTime.hours === 8, 'old (v1) file through the Homework tab: the 7Ml class is found, the title kept, out of 3, due 08:00 UTC (winter)');
let bad = ''; try { ctx.setHomework('pk', { cls: '10C2', file: 'homework-7MLA-2026-11-02.json', dueOn: '2026-11-03' }); } catch (e) { bad = e.message; }
check(/is for 7MLA, not 10C2/.test(bad), 'a quiz file for another class is refused');
bad = ''; try { ctx.setHomework('pk', { cls: '10C2', file: 'homework-10C2-2026-11-02-core.json', setOn: '2026-10-21', dueOn: '2026-10-21' }); } catch (e) { bad = e.message; }
check(/due date must be after/.test(bad), 'a due date on or before the set day is refused');
check(/^\d{4}-\d{2}-\d{2}$/.test(ctx.checkHomework('pk', 'homework-10C2-2026-11-02-core.json')) && ctx.homeworkList('pk').find((x) => x.name === 'homework-10C2-2026-11-02-core.json').checked, '"Looks right" marks a quiz as checked, and the list shows it');

const lv2 = ctx.homeworkList('pk').find((x) => x.name === 'homework-10C2-2026-10-26-core.json');
const q3 = lv2.hw.questions.find((q) => q.label === 'Question 3(b)');
check(lv2.hw.points === 13 && q3.marking.length === 1 && q3.marking[0].title === 'Question 3(b), mark 1: did you say the block transfers energy to the surroundings?' && q3.marking[0].points === 1 && /Also accepted/.test(q3.marking[0].help),
  'Homework tab check list: page 2 items in the exact Form wording, with points, and the total');

console.log('── other homework kinds, status, marking, results (2026-10-19)');
allCoursework.length = 0;
const sen = { cls: '10C2', kind: 'seneca', title: 'Energy stores on Seneca', link: 'https://app.senecalearning.com/abc', setOn: '2026-10-20', dueOn: '2026-10-27', post: 'draft', message: 'Your homework this week is on Seneca.' };
const l1 = ctx.setHomework('pk', sen);
const senRow = sheets.Homework.rows.slice(-1)[0];
check(l1.ok && l1.draft && allCoursework.length === 1 && coursework.id === 'C9' && coursework.body.title === 'Energy stores on Seneca' && coursework.body.materials[0].link.url === sen.link
  && !('maxPoints' in coursework.body) && coursework.body.state === 'DRAFT' && senRow[2] === 'seneca' && senRow[15] === 'drafted', 'Seneca homework: a Classroom draft with the link, no points, no Form, and a Homework row');
const l2 = ctx.setHomework('pk', sen);
check(l2.already && allCoursework.length === 1, 'the same Seneca homework twice: made once');
let lbad = ''; try { ctx.setHomework('pk', { ...sen, title: '' }); } catch (e) { lbad = e.message; }
check(/give the homework a title/.test(lbad), 'link homework with no title is refused');
lbad = ''; try { ctx.setHomework('pk', { ...sen, title: 'x', link: 'senecalearning.com' }); } catch (e) { lbad = e.message; }
check(/should start with https/.test(lbad), 'a link that is not a web address is refused');
const k1 = ctx.setHomework('pk', { cls: '10C2', kind: 'key', title: 'Key homework 2: energy', setOn: '2026-10-20', dueOn: '2026-10-27', post: 'draft', message: 'Hand it in next lesson.' });
check(k1.draft && !coursework.body.materials, 'key homework with no link: a plain draft (he attaches the file in Classroom)');

// the first quiz row: posted in Classroom (CW1 is PUBLISHED in the fake), due Tue 27 Oct, with the results Form
sheets.Homework.rows[1][6] = 'RES'; sheets.Homework.rows[1][9] = 'CW1'; sheets.Homework.rows[1][12] = '2026-10-27';
const mkItem = (id, title, type, pts, choices) => ({ getId: () => id, getTitle: () => title, getType: () => type,
  asMultipleChoiceItem: () => ({ getPoints: () => pts, getChoices: () => choices }), asCheckboxItem: () => ({ getPoints: () => pts }) });
const its = [mkItem(1, '1. Which is a store of energy?', 'MULTIPLE_CHOICE', 1), mkItem(2, '2. Explain why the block cools.  [3 marks]', 'PARAGRAPH_TEXT'),
  mkItem(3, 'Question 2, mark 1 of 3: did your answer earn this mark?', 'MULTIPLE_CHOICE', 1), mkItem(4, 'Question 2, mark 2 of 3: did your answer earn this mark?', 'MULTIPLE_CHOICE', 1),
  mkItem(5, 'Question 2, mark 3 of 3: did your answer earn this mark?', 'MULTIPLE_CHOICE', 1)];
const byId = (id) => its.find((x) => x.getId() === id);
const resp = (email, when, answers, scores) => ({ getRespondentEmail: () => email, getTimestamp: () => new Date(when),
  getItemResponses: () => Object.keys(answers).map((id) => ({ getItem: () => byId(+id), getResponse: () => answers[id] })),
  getGradableItemResponses: () => Object.keys(scores).map((id) => ({ getItem: () => byId(+id), getScore: () => scores[id][0], getResponse: () => scores[id][1] })) });
resForm = { getItems: () => its, getResponses: () => [
  resp('amy@school', '2026-10-26T18:00:00Z', { 2: 'The block transfers energy to the surroundings by heating because it is hotter than the air.' }, { 1: [1, 'Thermal'], 3: [1, 'Yes'], 4: [1, 'Yes'], 5: [0, 'No'] }),
  resp('ben@school', '2026-10-27T09:30:00Z', { 2: 'heat' }, { 1: [0, 'Kinetic'], 3: [1, 'Yes'], 4: [1, 'Yes'], 5: [1, 'Yes'] }),
] };
const st = ctx.homeworkStatus('pk', true);
const quizRow = st.find((x) => x.formId === 'RES');
check(st.length === sheets.Homework.rows.length - 1 && quizRow && quizRow.live.state === 'PUBLISHED' && quizRow.size === 3 && quizRow.done === 2, 'status: Classroom state, class size and Form responses for each homework');
const before = calls.cwGet;
ctx.homeworkStatus('pk');
check(calls.cwGet === before, 'status is kept for 5 minutes (no second round of Classroom calls)');
{   // 4.6 (2026-10-29): only recent unmarked work is asked about; Refresh asks about all unmarked work
  const H = sheets.Homework.rows, hd = H[0], qi = H.findIndex((r, i) => i && r[hd.indexOf('formId')] === 'RES');
  const keep = H[qi].slice();
  const col = (n) => hd.indexOf(n);
  H[qi][col('dueOn')] = '2026-01-05';   // long past and not marked
  delete cache.hwstat; let n0 = calls.openById; const a = ctx.homeworkStatus('pk');
  const ra = a.find((x) => x.formId === 'RES');
  check(ra.done === null && ra.live === null && /Over 4 weeks old/.test(ra.note), 'status: unmarked work over 4 weeks old is not opened again, and says so');
  n0 = calls.openById; const b = ctx.homeworkStatus('pk', true);
  check(calls.openById > n0 && b.find((x) => x.formId === 'RES').done === 2, 'status: Refresh still checks it');
  H[qi][col('status')] = 'marked'; H[qi][col('dueOn')] = keep[col('dueOn')];
  const mk = ctx.homeworkStatus('pk', true).find((x) => x.formId === 'RES');
  check(mk.done === null && mk.live === null, 'status: marked work never opens its Form or asks Classroom');
  H[qi] = keep; delete cache.hwstat;
}
const r0 = ctx.homeworkResults('pk', quizRow.id);
const amy = r0.pupils.find((p) => p.name === 'Amy Able'), ben = r0.pupils.find((p) => p.name === 'Ben Brief');
check(r0.max === 4 && amy.score === 3 && amy.pct === 75 && !amy.late && !amy.flags.length, 'results: score out of the Form total, %, on time');
check(ben.late && ben.flags.join() === '2', 'results: handed in after 8:00 on the due day = late; 3 marks given for "heat" is flagged');
check(r0.missing.join() === 'Cal Absent', 'results: who has not done it, by name from the Classroom list');
const q1 = r0.questions.find((q) => q.key === '1'), q2 = r0.questions.find((q) => q.key === '2');
check(q1.kind === 'mcq' && q1.pct === 50 && q1.wrong[0].answer === 'Kinetic' && q1.text === 'Which is a store of energy?', 'results: multiple choice % and the wrong answer picked');
check(q2.max === 3 && q2.pct === 83 && q2.missed[0].pct === 50 && /mark 3 of 3/.test(q2.missed[0].title) && q2.text === 'Explain why the block cools.', 'results: self-marked question %, and the mark point missed most');
check(ctx.markHomework('pk', quizRow.id) === 'marked' && sheets.Homework.rows[1][15] === 'marked' && !cache.hwstat, 'Mark as marked saves the tick and forgets the kept status');
check(ctx.markHomework('pk', quizRow.id, false) === 'drafted', '...and can be undone');
// 1.4 (2026-10-29): undoing "marked" on a scheduled post gives back "scheduled", not "drafted"
const schedRow = sheets.Homework.rows.find((r) => r[15] === 'scheduled');
check(schedRow && ctx.markHomework('pk', schedRow[0]) === 'marked' && ctx.markHomework('pk', schedRow[0], false) === 'scheduled' && schedRow[15] === 'scheduled', 'unmarking a scheduled homework restores "scheduled"');
const gb = ctx.setGradeBands('pk', { ks4: [{ g: '7', min: '70' }, { g: '4', min: 140 }, { g: '', min: 3 }] });
check(gb.ks4.length === 2 && gb.ks4[0].min === 70 && gb.ks4[1].min === 100 && JSON.parse(props.GRADE_BANDS).ks3.length === 0, 'grade boundaries saved, kept between 0 and 100, blanks dropped');

sheets.Added = sheet('Added'); sheets.Added.appendRow(['lesson', 'saved']);
sheets.Added.appendRow([JSON.stringify({ cls: '10C2', unit: 'P1', num: '4a', title: 'Extra practice', rel: null }), new Date()]);
const rn = ctx.renameAdded('pk', '10C2', 'P1', 'Extra practice', 'SHC practice');
check(rn.name === 'SHC practice' && JSON.parse(sheets.Added.rows[1][0]).title === 'Extra practice', 'rename an added lesson: the new name is kept beside the first one');
let rnbad = ''; try { ctx.renameAdded('pk', '10C2', 'P1', 'Not there', 'x'); } catch (e) { rnbad = e.message; }
check(/only lessons you added/.test(rnbad), 'a scheme lesson cannot be renamed');

console.log(fails ? `FAILED ${fails}` : 'homework quizzes: all checks pass');
process.exit(fails ? 1 : 0);
