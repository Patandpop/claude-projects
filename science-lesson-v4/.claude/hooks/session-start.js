#!/usr/bin/env node
'use strict';
// session-start.js — SessionStart hook.
// Fires once at the start of each new chat session.
// Prints a compact context banner so Patryk doesn't need to state prior context verbally.

const fs   = require('fs');
const path = require('path');

const ROOT  = path.resolve(__dirname, '../..');

// SessionStart fires once per chat — no stdin, no flag file needed.
run();

function run() {
  const now = Date.now();

  // ── Last built lesson (upload-log.txt tab-separated: timestamp\tname\tdrivePath) ──
  let lastBuilt = '(none on record)';
  const logFile = path.join(ROOT, 'upload-log.txt');
  if (fs.existsSync(logFile)) {
    const lines = fs.readFileSync(logFile, 'utf8').split('\n').filter(Boolean);
    if (lines.length) {
      const parts = lines[lines.length - 1].split('\t');
      const name  = (parts[1] || '').trim();
      const ts    = (parts[0] || '').slice(0, 10);
      if (name) lastBuilt = `${name}  [${ts}]`;
    }
  }

  // ── Week context (context.json — uses weekOf + weekType) ──
  let todayClasses = '(no context.json — run node references/context.js)';
  const ctxFile = path.join(ROOT, 'context.json');
  if (fs.existsSync(ctxFile)) {
    try {
      const ctx   = JSON.parse(fs.readFileSync(ctxFile, 'utf8'));
      const today = new Date().toISOString().slice(0, 10);
      const parts = [];
      if (ctx.weekOf) parts.push(`w/c ${ctx.weekOf}  Week ${ctx.weekType || '?'}`);
      // Tests today
      const testsToday = (ctx.tests || []).filter(t => t.date === today && t.confirmed !== false);
      if (testsToday.length) parts.push('TEST: ' + testsToday.map(t => `${t.class} ${t.topic}`).join(', '));
      // Revision classes
      const revClasses = (ctx.revisionMode || []).filter(r => r.active).map(r => r.class);
      if (revClasses.length) parts.push('Revision: ' + revClasses.join(', '));
      todayClasses = parts.join('  ·  ') || '(context empty)';
    } catch { todayClasses = '(context.json unreadable)'; }
  }

  // ── Skill file freshness ──
  let skillAge = '(not built yet)';
  const skillFile = path.join(ROOT, 'science-lesson.skill');
  if (fs.existsSync(skillFile)) {
    const days = Math.round((now - fs.statSync(skillFile).mtimeMs) / 86400000);
    skillAge = days === 0 ? 'built today ✓' : `${days}d old — upload to claude.ai if changed`;
  }

  // ── Open bugs count — bug header lines in SKILL.md without FIXED on the same line ──
  let openBugs = '';
  const skillMd = path.join(ROOT, 'science-lesson/SKILL.md');
  if (fs.existsSync(skillMd)) {
    const headers = fs.readFileSync(skillMd, 'utf8').split('\n').filter(l => /^\*\*Bug \d+/.test(l));
    const open = headers.filter(l => !/FIXED/.test(l)).length;
    openBugs = `${open} open`;
  }

  const W   = 58;
  const bar = '═'.repeat(W);
  const pad = (s, n) => String(s).slice(0, n).padEnd(n);

  console.log(`\n╔${bar}╗`);
  console.log(`║${pad('  SESSION START — Science Lesson (Beechen Cliff)', W)}║`);
  console.log(`╠${bar}╣`);
  console.log(`║  Last built : ${pad(lastBuilt, W - 15)}║`);
  console.log(`║  Today      : ${pad(todayClasses, W - 15)}║`);
  console.log(`║  Skill file : ${pad(skillAge, W - 15)}║`);
  if (openBugs) console.log(`║  Bugs open  : ${pad(openBugs + ' (check SKILL.md for backlog)', W - 15)}║`);
  console.log(`╚${bar}╝\n`);

  process.exit(0);
}
