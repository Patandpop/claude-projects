// node app/tools/make-push-keys.js you@example.com
//   Makes the keys for notifications (lanes/design-installed-app.md 6.2), once, on the home PC. Nothing is written to a
//   file or sent anywhere: it only prints two blocks for you to copy.
//     1. four secrets for the Cloudflare Worker (app/worker/push-worker.js);
//     2. three Script properties for the planner's Apps Script project.
//   The email goes inside every signed message, so a push service can contact the sender if something goes wrong.
//   Running it again makes new keys: every device then has to switch notifications off and on again.
'use strict';
const crypto = require('crypto');

const email = String(process.argv[2] || '').trim();
if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) { console.error('Give your email address: node app/tools/make-push-keys.js you@example.com'); process.exit(1); }
const b64u = (buf) => Buffer.from(buf).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const { publicKey, privateKey } = crypto.generateKeyPairSync('ec', { namedCurve: 'prime256v1' });
const pub = publicKey.export({ format: 'jwk' }), priv = privateKey.export({ format: 'jwk' });
const raw = Buffer.concat([Buffer.from([4]), Buffer.from(pub.x, 'base64url'), Buffer.from(pub.y, 'base64url')]);
const secret = b64u(crypto.randomBytes(24));

console.log('\n1. Cloudflare: Workers, your push worker, Settings, Variables and secrets. Add each as a Secret:\n');
console.log('   VAPID_PUBLIC   ' + b64u(raw));
console.log('   VAPID_PRIVATE  ' + priv.d);
console.log('   VAPID_SUBJECT  mailto:' + email);
console.log('   PUSH_SECRET    ' + secret);
console.log('\n2. Apps Script: Project Settings, Script properties. Add:\n');
console.log('   PUSH_WORKER_URL  (the worker\'s address, like https://planner-push.<you>.workers.dev)');
console.log('   PUSH_SECRET      ' + secret);
console.log('   PUSH_PUBLIC_KEY  ' + b64u(raw));
console.log('\nKeep VAPID_PRIVATE and PUSH_SECRET to those two places only (never in the repo or a chat).\n');
