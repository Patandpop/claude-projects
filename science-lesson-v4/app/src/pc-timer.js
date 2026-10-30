// The home PC's evening timer (lanes/design-installed-app.md section 8, build step 10). While the installed app is open
// on the home PC and this is switched on, it reads ActivityWatch's record on this PC (http://localhost:5600, free, local),
// turns each window into a job and class with the Timer Rules (DayLogic.mapWindow: Gmail = Emails, a lesson PowerPoint =
// Building lessons 9AS, ...; anything else = Personal), takes away the idle time, and sends only minutes per day, job
// and class (timerLog). Window titles never leave this PC.
//   - counts from where it last stopped, so a closed app back-fills the gap next time (two days at most);
//   - part-minutes are carried over, so many short syncs add up to the right total;
//   - the "counted up to" mark only moves when the planner has saved the totals, and every row has its own id, so a
//     resend after no signal is saved once;
//   - Little Ulhu's pop-up: when a new job has been in front for 2 minutes he says what he is counting ("Not that" marks
//     it "maybe" for the report); from 19:00 he says once that he is counting quietly, and nothing else.
// makePcTimer({ fetch, storage, api, logic: DayLogic, now }) -> { sync(), current(), popupDue(), notThat(), state() }
(function (root) {
  'use strict';
  var AW = 'http://localhost:5600/api/0';
  var K = 'app.pcTimer';            // { on, upTo (ms), pending: { 'day|job|cls': seconds }, shown, night, notThat: { day, key } }
  var LATEST = 19 * 60, SETTLE = 2 * 60 * 1000, BACKFILL = 2 * 24 * 3600 * 1000;

  var pad = function (n) { return (n < 10 ? '0' : '') + n; };
  var dayOf = function (ms) { var d = new Date(ms); return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); };
  var minOf = function (ms) { var d = new Date(ms); return d.getHours() * 60 + d.getMinutes(); };

  // the seconds of [a, b) not covered by any of the idle stretches
  function activeSeconds(a, b, idle) {
    var cut = 0;
    idle.forEach(function (x) { var s = Math.max(a, x.s), e = Math.min(b, x.e); if (e > s) cut += e - s; });
    return Math.max(0, (b - a - cut) / 1000);
  }

  function makePcTimer(o) {
    var store = o.storage, api = o.api, L = o.logic, now = o.now || Date.now, fetchFn = o.fetch;
    var read = function () { try { return JSON.parse(store.getItem(K) || '{}') || {}; } catch (e) { return {}; } };
    var write = function (v) { store.setItem(K, JSON.stringify(v)); };
    var last = { cur: null, rules: null, error: '' };

    function getJson(url) {
      return fetchFn(url).then(function (r) { if (!r.ok) throw new Error('ActivityWatch answered ' + r.status); return r.json(); });
    }
    function buckets() {
      return getJson(AW + '/buckets/').then(function (b) {
        var ids = Object.keys(b || {});
        var win = ids.filter(function (i) { return /^aw-watcher-window/.test(i); })[0], afk = ids.filter(function (i) { return /^aw-watcher-afk/.test(i); })[0];
        if (!win) throw new Error('ActivityWatch is running but is not watching windows yet');
        return { win: win, afk: afk };
      });
    }
    function events(id, a, b) {
      return getJson(AW + '/buckets/' + encodeURIComponent(id) + '/events?start=' + encodeURIComponent(new Date(a).toISOString()) + '&end=' + encodeURIComponent(new Date(b).toISOString()) + '&limit=-1');
    }

    // one sync: read since the mark, add up, send whole minutes, keep the rest
    function sync() {
      var st = read();
      if (!st.on) return Promise.resolve({ off: true });
      var end = now(), midnight = new Date(new Date(end).toDateString()).getTime();
      var start = st.upTo ? Math.max(st.upTo, end - BACKFILL) : midnight;   // first time: from midnight today
      var rules = last.rules;
      return buckets().then(function (bk) {
        return Promise.all([events(bk.win, start, end), bk.afk ? events(bk.afk, start, end) : []]);
      }).then(function (res) {
        var idle = (res[1] || []).filter(function (x) { return x.data && x.data.status === 'afk'; })
          .map(function (x) { var s = Date.parse(x.timestamp); return { s: s, e: s + (x.duration || 0) * 1000 }; });
        var pending = Object.assign({}, st.pending || {}), latest = last.cur;
        (res[0] || []).slice().sort(function (a, b) { return Date.parse(a.timestamp) - Date.parse(b.timestamp); }).forEach(function (x) {
          var s = Math.max(Date.parse(x.timestamp), start), e = Math.min(Date.parse(x.timestamp) + (x.duration || 0) * 1000, end);
          if (!(e > s)) return;
          var sec = activeSeconds(s, e, idle); if (!sec) return;
          var m = L.mapWindow(x.data && x.data.app, x.data && x.data.title, rules), key = dayOf(s) + '|' + m.job + '|' + m.cls;
          pending[key] = (pending[key] || 0) + sec;
          // the job in front now, and since when it has been (a run of windows with the same job counts as one)
          if (!latest || latest.job !== m.job || latest.cls !== m.cls) latest = { at: Date.parse(x.timestamp), job: m.job, cls: m.cls };
        });
        if (latest) last.cur = latest;
        var rows = [], keep = {}, nt = st.notThat || {};
        Object.keys(pending).forEach(function (key, i) {
          var whole = Math.floor(pending[key] / 60), p = key.split('|');
          if (pending[key] - whole * 60 > 0) keep[key] = pending[key] - whole * 60;
          if (whole > 0) rows.push({ id: 'pc-' + p[0] + '-' + end.toString(36) + '-' + i, day: p[0], job: p[1], cls: p[2], minutes: whole,
            startedAt: start, endedAt: end, maybe: nt.day === p[0] && nt.key === p[1] + '|' + p[2] });
        });
        var send = rows.length ? api.call('timerLog', rows) : Promise.resolve({ saved: 0 });
        return send.then(function (r) {
          var st2 = read(), today = dayOf(end); st2.upTo = end; st2.pending = keep; st2.lastOk = end;   // the mark moves only now
          if (!st2.sent || st2.sent.day !== today) st2.sent = { day: today, min: {} };   // today's sent minutes, for the night tally
          rows.forEach(function (r) { if (r.day === today) { var k = r.job + '|' + r.cls; st2.sent.min[k] = (st2.sent.min[k] || 0) + r.minutes; } });
          write(st2);
          last.error = '';
          return { sent: rows.length, saved: r && r.saved, rows: rows };
        });
      }).catch(function (e) {
        last.error = (e && e.message) || 'ActivityWatch did not answer';
        if (/Failed to fetch|NetworkError|did not answer|answered/.test(last.error) && !/^The server|Locked/.test(last.error)) last.error = 'ActivityWatch is not answering on this PC (is it running?)';
        throw new Error(last.error);
      });
    }

    // what to show: 'day' when a new job has been in front for 2 minutes (before 19:00), 'night' once per evening after
    // 19:00 while counting; marks it shown so it is never repeated
    function popupDue() {
      var st = read(), c = last.cur, t = now();
      if (!st.on || !c || t - c.at < SETTLE) return null;
      var key = c.job + '|' + c.cls;
      if (minOf(t) >= LATEST) {
        if (st.night === dayOf(t)) return null;
        st.night = dayOf(t); st.shown = key; write(st);
        return { kind: 'night', job: c.job, cls: c.cls, since: c.at, ledger: tonight(st, t) };
      }
      if (st.shown === key) return null;
      st.shown = key; write(st);
      return { kind: 'day', job: c.job, cls: c.cls, since: c.at };
    }
    // the tally for the night pop-up: minutes per job and class today, sent plus still waiting
    function tonight(st, t) {
      var day = dayOf(t), acc = {}, sent = st.sent && st.sent.day === day ? st.sent.min : {};
      Object.keys(sent).forEach(function (k) { acc[k] = sent[k]; });
      Object.keys(st.pending || {}).forEach(function (k) { var p = k.split('|'); if (p[0] === day) acc[p[1] + '|' + p[2]] = (acc[p[1] + '|' + p[2]] || 0) + st.pending[k] / 60; });
      return Object.keys(acc).map(function (k) { var p = k.split('|'); return { job: p[0], cls: p[1], minutes: Math.round(acc[k]) }; })
        .filter(function (r) { return r.minutes > 0; }).sort(function (a, b) { return b.minutes - a.minutes; });
    }
    function notThat() { var st = read(), c = last.cur; if (!c) return; st.notThat = { day: dayOf(now()), key: c.job + '|' + c.cls }; write(st); }
    function setOn(on) { var st = read(); st.on = !!on; if (on && !st.upTo) st.upTo = 0; write(st); }

    return { sync: sync, popupDue: popupDue, notThat: notThat, setOn: setOn, current: function () { return last.cur; },
      setRules: function (r) { last.rules = r && r.length ? r : null; }, state: function () { return Object.assign(read(), { error: last.error }); } };
  }

  if (typeof module === 'object' && module.exports) module.exports = { makePcTimer: makePcTimer, activeSeconds: activeSeconds };
  else root.makePcTimer = makePcTimer;
})(typeof window !== 'undefined' ? window : this);
