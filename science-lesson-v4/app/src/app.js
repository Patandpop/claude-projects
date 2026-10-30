// The installed app's shell (lanes/design-installed-app.md 3.1, build step 5). Needs api.js (window.API) and outbox.js
// (window.Outbox) first. Shows "Set up this device" until the server address and key are saved (then tests them with
// one harmless read), else the home card and Settings: theme, change or forget the key, waiting taps, and "Update now"
// when a newer build is ready. Registers the service worker (sw.js) so the app installs and opens with no signal.
(function () {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };
  var LS = { get: function (k) { try { return localStorage.getItem(k); } catch (e) { return null; } }, set: function (k, v) { try { localStorage.setItem(k, v); } catch (e) {} } };
  function say(el, text, good) { el.textContent = text || ''; el.className = 'msg' + (text ? (good ? ' good' : ' bad') : ''); }

  // ---- theme: Auto follows the device; the same choice as the phone page's
  function theme(t) {
    t = /^(auto|light|dark)$/.test(t) ? t : 'auto';
    document.documentElement.dataset.theme = t; LS.set('app.theme', t);
    Array.prototype.forEach.call($('theme').children, function (b) { b.setAttribute('aria-pressed', String(b.dataset.t === t)); });
  }
  theme(LS.get('app.theme'));
  $('theme').addEventListener('click', function (e) { var b = e.target.closest('button'); if (b) theme(b.dataset.t); });

  // ---- which screen
  function show(which, why) {
    var setup = which === 'setup';
    $('setup').classList.toggle('hidden', !setup); $('home').classList.toggle('hidden', setup);
    if (setup) {
      var s = API.settings();
      $('url').value = s.url; $('key').value = '';
      $('cancel').classList.toggle('hidden', !API.ready());
      say($('setupMsg'), why || '', false);
    } else {
      var u = API.settings().url;
      $('server').textContent = 'Connected to ' + u.replace(/^https:\/\/script\.google\.com\/macros\/s\/(.{6}).*$/, 'your planner (…$1…)') + '. The key is kept on this device only.';
      drawOutbox();
    }
  }
  API.onLocked = function () { show('setup', 'The planner did not accept the key. Type it again.'); };

  // ---- set up: save, then one harmless read to prove the address and key work
  $('save').onclick = function () {
    var before = API.settings();
    try { API.save($('url').value, $('key').value); } catch (e) { return say($('setupMsg'), e.message, false); }
    $('save').disabled = true; say($('setupMsg'), 'Testing...', true);
    API.call('getMode').then(function () {
      $('save').disabled = false; $('key').value = ''; show('home'); say($('homeMsg'), 'Connected. This device is set up.', true);
      Outbox.flush();
    }, function (e) {
      $('save').disabled = false;
      if (e && e.message === 'Locked') { restore(before); return say($('setupMsg'), 'The planner did not accept that key. Check it and try again.', false); }
      if (!navigator.onLine) return say($('setupMsg'), 'Saved. No signal to test it now; it will be used when signal returns.', true);
      restore(before); say($('setupMsg'), 'Could not reach the planner: ' + ((e && e.message) || 'no answer') + '. Check the address.', false);
    });
  };
  function restore(s) {   // a failed test puts the old, working settings back (or none)
    try { if (s.url && s.key) API.save(s.url, s.key); else { localStorage.removeItem('app.serverUrl'); localStorage.removeItem('app.key'); } } catch (e) {}
  }
  $('cancel').onclick = function () { show('home'); };
  $('change').onclick = function () { show('setup'); };
  $('forgetKey').onclick = function () {
    if (!confirm('Forget the planner key on this device? You will type it again to use the app here.')) return;
    try { localStorage.removeItem('app.key'); } catch (e) {}
    show('setup', '');
  };
  ['url', 'key'].forEach(function (id) { $(id).addEventListener('keydown', function (e) { if (e.key === 'Enter') $('save').click(); }); });

  // ---- waiting taps (the outbox)
  function drawOutbox() {
    var w = Outbox.waiting().length, st = Outbox.stuck();
    $('outbox').classList.toggle('hidden', !w && !st.length);
    $('waiting').textContent = (w ? w + ' waiting to send. ' : '') + (st.length ? st.length + ' the planner would not take:' : '');
    $('stuckList').innerHTML = '';
    st.forEach(function (x) { var li = document.createElement('li'); li.textContent = x.label + (x.why ? ' (' + x.why + ')' : ''); $('stuckList').appendChild(li); });
    $('stuckBtns').classList.toggle('hidden', !st.length);
  }
  Outbox.onChange = drawOutbox;
  $('retry').onclick = function () { Outbox.retryStuck(); };
  $('forget').onclick = function () { Outbox.forgetStuck(); };

  // ---- signal
  function net() { var on = navigator.onLine; $('net').textContent = on ? 'Online' : 'No signal'; $('net').classList.toggle('off', !on); }
  window.addEventListener('online', net); window.addEventListener('offline', net); net();

  // ---- this PC's evening timer (pc-timer.js): off unless switched on here; a sync every 5 minutes while the app is open
  var PC = window.makePcTimer && window.DayLogic ? makePcTimer({ fetch: window.fetch.bind(window), storage: localStorage, api: API, logic: DayLogic }) : null;
  var pcLoop = null, rulesAsked = false;
  function pcDraw(text, good) {
    var on = !!(PC && PC.state().on);
    Array.prototype.forEach.call($('pcOn').children, function (b) { b.setAttribute('aria-pressed', String((b.dataset.v === 'on') === on)); });
    if (text !== undefined) say($('pcMsg'), text, good);
  }
  function pcTick() {
    if (!PC || !PC.state().on) return;
    if (!rulesAsked && API.ready()) { rulesAsked = true; API.call('timerRules').then(function (r) { PC.setRules(r); }, function () { rulesAsked = false; }); }
    PC.sync().then(function (r) {
      var c = PC.current();
      pcDraw('Counting. Last sent ' + new Date().toTimeString().slice(0, 5) + (c ? '; now: ' + c.job + (c.cls ? ' ' + c.cls : '') : '') + '.', true);
      var p = PC.popupDue();
      if (p && window.DayPopup) DayPopup.show(document.body, { job: p.job, cls: p.cls, since: p.since, ledger: p.ledger, onNotThat: function () { PC.notThat(); } });
    }, function (e) { pcDraw(e.message, false); });
  }
  function pcStart() { if (pcLoop) clearInterval(pcLoop); pcLoop = PC && PC.state().on ? setInterval(pcTick, 5 * 60 * 1000) : null; pcTick(); }
  if (PC) {
    $('pcOn').addEventListener('click', function (e) {
      var b = e.target.closest('button'); if (!b) return;
      PC.setOn(b.dataset.v === 'on'); pcDraw(b.dataset.v === 'on' ? 'Looking for ActivityWatch...' : 'Off. Nothing is counted on this PC.', b.dataset.v !== 'on'); pcStart();
    });
    pcDraw(); pcStart();
  } else $('pcCard').classList.add('hidden');

  // ---- install and updates
  if ('serviceWorker' in navigator && location.protocol !== 'file:') {
    navigator.serviceWorker.register('sw.js').then(function (reg) {
      function waiting() { if (reg.waiting && navigator.serviceWorker.controller) $('update').classList.remove('hidden'); }
      waiting();
      reg.addEventListener('updatefound', function () { var nw = reg.installing; if (nw) nw.addEventListener('statechange', function () { if (nw.state === 'installed') waiting(); }); });
      $('updateNow').onclick = function () { if (reg.waiting) reg.waiting.postMessage('update'); };
    }).catch(function () { /* no offline copy on this browser; the app still works online */ });
    var reloaded = false;
    navigator.serviceWorker.addEventListener('controllerchange', function () { if (!reloaded && !$('update').classList.contains('hidden')) { reloaded = true; location.reload(); } });
  }

  show(API.ready() ? 'home' : 'setup');
})();
