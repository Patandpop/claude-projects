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
const mock = `<script>
window.__DATA = ${data};
window.__HW = ${JSON.stringify(hw)};
window.google = { script: { run: (function make(ok, bad) {
  const api = {
    withSuccessHandler(f) { return make(f, bad); }, withFailureHandler(f) { return make(ok, f); },
    loadAll() { setTimeout(() => ok({ data: window.__DATA, weeks: {}, learned: {}, added: [], hasTemplate: false }), 0); },
    createLesson(k, info) { setTimeout(() => ok({ rec: { cls: info.cls, unit: info.unit, afterKey: info.afterKey, num: info.num, title: info.title, rel: info.makeFolder ? info.topicRel + '/' + info.folderName : null }, message: 'Added, with an empty folder on Drive: ' + info.folderName }), 0); },
    saveWeek() { setTimeout(() => ok({ saved: true }), 0); },
    saveWeeks() { setTimeout(() => ok({ saved: true }), 0); },
    saveLessons() { setTimeout(() => ok({ saved: true }), 0); },
    homeworkList() { setTimeout(() => ok(window.__HW || []), 0); },
    makeHomework(k, name) { setTimeout(() => ok({ made: [{ title: name, form: 'https://forms', draft: true, note: '' }], seen: 1, already: 0, names: [name] }), 0); },
    sendRequest() { setTimeout(() => ok({ id: 'preview' }), 0); },
    setBehaviourUrl(k, u) { setTimeout(() => ok(u), 0); }, learnEquipment() { setTimeout(() => ok(true), 0); },
    myEvents() { setTimeout(() => ok([{ title: 'Department meeting', day: 2, time: '15:30-16:30', allDay: false }, { title: 'Parents evening Y9', day: 3, time: '', allDay: true }]), 0); },
    syncWeek(k, m, evs) { setTimeout(() => ok({ written: evs.length, calendar: 'Lessons (Planner)' }), 0); },
  };
  return api;
})() } };
</script>
<script>${fs.readFileSync(path.join(dir, 'logic.js'), 'utf8')}</script>`;
html = html.replace("<?!= include('Logic') ?>", mock).replace('<?!= JSON.stringify(key) ?>', '"preview"');
if (sel >= 0) html = html.replace('</body>', `<script>setTimeout(() => { S.showMine = true; loadMine(); S.week.extras.push({ day: 1, text: 'Mark 9XS Particles tests', kind: 'marking', kindLabel: '✎' }); S.sel = ${sel}; render(); editor(); }, 300);</script></body>`);
if (view || monday) html = html.replace('</body>', `<script>setTimeout(() => { ${monday ? `loadWeek(P.parse('${monday}')); markGaps();` : ''} ${view ? `S.view = '${view}';` : ''} render(); editor(); }, 400);</script></body>`);
if (js) html = html.replace('</body>', `<script>setTimeout(() => { ${js} }, 900);</script></body>`);
fs.writeFileSync(path.join(dir, out), html);
console.log('planner/preview.html written');
