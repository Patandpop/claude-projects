// The quick-capture box and the morning sort (Lane C; lanes/design-installed-app.md 3.2 point 1 and 3.11).
// A self-contained piece: DayCapture.mount(element, call, opts). Not attached to any page yet; it goes at the top of the
// day screen once Patryk picks the layout (the box looks the same in all three). Needs planner/day-logic.js first.
//   call(fn, ...args) -> Promise (google.script.run on the planner pages, API.call in the installed app)
//   opts: { names: () => [pupil names known on this device, only compared, never stored], inbox: [rows from dayLoad], storage }
// Saving: the capture is kept in this browser first, so no signal loses nothing; it is sent with its own id, so a
// resend is saved once. The suggested home comes from the fixed keyword rules (DayLogic.sortCapture), never AI.
// The morning sort: each capture shows its suggested home with one-tap confirm, or "Other" to pick another.
// Anything with a class or about a pupil never offers Obsidian.
(function (root) {
  'use strict';
  var Q = 'dayCaptureQueue';
  var CSS = '.dc{color:var(--ink,#12345C)}' +
    '.dc .box{display:flex;gap:6px}' +
    '.dc input{flex:1;min-width:0;border:1px solid var(--line,#C9D6E5);border-radius:10px;padding:10px;font:inherit;background:var(--plate,#fff);color:var(--ink,#12345C)}' +
    '.dc .save{border:0;border-radius:10px;background:var(--deep,#0D2442);color:#fff;font:inherit;font-weight:700;padding:0 14px;cursor:pointer}' +
    '.dc .note{font-size:12px;color:var(--soft,#557192);min-height:1em;margin:4px 2px 0}' +
    '.dc .note.bad{color:var(--warn-text,#8A3F00)}' +
    '.dc h4{font-size:12px;letter-spacing:.06em;text-transform:uppercase;color:var(--soft,#557192);margin:12px 0 6px}' +
    '.dc .it{background:var(--sodium-wash,#FFF3D1);border-radius:10px;padding:8px 10px;font-size:14px;margin-bottom:6px}' +
    '.dc .it b{color:var(--sodium-text,#7A4E00)}' +
    '.dc .it button{font:inherit;font-size:12px;border:1px solid var(--line,#C9D6E5);background:var(--plate,#fff);color:var(--ink,#12345C);border-radius:6px;padding:3px 8px;margin:4px 4px 0 0;cursor:pointer}' +
    '.dc .it button.ok{background:var(--deep,#0D2442);border-color:var(--deep,#0D2442);color:#fff;font-weight:700}';
  function esc(s) { return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function homeLabel(h) {
    return h.home === 'orderSheet' ? 'Order sheet' : h.home === 'class' ? (h.cls || 'Class') : h.home === 'lesson' ? (h.cls + ' L' + h.lesson) : h.home === 'todo' ? 'To-do' : 'Obsidian';
  }

  function mount(el, call, opts) {
    var L = root.DayLogic, o = opts || {}, store = o.storage || root.localStorage;
    if (!L) throw new Error('day-logic.js must load before day-capture.js');
    if (!document.getElementById('dc-css')) { var st = document.createElement('style'); st.id = 'dc-css'; st.textContent = CSS; document.head.appendChild(st); }
    var S = { inbox: (o.inbox || []).slice(), note: '', bad: false, other: '' };
    var names = function () { try { return (o.names && o.names()) || []; } catch (e) { return []; } };
    var queue = function () { try { return JSON.parse(store.getItem(Q) || '[]'); } catch (e) { return []; } };
    var setQueue = function (q) { try { store.setItem(Q, JSON.stringify(q)); } catch (e) {} };

    function draw() {
      var waiting = queue().length;
      var h = '<div class="dc"><div class="box"><input data-dc="text" maxlength="500" placeholder="Capture anything..." aria-label="Capture"><button class="save" data-dc="save">Save</button></div>' +
        '<p class="note' + (S.bad ? ' bad' : '') + '" data-dc="note">' + esc(S.note || (waiting ? waiting + ' waiting to send' : '')) + '</p>';
      if (S.inbox.length) {
        h += '<h4>Sort your captures</h4>' + S.inbox.map(function (x) {
          var sug = { home: x.suggestedHome, cls: x.cls, lesson: x.lesson };
          var row = '<div class="it" data-id="' + esc(x.id) + '">"' + esc(x.text) + '" → <b>' + esc(homeLabel(sug)) + '</b><br>' +
            '<button class="ok" data-dc="file" data-home="' + esc(sug.home) + '">Yes</button><button data-dc="other">Other</button>';
          if (S.other === x.id) {
            var cls = x.cls || L.findClass(x.text), opts2 = [{ home: 'todo' }, { home: 'orderSheet', cls: cls }];
            if (cls) { opts2.push({ home: 'class', cls: cls }); if (x.lesson) opts2.push({ home: 'lesson', cls: cls, lesson: x.lesson }); }
            else if (x.suggestedHome !== 'todo') opts2.push({ home: 'obsidian' });   // never for a class or a pupil
            row += '<br>' + opts2.filter(function (p) { return p.home !== sug.home; }).map(function (p) {
              return '<button data-dc="file" data-home="' + p.home + '">' + esc(homeLabel(p)) + '</button>'; }).join('');
          }
          return row + '</div>';
        }).join('');
      }
      var old = el.querySelector('[data-dc=text]'), typed = old ? old.value : '', focused = old && document.activeElement === old;
      el.innerHTML = h + '</div>';
      var inp = el.querySelector('[data-dc=text]'); inp.value = typed; if (focused) inp.focus();   // a redraw never loses what he is typing
    }
    function flush() {
      var q = queue(); if (!q.length) return Promise.resolve(0);
      var x = q[0];
      return call('captureSave', x.text, x.at, x.id, x.sug).then(function () {
        setQueue(queue().filter(function (y) { return y.id !== x.id; }));
        return flush().then(function (n) { return n + 1; });
      }, function () { return 0; });
    }
    function save() {
      var inp = el.querySelector('[data-dc=text]'), text = inp.value.trim();
      if (!text) return Promise.resolve();
      var sug = L.sortCapture(text, names()), at = Date.now();
      var item = { id: 'c' + at.toString(36) + Math.random().toString(36).slice(2, 6), text: text, at: at, sug: { home: sug.home, cls: sug.cls, lesson: sug.lesson || '' } };
      setQueue(queue().concat([item]));   // kept on this device first
      inp.value = '';
      S.note = 'Saved. Suggested home: ' + homeLabel(item.sug) + '.'; S.bad = false; draw();
      return flush().then(function () {
        if (queue().some(function (y) { return y.id === item.id; })) { S.note = 'Saved on this device; it sends when there is signal.'; draw(); }
      });
    }
    function file(id, home) {
      var x = S.inbox.find(function (y) { return y.id === id; }); if (!x) return;
      var h = { home: home, cls: home === 'obsidian' ? '' : (x.cls || L.findClass(x.text)), lesson: x.lesson };
      return call('captureFile', id, h).then(function (r) {
        S.inbox = S.inbox.filter(function (y) { return y.id !== id; }); S.other = ''; S.bad = false;
        S.note = r && r.held ? 'Kept for Obsidian. Nothing is written there until you switch it on in Settings.' : 'Filed: ' + homeLabel(h) + '.';
        draw();
        if (o.onFiled) o.onFiled(id, h);
      }, function (e) { S.note = 'Not filed: ' + ((e && e.message) || 'no signal'); S.bad = true; draw(); });
    }
    el.addEventListener('click', function (e) {
      var b = e.target.closest('[data-dc]'); if (!b || !el.contains(b)) return;
      var k = b.getAttribute('data-dc'), it = b.closest('.it'), id = it && it.getAttribute('data-id');
      if (k === 'save') save();
      else if (k === 'other') { S.other = S.other === id ? '' : id; draw(); }
      else if (k === 'file') file(id, b.getAttribute('data-home'));
    });
    el.addEventListener('keydown', function (e) { if (e.key === 'Enter' && e.target.getAttribute('data-dc') === 'text') { e.preventDefault(); save(); } });
    if (root.addEventListener) root.addEventListener('online', function () { flush().then(draw); });
    draw(); flush().then(function (n) { if (n) draw(); });
    return { save: save, flush: flush, file: file, state: function () { return S; }, setInbox: function (rows) { S.inbox = (rows || []).slice(); draw(); } };
  }

  var api = { mount: mount, homeLabel: homeLabel };
  if (typeof module === 'object' && module.exports) module.exports = api; else root.DayCapture = api;
})(typeof window !== 'undefined' ? window : this);
