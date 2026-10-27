/* Blood and sigils (Patryk 2026-10-27, final picks from the "Blood and Sigils" mock-up):
   blood BL8b "Soaked in", sigils F3 / D3 / S3c / C3a in the Set 3 gilded style, glow G5 "Abyssal ripple".
   BLOOD.open(host, card, onPick): four sigils rise at the bottom of host (a position:relative, maybe scrolling, pane)
   and four spurts of blood fly from the tapped curse tile onto them. Tapping a sigil glows it, everything sinks away,
   then onPick('Flesh' | 'Domain' | 'Scene' | 'Coven'). A tap anywhere else in host, or BLOOD.close(), sinks it away
   and calls onPick(null). onPick is always called exactly once per open.
   BLOOD.icons holds the four icon SVG strings (they carry their own gilded colours, so they work anywhere).
   How the blood is drawn: soft blobs go into a hidden field where touching blobs merge, then the field is shaded
   (depth colour, darker clotting rim, one sharp highlight, a soft shadow). All CSS classes start with bl-. */
(function () {
'use strict';
if (window.BLOOD) return;

const cl = (x) => (x < 0 ? 0 : x > 1 ? 1 : x), seg = (k, a, b) => cl((k - a) / (b - a)), eo = (x) => 1 - Math.pow(1 - x, 3), lerp = (a, b, t) => a + (b - a) * t;
function rng(s) { return function () { s |= 0; s = (s + 0x6D2B79F5) | 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const RMQ = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : null;
const RM = () => !!(RMQ && RMQ.matches);

/* ================= CSS (injected once) ================= */
const CSS = `
.bl-layer{position:absolute;left:0;top:0;width:0;height:0;z-index:40;pointer-events:none;overflow:hidden;--gd:.55s}
.bl-cv{position:absolute;left:0;top:0;width:100%;height:100%;pointer-events:none;z-index:7}
.bl-row{position:absolute;left:8px;right:8px;bottom:8px;display:grid;grid-template-columns:repeat(4,1fr);gap:4px}
.bl-slot{display:flex;justify-content:center}
.bl-row .bl-sg{transition:transform .25s ease-out,opacity .2s}
.bl-row.bl-off .bl-sg{opacity:0;transform:translateY(20px);pointer-events:none}
.bl-row.bl-sink .bl-sg{opacity:0;transform:translateY(26px);pointer-events:none;transition:transform .32s ease-in,opacity .3s}
.bl-sg{--d:56px;display:flex;flex-direction:column;align-items:center;gap:4px;min-height:44px;min-width:44px;background:none;border:0;padding:0;margin:0;font:inherit;color:inherit;cursor:pointer;pointer-events:auto;-webkit-tap-highlight-color:transparent;
  --bg:radial-gradient(circle at 50% 38%,#173a34,#06120f 75%);--rim:#c8a050;--lab:#f0d088}
.bl-sg:focus-visible{outline:2px solid #5ef2a0;outline-offset:2px}
.bl-disc{position:relative;width:var(--d);height:var(--d);border-radius:50%;background:var(--bg);display:grid;place-items:center;z-index:6;
  --bs:inset 0 0 0 2px var(--rim),inset 0 -6px 12px rgba(0,0,0,.55),0 3px 8px rgba(0,0,0,.65);box-shadow:var(--bs)}
.bl-clip{position:absolute;inset:0;border-radius:50%;overflow:hidden}
.bl-disc .bl-ico{position:relative;z-index:1;width:72%;height:72%}
.bl-fx{position:absolute;inset:0;z-index:2;pointer-events:none;display:grid;place-items:center}
.bl-lab{position:relative;z-index:8;font:700 15px/1 var(--g,'Grenze Gotisch',serif);letter-spacing:.03em;color:var(--lab)}
.bl-ico{overflow:visible}
.bl-ico *{stroke-linecap:round;stroke-linejoin:round}
.bl-i{fill:none;stroke:var(--bl-ic,#e8c46e);stroke-width:2}
.bl-f{fill:var(--bl-ic,#e8c46e)}
.bl-af{fill:var(--bl-ic2,#c4323a)}
.bl-h{fill:var(--bl-hole,#020806)}
.bl-d{fill:rgba(0,0,0,.42)}
/* what a BL8b spurt leaves on a sigil */
.bl-soakL{position:absolute;inset:0;border-radius:50%;background:radial-gradient(circle at 50% 58%,rgba(225,35,45,.95),rgba(125,4,14,.95) 55%,rgba(45,0,6,.97));opacity:0;transition:opacity .5s ease-out}
.bl-disc.bl-soaked .bl-soakL{opacity:.9}
.bl-disc.bl-soaked .bl-ico{filter:sepia(1) saturate(3.2) hue-rotate(-38deg) brightness(1.08) drop-shadow(0 0 3px rgba(255,70,60,.9));transition:filter .5s}
.bl-disc.bl-soaked{animation:bl-soakp 1.8s ease-in-out infinite}
.bl-disc.bl-now .bl-soakL,.bl-disc.bl-now .bl-ico{transition:none}
@keyframes bl-soakp{50%{box-shadow:var(--bs),0 0 16px 3px rgba(210,25,35,.6)}}
.bl-disc.bl-thd{animation:bl-thd .32s ease-out}
@keyframes bl-thd{25%{transform:scale(.9) translateY(2px)}60%{transform:scale(1.04)}}
/* G5 Abyssal ripple */
.bl-rip{position:absolute;inset:0;border-radius:50%;border:2px solid #5ef2a0;box-shadow:0 0 10px #5ef2a0,inset 0 0 8px #5ef2a0;opacity:0;animation:bl-rip calc(var(--gd) * 1.3) ease-out forwards}
@keyframes bl-rip{0%{transform:scale(.7);opacity:.95}100%{transform:scale(2.1);opacity:0}}
.bl-disc.bl-g5{animation:bl-g5 calc(var(--gd) * 1.3) ease-out}
.bl-disc.bl-g5 .bl-ico{animation:bl-g5i calc(var(--gd) * 1.3) ease-out}
@keyframes bl-g5{30%{box-shadow:var(--bs),inset 0 0 18px rgba(94,242,160,.9),0 0 22px 4px rgba(94,242,160,.6)}}
@keyframes bl-g5i{30%{filter:brightness(1.6) drop-shadow(0 0 5px #5ef2a0)}}
.bl-disc.bl-grm{box-shadow:var(--bs),0 0 0 3px #5ef2a0,0 0 18px rgba(94,242,160,.8)}
@media (prefers-reduced-motion:reduce){.bl-disc.bl-soaked{animation:none}.bl-row .bl-sg,.bl-row.bl-sink .bl-sg{transition:opacity .15s}.bl-row.bl-off .bl-sg,.bl-row.bl-sink .bl-sg{transform:none}}
`;
function injectCss() { if (typeof document === 'undefined' || document.getElementById('blood-css')) return;
  const s = document.createElement('style'); s.id = 'blood-css'; s.textContent = CSS; (document.head || document.documentElement).appendChild(s); }
injectCss();

/* ================= the four icons (F3, D3, S3c, C3a) ================= */
const VAL = (y) => '<path class="bl-f" d="M7 ' + y + 'h34v4c-2.8 2.6-5.7 2.6-8.5 0-2.8 2.6-5.7 2.6-8.5 0-2.8 2.6-5.7 2.6-8.5 0-2.8 2.6-5.7 2.6-8.5 0z"/>';
const HOODS = '<path class="bl-i" d="M11 19c-3 0-5 4-5 8 0 3-1 5-2 7v8h9M37 19c3 0 5 4 5 8 0 3 1 5 2 7v8h-9"/><path class="bl-d" d="M24 9c-6 0-9 6-9 11 0 4-2 8-3 10v12h24V30c-1-2-3-6-3-10 0-5-3-11-9-11z"/><path class="bl-i" d="M24 9c-6 0-9 6-9 11 0 4-2 8-3 10v12h24V30c-1-2-3-6-3-10 0-5-3-11-9-11z"/><ellipse class="bl-h" cx="24" cy="21" rx="3.5" ry="4.5"/><circle class="bl-af" cx="22.6" cy="21" r=".9"/><circle class="bl-af" cx="25.4" cy="21" r=".9"/>';
const INNER = {
  Flesh: '<path class="bl-af" d="M24 40C15 34 10 28 10 21a7 7 0 0 1 14-3 7 7 0 0 1 14 3c0 7-5 13-14 19z"/><path class="bl-i" d="M24 40C15 34 10 28 10 21a7 7 0 0 1 14-3 7 7 0 0 1 14 3c0 7-5 13-14 19z"/><path class="bl-i" stroke-width="1.5" d="M5 23c6-4 13 4 19 0s13-4 19 0M5 29c6 4 13-4 19 0s13 4 19 0M11 21l-1-3M19 24l1 3M29 22l-1-3M37 24l1 3M13 30l-1 3M21 28l1-3M31 30l-1 3M38 29l1-3"/><path class="bl-i" d="M24 4v9M20.5 7.5h7"/>',
  Domain: '<path class="bl-f" opacity=".25" d="M10 15.5L24 8.4l14 7.1z"/><path class="bl-i" d="M7 16L24 7l17 9zM7 18h34M7 37h34M5 41h38"/><path class="bl-i" stroke-width="3" d="M12 20v15M20 20v15M28 20v15M36 20v15"/><path class="bl-af" d="M22.5 26h3v9h-3z"/>',
  Scene: '<path class="bl-i" d="M6 44V13l18-6 18 6v31"/>' + VAL(13) + '<path class="bl-af" d="M7 17c1 8 2 17 0 27h5c-1-8 0-14 4-18-3-3-6-6-9-9zM41 17c-1 8-2 17 0 27h-5c1-8 0-14-4-18 3-3 6-6 9-9z"/><path class="bl-f" opacity=".14" d="M24 17l-6 27h12z"/><path class="bl-i" stroke-width="3.4" d="M23 44c-3-5 5-8 3-13s-6-4-4.5-8.5c1.2-3 5-2.6 4.5.5"/><circle class="bl-h" cx="25.6" cy="36.5" r=".9"/><circle class="bl-h" cx="24.3" cy="29.5" r=".9"/><circle class="bl-h" cx="22.4" cy="23.5" r=".8"/><path class="bl-i" d="M3 44.5h42"/>',
  Coven: '<ellipse class="bl-i" stroke-width="1.2" cx="24" cy="5.5" rx="6" ry="1.8"/>' + HOODS + '<path class="bl-i" stroke-width="1" d="M24 30.5v11"/>' };
const NAMES = ['Flesh', 'Domain', 'Scene', 'Coven'];
const CODES = { Flesh: 'F3', Domain: 'D3', Scene: 'S3c', Coven: 'C3a' };
const svgOf = (n) => '<svg class="bl-ico" viewBox="0 0 48 48" aria-hidden="true" focusable="false">' + INNER[n] + '</svg>';
const ICONS = {}; NAMES.forEach((n) => { ICONS[n] = svgOf(n); });
const sigilHtml = (n) => '<div class="bl-slot"><button type="button" class="bl-sg" data-sig="' + n + '" aria-label="' + n + ' (' + CODES[n] + ')"><span class="bl-disc"><span class="bl-clip"><span class="bl-soakL"></span></span>' + ICONS[n] + '<span class="bl-fx"></span></span><span class="bl-lab">' + n + '</span></button></div>';

/* ================= blood renderer ================= */
let SPR = null;   // soft round blob sprite, made on first use
function sprite() { if (SPR) return SPR; const c = document.createElement('canvas'); c.width = c.height = 64; const x = c.getContext('2d'), im = x.createImageData(64, 64);
  for (let j = 0; j < 64; j++) for (let i = 0; i < 64; i++) { const dx = (i + .5 - 32) / 32, dy = (j + .5 - 32) / 32, q = dx * dx + dy * dy, v = q < 1 ? (1 - q) * (1 - q) * .62 : 0, o = (j * 64 + i) * 4;
    im.data[o] = im.data[o + 1] = im.data[o + 2] = 255; im.data[o + 3] = Math.round(v * 255); }
  x.putImageData(im, 0, 0); SPR = c; return c; }
const LN = (() => { const v = [-.5, -.62, .6], l = Math.hypot(...v); return v.map((a) => a / l); })();
const HV = (() => { const v = [LN[0], LN[1], LN[2] + 1], l = Math.hypot(...v); return v.map((a) => a / l); })();
const TH = .32;
function shade(a, o, W, H, FS) {
  o.fill(0); const K = 7 * FS, so = Math.max(2, Math.round(2 * FS)), sy2 = Math.max(3, Math.round(3 * FS)), W4 = W * 4;
  for (let y = 3; y < H - 3; y++) for (let x = 3; x < W - 3; x++) {
    const q = (y * W + x) * 4, v = a[q + 3] / 255;
    if (v < TH - .045) { const vs = a[q - sy2 * W4 - so * 4 + 3] / 255; if (vs > TH - .16) o[q + 3] = Math.min(1, (vs - (TH - .16)) / .16) * 150; continue; }
    const m = Math.min(1, (v - (TH - .045)) / .06);
    const gx = (a[q + 7] - a[q - 1]) / 255, gy = (a[q + W4 + 3] - a[q - W4 + 3]) / 255;
    let nx = -gx * K, ny = -gy * K, nz = 1; const nl = 1 / Math.sqrt(nx * nx + ny * ny + 1); nx *= nl; ny *= nl; nz *= nl;
    const dif = Math.max(0, nx * LN[0] + ny * LN[1] + nz * LN[2]), sp = Math.pow(Math.max(0, nx * HV[0] + ny * HV[1] + nz * HV[2]), 40) * 1.2;
    const th = Math.sqrt(cl((v - TH) / .3)), rim = 1 - cl((v - TH) / .06);
    let r = lerp(205, 120, th), g = lerp(24, 6, th), b = lerp(34, 14, th);
    r = lerp(r, 58, rim * .8); g = lerp(g, 3, rim * .8); b = lerp(b, 7, rim * .8);
    const sh = .45 + .75 * dif; r = r * sh + sp * 255; g = g * sh + sp * 225; b = b * sh + sp * 225;
    o[q] = r; o[q + 1] = g; o[q + 2] = b; o[q + 3] = m * 255;
  }
}
function mkPath(f, n) { n = n || 90; const pts = []; let L = 0;
  for (let i = 0; i <= n; i++) { const p = f(i / n); if (i) L += Math.hypot(p[0] - pts[i - 1][0], p[1] - pts[i - 1][1]); pts.push([p[0], p[1], L]); }
  return { L, at(s) { s = Math.max(0, Math.min(L, s)); let lo = 0, hi = n; while (hi - lo > 1) { const m = (lo + hi) >> 1; if (pts[m][2] < s) lo = m; else hi = m; }
    const A = pts[lo], B = pts[hi], d = B[2] - A[2] || 1, t = (s - A[2]) / d; return [A[0] + (B[0] - A[0]) * t, A[1] + (B[1] - A[1]) * t]; },
    atU(u) { return this.at(u * L); } }; }

/* the four spurts in flight; each lands on its sigil at HITS[i] */
const HITS = [.23, .39, .55, .71];
function spurtKit(g, R, endAt, vol) { vol = vol || 1;
  const S = g.S, W0 = (i) => .02 + i * .16;
  const A = g.T.map((T) => { const e = endAt(T), c = [lerp(S[0], e[0], .55), S[1] + (e[1] - S[1]) * .05 - 8];
    const f = (u) => { const v = 1 - u; return [v * v * S[0] + 2 * v * u * c[0] + u * u * e[0], v * v * S[1] + 2 * v * u * c[1] + u * u * e[1]]; };
    return { P: mkPath(f), drops: Array.from({ length: vol > 1 ? 12 : 8 }, () => [R(), R()]), spat: Array.from({ length: 8 }, () => [R(), R(), R()]) }; });
  return { A, hk: (i) => W0(i) + .21,
    fly(a, k) { a.blob(S[0], S[1] + 2, 3.4 * eo(seg(k, 0, .05)));
      A.forEach((s, i) => { const w0 = W0(i), l = seg(k, w0, w0 + .26), pulse = l > 0 && l < .2 ? Math.sin(l / .2 * Math.PI) : 0; if (pulse) a.blob(S[0], S[1] + 3, (3 + 4 * pulse) * vol);
        const h = Math.min(1, l * 1.25);
        if (h > 0 && h < 1) for (let u = Math.max(0, h - .28); u <= h; u += .012) { const z = (u - (h - .28)) / .28, r = z > .7 ? lerp(2.4, 3.8, (z - .7) / .3) : (.9 + 1.5 * z) * (Math.sin(u * 110) > -.1 ? 1 : .35); a.blob(...s.P.atU(u), r * vol); }
        const T = g.T[i]; s.drops.forEach(([u, r]) => { if (u * .9 >= h) return; const p = s.P.atU(u * .9); if (Math.hypot(p[0] - T.x, p[1] - T.y) < T.r * 1.1) return; a.blob(...p, (1.3 + r * 1.5) * (vol > 1 ? vol * 1.08 : 1)); }); }); } };
}
/* BL8b Soaked in: each spurt bursts on its sigil and sinks into it; a bead seeps out underneath */
const SCENE = { dur: 1000,
  setup(g, R) { const K = spurtKit(g, R, (T) => [T.x, T.y - T.r * .15], 1.35);
    return (a, k) => { K.fly(a, k);
      g.T.forEach((T, i) => { const q = seg(k, K.hk(i), K.hk(i) + .27); if (q <= 0) return; const r = T.r, P = [T.x, T.y - r * .15], qq = eo(Math.min(1, q * 4)), ab = eo(seg(q, .25, .9)), keep = 1 - ab, sp = K.A[i].spat;
        a.blob(...P, r * .4 * qq * keep); for (let j = 0; j < 5; j++) { const an = j / 5 * 6.283 + sp[j][0]; a.blob(P[0] + Math.cos(an) * r * .3 * qq, P[1] + Math.sin(an) * r * .28 * qq, r * .17 * qq * keep); }
        sp.slice(0, 4).forEach(([u, v, w]) => { const an = -Math.PI * 1.05 + u * Math.PI * 1.1, d = r * (1.16 + .28 * v); a.blob(T.x + Math.cos(an) * d, T.y + Math.sin(an) * d, (.8 + 1 * w) * qq); });
        if (ab > .2) { const s2 = seg(ab, .2, 1); a.blob(T.x + r * .18, T.y + r * .97, 1.6 + 1.2 * s2); a.blob(T.x + r * .18, T.y + r + 1.5 + 3 * s2, 1.6 * s2 + .4); } }); }; } };

class Blood {
  constructor(cv) { this.cv = cv; this.ox = cv.getContext('2d'); this.f = document.createElement('canvas'); this.fx = this.f.getContext('2d', { willReadFrequently: true }); this.dr = 0; this.k = 0; this.raf = 0;
    const self = this;
    this.api = { t: 0, alpha(v) { self.fx.globalAlpha = v; },
      blob(x, y, r) { if (!(r > .25)) return; if (self.dr) { r *= 1 - .5 * self.dr; y += self.dr * self.dr * 24; } const R = r / .531 * self.FS; self.fx.drawImage(sprite(), x * self.FS - R, y * self.FS - R, 2 * R, 2 * R); } };
  }
  size(w, h) { if (w < 20 || h < 20) return false; let FS = (window.devicePixelRatio || 1) > 1.4 ? 1.5 : 1;
    if (w * h * FS * FS > 1.1e6) FS = 1;   // big screens: keep the per-frame shading cheap
    this.FS = FS; const W = Math.ceil(w * FS), H = Math.ceil(h * FS);
    if (this.cv.width !== W || this.cv.height !== H) { this.cv.width = this.f.width = W; this.cv.height = this.f.height = H; this.img = this.ox.createImageData(W, H); }
    this.W = W; this.H = H; return true; }
  // (re)build the scene for geometry g with this open's seed; the same seed gives the same splashes after a scroll or resize
  build(g) { const R = rng(this.seed); this.draw = SCENE.setup(g, R); }
  frame(k, t) { if (!this.draw || !this.W) return; const fx = this.fx; fx.globalCompositeOperation = 'source-over'; fx.globalAlpha = 1; fx.clearRect(0, 0, this.W, this.H); fx.globalCompositeOperation = 'lighter';
    this.api.t = t; this.draw(this.api, k); const src = fx.getImageData(0, 0, this.W, this.H).data; shade(src, this.img.data, this.W, this.H, this.FS); this.ox.putImageData(this.img, 0, 0); }
  redraw() { this.frame(this.k, 1.5); }
  play(g, o) { cancelAnimationFrame(this.raf); this.cv.style.opacity = '1'; this.dr = 0; this.seed = (Math.random() * 1e9) | 0; this.build(g);
    const fired = {}, D = SCENE.dur, t0 = performance.now();
    if (o.still) { this.k = 1; this.frame(1, 1.5); HITS.forEach((_, i) => o.onHit(i, true)); return; }
    const f = (now) => { const t = now - t0, k = Math.min(1, t / D); this.k = k; this.frame(k, t / 1000); HITS.forEach((hk, i) => { if (k >= hk && !fired[i]) { fired[i] = 1; o.onHit(i, false); } });
      this.raf = k < 1 ? requestAnimationFrame(f) : 0; };
    this.raf = requestAnimationFrame(f); }
  drain(still, done) { cancelAnimationFrame(this.raf); this.k = 1; if (still || !this.draw) { this.clear(); done(); return; }
    const t0 = performance.now(), D = 420;
    const f = (now) => { const q = Math.min(1, (now - t0) / D); this.dr = q; this.frame(1, 1.5 + (now - t0) / 1000); this.cv.style.opacity = String(1 - q * q);
      if (q < 1) this.raf = requestAnimationFrame(f); else { this.clear(); done(); } };
    this.raf = requestAnimationFrame(f); }
  clear() { cancelAnimationFrame(this.raf); this.raf = 0; this.ox.clearRect(0, 0, this.cv.width, this.cv.height); this.draw = null; this.dr = 0; this.cv.style.opacity = '1'; }
}

/* ================= one open session ================= */
let cur = null;   // { host, card, onPick, layer, row, blood, state: 'open' | 'closing', ... }

function hitFx(btn, still) { if (!btn) return; const d = btn.querySelector('.bl-disc');
  if (!still) { d.classList.remove('bl-thd'); void d.offsetWidth; d.classList.add('bl-thd'); setTimeout(() => d.classList.remove('bl-thd'), 420); }
  if (still) d.classList.add('bl-soaked', 'bl-now'); else setTimeout(() => { if (d.isConnected) d.classList.add('bl-soaked'); }, 90); }
function glow(btn, still) { const d = btn.querySelector('.bl-disc'), fx = d.querySelector('.bl-fx');
  d.classList.remove('bl-g5', 'bl-grm', 'bl-thd'); void d.offsetWidth;
  if (still) { d.classList.add('bl-grm'); return; }
  fx.innerHTML = '<i class="bl-rip"></i><i class="bl-rip" style="animation-delay:.12s"></i><i class="bl-rip" style="animation-delay:.24s"></i>'; d.classList.add('bl-g5'); }

// lay the overlay over the visible part of host (it scrolls with host's content, so follow scrollTop)
function place(s) { const h = s.host, L = s.layer; L.style.left = h.scrollLeft + 'px'; L.style.top = h.scrollTop + 'px'; L.style.width = h.clientWidth + 'px'; L.style.height = h.clientHeight + 'px'; }
function geom(s) { const h = s.host, hr = h.getBoundingClientRect(), ox = hr.left + h.clientLeft, oy = hr.top + h.clientTop;
  const C = s.card.getBoundingClientRect(), cx = C.left - ox, cy = C.top - oy;
  return { S: [cx + C.width / 2, cy + C.height - 1],
    T: [...s.row.querySelectorAll('.bl-slot')].map((sl) => { const r = sl.getBoundingClientRect(), D = sl.querySelector('.bl-disc').offsetWidth; return { x: r.left - ox + r.width / 2, y: r.top - oy + D / 2, r: D / 2 }; }) }; }
// after a scroll or resize: move the overlay, rebuild the paths for the new positions, keep the animation going
function relayout(s) { if (cur !== s) return; place(s); if (!s.blood.size(s.host.clientWidth, s.host.clientHeight)) return;
  if (!s.blood.draw) return; s.blood.build(geom(s)); if (!s.blood.raf) s.blood.redraw(); }
function schedule(s) { if (s.pend) return; s.pend = requestAnimationFrame(() => { s.pend = 0; relayout(s); }); }

function teardown(s, result) { if (s.done) return; s.done = true; clearTimeout(s.tSink); clearTimeout(s.tGo); cancelAnimationFrame(s.pend); s.blood.clear();
  s.host.removeEventListener('scroll', s.onScroll); s.host.removeEventListener('click', s.onHost); if (s.ro) s.ro.disconnect(); window.removeEventListener('resize', s.onScroll);
  if (s.layer.parentNode) s.layer.parentNode.removeChild(s.layer); if (cur === s) cur = null;
  try { if (typeof s.onPick === 'function') s.onPick(result); } catch (e) { setTimeout(() => { throw e; }); } }
// sink away, then call onPick(result)
function finish(s, result, delay) { if (s.state !== 'open') return; s.state = 'closing'; const still = RM();
  s.tGo = setTimeout(() => {
    s.row.classList.add('bl-sink'); let n = 2; const one = () => { if (--n === 0) teardown(s, result); };
    s.blood.drain(still, one); s.tSink = setTimeout(one, 340); }, delay); }

function open(host, card, onPick) {
  if (!host || !card) { if (typeof onPick === 'function') onPick(null); return; }
  injectCss(); if (cur) teardown(cur, null);
  if (getComputedStyle(host).position === 'static') host.style.position = 'relative';
  const still = RM(), layer = document.createElement('div'); layer.className = 'bl-layer';
  layer.innerHTML = '<canvas class="bl-cv" aria-hidden="true"></canvas><div class="bl-row bl-off" role="group" aria-label="Pick a sigil">' + NAMES.map(sigilHtml).join('') + '</div>';
  const s = cur = { host, card, onPick, layer, row: layer.querySelector('.bl-row'), blood: new Blood(layer.querySelector('canvas')), state: 'open', done: false, pend: 0 };
  host.appendChild(layer); place(s);
  s.row.addEventListener('click', (e) => { const b = e.target.closest('.bl-sg'); if (!b) return; e.stopPropagation(); if (s.state !== 'open') return;
    glow(b, RM()); finish(s, b.dataset.sig, 230); });
  s.onHost = (e) => { if (s.layer.contains(e.target)) return; close(); };
  s.onScroll = () => schedule(s);
  host.addEventListener('scroll', s.onScroll, { passive: true });
  window.addEventListener('resize', s.onScroll);
  if (window.ResizeObserver) { s.ro = new ResizeObserver(() => schedule(s)); s.ro.observe(host); }
  // the tap that opened us may still be bubbling up to host: listen for "tap elsewhere" from the next event on
  setTimeout(() => { if (cur === s && s.state === 'open') host.addEventListener('click', s.onHost); }, 0);
  const slots = s.row.querySelectorAll('.bl-sg');
  if (s.blood.size(host.clientWidth, host.clientHeight)) s.blood.play(geom(s), { still, onHit: (i, st) => hitFx(slots[i], st) });
  // BL8b: the sigils rise at once while the first spurt is in the air
  if (still) s.row.classList.remove('bl-off'); else { void s.row.offsetWidth; requestAnimationFrame(() => { if (cur === s) s.row.classList.remove('bl-off'); }); }
}
function close() { if (cur && cur.state === 'open') finish(cur, null, 0); }

window.BLOOD = { open, close, icons: ICONS };
})();
