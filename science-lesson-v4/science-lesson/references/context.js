#!/usr/bin/env node
// context.js — weekly scheduling context capture
// Usage: node context.js [--absent YYYY-MM-DD|today] [--dry-run] [--review] [--help]
'use strict';

const fs       = require('fs');
const path     = require('path');
const readline = require('readline');

const ROOT          = path.join(__dirname, '../..');
const CONTEXT_PATH  = path.join(ROOT, 'context.json');
const STANDING_PATH = path.join(ROOT, 'context-standing.json');

// Class list: school-classes.js (classes-2026-27.json) — the hard-coded 2025/26 list was dropped 2026-10-02.
const school  = require('./school-classes.js');
const CLASSES = school.CLASSES;

// ─── Helpers ──────────────────────────────────────────────────────────────────

const today    = () => new Date().toISOString().slice(0, 10);
const loadJson = p  => fs.existsSync(p) ? JSON.parse(fs.readFileSync(p, 'utf8')) : null;
const ask      = (rl, q) => new Promise(res => rl.question(q, a => res(a.trim())));

function mondayOf(iso) {
  const d = new Date(iso + 'T12:00:00');
  const day = d.getDay();
  d.setDate(d.getDate() - (day === 0 ? 6 : day - 1));
  return d.toISOString().slice(0, 10);
}

// ─── Summary ─────────────────────────────────────────────────────────────────

function printSummary(ctx) {
  console.log('\n' + '─'.repeat(60));
  console.log(`Week ${ctx.weekType}  ${ctx.weekOf}`);
  for (const cls of CLASSES) {
    const flags = [];
    if ((ctx.sharing || []).some(s => s.class === cls))                  flags.push('SHARED');
    if ((ctx.revisionMode || []).some(r => r.class === cls && r.active)) flags.push('REVISION');
    const t = (ctx.tests || []).find(t => t.class === cls);
    if (t) flags.push(`TEST ${t.date}`);
    const mp = (ctx.missingPeriods || []).find(m => !(m.classes || []).length || m.classes.includes(cls));
    if (mp) flags.push(mp.action === 'move' ? 'MOVED' : 'COVER');
    if ((ctx.combinedOrDisjointed || []).some(c => c.class === cls))     flags.push('DISJOINTED');
    console.log(`  ${cls.padEnd(6)} ${flags.length ? '[' + flags.join(' / ') + ']' : 'normal'}`);
  }
  for (const e of (ctx.eventsAffectingPeriods || []))
    console.log(`  EVENT ${e.date}: ${e.event} (${e.periodsAffected})`);
  console.log('─'.repeat(60));
}

// ─── Mid-week absence (M3) ────────────────────────────────────────────────────

async function absentMode(dateArg, dryRun) {
  const absDate = dateArg === 'today' ? today() : dateArg;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(absDate)) {
    console.error('ERROR: date must be YYYY-MM-DD or "today"'); process.exit(1);
  }
  const ctx = loadJson(CONTEXT_PATH);
  if (!ctx) {
    console.error('ERROR: no context.json — run weekly setup first'); process.exit(1);
  }

  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  process.on('SIGINT', () => { rl.close(); console.log('\nCancelled.'); process.exit(0); });

  console.log(`\nMid-week absence: ${absDate}`);
  const classesAns = await ask(rl, 'Affected classes (comma-sep, or Enter for all): ');
  const reason     = await ask(rl, 'Reason: ');
  const periodsAns = await ask(rl, 'Periods (e.g. P3,P4 or "all") [all]: ');
  const pracAns    = await ask(rl, 'Practical lesson? → moves to next slot [y/N]: ');

  const classes = classesAns ? classesAns.split(',').map(s => school.normClass(s.trim()) || s.trim().toUpperCase()) : [];
  const action  = /^y/i.test(pracAns) ? 'move' : 'cover';
  const entry   = { date: absDate, periods: periodsAns || 'all', reason, classes, action };

  console.log(`\n  Proposed: ${action.toUpperCase()} — ${absDate} — ${classes.join(', ') || 'all classes'} — ${reason}`);
  // N4: warn on test collision for moved practicals
  if (action === 'move')
    for (const cls of (classes.length ? classes : CLASSES)) {
      const test = (ctx.tests || []).find(t => t.class === cls && t.date >= absDate);
      if (test) console.log(`  WARNING: ${cls} has test on ${test.date} — moved practical may collide`);
    }

  const ok = await ask(rl, 'Confirm? [Y/n]: ');
  rl.close();

  if (!ok || ok.toLowerCase() === 'y') {
    ctx.missingPeriods = [...(ctx.missingPeriods || []), entry];
    if (!dryRun) {
      fs.writeFileSync(CONTEXT_PATH, JSON.stringify(ctx, null, 2), 'utf8');
      console.log('context.json updated.');
    } else {
      console.log('--dry-run: not written.');
    }
    printSummary(ctx);
  } else {
    console.log('Cancelled.');
  }
}

// ─── Weekly setup ─────────────────────────────────────────────────────────────

async function weeklyMode(dryRun) {
  const standing = loadJson(STANDING_PATH) || { sharing: [] };
  const prev     = loadJson(CONTEXT_PATH);
  const weekOf   = mondayOf(today());

  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  process.on('SIGINT', () => { rl.close(); console.log('\nCancelled.'); process.exit(0); });

  // M8: already set this week?
  if (prev && prev.weekOf === weekOf && !dryRun) {
    printSummary(prev);
    const ans = await ask(rl, `Week ${weekOf} already set. Replace? [Y/n]: `);
    if (ans && ans.toLowerCase() !== 'y') { rl.close(); console.log('Cancelled. Use --absent for mid-week changes.'); return; }
  }

  // Week type — toggle from previous, let Patryk override
  const prevType = prev && prev.weekType;
  const defType  = prevType === 'A' ? 'B' : prevType === 'B' ? 'A' : 'A';
  const wtAns    = await ask(rl, `Week type [${defType}]: `);
  const weekType = /^[AB]$/i.test(wtAns) ? wtAns.toUpperCase() : defType;

  // ── Quick path (2026-07-12) ────────────────────────────────────────────────
  // Most weeks nothing unusual happens: no trips, no new tests, no cover, no
  // events. The carry-forward state (tests still ahead, active revision, standing
  // sharing) already describes such a week. So show it and ask ONE question. Only
  // fall through to the full five-prompt walk when something actually changed.
  const carriedTests = ((prev && prev.tests) || [])
    .filter(t => t.date >= weekOf)
    .map(t => Object.assign({}, t, { confirmed: true }));
  const carriedRevision = ((prev && prev.revisionMode) || [])
    .filter(r => r.active).map(r => Object.assign({}, r));
  const carriedSharing = (standing.sharing || []).filter(s => !s.weekType || s.weekType === weekType);

  console.log(`\nCarrying forward for Week ${weekType} (${weekOf}):`);
  console.log('  Tests:    ' + (carriedTests.length ? carriedTests.map(t => `${t.class} ${t.date}`).join(', ') : 'none'));
  console.log('  Revision: ' + (carriedRevision.length ? carriedRevision.map(r => r.class).join(', ') : 'none'));
  console.log('  Sharing:  ' + (carriedSharing.length ? carriedSharing.map(s => `${s.class} ${s.day}`).join(', ') : 'none (from standing)'));
  const unusual = await ask(rl, '\nAnything different this week — trips, a new test, cover, events? [y/N]: ');
  if (!/^y/i.test(unusual)) {
    const ctxQuick = {
      weekOf, weekType,
      missingPeriods: [], tests: carriedTests, combinedOrDisjointed: [],
      revisionMode: carriedRevision, eventsAffectingPeriods: [], sharing: carriedSharing,
    };
    rl.close();
    if (!dryRun) { fs.writeFileSync(CONTEXT_PATH, JSON.stringify(ctxQuick, null, 2), 'utf8'); console.log('\nWrote context.json (quick — nothing unusual).'); }
    else { console.log('\n--dry-run — would write:'); console.log(JSON.stringify(ctxQuick, null, 2)); }
    printSummary(ctxQuick);
    return;
  }
  console.log('  → full setup (blank line finishes each section):');

  // ── 1/5: Missing periods ──────────────────────────────────────────────────
  console.log('\n── 1/5  Missing days/periods (trips, INSET, bank holidays) ──');
  console.log('  YYYY-MM-DD [CLASS CLASS] [reason]  — blank line to finish');
  const missingPeriods = [];
  while (true) {
    const line = await ask(rl, '  > ');
    if (!line) break;
    const tokens = line.split(/\s+/);
    const date   = tokens[0];
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) { console.log('  (bad date — YYYY-MM-DD)'); continue; }
    const clsList = tokens.slice(1).map(t => school.normClass(t)).filter(Boolean);   // "7ml" → 7MLA
    const reason  = tokens.slice(1).filter(t => !school.normClass(t)).join(' ') || 'unspecified';
    const pAns    = await ask(rl, '  Periods (e.g. P3,P4 or "all") [all]: ');
    const pracAns = await ask(rl, '  Practical lesson? → move to next slot [y/N]: ');
    missingPeriods.push({ date, periods: pAns || 'all', reason, classes: clsList, action: /^y/i.test(pracAns) ? 'move' : 'cover' });
  }

  // ── 2/5: Tests ────────────────────────────────────────────────────────────
  console.log('\n── 2/5  Tests this week ──');
  // M10: carry forward any tests from prev context still in this week or later
  const tests = ((prev && prev.tests) || [])
    .filter(t => t.date >= weekOf)
    .map(t => Object.assign({}, t, { confirmed: true }));
  if (tests.length) console.log('  Pre-loaded: ' + tests.map(t => `${t.class} ${t.date}`).join(', ') + ' — type "remove CLASS" to drop');
  console.log('  Add: CLASS YYYY-MM-DD [topic]  — blank line to finish');
  while (true) {
    const line = await ask(rl, '  > ');
    if (!line) break;
    if (/^remove\s/i.test(line)) {
      const cls = line.split(/\s+/)[1].toUpperCase();
      const i = tests.findIndex(t => t.class === cls);
      if (i >= 0) { tests.splice(i, 1); console.log(`  Removed ${cls}`); }
      continue;
    }
    const parts = line.split(/\s+/);
    const cls   = parts[0].toUpperCase();
    const date  = parts[1] || '';
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) { console.log('  (format: CLASS YYYY-MM-DD [topic])'); continue; }
    tests.push({ class: cls, date, topic: parts.slice(2).join(' '), confirmed: true });
  }

  // ── 3/5: Combined/disjointed ──────────────────────────────────────────────
  console.log('\n── 3/5  Combined classes or disjointed lessons (not in sequence) ──');
  console.log('  CLASS YYYY-MM-DD [note]  — blank line to finish');
  const combinedOrDisjointed = [];
  while (true) {
    const line = await ask(rl, '  > ');
    if (!line) break;
    const parts = line.split(/\s+/);
    const cls   = parts[0].toUpperCase();
    const date  = parts[1] || '';
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) { console.log('  (format: CLASS YYYY-MM-DD [note])'); continue; }
    combinedOrDisjointed.push({ class: cls, date, note: parts.slice(2).join(' ') || 'one-off, not in sequence' });
  }

  // ── 4/5: Revision mode ────────────────────────────────────────────────────
  console.log('\n── 4/5  Revision mode ──');
  // M11: revision mode persists week-to-week — carry forward active entries
  const revisionMode = ((prev && prev.revisionMode) || [])
    .filter(r => r.active)
    .map(r => Object.assign({}, r));
  if (revisionMode.length)
    console.log('  Active: ' + revisionMode.map(r => `${r.class} (${r.type})`).join(', '));
  else
    console.log('  None active.');
  console.log('  Add: CLASS [type]  — or type an active CLASS to toggle off — blank line to finish');
  while (true) {
    const line = await ask(rl, '  > ');
    if (!line) break;
    const parts = line.split(/\s+/);
    const cls   = parts[0].toUpperCase();
    const type  = parts.slice(1).join('-') || 'revision';
    const ex    = revisionMode.find(r => r.class === cls);
    if (ex) { ex.active = false; console.log(`  ${cls} → OFF`); }
    else    { revisionMode.push({ class: cls, active: true, type }); console.log(`  ${cls} → ON (${type})`); }
  }

  // ── 5/5: Events affecting periods ────────────────────────────────────────
  console.log('\n── 5/5  Events affecting periods (parents evening, assembly, etc.) ──');
  console.log('  YYYY-MM-DD [event name] [periods e.g. P5-P6]  — blank line to finish');
  const eventsAffectingPeriods = [];
  while (true) {
    const line = await ask(rl, '  > ');
    if (!line) break;
    const parts = line.split(/\s+/);
    const date  = parts[0];
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) { console.log('  (bad date — YYYY-MM-DD)'); continue; }
    const lastTok     = parts[parts.length - 1];
    const hasPeriods  = /^P\d/i.test(lastTok);
    const periods     = hasPeriods ? lastTok : 'TBD';
    const eventName   = (hasPeriods ? parts.slice(1, -1) : parts.slice(1)).join(' ') || 'unspecified';
    eventsAffectingPeriods.push({ date, event: eventName, periodsAffected: periods });
  }

  // ── M9: Apply sharing from standing config (no prompt) ───────────────────
  const sharing = (standing.sharing || []).filter(s => !s.weekType || s.weekType === weekType);

  // ── M5: Print proposal, confirm before writing ───────────────────────────
  console.log('\n── Proposed week ──');
  if (!missingPeriods.length) {
    console.log('  No missing periods.');
  } else {
    for (const mp of missingPeriods) {
      const cls = mp.classes.length ? mp.classes.join(', ') : 'all classes';
      console.log(`  ${mp.action.toUpperCase().padEnd(5)}  ${mp.date}  ${cls}  (${mp.reason})`);
    }
    // N4: warn if a moved practical lands in a week with a test for the same class
    for (const mp of missingPeriods.filter(m => m.action === 'move'))
      for (const cls of mp.classes) {
        const test = tests.find(t => t.class === cls && t.date >= mp.date);
        if (test) console.log(`  WARNING: ${cls} has test on ${test.date} — moved practical may collide`);
      }
  }
  if (tests.length)
    console.log('  Tests: ' + tests.map(t => `${t.class} ${t.date}${t.topic ? ' – ' + t.topic : ''}`).join(', '));
  if (sharing.length)
    console.log('  Sharing (standing): ' + sharing.map(s => `${s.class} ${s.day} W${s.weekType}`).join(', '));
  if (revisionMode.filter(r => r.active).length)
    console.log('  Revision: ' + revisionMode.filter(r => r.active).map(r => r.class).join(', '));

  const ok = await ask(rl, '\nConfirm and write? [Y/n]: ');
  rl.close();

  if (ok && ok.toLowerCase() !== 'y') { console.log('Cancelled.'); return; }

  const ctx = { weekOf, weekType, missingPeriods, tests, combinedOrDisjointed, revisionMode, eventsAffectingPeriods, sharing };

  // M6: write
  if (!dryRun) {
    fs.writeFileSync(CONTEXT_PATH, JSON.stringify(ctx, null, 2), 'utf8');
    console.log('\nWrote context.json');
  } else {
    console.log('\n--dry-run — would write:');
    console.log(JSON.stringify(ctx, null, 2));
  }

  // M7: one-line-per-class summary
  printSummary(ctx);
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const args   = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');

  if (args.includes('--help') || args.includes('-h')) {
    console.log([
      'context.js — weekly scheduling context capture',
      '',
      'Usage:',
      '  node context.js                     Monday setup (5-prompt weekly session)',
      '  node context.js --absent YYYY-MM-DD Mid-week absence update',
      '  node context.js --absent today       Same, using today\'s date',
      '  node context.js --dry-run            Show what would be written, do not write',
      '  node context.js --review             Print current context.json summary',
      '  node context.js --help               This help',
    ].join('\n'));
    return;
  }

  if (args.includes('--review')) {
    const ctx = loadJson(CONTEXT_PATH);
    if (!ctx) { console.log('No context.json found.'); return; }
    printSummary(ctx);
    return;
  }

  const ai = args.indexOf('--absent');
  if (ai >= 0) {
    const dateArg = (args[ai + 1] && !args[ai + 1].startsWith('--')) ? args[ai + 1] : 'today';
    await absentMode(dateArg, dryRun);
    return;
  }

  await weeklyMode(dryRun);
}

main().catch(err => { console.error('ERROR:', err.message); process.exit(1); });
