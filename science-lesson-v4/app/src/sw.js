// The installed app's service worker (lanes/design-installed-app.md 3.1, build step 5): keeps the app's own files on the
// device so it opens with no signal, and tells the page when a newer build is ready.
//   - only this site's own files are kept: never the planner's server (script.google.com), never the sign-in pages
//     (/cdn-cgi/), never the school test page, never anything sent (only GET);
//   - pages: the network first, the kept copy when there is no signal; other files: the kept copy first, refreshed behind;
//   - every build has its own store, named by the build stamp; old ones are cleared when the new one takes over.
'use strict';
var STORE = 'planner-app {{BUILD_STAMP}}';
var SHELL = ['./', 'index.html', 'app.js', 'api.js', 'outbox.js', 'pc-timer.js', 'shared/day-logic.js', 'shared/day-popup.js', 'shared/game-ulhu.js', 'manifest.webmanifest', 'icons/icon-32.png', 'icons/icon-180.png', 'icons/icon-192.png', 'icons/icon-512.png'];

self.addEventListener('install', function (e) {
  e.waitUntil(caches.open(STORE).then(function (c) { return c.addAll(SHELL); }));
});
self.addEventListener('activate', function (e) {
  e.waitUntil(caches.keys().then(function (keys) {
    return Promise.all(keys.filter(function (k) { return k.indexOf('planner-app ') === 0 && k !== STORE; }).map(function (k) { return caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});
self.addEventListener('message', function (e) { if (e.data === 'update') self.skipWaiting(); });   // the page's "Update now" button

function mine(req) {
  var u = new URL(req.url);
  return req.method === 'GET' && u.origin === self.location.origin && !/^\/(cdn-cgi|test)(\/|$)/.test(u.pathname);
}
self.addEventListener('fetch', function (e) {
  var req = e.request;
  if (!mine(req)) return;   // the browser handles it as normal
  if (req.mode === 'navigate') {
    e.respondWith(fetch(req).then(function (r) {
      if (r.ok) { var copy = r.clone(); caches.open(STORE).then(function (c) { c.put('index.html', copy); }); }
      return r;
    }).catch(function () { return caches.match('index.html', { cacheName: STORE }); }));
    return;
  }
  e.respondWith(caches.match(req, { cacheName: STORE }).then(function (hit) {
    var net = fetch(req).then(function (r) { if (r.ok) { var copy = r.clone(); caches.open(STORE).then(function (c) { c.put(req, copy); }); } return r; }).catch(function () { return hit; });
    return hit || net;
  }));
});
