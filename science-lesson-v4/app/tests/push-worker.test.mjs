// node app/tests/push-worker.test.mjs : the notification Worker (app/worker/push-worker.js).
// The Worker locks messages with the browser's WebCrypto; this test opens them again with node's own crypto (a second,
// separate implementation of RFC 8291), checks the signature with the public key, and checks the Worker's rules.
import crypto from 'node:crypto';
import { encryptPayload, vapidHeader, handle, b64u } from '../worker/push-worker.js';

let failed = 0;
const ok = (n, c) => { console.log((c ? 'PASS ' : 'FAIL ') + 'push worker: ' + n); if (!c) failed++; };

// a made-up phone: its own key pair and auth secret, as the browser makes them
const phone = crypto.createECDH('prime256v1'); phone.generateKeys();
const auth = crypto.randomBytes(16);
const sub = { endpoint: 'https://fcm.googleapis.com/fcm/send/abc123', keys: { p256dh: b64u(phone.getPublicKey()), auth: b64u(auth) } };
const hk = (salt, ikm, info, n) => Buffer.from(crypto.hkdfSync('sha256', ikm, salt, info, n));

function open(body) {   // RFC 8291 section 3.4, done the other way round with node's crypto
  const salt = body.subarray(0, 16), rs = body.readUInt32BE(16), idlen = body[20], as = body.subarray(21, 21 + idlen), ct = body.subarray(21 + idlen);
  const shared = phone.computeSecret(as);
  const ikm = hk(auth, shared, Buffer.concat([Buffer.from('WebPush: info\0'), phone.getPublicKey(), as]), 32);
  const cek = hk(salt, ikm, Buffer.from('Content-Encoding: aes128gcm\0'), 16), nonce = hk(salt, ikm, Buffer.from('Content-Encoding: nonce\0'), 12);
  const d = crypto.createDecipheriv('aes-128-gcm', cek, nonce); d.setAuthTag(ct.subarray(ct.length - 16));
  const plain = Buffer.concat([d.update(ct.subarray(0, ct.length - 16)), d.final()]);
  return { rs, idlen, last: plain[plain.length - 1], text: plain.subarray(0, plain.length - 1).toString('utf8') };
}

const msg = JSON.stringify({ title: 'Today', body: '9AS P2 Latent heat not built' });
const sealed = Buffer.from(await encryptPayload(msg, sub.keys.p256dh, sub.keys.auth));
const o = open(sealed);
ok('a locked message opens on the phone with its own keys (a separate implementation)', o.text === msg && o.last === 2 && o.rs === 4096 && o.idlen === 65);
ok('every message is locked afresh (new salt and server key each time)', !Buffer.from(await encryptPayload(msg, sub.keys.p256dh, sub.keys.auth)).subarray(0, 86).equals(sealed.subarray(0, 86)));
let bad = ''; try { await encryptPayload(msg, 'AAAA', sub.keys.auth); } catch (e) { bad = e.message; }
ok('bad device keys are refused', /Bad device keys/.test(bad));

// the planner's own signing keys, as make-push-keys.js makes them
const { publicKey, privateKey } = crypto.generateKeyPairSync('ec', { namedCurve: 'prime256v1' });
const pj = publicKey.export({ format: 'jwk' });
const env = { VAPID_PUBLIC: b64u(Buffer.concat([Buffer.from([4]), Buffer.from(pj.x, 'base64url'), Buffer.from(pj.y, 'base64url')])),
  VAPID_PRIVATE: privateKey.export({ format: 'jwk' }).d, VAPID_SUBJECT: 'mailto:someone@example.com', PUSH_SECRET: 'made-up-secret-123' };
const now = Date.UTC(2026, 10, 2, 7, 0);
const h = await vapidHeader(sub.endpoint, env, now), m = /^vapid t=([^.]+)\.([^.]+)\.([^,]+), k=(.+)$/.exec(h);
const claims = m && JSON.parse(Buffer.from(m[2], 'base64url'));
ok('the signed line names the push service, expires within a day, and carries the public key', m && claims.aud === 'https://fcm.googleapis.com' && claims.exp - now / 1000 <= 86400 && claims.exp > now / 1000 && claims.sub === env.VAPID_SUBJECT && m[4] === env.VAPID_PUBLIC);
ok('the signature checks out with the public key', m && crypto.verify('sha256', Buffer.from(m[1] + '.' + m[2]), { key: publicKey, dsaEncoding: 'ieee-p1363' }, Buffer.from(m[3], 'base64url')));

// the Worker itself, with a fake push service
const sent = [];
const fake = async (url, init) => { sent.push({ url, init }); return { status: url.includes('gone') ? 410 : 201 }; };
const req = (body, secret, path = '/send', method = 'POST') => new Request('https://planner-push.example.workers.dev' + path, { method, headers: secret ? { 'X-Push-Secret': secret } : {}, body: method === 'POST' ? JSON.stringify(body) : undefined });
const R = async (r) => ({ status: r.status, body: await r.json().catch(() => null) });

let r = await R(await handle(req({ subs: [sub], msg: { title: 'x' } }, 'wrong'), env, fake));
ok('a wrong secret is refused and nothing is sent', r.status === 403 && sent.length === 0);
r = await R(await handle(req({ subs: [sub], msg: { title: 'x' } }), env, fake));
ok('no secret is refused', r.status === 403 && sent.length === 0);
r = await R(await handle(req({ subs: [sub, Object.assign({}, sub, { endpoint: 'https://fcm.googleapis.com/fcm/send/gone1' }), { endpoint: 'http://not-safe', keys: sub.keys }], msg: { title: 'Today', body: 'hi' } }, env.PUSH_SECRET), env, fake));
ok('the right secret sends to each device and reports each one (410 = that device has gone)', r.status === 200 && r.body.ok && r.body.results.map((x) => x.status).join() === '201,410,0' && sent.length === 2);
const hd = sent[0].init.headers;
ok('each send is locked and signed the standard way', hd['Content-Encoding'] === 'aes128gcm' && /^vapid t=/.test(hd.Authorization) && hd.TTL === '3600' && open(Buffer.from(sent[0].init.body)).text === JSON.stringify({ title: 'Today', body: 'hi' }));
r = await R(await handle(req({ subs: Array(21).fill(sub), msg: {} }, env.PUSH_SECRET), env, fake));
ok('more than 20 devices in one go is refused', r.status === 400);
r = await R(await handle(req({ subs: [sub], msg: { body: 'x'.repeat(4000) } }, env.PUSH_SECRET), env, fake));
ok('a very long message is refused', r.status === 400);
const g = await handle(req(null, null, '/', 'GET'), env, fake), g2 = await handle(req(null, null, '/', 'GET'), { VAPID_PUBLIC: 'x' }, fake);
ok('GET / says ready, or names what is missing (never a secret)', (await g.text()) === 'Planner push worker: ready' && /missing VAPID_PRIVATE, VAPID_SUBJECT, PUSH_SECRET/.test(await g2.text()));
r = await R(await handle(req({ subs: [sub], msg: {} }, 'x'), {}, fake));
ok('a Worker with no secrets set refuses to send', r.status === 500);

console.log(failed ? `push worker: ${failed} FAILED` : 'push worker: all passed');
process.exit(failed ? 1 : 0);
