// The installed app's service worker (lanes/design-installed-app.md 3.1, build step 5): keeps the app's own files on the
// device so it opens with no signal, and tells the page when a newer build is ready.
//   - only this site's own files are kept: never the planner's server (script.google.com), never the sign-in pages
//     (/cdn-cgi/), never the school test page, never anything sent (only GET);
//   - pages: the network first, the kept copy when there is no signal; other files: the kept copy first, refreshed behind;
//   - every build has its own store, named by the build stamp; old ones are cleared when the new one takes over;
//   - the home page is kept as './', never 'index.html': Cloudflare answers /index.html with a redirect to /, and a
//     browser refuses a kept redirect when opening a page, so the app would not open with no signal. Other pages on the
//     site (the mock-ups) are left to the browser and never replace the kept home page.
'use strict';
var STORE = 'planner-app {{BUILD_STAMP}}';
var SHELL = ['./', 'app.js', 'api.js', 'outbox.js', 'pc-timer.js', 'shared/day-logic.js', 'shared/day-popup.js', 'shared/game-ulhu.js', 'manifest.webmanifest', 'icons/icon-32.png', 'icons/icon-180.png', 'icons/icon-192.png', 'icons/icon-512.png'];

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
    var home = new URL('./', self.registration.scope).pathname, path = new URL(req.url).pathname;
    if (path !== home && path !== home + 'index' && path !== home + 'index.html') return;   // a mock-up page: the browser's job
    e.respondWith(fetch(req).then(function (r) {
      if (r.ok && !r.redirected) { var copy = r.clone(); caches.open(STORE).then(function (c) { c.put('./', copy); }); }
      return r;
    }).catch(function () { return caches.match('./', { cacheName: STORE }); }));
    return;
  }
  e.respondWith(caches.match(req, { cacheName: STORE }).then(function (hit) {
    var net = fetch(req).then(function (r) { if (r.ok) { var copy = r.clone(); caches.open(STORE).then(function (c) { c.put(req, copy); }); } return r; }).catch(function () { return hit; });
    return hit || net;
  }));
});
