// node planner/make-preview.js [--select N] — builds planner/preview.html: the real Planner.html with
// the Apps Script server replaced by an in-page stand-in holding planner-data.json, so the page can
// be checked in a headless browser before Patryk deploys it. Nothing here is deployed.
'use strict';
const fs = require('fs');
const path = require('path');
const dir = __dirname;
const arg = (k) => (process.argv.includes(k) ? process.argv[process.argv.indexOf(k) + 1] : null);
const sel = arg('--select') != null ? +arg('--select') : -1;
const js = arg('--js');
const view = arg('--view'); const monday = arg('--monday'); const out = arg('--out') || 'preview.html';
let html = fs.readFileSync(path.join(dir, 'Planner.html'), 'utf8');
const data = fs.readFileSync(path.join(dir, 'planner-data.json'), 'utf8');
// a real homework file from the sync folder, if there is one, for the Homework tab
const hwDir = 'G:/My Drive/Beechen Cliff Science/Admin/Planner Sync';
let hw = [];
try { hw = fs.readdirSync(hwDir).filter((n) => /^homework-.*.json$/.test(n) && n !== 'homework-made.json').map((n) => ({ name: n, made: null, hw: JSON.parse(fs.readFileSync(path.join(hwDir, n), 'utf8')) })); } catch (e) { /* not at home */ }
// a made-up schema 2 quiz (2026-10-18) so the Homework tab always has one to show, Core and Challenge
const sampleQ = (tier) => ({ schema: 2, cls: '10C2', due: '2026-11-02', kind: 'exam-practice', tier, board: 'AQA', topic: 'P1 Energy', title: '10C2 P1 Energy exam practice (' + (tier === 'core' ? 'Core' : 'Challenge') + ')', minutes: 6,
  intro: 'Exam practice on P1 Energy. 3 questions, about 6 minutes. Do it in one go.', left: [{ ref: 'x', label: 'Question 4', why: 'it needs drawing' }], questions: [
    { type: 'mcq', label: 'Question 1', text: 'Why did the student insulate the beaker?', options: ['To increase energy transfer.', 'To reduce energy transfer.'], answer: 1, points: 1, images: [{ name: 'f.png', data: '' }] },
    { type: 'number', label: 'Question 2', text: 'The power of the kettle is 2000 W. Calculate the energy transferred in 12 s.', unit: 'J', marks: 2, scheme: '✓ 1 mark: E = 2000 × 12\n✓ 1 mark: E = 24 000 (J)',
      markPoints: [{ kind: 'method', marks: 1, says: 'E = 2000 × 12' }, { kind: 'answer', marks: 1, says: 'E = 24 000 (J)' }] },
    { type: 'written', label: 'Question 3(b)', text: 'Give one reason the temperature rise was smaller than calculated.', marks: 1, scheme: '✓ 1 mark: the block transfers energy to the surroundings',
      markPoints: [{ kind: 'point', marks: 1, says: 'the block transfers energy to the surroundings', also: ['heat lost to the surroundings'] }] }] });
if (!hw.some((x) => x.hw && x.hw.schema === 2)) hw.push(...['core', 'challenge'].map((t) => ({ name: 'homework-10C2-2026-11-02-' + t + '.json', made: null, checked: null, hw: sampleQ(t) })));
// what the server's homeworkList adds (page 2 wording, points, no pictures): the real Code.gs functions
{
  const vm = require('vm'), cx = vm.createContext({});
  vm.runInContext(fs.readFileSync(path.join(dir, 'Code.gs'), 'utf8') + '\nthis.pointWords_ = pointWords_; this.totalPoints_ = totalPoints_; this.needsDrawing_ = needsDrawing_;', cx);
  hw.forEach((x) => { const h = x.hw; if (!h || !h.questions) return; const v2 = Number(h.schema) >= 2;
    h.questions.forEach((q, n) => { q.pictures = (q.images || []).length; delete q.images; if (q.type === 'mcq' || cx.needsDrawing_(q)) return;
      const N = v2 && q.label ? String(q.label).replace(/^Question\s+/, '') : String(n + 1); let at = 0;
      q.marking = v2 && (q.markPoints || []).length ? q.markPoints.map((p) => { const w = cx.pointWords_(N, p, at + 1); at += p.marks || 0; return { title: w.title, help: w.help, points: p.marks || 1 }; })
        : Array.from({ length: q.marks || 1 }, (z, j) => ({ title: 'Question ' + N + ', mark ' + (j + 1) + ' of ' + (q.marks || 1) + ': did your answer earn this mark?', help: '', points: 1 })); });
    h.points = cx.totalPoints_(h); });
}
const mock = `<script>
window.__DATA = ${data};
window.__HW = ${JSON.stringify(hw)};
window.google = { script: { run: (function make(ok, bad) {
  const api = {
    withSuccessHandler(f) { return make(f, bad); }, withFailureHandler(f) { return make(ok, f); },
    loadAll() { setTimeout(() => ok({ data: window.__DATA, weeks: {}, weekStamps: {}, lessonsStamp: 0, learned: {}, added: [], hasTemplate: false }), 0); },
    createLesson(k, info) { setTimeout(() => ok({ rec: { cls: info.cls, unit: info.unit, afterKey: info.afterKey, num: info.num, title: info.title, rel: info.makeFolder ? info.topicRel + '/' + info.folderName : null }, message: 'Added, with an empty folder on Drive: ' + info.folderName }), 0); },
    saveWeek() { setTimeout(() => ok({ saved: true }), 0); },
    saveWeeks() { setTimeout(() => ok({ saved: true }), 0); },
    saveLessons() { setTimeout(() => ok({ saved: true }), 0); },
    saveLessonChanges(k, changes) { setTimeout(() => ok({ saved: changes.length, stamp: Date.now() }), 0); },
    pushHome() { setTimeout(() => ok('nothing new'), 0); },
    // the Memory tab (big goal 1): made-up class-level evidence, no names
    memoryDetail(k, cls) { setTimeout(() => ok({ evidence: window.__MEMEV || [], dueBelow: 75, updated: '30 Oct 06:10' }), 0); },
    saveClassSetting(k, cls, obj) { setTimeout(() => ok(true), 0); },
    // behaviour, built in (2026-10-12): a made-up class, no real names
    init() { setTimeout(() => ok({ classes: ['7ML', '8XP'], today: ['8XP'], rules: { 2: 'Work ethic', 4: 'Attention' }, version: 22 }), 0); },
    openClass(k, cls) { setTimeout(() => ok({ students: ['Ada Lovelace', 'Alan Turing', 'Marie Curie'].map((n, i) => ({ name: n, short: n.split(' ')[0] + ' ' + n.split(' ')[1][0] + '.', x: 20 + i * 30, y: 50, support: '' })), ratio: 2.6, events: (window.__EV = window.__EV || []) }), 0); },
    logEvent(k, cls, name, type, rule) { setTimeout(() => { window.__EV.push({ id: Date.now() + window.__EV.length, t: '10:05', name, type, rule }); ok(window.__EV.slice()); }, 0); },
    removeEvent(k, cls, id) { setTimeout(() => { window.__EV = window.__EV.filter((e) => e.id !== id); ok(window.__EV.slice()); }, 0); },
    behaviourWeek(k, mon) { setTimeout(() => ok(window.__BW || []), 0); },
    homeworkList() { setTimeout(() => ok(window.__HW || []), 0); },
    setHomework(k, item) { setTimeout(() => ok({ ok: true, formUrl: 'https://forms/view', editUrl: 'https://forms/edit', draft: true, scheduled: item.post === 'schedule', courseWorkId: 'CW1', classroomUrl: 'https://classroom.google.com', why: '', notes: [] }), 300); },
    checkHomework(k, name) { setTimeout(() => ok('2026-10-19'), 0); },
    // made-up homework rows and Form results (2026-10-19), so the status strip, by-class list and results show
    homeworkStatus() { setTimeout(() => ok([
      { id: '10C2-2026-10-19-1', cls: '10C2', kind: 'exam-practice', title: '10C2 P1 Energy exam practice (Core)', tier: 'core', formId: 'F1', formUrl: 'https://forms/view', setOn: '2026-10-19', dueOn: '2026-10-26', status: 'drafted', live: { state: 'PUBLISHED' }, size: 28, done: 19, link: 'https://classroom.google.com' },
      { id: '10S2-2026-10-21-1', cls: '10S2', kind: 'seneca', title: 'Energy resources on Seneca', formId: '', setOn: '2026-10-21', dueOn: '2026-10-28', status: 'drafted', live: { state: 'DRAFT' }, size: null, done: null, link: '' },
      { id: '11S2-2026-10-12-1', cls: '11S2', kind: 'key', title: 'Key homework 2', formId: '', setOn: '2026-10-12', dueOn: '2026-10-19', status: 'drafted', live: { state: 'PUBLISHED' }, size: 29, done: 22, link: '' }]), 0); },
    homeworkResults(k, id) { setTimeout(() => ok({ id, cls: '10C2', title: '10C2 P1 Energy exam practice (Core)', dueOn: '2026-10-26', max: 20, size: 28,
      pupils: Array.from({ length: 19 }, (x, i) => ({ name: 'Pupil ' + (i + 1), email: 'p' + i, score: 4 + (i * 7) % 16, pct: Math.round(100 * (4 + (i * 7) % 16) / 20), late: i === 3, flags: i === 5 ? ['3'] : [] })),
      missing: ['Pupil 20', 'Pupil 21'],
      questions: [{ key: '1', text: 'Which is a store of energy?', kind: 'mcq', max: 1, pct: 84, wrong: [{ answer: 'Sound', count: 3 }], missed: [] },
        { key: '2', text: 'Calculate the kinetic energy of the car.', kind: 'number', max: 3, pct: 52, wrong: [], missed: [{ title: 'final answer: did you get 45 000 J?', pct: 61 }] },
        { key: '3', text: 'Describe a method to find the specific heat capacity of a metal block.', kind: 'written', max: 6, pct: 31, wrong: [], missed: [{ title: 'Level 2 (3 to 4 marks): does your answer match this level?', pct: 72 }] }] }), 200); },
    markHomework(k, id, on) { setTimeout(() => ok(on === false ? 'drafted' : 'marked'), 0); },
    setGradeBands(k, b) { setTimeout(() => ok(b), 0); },
    renameAdded(k, cls, unit, title, name) { setTimeout(() => ok({ cls, unit, title, name }), 0); },
    makeHomework(k, name) { setTimeout(() => ok({ made: [{ title: name, form: 'https://forms', draft: true, note: '' }], seen: 1, already: 0, names: [name] }), 0); },
    sendRequest(k, req) { window.__REQ = req; setTimeout(() => ok({ id: 'preview' }), 0); },
    setBehaviourUrl(k, u) { setTimeout(() => ok(u), 0); }, learnEquipment() { setTimeout(() => ok(true), 0); },
    myEvents() { setTimeout(() => ok([{ title: 'Department meeting', day: 2, time: '15:30-16:30', allDay: false }, { title: 'Parents evening Y9', day: 3, time: '', allDay: true }]), 0); },
    syncWeek(k, m, evs) { setTimeout(() => ok({ written: evs.length, calendar: 'Lessons (Planner)' }), 0); },
  };
  return api;
})() } };
</script>
<script>${fs.readFileSync(path.join(dir, 'logic.js'), 'utf8')}</script>`;
html = html.replace("<?!= include('Logic') ?>", mock).replace('<?!= JSON.stringify(key) ?>', '"preview"').replace('<?!= JSON.stringify(appUrl) ?>', '"https://script.google.com/preview/exec"');
if (sel >= 0) html = html.replace('</body>', `<script>setTimeout(() => { S.showMine = true; loadMine(); S.week.extras.push({ day: 1, text: 'Mark 9XS Particles tests', kind: 'marking', kindLabel: '✎' }); S.sel = ${sel}; render(); editor(); }, 300);</script></body>`);
if (view || monday) html = html.replace('</body>', `<script>setTimeout(() => { ${monday ? `loadWeek(P.parse('${monday}')); markGaps();` : ''} ${view ? `S.view = '${view}';` : ''} render(); editor(); }, 400);</script></body>`);
if (js) html = html.replace('</body>', `<script>setTimeout(() => { ${js} }, 900);</script></body>`);
fs.writeFileSync(path.join(dir, out), html);
console.log('planner/preview.html written');
