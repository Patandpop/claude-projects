// The planner's notification sender (lanes/design-installed-app.md 6.2, build step 8). A Cloudflare Worker, free plan.
// Why it exists: a phone only shows a notification that was signed and locked by a server, and Apps Script cannot do
// that maths. So the planner (Day.gs pushSend_) posts the message here, and this Worker locks it for each device
// (RFC 8291, aes128gcm), signs the request (RFC 8292, VAPID) and hands it to the phone's push service.
//   POST /send   header X-Push-Secret: <PUSH_SECRET>
//                body {"subs": [{"endpoint": "https://...", "keys": {"p256dh": "...", "auth": "..."}}], "msg": {...}}
//                answer {"ok": true, "results": [{"i": 0, "status": 201}, ...]}  (404 or 410 = that device has gone)
//   GET  /       "Planner push worker: ready" (or what is missing), to check it is set up.
// Secrets (Cloudflare dashboard, Worker, Settings, Variables and secrets), made by node app/tools/make-push-keys.js:
//   VAPID_PUBLIC, VAPID_PRIVATE, VAPID_SUBJECT (mailto:...), PUSH_SECRET.
// It keeps nothing: no list of devices, no messages, no log of what was said. Only the planner knows the devices.
// Plain WebCrypto, no packages, so the file can be pasted into the dashboard as it is.

const MAX_SUBS = 20, MAX_MSG = 3000, RECORD = 4096;
const enc = new TextEncoder();

export function b64u(bytes) {
  let s = ''; bytes = new Uint8Array(bytes);
  for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
export function unb64u(str) {
  const s = String(str || '').replace(/-/g, '+').replace(/_/g, '/'), pad = s + '==='.slice((s.length + 3) % 4);
  const bin = atob(pad), out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}
const join = (...parts) => { const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0)); let o = 0; parts.forEach((p) => { out.set(p, o); o += p.length; }); return out; };

async function hkdf(salt, ikm, info, bytes) {
  const key = await crypto.subtle.importKey('raw', ikm, 'HKDF', false, ['deriveBits']);
  return new Uint8Array(await crypto.subtle.deriveBits({ name: 'HKDF', hash: 'SHA-256', salt, info }, key, bytes * 8));
}

// Lock one message for one device (RFC 8291). opts.salt and opts.serverKeys are only for the tests.
export async function encryptPayload(text, p256dh, auth, opts = {}) {
  const ua = unb64u(p256dh), secret = unb64u(auth);
  if (ua.length !== 65 || ua[0] !== 4 || secret.length !== 16) throw new Error('Bad device keys');
  const uaKey = await crypto.subtle.importKey('raw', ua, { name: 'ECDH', namedCurve: 'P-256' }, false, []);
  const pair = opts.serverKeys || await crypto.subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveBits']);
  const as = new Uint8Array(await crypto.subtle.exportKey('raw', pair.publicKey));
  const shared = new Uint8Array(await crypto.subtle.deriveBits({ name: 'ECDH', public: uaKey }, pair.privateKey, 256));
  const ikm = await hkdf(secret, shared, join(enc.encode('WebPush: info\0'), ua, as), 32);
  const salt = opts.salt || crypto.getRandomValues(new Uint8Array(16));
  const cek = await hkdf(salt, ikm, enc.encode('Content-Encoding: aes128gcm\0'), 16);
  const nonce = await hkdf(salt, ikm, enc.encode('Content-Encoding: nonce\0'), 12);
  const body = join(enc.encode(text), new Uint8Array([2]));   // one record, so it ends with the last-record mark
  const aes = await crypto.subtle.importKey('raw', cek, 'AES-GCM', false, ['encrypt']);
  const sealed = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv: nonce }, aes, body));
  const head = new Uint8Array(21); head.set(salt, 0); new DataView(head.buffer).setUint32(16, RECORD); head[20] = as.length;
  return join(head, as, sealed);
}

// The signed line that tells the push service the message really comes from this planner (RFC 8292).
export async function vapidHeader(endpoint, env, now = Date.now()) {
  const pub = unb64u(env.VAPID_PUBLIC);
  if (pub.length !== 65) throw new Error('VAPID_PUBLIC is not a public key');
  const jwk = { kty: 'EC', crv: 'P-256', d: env.VAPID_PRIVATE, x: b64u(pub.slice(1, 33)), y: b64u(pub.slice(33, 65)), ext: true };
  const key = await crypto.subtle.importKey('jwk', jwk, { name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign']);
  const claims = { aud: new URL(endpoint).origin, exp: Math.floor(now / 1000) + 12 * 3600, sub: env.VAPID_SUBJECT };
  const unsigned = b64u(enc.encode(JSON.stringify({ typ: 'JWT', alg: 'ES256' }))) + '.' + b64u(enc.encode(JSON.stringify(claims)));
  const sig = await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, key, enc.encode(unsigned));
  return 'vapid t=' + unsigned + '.' + b64u(sig) + ', k=' + env.VAPID_PUBLIC;
}

function same(a, b) {   // the secret check takes the same time however much of it matches
  a = String(a || ''); b = String(b || '');
  let d = a.length ^ b.length;
  for (let i = 0; i < Math.max(a.length, b.length); i++) d |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0);
  return d === 0 && b.length > 0;
}
const json = (obj, status = 200) => new Response(JSON.stringify(obj), { status, headers: { 'Content-Type': 'application/json' } });
const missing = (env) => ['VAPID_PUBLIC', 'VAPID_PRIVATE', 'VAPID_SUBJECT', 'PUSH_SECRET'].filter((k) => !env[k]);

export async function handle(request, env, fetchFn = fetch) {
  const url = new URL(request.url);
  if (request.method === 'GET' && url.pathname === '/') {
    const m = missing(env);
    return new Response(m.length ? 'Planner push worker: missing ' + m.join(', ') : 'Planner push worker: ready', { headers: { 'Content-Type': 'text/plain' } });
  }
  if (request.method !== 'POST' || url.pathname !== '/send') return json({ ok: false, error: 'Not found' }, 404);
  if (missing(env).length) return json({ ok: false, error: 'Not set up: missing ' + missing(env).join(', ') }, 500);
  if (!same(request.headers.get('X-Push-Secret'), env.PUSH_SECRET)) return json({ ok: false, error: 'Wrong secret' }, 403);
  let b; try { b = await request.json(); } catch (e) { return json({ ok: false, error: 'Bad request' }, 400); }
  const subs = Array.isArray(b && b.subs) ? b.subs : [], text = JSON.stringify((b && b.msg) || {});
  if (!subs.length || subs.length > MAX_SUBS) return json({ ok: false, error: 'Between 1 and ' + MAX_SUBS + ' devices' }, 400);
  if (text.length > MAX_MSG) return json({ ok: false, error: 'Message too long' }, 400);
  const results = [];
  for (let i = 0; i < subs.length; i++) {
    const s = subs[i] || {};
    try {
      if (!/^https:\/\//.test(String(s.endpoint || ''))) throw new Error('Bad device address');
      const body = await encryptPayload(text, s.keys && s.keys.p256dh, s.keys && s.keys.auth);
      const r = await fetchFn(s.endpoint, { method: 'POST', body, headers: { 'Content-Encoding': 'aes128gcm', 'Content-Type': 'application/octet-stream',
        TTL: String(Math.min(Math.max(Number(b.ttl) || 3600, 60), 86400)), Urgency: 'normal', Authorization: await vapidHeader(s.endpoint, env) } });
      results.push({ i, status: r.status });
    } catch (e) { results.push({ i, status: 0, error: String((e && e.message) || e).slice(0, 80) }); }
  }
  return json({ ok: true, results });
}

export default { fetch: (request, env) => handle(request, env) };
