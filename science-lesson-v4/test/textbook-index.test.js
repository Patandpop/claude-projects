'use strict';
/* ============================================================================
   test/textbook-index.test.js — unit coverage for the textbook matcher.

   Drives references/textbook-index.js against the real textbook-index.md:
   auto-match returns the right book + page range for known topics, null for an
   unmatchable KS3 topic, override paths (code / explicit / "none"), and
   primaryBook per year+subject.

   Exported run() returns { fails, warns }; invoked from run.js.
   ============================================================================ */

const path = require('path');
const ROOT = path.resolve(__dirname, '..');
const T = require(path.join(ROOT, 'science-lesson', 'references', 'textbook-index.js'));

const RED = '\x1b[31m', GRN = '\x1b[32m', RST = '\x1b[0m';

function run() {
  let fails = 0;
  const ok  = (m) => console.log(`  ${GRN}✓${RST} ${m}`);
  const bad = (m) => { console.log(`  ${RED}✗ FAIL${RST} ${m}`); fails++; };
  const eq  = (a, b, m) => (a === b ? ok(m) : bad(`${m} (got ${JSON.stringify(a)}, want ${JSON.stringify(b)})`));

  console.log('── textbook matcher');

  const idx = T.loadIndex();
  (idx.sections.length > 400 ? ok : bad)(`index parses (${idx.sections.length} sections)`);

  // Auto-match: enzymes (Y9 Bio) → Kerboodle B3.4–B3.5.
  const enz = T.matchLesson({ year: 9, subject: 'Biology', topic: 'Enzyme Activity - Amylase', keywords: ['enzyme', 'substrate'] });
  eq(enz && enz.book, 'AQA Biology (Kerboodle)', 'enzymes → Kerboodle Biology');
  eq(enz && T.formatRef(enz), 'AQA Biology (Kerboodle), pp. 42–44', 'enzymes → pp. 42–44');

  // Page-adjacency: Ideal Gas must land on gas-pressure sections, not span chapters.
  const gas = T.matchLesson({ year: 9, subject: 'Physics', topic: 'Ideal Gas Law', keywords: ['pressure', 'volume', 'temperature'] });
  eq(gas && T.formatRef(gas), 'AQA Physics (Kerboodle), pp. 86–88', 'ideal gas → pp. 86–88 (no cross-chapter range)');

  // Unmatchable KS3 topic → null (the "can't be forced" rule).
  eq(T.matchLesson({ year: 7, subject: 'Biology', topic: 'MRS GREN', keywords: ['life processes'] }), null, 'MRS GREN → no match');
  // Y12 (A-level, not indexed) → null.
  eq(T.matchLesson({ year: 12, subject: 'Physics', topic: 'Drift velocity' }), null, 'Y12 → no match (not indexed)');

  // Override: explicit "none" suppresses; a code / code list resolves; explicit object.
  eq(T.resolve({ year: 9, subject: 'Biology', topic: 'Enzyme', override: 'none' }), null, 'override "none" suppresses');
  eq(T.formatRef(T.resolve({ override: 'B3.4' })), 'AQA Biology (Kerboodle), p. 42', 'override code B3.4 → p. 42');
  eq(T.formatRef(T.resolve({ override: ['B3.4', 'B3.5'] })), 'AQA Biology (Kerboodle), pp. 42–44', 'override codes → pp. 42–44');
  eq(T.formatRef(T.resolve({ override: { book: 'CGP Physics', pages: '10-12' } })), 'CGP Physics, p. 10-12', 'explicit override object');

  // primaryBook (review ordering) — no section match needed.
  eq(T.primaryBook({ year: 10, subject: 'Chemistry' }), 'AQA Chemistry (Kerboodle)', 'primaryBook Y10 Chem → Kerboodle Chemistry');
  eq(T.primaryBook({ year: 7 }), 'Activate 1', 'primaryBook Y7 → Activate 1');
  eq(T.primaryBook({ year: 8 }), 'Activate 2', 'primaryBook Y8 → Activate 2');
  eq(T.primaryBook({ year: 12, subject: 'Physics' }), null, 'primaryBook Y12 → none');

  // Known misses (Patryk 2026-10-08: book pages must be accurate)
  const ref = (y, s, t) => T.formatRef(T.matchLesson({ year: y, subject: s, topic: t })) || '(none)';
  eq(ref(7, 'Chemistry', 'Gas Pressure'), 'Activate 1, p. 72', 'Y7 Gas Pressure → its own book (Activate 1), not Activate 2');
  eq(ref(7, 'Physics', 'Air Resistance'), 'Activate 1, p. 116', 'Y7 Air Resistance → "Drag forces and friction"');
  eq(ref(7, 'Science Skills', 'Introduction and Safety'), '(none)', 'Introduction and Safety → no book page');
  eq(ref(10, 'Physics', 'Plugs'), 'AQA Physics (Kerboodle), p. 66', 'Plugs → "Cables and plugs"');
  // 2026-10-10: rare words outweigh common ones ("internal" beats nine "energy" sections)
  eq(ref(9, 'Physics', 'Internal Energy'), 'AQA Physics (Kerboodle), p. 82', 'Internal Energy → P6.4 (not the P1 energy chapter)');
  eq(ref(9, 'Physics', 'Latent Heat Capacity Theory'), 'AQA Physics (Kerboodle), p. 84', '"Latent Heat Capacity" → specific latent heat P6.5 (not heat capacity P2.4)');
  eq(ref(7, 'Biology', 'Microscopes'), 'Activate 1, p. 14', 'Y7 Microscopes → "Observing cells"');
  eq(ref(9, 'Physics', 'P3 Particles Test'), '(none)', 'a test lesson → no book page');

  return { fails, warns: 0 };
}

module.exports = { run };
if (require.main === module) { const r = run(); process.exit(r.fails ? 1 : 0); }
