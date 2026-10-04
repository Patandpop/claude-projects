// node planner/make-preview.js [--select N] — builds planner/preview.html: the real Planner.html with
// the Apps Script server replaced by an in-page stand-in holding planner-data.json, so the page can
// be checked in a headless browser before Patryk deploys it. Nothing here is deployed.
'use strict';
const fs = require('fs');
const path = require('path');
const dir = __dirname;
const sel = process.argv.includes('--select') ? +process.argv[process.argv.indexOf('--select') + 1] : -1;
let html = fs.readFileSync(path.join(dir, 'Planner.html'), 'utf8');
const data = fs.readFileSync(path.join(dir, 'planner-data.json'), 'utf8');
const mock = `<script>
window.__DATA = ${data};
window.google = { script: { run: (function make(ok, bad) {
  const api = {
    withSuccessHandler(f) { return make(f, bad); }, withFailureHandler(f) { return make(ok, f); },
    loadAll() { setTimeout(() => ok({ data: window.__DATA, weeks: {}, learned: {}, hasTemplate: false }), 0); },
    saveWeek() { setTimeout(() => ok({ saved: true }), 0); }, learnEquipment() { setTimeout(() => ok(true), 0); },
    myEvents() { setTimeout(() => ok([{ title: 'Department meeting', day: 2, time: '15:30-16:30', allDay: false }, { title: 'Parents evening Y9', day: 3, time: '', allDay: true }]), 0); },
    syncWeek(k, m, evs) { setTimeout(() => ok({ written: evs.length, calendar: 'Lessons (Planner)' }), 0); },
  };
  return api;
})() } };
</script>
<script>${fs.readFileSync(path.join(dir, 'logic.js'), 'utf8')}</script>`;
html = html.replace("<?!= include('Logic') ?>", mock).replace('<?!= JSON.stringify(key) ?>', '"preview"');
if (sel >= 0) html = html.replace('</body>', `<script>setTimeout(() => { S.showMine = true; loadMine(); S.week.extras.push({ day: 1, text: 'Mark 9XS Particles tests', kind: 'marking', kindLabel: '✎' }); S.sel = ${sel}; render(); editor(); }, 300);</script></body>`);
fs.writeFileSync(path.join(dir, 'preview.html'), html);
console.log('planner/preview.html written');
