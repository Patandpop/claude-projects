'use strict';
// brief-smoke.test.js — the morning brief runs end to end (workplan Phase 5, "smoke tests for the brief", 2026-10-30).
// Uses --preview only: it prints the page and never writes to Drive. Reads this PC's own context files (skips
// without them). Checks: it finishes, the page is whole, it names only this year's classes, no em dashes.
const fs = require('fs');
const path = require('path');
const cp = require('child_process');
const GRN = '\x1b[32m', RED = '\x1b[31m', YEL = '\x1b[33m', RST = '\x1b[0m';
function run() {
  let fails = 0;
  const check = (c, m) => { console.log(`  ${c ? GRN + '✓' : RED + '✗'}${RST} ${m}`); if (!c) fails++; };
  console.log('── Morning brief (preview, end to end)');
  const root = path.join(__dirname, '..');
  if (!fs.existsSync(path.join(root, 'context.json'))) { console.log(`  ${YEL}!${RST} no context.json on this PC: not checked`); return { fails, warns: 1 }; }
  const r = cp.spawnSync(process.execPath, [path.join(root, 'science-lesson', 'references', 'daily-brief.js'), '--preview'], { cwd: root, encoding: 'utf8', timeout: 120000, env: Object.assign({}, process.env, { NO_UPLOAD: '1' }) });
  const html = String(r.stdout || '');
  check(r.status === 0, 'the brief runs to the end' + (r.status ? ': ' + String(r.stderr).trim().split('\n').pop() : ''));
  check(/^<!DOCTYPE html>/.test(html.trim()) && /<\/html>\s*$/.test(html.trim()) && /<title>Daily Brief/.test(html), 'it makes a whole page, with its title');
  const old = html.match(/\b(8AB|9AB|11C3|7BYA|12D|10C4|10C3)\b/g) || [];
  check(!old.length, 'it names only this year\'s classes' + (old.length ? ' (found ' + [...new Set(old)].join(', ') + ')' : ''));
  check(!/\u2014/.test(html), 'no em dashes on the page');
  check(!/Brief written to/.test(String(r.stdout) + String(r.stderr)), 'preview writes nothing to Drive');
  return { fails, warns: 0 };
}
module.exports = { run };
if (require.main === module) process.exit(run().fails ? 1 : 0);
