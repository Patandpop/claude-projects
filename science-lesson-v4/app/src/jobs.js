// Long jobs from the app (lanes/design-installed-app.md 6.1, build step 7). Needs api.js (window.API) first.
// start() asks the planner to run a slow task in the background (Day.gs jobStart) and shows it as a pill; while any job
// is waiting or running, it asks how it is going every 10 seconds (jobStatus). When the app is closed the planner
// notices nobody is asking and sends a "job" notification instead. The pills are kept in this browser (just the job,
// its label and state), so they are still there when the app opens again.
// Works in the browser (window.makeJobs) and in node for the tests (module.exports.makeJobs).
(function (root) {
  'use strict';
  var KEY = 'app.jobs', EVERY = 10000, KEEP = 6;

  function makeJobs(opts) {
    var api = opts.api, store = opts.storage, later = opts.later || function (f, ms) { return setTimeout(f, ms); }, timer = null;
    var J = { onChange: null };
    function load() { try { return JSON.parse(store.getItem(KEY) || '[]'); } catch (e) { return []; } }
    function save(list) { store.setItem(KEY, JSON.stringify(list.slice(0, KEEP))); if (J.onChange) J.onChange(list.slice(0, KEEP)); }
    function put(job) { var list = load().filter(function (x) { return x.id !== job.id; }); list.unshift(job); save(list); }
    function patch(id, ch) {
      var list = load(), hit = list.filter(function (x) { return x.id === id; })[0];
      if (!hit) return;
      Object.keys(ch).forEach(function (k) { hit[k] = ch[k]; }); save(list);
    }
    var busy = function (x) { return x.status === 'queued' || x.status === 'running'; };
    J.list = load;
    J.start = function (kind, args) {
      var id = 'j' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
      put({ id: id, kind: kind, label: '', status: 'sending', small: args === null || args === undefined });
      return api.call('jobStart', kind, args === undefined ? null : args, id).then(function (r) {
        patch(id, { label: r.label, status: r.status, note: r.note || '' }); J.poll(); return r;
      }, function (e) {
        patch(id, { status: 'unsent', note: e && e.server ? e.message : 'No signal: not sent. Try again when you have signal.' }); throw e;
      });
    };
    J.retry = function (id) {   // only for jobs that send nothing big (results, memory map); the order sheet is sent again from its screen
      var hit = load().filter(function (x) { return x.id === id; })[0];
      if (!hit || !hit.small) return Promise.resolve(null);
      J.dismiss(id); return J.start(hit.kind, null);
    };
    J.dismiss = function (id) { save(load().filter(function (x) { return x.id !== id; })); };
    J.poll = function () {
      if (timer) return;
      var pending = load().filter(busy);
      if (!pending.length) return;
      timer = later(function () {
        timer = null;
        Promise.all(load().filter(busy).map(function (x) {
          return api.call('jobStatus', x.id).then(function (r) { patch(x.id, { label: r.label, status: r.status, note: r.note || '', hasFile: !!r.hasFile }); }, function () {});
        })).then(function () { J.poll(); });
      }, EVERY);
    };
    J.file = function (id) { return api.call('jobStatus', id, true).then(function (r) { if (!r.file) throw new Error('The file has gone (files are kept for 6 hours). Make it again.'); return r.file; }); };
    return J;
  }

  if (typeof module !== 'undefined' && module.exports) module.exports = { makeJobs: makeJobs };
  else root.makeJobs = makeJobs;
})(this);
