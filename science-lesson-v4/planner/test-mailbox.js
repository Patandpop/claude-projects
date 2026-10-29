// node planner/test-mailbox.js — runs Mailbox.gs and the mailbox half of Code.gs against fake Google
// services (an in-memory Drive), so the home <-> school link is checked without deploying anything.
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');

let fails = 0;
const check = (c, m) => { console.log((c ? '  ✓ ' : '  ✗ ') + m); if (!c) fails++; };

/* ---- fake Drive ---- */
function folder(name) {
  const f = { name, kids: [], files: [], url: 'https://drive/' + name };
  const it = (arr) => { let i = 0; return { hasNext: () => i < arr.length, next: () => arr[i++] }; };
  f.getFoldersByName = (n) => it(f.kids.filter((k) => k.name === n));
  f.getFilesByName = (n) => it(f.files.filter((k) => k.name === n));
  f.createFolder = (n) => { const k = folder(n); f.kids.push(k); return k; };
  f.createFile = (n, text) => { const file = mkFile(n, text); f.files.push(file); return file; };
  f.getUrl = () => f.url;
  f.getFolders = () => it(f.kids);
  f.getName = () => f.name;
  f.created = new Date(Date.now() + (folder.n = (folder.n || 0) + 1) * 1000);
  f.getDateCreated = () => f.created;
  return f;
}
function mkFile(name, text) {
  const file = { name, text, at: new Date() };
  file.getBlob = () => ({ getDataAsString: () => file.text });
  file.setContent = (t) => { file.text = t; file.at = new Date(Date.now() + 1000); };
  file.getLastUpdated = () => file.at;
  return file;
}
const root = folder('My Drive');
// his real folder's name ends with a space (2026-10-08), and an accidental later copy exists
const bcs = root.createFolder('Beechen Cliff Science ');
bcs.createFolder('Admin');
const dup = root.createFolder('Beechen Cliff Science'); dup.createFolder('Admin');
const b1 = bcs.createFolder('Lessons').createFolder('Year 9').createFolder('Biology').createFolder('B1 Cells');

function props(init) { const m = Object.assign({}, init); return { getProperty: (k) => (k in m ? m[k] : null), setProperty: (k, v) => { m[k] = v; } }; }
const common = {
  Utilities: { getUuid: () => '1234abcd-5678-90ef-aaaa-bbbbccccdddd', formatDate: () => '2026-10-07 21:00' },
  Logger: { log: () => {} }, MimeType: { PLAIN_TEXT: 'text/plain' }, JSON, Date, String, Object, Error,
};

/* ---- the mailbox (personal account) ---- */
const mbProps = props({ MAILBOX_KEY: 'k1' });
const mb = vm.createContext(Object.assign({}, common, {
  DriveApp: { getRootFolder: () => root },
  PropertiesService: { getScriptProperties: () => mbProps },
  ContentService: { MimeType: { JSON: 'json' }, createTextOutput: (t) => ({ t, setMimeType() { return this; }, getContentText() { return t; } }) },
  LockService: { getScriptLock: () => ({ waitLock() {}, releaseLock() {} }) },
}));
vm.runInContext(fs.readFileSync(path.join(__dirname, 'Mailbox.gs'), 'utf8'), mb);

/* ---- the school planner (only its mailbox functions are exercised) ---- */
const schoolProps = props({ MAILBOX_URL: 'https://mailbox', MAILBOX_KEY: 'k1', PLANNER_KEY: 'pk' });
const imported = [], schoolCache = {};
const school = vm.createContext(Object.assign({}, common, {
  PropertiesService: { getScriptProperties: () => schoolProps },
  CacheService: { getScriptCache: () => ({ get: (k) => (k in schoolCache ? schoolCache[k] : null), put: (k, v) => { schoolCache[k] = v; }, remove: (k) => { delete schoolCache[k]; } }) },
  UrlFetchApp: { fetch(url, opt) {
    const res = opt && opt.method === 'post'
      ? mb.doPost({ postData: { contents: opt.payload } })
      : mb.doGet({ parameter: Object.fromEntries(new URL(url).searchParams) });
    return { getContentText: () => res.t };
  } },
}));
vm.runInContext(fs.readFileSync(path.join(__dirname, 'Code.gs'), 'utf8'), school);
school.importData_ = (text) => { imported.push(text); return {}; };
school.loadAll_ = () => ({ weeks: { '2026-10-12': { slots: [] } }, learned: { a: 1 }, added: [] });

console.log('── planner mailbox');
mb.setup();
const sync = bcs.kids[0].kids.find((k) => k.name === 'Planner Sync');
check(!!sync, 'setup uses the REAL folder (name with a trailing space), not the later copy');
check(!dup.kids[0].kids.length && root.kids.length === 2, 'no new Beechen Cliff Science folder is made');
check(JSON.parse(mb.doGet({ parameter: { key: 'wrong', op: 'ping' } }).t).ok === false, 'a wrong key is refused');

let r = school.pullData_();
check(r.on && r.note && !imported.length, 'no data file at home yet: nothing imported, no error');
sync.createFile('planner-data.json', '{"classes":{},"timetable":[]}');
r = school.pullData_();
check(r.pulled && imported.length === 1, 'new planner-data.json from home is imported automatically');
r = school.pullData_();
check(!r.pulled && imported.length === 1, 'the same file is not imported twice');

check(school.pushState_() === true, 'saving at school sends planner-state.json home');
// 1.7 (2026-10-29): the push is throttled, the page's nudge sends the last one, results and requests always push
{
  const writes = () => sync.files.filter((f) => f.name === 'planner-state.json').length;
  const before = writes();
  check(school.pushState_() === 'later' && schoolCache.pushDue === '1', 'a second save a moment later does not push again (the server says "later")');
  check(school.pushHome('pk') === true && !schoolCache.pushDue, 'the page\'s nudge after a quiet spell sends the push that was skipped');
  check(school.pushHome('pk') === 'nothing new', 'a nudge with nothing skipped sends nothing');
  check(school.pushState_(true) === true, 'the daily results and "Send to Claude" always push (force)');
  delete schoolCache.pushAt;
  check(school.pushState_() === true, 'once the gap has passed, a save pushes again');
  check(writes() >= before, 'planner-state.json is still written on each real push');
}
const st = JSON.parse(sync.files.find((f) => f.name === 'planner-state.json').text);
check(st.weeks['2026-10-12'] && st.learned.a === 1, 'planner-state.json holds the saved weeks and equipment edits');

// learning loop M1 (2026-10-22): what goes home is class counts only, never a name, email or single score
const res = { id: 'h1', cls: '9XS', title: 'Atoms quiz', dueOn: '2026-10-20', max: 10, size: 28,
  pupils: [{ name: 'Amelia Pond', email: 'apond@school.org', score: 7, pct: 70, late: false, flags: ['3'] }, { name: 'Rory Williams', email: 'rwilliams@school.org', score: 5, pct: 50, late: true, flags: [] }],
  missing: ['Clara Oswald'],
  questions: [{ key: '1', text: 'Which is a compound?', kind: 'mcq', max: 1, pct: 50, wrong: [{ answer: 'O2', count: 1 }], missed: [] },
    { key: '2', text: 'Mass in g', kind: 'number', max: 2, pct: 40, wrong: [{ answer: '12 g', count: 1 }, { answer: 'ask Amelia Pond', count: 1 }], missed: [] },
    { key: '3', text: 'Explain', kind: 'written', max: 3, pct: 30, wrong: [], missed: [{ title: 'atoms joined in a fixed ratio', pct: 80 }] }] };
const home = school.homeResults_(res, { file: 'homework-9XS-2026-10-20.json' });
const homeText = JSON.stringify(home);
check(!/Amelia|Rory|Clara|@school|apond|rwilliams/i.test(homeText) && !('pupils' in home) && !('missing' in home),
  'results for home carry no names, emails, typed free text or pupil list (class counts only)');
check(home.done === 2 && home.avg === 60 && home.late === 1 && home.questions[0].wrong[0].answer === 'O2' && home.questions[1].wrong.length === 1,
  'results for home keep the class numbers: 2 done, average 60%, 1 late, the wrong MCQ answer, a typed number');

const out = school.sendRequest('pk', { kind: 'build', text: 'hi', lessons: [{ when: 'Thu', cls: '9XS', prompt: 'p' }] });
check(!!out.id, '"Send to Claude" request accepted');
const reqs = JSON.parse(sync.files.find((f) => f.name === 'requests.json').text);
check(reqs.length === 1 && reqs[0].lessons[0].cls === '9XS', 'requests.json holds the request for home');

const bad = JSON.parse(mb.doPost({ postData: { contents: JSON.stringify({ key: 'k1', op: 'write', name: 'planner-data.json', text: 'x' }) } }).t);
check(bad.ok === false, 'school cannot overwrite the data file home writes');

const mk = school.mailPost_({ op: 'mkdir', topicRel: 'Year 9/Biology/B1 Cells', folderName: 'Lesson 4a - Extra: practice' });
check(mk.ok && b1.kids.some((k) => k.name === 'Lesson 4a - Extra  practice'), 'New lesson makes an empty folder in the right topic');
const again = school.mailPost_({ op: 'mkdir', topicRel: 'Year 9/Biology/B1 Cells', folderName: 'Lesson 4a - Extra: practice' });
check(again.existed && b1.kids.length === 1, 'asking twice reuses the folder');
check(JSON.parse(mb.doPost({ postData: { contents: JSON.stringify({ key: 'k1', op: 'mkdir', topicRel: 'Year 9/Nope', folderName: 'x' }) } }).t).ok === false, 'a missing topic folder is not created');
check(sync.files.some((f) => f.name === 'mailbox-log.txt' && /created lesson folder/.test(f.text)), 'every write is logged');

console.log(fails ? `FAILED ${fails}` : 'mailbox: all checks pass');
process.exit(fails ? 1 : 0);
