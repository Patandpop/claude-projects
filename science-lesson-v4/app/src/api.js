// The installed app's only way to the server (lanes/design-installed-app.md 2.2 and 5).
// Every screen calls API.call('fn', ...args) or a named shortcut (API.init(), API.gameLoad(...)). To move off Apps
// Script one day, only this file changes. It POSTs { key, fn, args } as plain text to the planner's web app (Day.gs
// doPost), the shape Apps Script accepts from another site, and follows Google's redirect.
//   - the server address and the planner key are typed once per device and kept in this browser, never in the repo;
//   - a network failure is retried once after a second; a refusal from the server is never retried;
//   - "Locked" (wrong or missing key) calls onLocked so the app can ask for the key again.
// Works in the browser (window.API) and in node for the tests (module.exports.makeApi).
(function (root) {
  'use strict';
  var NAMES = ['init', 'openClass', 'logEvent', 'logMany', 'removeEvent', 'removeMany', 'positivesOver', 'getMode', 'setMode',
    'setLive', 'setLost', 'setSupport', 'getSilence', 'setLimit', 'showRecap', 'stopRecap', 'setTimer', 'adjustTimer',
    'stopTimer', 'setPause', 'endMode', 'getFriday', 'markEmailed', 'lessonMcqs', 'saveVote', 'removeVote',
    'loadAll', 'saveWeek', 'saveWeeks', 'saveLessonChanges', 'saveLessons', 'saveClassSetting', 'learnEquipment',
    'createLesson', 'renameAdded', 'sendRequest', 'pushHome', 'behaviourWeek', 'syncWeek', 'myEvents', 'homeworkList',
    'checkHomework', 'setHomework', 'homeworkStatus', 'markHomework', 'homeworkResults', 'setGradeBands',
    'turnOnDailyResults', 'setBehaviourUrl', 'exportXlsx',
    'gameLoad', 'gameTick', 'gameUntick', 'gameSaveGoal', 'gameAim', 'gameVespers'];
  var URL_KEY = 'app.serverUrl', KEY_KEY = 'app.key';

  function ServerError(msg) { var e = new Error(msg); e.server = true; return e; }

  function makeApi(opts) {
    var fetchFn = opts.fetch, store = opts.storage, wait = opts.wait || function (ms) { return new Promise(function (r) { setTimeout(r, ms); }); };
    var api = { onLocked: null, names: NAMES.slice() };
    api.settings = function () { return { url: store.getItem(URL_KEY) || '', key: store.getItem(KEY_KEY) || '' }; };
    api.save = function (url, key) {
      url = String(url || '').trim(); key = String(key || '').trim();
      if (!/^https:\/\/script\.google\.com\/macros\/s\/[\w-]+\/exec$/.test(url)) throw new Error('The server address should look like https://script.google.com/macros/s/.../exec');
      if (!/^[A-Za-z0-9-]{6,64}$/.test(key)) throw new Error('The key is letters, numbers and dashes only');   // e.g. 1b4e28ba-2fa1
      store.setItem(URL_KEY, url); store.setItem(KEY_KEY, key);
    };
    api.ready = function () { var s = api.settings(); return !!(s.url && s.key); };

    function once(fn, args) {
      var s = api.settings();
      if (!s.url || !s.key) return Promise.reject(ServerError('Locked'));
      return fetchFn(s.url, { method: 'POST', redirect: 'follow', headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ key: s.key, fn: fn, args: args }) })
        .then(function (r) {
          if (!r.ok) throw new Error('The server answered ' + r.status);
          return r.json().catch(function () { throw ServerError('The server sent something that is not an answer (is the address right?)'); });
        })
        .then(function (j) {
          if (j && j.ok === true) return j.result;
          throw ServerError((j && j.error) || 'No answer');
        });
    }
    api.call = function (fn) {
      var args = Array.prototype.slice.call(arguments, 1);
      return once(fn, args).catch(function (e) {
        if (e.server) throw e;
        return wait(1000).then(function () { return once(fn, args); });   // one retry for a network blip
      }).catch(function (e) {
        if (e.server && e.message === 'Locked' && typeof api.onLocked === 'function') api.onLocked();
        throw e;
      });
    };
    NAMES.forEach(function (n) { api[n] = function () { return api.call.apply(null, [n].concat(Array.prototype.slice.call(arguments))); }; });
    return api;
  }

  if (typeof module === 'object' && module.exports) module.exports = { makeApi: makeApi, NAMES: NAMES };
  else root.API = makeApi({ fetch: root.fetch.bind(root), storage: root.localStorage });
})(typeof window !== 'undefined' ? window : this);
