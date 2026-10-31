// Notifications on this device (lanes/design-installed-app.md 6.2, build step 8). Needs api.js (window.API) first.
// Switching on asks the browser's permission, makes this device's push address with the planner's public key, and saves
// it on the planner (Day.gs pushSave) with the kinds ticked: "morning" (07:00 on school days: lessons not built) and
// "nudge" (Ulhu, at most one a day). Switching off removes the address here and marks it off on the planner.
// The device id is made once and kept in this browser; nothing else is stored here.
// Works in the browser (window.makePush) and in node for the tests (module.exports.makePush).
(function (root) {
  'use strict';
  var ID_KEY = 'app.deviceId';

  function keyBytes(b64) {   // the planner's public key, base64url, as the bytes the browser wants
    var s = String(b64 || '').replace(/-/g, '+').replace(/_/g, '/'); s += '==='.slice((s.length + 3) % 4);
    var bin = atob(s), out = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
    return out;
  }

  function makePush(opts) {
    var api = opts.api, store = opts.storage, nav = opts.navigator, N = opts.Notification;
    function deviceId() {
      var id = store.getItem(ID_KEY);
      if (!id) { id = 'd' + Date.now().toString(36) + Math.random().toString(36).slice(2, 10); store.setItem(ID_KEY, id); }
      return id;
    }
    function label() { var ua = String((nav && nav.userAgent) || ''); return /Android|iPhone|iPad/.test(ua) ? 'Phone' : 'Computer'; }
    var P = {};
    // can this browser show notifications at all? (iPhone: only once the app is on the home screen)
    P.supported = function () { return !!(N && nav && nav.serviceWorker && opts.pushManagerOk !== false); };
    P.permission = function () { return N ? N.permission : 'denied'; };
    P.status = function () { return api.call('pushStatus', deviceId()); };
    function sub(reg, publicKey) {
      return reg.pushManager.getSubscription().then(function (s) {
        return s || reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyBytes(publicKey) });
      });
    }
    // switch on (or change the ticked kinds)
    P.on = function (kinds) {
      if (!P.supported()) return Promise.reject(new Error('This browser cannot show notifications. On an iPhone, add the app to the home screen first.'));
      return P.status().then(function (st) {
        if (!st || !st.ready) throw new Error('Notifications are not set up on the planner yet (see the Lane C log).');
        return Promise.resolve(N.permission === 'granted' ? 'granted' : N.requestPermission()).then(function (perm) {
          if (perm !== 'granted') throw new Error('Notifications are blocked for this app. Allow them in the browser\'s site settings, then try again.');
          return nav.serviceWorker.ready.then(function (reg) { return sub(reg, st.publicKey); });
        });
      }).then(function (s) {
        var j = s.toJSON ? s.toJSON() : s;
        return api.call('pushSave', { deviceId: deviceId(), label: label(), endpoint: j.endpoint, keys: { p256dh: j.keys.p256dh, auth: j.keys.auth } }, kinds);
      });
    };
    P.off = function () {
      var drop = nav && nav.serviceWorker ? nav.serviceWorker.ready.then(function (reg) { return reg.pushManager.getSubscription(); })
        .then(function (s) { return s && s.unsubscribe(); }).catch(function () {}) : Promise.resolve();
      return drop.then(function () { return api.call('pushRemove', deviceId()); });
    };
    P.test = function () { return api.call('pushTest', deviceId()); };
    P.deviceId = deviceId;
    return P;
  }

  if (typeof module !== 'undefined' && module.exports) module.exports = { makePush: makePush, keyBytes: keyBytes };
  else root.makePush = makePush;
})(this);
