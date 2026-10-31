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
      drawOutbox(); pushRefresh(); drawJobs(); if (JOBS) JOBS.poll();
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

  // ---- notifications on this device (push.js): off until switched on here; the planner says whether it is set up
  var PUSH = window.makePush ? makePush({ api: API, storage: localStorage, navigator: navigator, Notification: window.Notification, pushManagerOk: 'PushManager' in window }) : null;
  function pushKinds() { return [$('pushMorning').checked && 'morning', $('pushNudge').checked && 'nudge', $('pushJob').checked && 'job'].filter(Boolean); }
  function pushDraw(st, text, good) {
    var on = !!(st && st.device && st.device.status === 'on');
    Array.prototype.forEach.call($('pushOn').children, function (b) { b.setAttribute('aria-pressed', String((b.dataset.v === 'on') === on)); });
    if (on) { $('pushMorning').checked = st.device.kinds.indexOf('morning') >= 0; $('pushNudge').checked = st.device.kinds.indexOf('nudge') >= 0; $('pushJob').checked = st.device.kinds.indexOf('job') >= 0; }
    $('pushTest').classList.toggle('hidden', !on);
    if (text !== undefined) say($('pushMsg'), text, good);
  }
  function pushFail(e) {
    var m = (e && e.message) || 'No answer';
    pushDraw(null, /^Not allowed/.test(m) ? 'This copy of the planner has no notifications yet (they come with the next paste).' : m, false);
  }
  function pushRefresh() {
    if (!PUSH || !API.ready()) return;
    if (!PUSH.supported()) return pushDraw(null, 'This browser cannot show notifications. On an iPhone, add the app to the home screen first.', false);
    PUSH.status().then(function (st) {
      if (!st || typeof st.ready !== 'boolean') return pushFail({ message: 'Not allowed' });
      var gone = st.device && st.device.status === 'gone';
      pushDraw(st, !st.ready ? 'Not set up on the planner yet.' : gone ? 'This device stopped receiving them. Switch On again.' : st.device && st.device.status === 'on' ? 'On for this device.' : '', !!st.ready && !gone);
    }, function (e) { if (navigator.onLine) pushFail(e); });
  }
  function pushSwitch(wantOn) {
    if (wantOn && !pushKinds().length) return say($('pushMsg'), 'Tick at least one kind first.', false);
    say($('pushMsg'), wantOn ? 'Switching on...' : 'Switching off...', true);
    (wantOn ? PUSH.on(pushKinds()) : PUSH.off()).then(function (st) {
      pushDraw(st, wantOn ? 'On. Press "Send a test" to check it arrives.' : 'Off for this device.', true);
    }, pushFail);
  }
  if (PUSH) {
    $('pushOn').addEventListener('click', function (e) { var b = e.target.closest('button'); if (b) pushSwitch(b.dataset.v === 'on'); });
    ['pushMorning', 'pushNudge', 'pushJob'].forEach(function (id) { $(id).addEventListener('change', function () {
      if ($('pushOn').querySelector('[data-v="on"]').getAttribute('aria-pressed') === 'true') pushSwitch(true);   // on: save the new ticks
    }); });
    $('pushTest').onclick = function () {
      say($('pushMsg'), 'Sending...', true);
      PUSH.test().then(function (r) { say($('pushMsg'), r && r.sent ? 'Sent. It should arrive in a few seconds.' : (r && r.why) || 'Not sent: this device has gone. Switch On again.', !!(r && r.sent)); }, pushFail);
    };
  } else $('pushCard').classList.add('hidden');

  // ---- background jobs (jobs.js): a pill each at the top of Today; the order sheet's file downloads from its pill
  var JOBS = window.makeJobs ? makeJobs({ api: API, storage: localStorage }) : null;
  var JOB_NAMES = { orderSheet: 'order sheet', results: 'homework results', memory: 'memory map' };
  function cap(t) { return t.charAt(0).toUpperCase() + t.slice(1); }
  function drawJobs() {
    var box = $('jobs'); box.innerHTML = '';
    (JOBS ? JOBS.list() : []).forEach(function (j) {
      var name = cap(j.label || JOB_NAMES[j.kind] || 'job'), el = document.createElement('span'), btn = function (text, fn) { var b = document.createElement('button'); b.className = 'plain'; b.textContent = text; b.onclick = fn; el.appendChild(b); };
      var busy = j.status === 'queued' || j.status === 'running' || j.status === 'sending', bad = j.status === 'failed' || j.status === 'unsent';
      el.className = 'pill' + (j.status === 'done' ? ' done' : bad ? ' bad' : '');
      el.appendChild(document.createTextNode(busy ? 'Making ' + name.toLowerCase() + '...' : j.status === 'done' ? name + ' ready' : name + ': ' + (j.note || 'did not work')));
      if (j.status === 'done' && j.hasFile) btn('Download', function () { download(j.id); });
      if (bad && j.small) btn('Try again', function () { JOBS.retry(j.id).catch(function () {}); });
      if (!busy) btn('x', function () { JOBS.dismiss(j.id); });
      box.appendChild(el);
    });
  }
  function download(id) {
    JOBS.file(id).then(function (f) {
      var bin = atob(f.b64), bytes = new Uint8Array(bin.length);
      for (var i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
      var a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([bytes], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }));
      a.download = f.name; document.body.appendChild(a); a.click(); setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
    }, function (e) { say($('homeMsg'), e.message, false); });
  }
  if (JOBS) {
    JOBS.onChange = drawJobs;
    $('jobCard').addEventListener('click', function (e) {
      var b = e.target.closest('button[data-job]'); if (!b) return;
      JOBS.start(b.dataset.job, null).catch(function (err) { if (err && /^Not allowed/.test(err.message)) say($('homeMsg'), 'This copy of the planner has no background jobs yet (they come with the next paste).', false); });
    });
  } else $('jobCard').classList.add('hidden');

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
