// The installed app's outbox (lanes/design-installed-app.md 4): taps made without signal (positives and points, Ulhu
// ticks, timer start and stop, captures, to-do ticks) wait here and are sent in the order they were made when signal
// returns. The phone page's tap queue, made general.
//   - every item has its own id and the time it was made; the caller puts the id in the server call where the server
//     takes one (logEvent, gameTick), so a resend is never counted twice;
//   - it lives in the browser's storage, so it survives closing the app;
//   - no signal: everything waits, nothing counts against an item;
//   - a refusal from the server while signal looks fine counts; after three the item is set aside as "stuck" (shown
//     to Patryk with Try again and Forget), so one bad item can never block the ones behind it.
// Works in the browser (window.Outbox, needs window.API) and in node for the tests (module.exports.makeOutbox).
(function (root) {
  'use strict';
  var Q = 'app.outbox', STUCK = 'app.stuck';

  function makeOutbox(opts) {
    var store = opts.storage, api = opts.api, online = opts.online || function () { return true; }, now = opts.now || Date.now;
    var read = function (k) { try { return JSON.parse(store.getItem(k) || '[]'); } catch (e) { return []; } };
    var write = function (k, v) { store.setItem(k, JSON.stringify(v)); };
    var flushing = null, seq = 0;
    var box = { onChange: null };
    function changed() { if (typeof box.onChange === 'function') box.onChange(box.waiting().length, box.stuck().length); }

    box.waiting = function () { return read(Q); };
    box.stuck = function () { return read(STUCK); };
    // add a call; args may contain the placeholder '$id' and '$at', filled with this item's id and time
    box.add = function (fn, args, label) {
      var at = now(), id = 'o' + at.toString(36) + '-' + (seq++).toString(36) + '-' + Math.random().toString(36).slice(2, 6);
      var filled = (args || []).map(function (a) { return a === '$id' ? id : a === '$at' ? at : a; });
      var q = read(Q); q.push({ id: id, at: at, fn: fn, args: filled, label: label || fn, tries: 0 }); write(Q, q); changed();
      return id;
    };
    box.flush = function () {
      if (flushing) return flushing;
      flushing = (function step(sent) {
        var q = read(Q); if (!q.length || !online()) return Promise.resolve(sent);
        var item = q[0];
        return api.call.apply(null, [item.fn].concat(item.args)).then(function () {
          write(Q, read(Q).filter(function (x) { return x.id !== item.id; })); changed();
          return step(sent + 1);
        }, function (e) {
          if (!e || !e.server || !online()) return sent;   // no signal: everything waits, nothing counts
          var rest = read(Q).filter(function (x) { return x.id !== item.id; });
          item.tries = (item.tries || 0) + 1; item.why = String(e.message || e).slice(0, 120);
          if (item.tries >= 3) { write(STUCK, read(STUCK).concat([item])); write(Q, rest); changed(); return step(sent); }
          write(Q, [item].concat(rest)); changed(); return sent;
        });
      })(0).then(function (n) { flushing = null; return n; }, function (e) { flushing = null; throw e; });
      return flushing;
    };
    box.retryStuck = function () { var st = read(STUCK); write(STUCK, []); write(Q, st.map(function (x) { x.tries = 0; return x; }).concat(read(Q))); changed(); return box.flush(); };
    box.forgetStuck = function () { write(STUCK, []); changed(); };
    return box;
  }

  if (typeof module === 'object' && module.exports) module.exports = { makeOutbox: makeOutbox };
  else {
    root.Outbox = makeOutbox({ storage: root.localStorage, api: root.API, online: function () { return root.navigator.onLine; } });
    root.addEventListener('online', function () { root.Outbox.flush(); });
    root.setInterval(function () { root.Outbox.flush(); }, 15000);
  }
})(typeof window !== 'undefined' ? window : this);
