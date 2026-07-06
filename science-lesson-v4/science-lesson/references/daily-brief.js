#!/usr/bin/env node
'use strict';
// daily-brief.js — daily HTML briefing generator
// Usage: node references/daily-brief.js [--preview]
//
// Reads from project root:
//   context.json         — today's schedule (create before use; format below)
//   context-standing.json — class counts, extra-time students, tutor class
//   upload-log.txt       — tab-separated: timestamp, lesson name, drive path
//   brief-log.json       — append-only log written by brief-log.js
//
// context.json format:
// {
//   "date": "YYYY-MM-DD", "weekType": "A|B", "yearWeek": N,
//   "periods": [{ "period": N, "class": "8AB", "lessonTopic": "Topic",
//                 "lessonNumber": N, "room": "L14",
//                 "isTest": false, "isRevision": false, "isAbsent": false,
//                 "isShared": false, "isCover": false, "setHomework": false }],
//   "tests": [{ "class": "8AB", "date": "YYYY-MM-DD", "topic": "Topic",
//               "tier": "higher|lower", "plcUploaded": false }]
// }
//
// context-standing.json format:
// {
//   "tutorClass": "11C3", "tutorCount": 28,
//   "classes": {
//     "8AB": { "standard": 22, "support": 4, "core": null, "extended": null,
//              "extraTime": [{ "id": "Student A", "percent": 25 }] }
//   }
// }

const fs   = require('fs');
const path = require('path');
const { LESSON_COLS, loadXlsx, parseRows, isFilledSheet, sheetWeekType, extractTimetable, extractLessons } = require('./xlsx-utils');

const ROOT          = path.join(__dirname, '../../');
const CONTEXT       = path.join(ROOT, 'context.json');
const STANDING      = path.join(ROOT, 'context-standing.json');
const UPLOAD_LOG    = path.join(ROOT, 'upload-log.txt');
const BRIEF_LOG     = path.join(ROOT, 'brief-log.json');
const QUESTION_BANK = path.join(__dirname, 'question-bank');
const DRIVE_BRIEF   = 'G:\\My Drive\\Beechen Cliff Science\\Admin\\Daily Brief';
const PLANNER       = path.join(ROOT, 'Planner.xlsx');

const PREVIEW  = process.argv.includes('--preview');
const DRIVE_UP = fs.existsSync('G:\\');

function loadTodayPeriods(ctx) {
  if (!fs.existsSync(PLANNER)) return null;
  try {
    const weekType   = (ctx && ctx.weekType) || 'A';
    const { zip, ss, sheets } = loadXlsx(PLANNER);
    const candidates = sheets.filter(function(s) { return isFilledSheet(s.name) && sheetWeekType(s.name) === weekType; });
    if (!candidates.length) return null;
    const sheet      = candidates[candidates.length - 1];
    const rows       = parseRows(zip.readAsText(sheet.file), ss);
    const timetable  = extractTimetable(rows);
    const lessons    = extractLessons(rows);
    const DAY_NAMES  = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
    const todaySlots = timetable[DAY_NAMES[TODAY.getDay()]] || [];
    return todaySlots.map(function(slot) {
      const cls        = slot.class.toUpperCase();
      const lessonName = lessons[cls] || '';
      const numMatch   = lessonName.match(/lesson\s+(\d+)/i);
      const topicMatch = lessonName.match(/lesson\s*\d*\s*[-–]\s*(.+)/i);
      const missingEn  = ctx && ctx.missingPeriods && ctx.missingPeriods.find(function(m) {
        return m.date === isoDate() && (!m.classes || !m.classes.length
          || m.classes.map(function(c){return c.toUpperCase();}).includes(cls));
      });
      return {
        period:      LESSON_COLS.indexOf(slot.lessonCol) + 1,
        class:       cls,
        lessonTopic: topicMatch ? topicMatch[1].trim() : lessonName,
        lessonNumber: numMatch ? parseInt(numMatch[1]) : null,
        room:        null,
        isTest:      !!(ctx && ctx.tests && ctx.tests.some(function(t) { return t.class.toUpperCase() === cls && t.date === isoDate(); })),
        isRevision:  !!(ctx && ctx.revisionMode && ctx.revisionMode.some(function(r) { return r.class.toUpperCase() === cls && r.active; })),
        isAbsent:    !!(missingEn),
        isCover:     !!(missingEn && missingEn.action === 'cover'),
        isShared:    !!(ctx && ctx.sharing && ctx.sharing.some(function(s) { return s.class.toUpperCase() === cls; })),
        isDisjointed:!!(ctx && ctx.combinedOrDisjointed && ctx.combinedOrDisjointed.some(function(c) { return c.class.toUpperCase() === cls && c.date === isoDate(); })),
        setHomework: false,
      };
    });
  } catch (e) { return null; }
}

// ─── Loaders ──────────────────────────────────────────────────────────────────

function loadJson(fp) {
  if (!fs.existsSync(fp)) return null;
  try { return JSON.parse(fs.readFileSync(fp, 'utf8')); }
  catch { return null; }
}

function loadUploadLog() {
  if (!fs.existsSync(UPLOAD_LOG)) return [];
  return fs.readFileSync(UPLOAD_LOG, 'utf8').split('\n').filter(Boolean).map(line => {
    const parts = line.split('\t');
    return { ts: parts[0], name: (parts[1] || '').trim(), drivePath: (parts[2] || '').trim() };
  });
}

// ─── Date helpers ─────────────────────────────────────────────────────────────

const TODAY = new Date();
TODAY.setHours(0, 0, 0, 0);

function pad(n) { return String(n).padStart(2, '0'); }
function isoDate(d) { d = d || TODAY; return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`; }
function dow() { return TODAY.getDay(); }
function dayName() { return ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'][dow()]; }

function schoolWeek(ctx) {
  if (ctx && ctx.yearWeek) return ctx.yearWeek;
  const cal     = TODAY.getFullYear();
  const ayStart = new Date(TODAY.getMonth() >= 8 ? cal : cal - 1, 8, 1); // Sep 1 of current AY
  const ms      = TODAY - ayStart;
  return ms < 0 ? 1 : Math.max(1, Math.min(52, Math.floor(ms / 604800000) + 1));
}

// ─── Brief log helpers ────────────────────────────────────────────────────────

function byCategory(log, cat) {
  return (log && log.entries ? log.entries : []).filter(function(en) { return en.category === cat; });
}

function orderSubmittedThisWeek(log) {
  if (!log || !log.entries) return false;
  const mon = new Date(TODAY);
  mon.setDate(TODAY.getDate() - ((TODAY.getDay() + 6) % 7));
  return log.entries.some(function(en) {
    return /order\s*sheet/i.test(en.message) && /submit/i.test(en.message)
        && new Date(en.timestamp) >= mon;
  });
}

// ─── Upload log lookup ────────────────────────────────────────────────────────

function norm(s) {
  return (s || '').toLowerCase().replace(/[^\w\s]/g, ' ').replace(/\s+/g, ' ').trim();
}

function findUploadEntry(topic, lessonNum, uploadLog) {
  if (!topic && !lessonNum) return null;
  const nt = norm(topic);
  for (const en of uploadLog) {
    if (!en.name) continue;
    const nn = norm(en.name);
    if (lessonNum && nn === norm('Lesson ' + lessonNum + ' - ' + topic)) return en;
    if (lessonNum && nn.startsWith('lesson ' + lessonNum + ' ')) return en;
    const title = nn.replace(/^lesson \d+ /, '');
    const shortT = nt.slice(0, 12);
    const shortN = title.slice(0, 12);
    if (shortT.length >= 5 && shortN.length >= 5 && (shortT === shortN || nt.includes(shortN) || title.includes(shortT.slice(0,8)))) return en;
  }
  return null;
}

function folderFiles(dp) {
  if (!dp || !DRIVE_UP || !fs.existsSync(dp)) return {};
  try {
    const files = fs.readdirSync(dp);
    return {
      pptx:    files.find(function(f) { return f.endsWith('_PTO.pptx'); }),
      ws:      files.find(function(f) { return f.endsWith('_PTO_worksheet.docx'); }),
      support: files.find(function(f) { return f.endsWith('_PTO_support_worksheet.docx'); }),
    };
  } catch { return {}; }
}

function fileUrl(dir, name) {
  return 'file:///' + path.join(dir, name).replace(/\\/g, '/');
}

// ─── Question bank ────────────────────────────────────────────────────────────

function getHwQuestions(cls, topic) {
  const bank = loadJson(path.join(QUESTION_BANK, cls + '.json'));
  if (!bank || !bank.questions || !bank.questions.length) return null;
  const nt = (topic || '').toLowerCase().slice(0, 12);
  const pool = nt
    ? bank.questions.filter(function(q) { return (q.topic || '').toLowerCase().includes(nt); })
    : [];
  return (pool.length ? pool : bank.questions).slice(-3);
}

// ─── HTML helpers ─────────────────────────────────────────────────────────────

function elt(tag, cls, html) {
  return '<' + tag + (cls ? ' class="' + cls + '"' : '') + '>' + html + '</' + tag + '>';
}
function div(cls, html) { return elt('div', cls, html); }
function miss(t) { return '<span class="missing">' + t + '</span>'; }
function flag(cls, t) { return '<span class="flag ' + cls + '">' + t + '</span>'; }

function section(num, title, cls, body) {
  return div('section s-' + cls, elt('h2', '', num + '. ' + title) + '\n' + body);
}

// ─── Section 1: Today's Lessons ───────────────────────────────────────────────

function sec1(todayPeriods, ctx, standing, uploadLog, log) {
  if (!todayPeriods || !todayPeriods.length)
    return miss('[Planner.xlsx not found or no lessons today — check timetable]');

  const periods = todayPeriods.filter(function(p) { return !p.isAbsent; });
  if (!periods.length) return '<p>No lessons today.</p>';

  return periods.map(function(p) {
    const cls    = p.class || '?';
    const topic  = p.lessonTopic || '[topic unknown]';
    const entry  = findUploadEntry(topic, p.lessonNumber, uploadLog);
    const dp     = entry && entry.drivePath;
    const files  = folderFiles(dp);
    const counts = standing && standing.classes && standing.classes[cls];
    const extra  = (counts && counts.extraTime) || [];

    // Print counts (M4)
    let printCounts;
    if (counts) {
      if (p.isTest && counts.core != null)
        printCounts = counts.core + ' core, ' + counts.extended + ' extended';
      else if (counts.standard != null)
        printCounts = counts.standard + ' standard, ' + counts.support + ' support';
    }

    // Flags
    const flags = [
      p.isTest       && flag('red',   'TEST'),
      p.isRevision   && flag('amber', 'REVISION'),
      p.isShared     && flag('blue',  'SHARED'),
      p.isCover      && flag('amber', 'COVER'),
      p.isDisjointed && flag('amber', 'DISJOINTED'),
    ].filter(Boolean).join(' ');

    // Drive/file links (M3)
    const folderLink = dp
      ? '<a href="' + fileUrl(dp, '') + '" class="drive-link">' + path.basename(dp) + '</a>'
      : miss('[NOT YET UPLOADED]');
    const pptxLink = (dp && files.pptx)
      ? '<a href="' + fileUrl(dp, files.pptx) + '">Open PPTX</a>'
      : miss('[NOT YET UPLOADED]');
    const wsLinks = (dp && files.ws)
      ? '<a href="' + fileUrl(dp, files.ws) + '">Standard</a>'
        + (files.support ? ' | <a href="' + fileUrl(dp, files.support) + '">Support</a>' : '')
      : miss('[NOT YET UPLOADED]');

    // Homework OUT (M5)
    let hwOut = '';
    if (p.setHomework) {
      const qs = getHwQuestions(cls, topic);
      hwOut = qs
        ? div('hw-out', '<strong>HW OUT — SET:</strong><br>' + qs.map(function(q, i) { return (i+1) + '. ' + q.text; }).join('<br>'))
        : div('hw-out', '<strong>HW OUT — </strong>' + miss('[GENERATE HOMEWORK — topic: ' + topic + ']'));
    }

    // Homework IN (M6, M7)
    const hwEntries = (log && log.entries ? log.entries : []).filter(function(en) {
      return en.category === 'homework' && en.message.toLowerCase().includes(cls.toLowerCase());
    });
    const lastHw = hwEntries[hwEntries.length - 1];
    let hwIn = '';
    if (lastHw) {
      const isSeneca = /seneca/i.test(lastHw.message);
      hwIn = div('hw-in', '<strong>HW IN — COLLECT:</strong> ' + lastHw.message
        + (isSeneca ? ' — ' + flag('red', 'CHECK SENECA — log detentions for non-completion') : ''));
    }

    // Late/owed work (M8)
    const late = (log && log.entries ? log.entries : []).filter(function(en) {
      return /ow(ed)?|late\s+work|missing\s+work/i.test(en.message)
          && en.message.toLowerCase().includes(cls.toLowerCase());
    });
    const lateHtml = late.length
      ? div('late-work', '<strong>OWED WORK:</strong> ' + late.map(function(_, i) { return 'Student ' + (i+1); }).join(', ') + ' — SUPER GOOD EXCUSES ONLY')
      : '';

    // Cover note (M9)
    const coverEn = (log && log.entries ? log.entries : []).find(function(en) {
      return en.category === 'cover' && en.message.toLowerCase().includes(cls.toLowerCase());
    });
    const coverHtml = coverEn
      ? div('cover-note', '<strong>COVER NOTE:</strong> ' + coverEn.message + ' — Do Now should draw from prior lesson.')
      : '';

    return div('lesson-block',
      elt('h3', '', 'Period ' + p.period + ': ' + cls + ' — ' + topic + ' ' + flags)
      + '<div class="lesson-meta">'
      + '<strong>Folder:</strong> ' + folderLink + '<br>'
      + '<strong>Presentation:</strong> ' + pptxLink + '<br>'
      + '<strong>Worksheets:</strong> ' + wsLinks + '<br>'
      + '<strong>Print counts:</strong> ' + (printCounts || miss('[CHECK COUNTS]'))
      + (extra.length ? '<br><strong>Extra time:</strong> ' + extra.map(function(s) { return s.id + ' — ' + s.percent + '% extra time'; }).join(', ') : '')
      + '</div>'
      + hwOut + hwIn + lateHtml + coverHtml
    );
  }).join('\n');
}

// ─── Section 2: Tutor Time (M10) ──────────────────────────────────────────────

function sec2(standing, log) {
  const tutorCls  = (standing && standing.tutorClass) || miss('[unknown — add to context-standing.json]');
  const tutorCnt  = (standing && standing.tutorCount) || '?';
  const concerns  = byCategory(log, 'tutor-note');
  const parentFl  = byCategory(log, 'parent-call');
  const isFriday  = dow() === 5;

  return '<p><strong>Tutor class:</strong> ' + tutorCls + ' (' + tutorCnt + ' students)</p>'
    + '<p><strong>Attendance:</strong> ' + miss('[Check register — flag any lates/absences]') + '</p>'
    + (concerns.length
      ? div('concern', '<strong>Concerns / behaviour notes:</strong><ul>'
          + concerns.map(function(c, i) { return '<li>Student ' + (i+1) + ': ' + c.message + '</li>'; }).join('')
          + '</ul>')
      : '<p><em>No tutor concerns logged.</em></p>')
    + '<p><strong>Tracker goals:</strong> ' + miss('[Check positives target — update tracker]') + '</p>'
    + ((!isFriday && parentFl.length)
      ? div('warn', '<strong>Parent contact needed:</strong><ul>'
          + parentFl.map(function(c, i) { return '<li>Student ' + (i+1) + ': ' + c.message + '</li>'; }).join('')
          + '</ul>')
      : '')
    + '<p><em>Reminder: Is the tracker up to date?</em></p>';
}

// ─── Section 3: Urgent Today (M11, M15) ──────────────────────────────────────

function sec3(log, ctx) {
  const parts = [];
  const d = dow();

  // Order sheet warning (M11)
  if (d >= 3 && !orderSubmittedThisWeek(log))
    parts.push(div('urgent', '<strong>ORDER SHEET DUE THURSDAY 3:15 — NOT YET SUBMITTED</strong>'));

  // Observation triple-check (M15)
  byCategory(log, 'observation').forEach(function(obs) {
    const dm = obs.message.match(/\d{4}-\d{2}-\d{2}/);
    if (!dm) return;
    const daysAway = Math.round((new Date(dm[0]) - TODAY) / 86400000);
    if (daysAway >= 0 && daysAway <= 3) {
      const clsMatch = obs.message.match(/class\s+(\w+)/i);
      const obsClass = clsMatch ? ' (' + clsMatch[1] + ')' : '';
      parts.push(div('urgent', '<strong>TRIPLE CHECK POWERPOINT — observation ' + dm[0] + obsClass + '</strong>'));
    }
  });

  // Lunchtime sessions
  const lunch = byCategory(log, 'lunchtime');
  if (lunch.length)
    parts.push(div('lunchtime', '<strong>Lunchtime sessions:</strong><ul>'
      + lunch.map(function(en) { return '<li>' + en.message + '</li>'; }).join('')
      + '</ul>'));

  // Today's deadlines
  const todayDl = (log && log.entries ? log.entries : []).filter(function(en) {
    return en.category === 'deadline' && en.message.includes(isoDate());
  });
  if (todayDl.length)
    parts.push(div('urgent', '<strong>Deadlines TODAY:</strong><ul>'
      + todayDl.map(function(en) { return '<li>' + en.message + '</li>'; }).join('')
      + '</ul>'));

  return parts.length ? parts.join('\n') : '<p><em>No urgent items.</em></p>';
}

// ─── Section 4: AI-Suggested Tasks (M12–M14) ──────────────────────────────────

function sec4(ctx, log, todayPeriods) {
  const d = dow();
  if (d < 1 || d > 4) return '<p><em>AI tasks only shown Mon–Thu.</em></p>';

  const ALL  = ['7BYA','7MLA','8AB','8XP','9AB','10S2','10C4','11C3'];
  const wk   = schoolWeek(ctx);
  const parts = [];

  // Free period count — determines task load (M12)
  const lessons   = todayPeriods ? todayPeriods.filter(function(p) { return !p.isAbsent; }).length : 0;
  const freeCount = Math.max(0, 5 - lessons);
  parts.push('<p><small>' + lessons + ' lesson' + (lessons !== 1 ? 's' : '') + ' today, '
    + freeCount + ' free period' + (freeCount !== 1 ? 's' : '')
    + (freeCount < 2 ? ' — priority tasks only' : '') + '</small></p>');

  // Book marking rota (M13)
  if (wk === 1) {
    parts.push('<p><strong>Book marking:</strong> Week 1 of year — skip.</p>');
  } else if (wk <= 4) {
    const idx = ((wk - 2) * 2) % ALL.length;
    parts.push('<p><strong>Book marking this week:</strong> ' + ALL[idx] + ', ' + ALL[(idx+1) % ALL.length] + '</p>');
  } else {
    parts.push('<p><strong>Book marking this week:</strong> ' + ALL[(wk - 5) % ALL.length] + '</p>');
  }

  // Parent calls
  const calls = byCategory(log, 'parent-call');
  if (calls.length)
    parts.push('<p><strong>Parent calls to make:</strong> ' + calls.map(function(en) { return en.message; }).join('; ') + '</p>');

  // PLC reminder (M14) — test 10–14 days away
  (ctx && ctx.tests ? ctx.tests : []).forEach(function(t) {
    const da = (new Date(t.date) - TODAY) / 86400000;
    if (da >= 10 && da <= 14)
      parts.push(div('warn', '<strong>PLC for ' + t.topic + ' (' + t.class + ') due — upload now</strong>'));
  });

  // ATL/behaviour — shown only on lighter days (M12: more tasks when more free periods)
  if (freeCount >= 2)
    parts.push('<p><strong>ATL data:</strong> ' + miss('[Check if Arbor deadline approaching]') + '</p>');

  // Y12/13 on lesson days (time-sensitive — always shown)
  if (todayPeriods && todayPeriods.some(function(p) { return /^1[23]/.test(p.class); }))
    parts.push('<p><strong>Y12/13 homework:</strong> Set questions today — 1 week deadline.</p>');

  return parts.join('\n');
}

// ─── Section 5: Upcoming Deadlines (M14, M15) ─────────────────────────────────

function sec5(ctx, log) {
  const parts = [];

  // Tests in next 30 days
  (ctx && ctx.tests ? ctx.tests : []).forEach(function(t) {
    const da = Math.round((new Date(t.date) - TODAY) / 86400000);
    if (da >= 0 && da <= 30) {
      const plc = t.plcUploaded ? '&#10003; PLC done' : miss('PLC not uploaded');
      parts.push('<p><strong>Test in ' + da + ' days (' + t.date + '):</strong> '
        + t.class + ' — ' + t.topic + ' (' + (t.tier || 'standard') + ') — ' + plc + '</p>');
    }
  });

  // Observations (M15)
  byCategory(log, 'observation').forEach(function(obs) {
    const dm = obs.message.match(/\d{4}-\d{2}-\d{2}/);
    const dateStr  = dm ? dm[0] : 'date unknown';
    const clsMatch = obs.message.match(/class\s+(\w+)/i);
    const obsClass = clsMatch ? clsMatch[1] : 'relevant class';
    parts.push(div('warn', '<strong>Observation logged:</strong> ' + obs.message
      + ' — check books for ' + obsClass + ' by lesson before ' + dateStr));
  });

  // Logged deadlines
  const dl = byCategory(log, 'deadline');
  if (dl.length)
    parts.push('<p><strong>Logged deadlines:</strong></p><ul>'
      + dl.map(function(d) { return '<li>' + d.timestamp + ': ' + d.message + '</li>'; }).join('')
      + '</ul>');

  return parts.length ? parts.join('\n') : '<p><em>No upcoming deadlines in next 30 days.</em></p>';
}

// ─── Section 6: Y12/13 Accountability (weekly, Mondays) ──────────────────────

function sec6() {
  if (dow() !== 1) return '<p><em>Shown on Mondays only.</em></p>';
  return '<p><strong>Y12/13 homework completion:</strong> ' + miss('[Update from accountability spreadsheet]') + '</p>'
    + '<p><em>Students below threshold: flag for contact, conversation, or note.</em></p>';
}

// ─── Section 7: End of Day Checklist (M16) ────────────────────────────────────

function sec7(todayPeriods) {
  // Last period per room
  const roomLast = {};
  (todayPeriods || []).forEach(function(p) {
    if (p.room && !p.isAbsent) roomLast[p.room] = p.period;
  });
  const chairs = Object.keys(roomLast).length
    ? Object.entries(roomLast).map(function(pair) { return 'Period ' + pair[1] + ' (' + pair[0] + ')'; }).join(', ')
    : miss('[Check timetable]');

  return '<ul class="checklist">'
    + '<li>&#9744; Positives logged on system</li>'
    + '<li>&#9744; Negatives logged on system</li>'
    + '<li>&#9744; Classroom clean</li>'
    + '<li>&#9744; Chairs up — ' + chairs + '</li>'
    + '</ul>';
}

// ─── HTML shell ───────────────────────────────────────────────────────────────

function buildHtml(bodyParts) {
  const d = isoDate();
  return '<!DOCTYPE html>\n<html lang="en">\n<head>\n'
    + '<meta charset="UTF-8">\n'
    + '<meta name="viewport" content="width=device-width,initial-scale=1">\n'
    + '<title>Daily Brief — ' + dayName() + ' ' + d + '</title>\n'
    + '<style>\n'
    + 'body{font-family:"Trebuchet MS",Arial,sans-serif;max-width:900px;margin:2rem auto;padding:0 1rem;background:#f8f9fa;color:#212529}\n'
    + 'h1{border-bottom:3px solid #0d6efd;padding-bottom:.5rem}\n'
    + 'h2{font-size:1.1rem;margin:0 0 .75rem}\n'
    + 'h3{font-size:1rem;margin:.5rem 0}\n'
    + '.section{background:#fff;border-radius:6px;padding:1rem 1.25rem;margin-bottom:1.25rem;border-left:5px solid #dee2e6;box-shadow:0 1px 3px rgba(0,0,0,.08)}\n'
    + '.s-lessons{border-color:#0d6efd}.s-tutor{border-color:#6610f2}.s-urgent{border-color:#dc3545}\n'
    + '.s-tasks{border-color:#198754}.s-deadlines{border-color:#fd7e14}.s-y12{border-color:#6c757d}.s-checklist{border-color:#198754}\n'
    + '.lesson-block{border:1px solid #dee2e6;border-radius:4px;padding:.75rem;margin-bottom:.75rem;background:#f8f9fa}\n'
    + '.lesson-meta{font-size:.9rem;line-height:1.8}\n'
    + '.hw-out{background:#d1e7dd;padding:.4rem .6rem;border-radius:3px;margin:.4rem 0;font-size:.9rem}\n'
    + '.hw-in{background:#cff4fc;padding:.4rem .6rem;border-radius:3px;margin:.4rem 0;font-size:.9rem}\n'
    + '.late-work{background:#f8d7da;padding:.4rem .6rem;border-radius:3px;margin:.4rem 0;font-size:.9rem}\n'
    + '.cover-note{background:#fff3cd;padding:.4rem .6rem;border-radius:3px;margin:.4rem 0;font-size:.9rem}\n'
    + '.concern,.warn{background:#fff3cd;padding:.4rem .6rem;border-radius:3px;margin:.4rem 0}\n'
    + '.urgent{background:#f8d7da;padding:.4rem .6rem;border-radius:3px;margin:.4rem 0;font-weight:bold}\n'
    + '.lunchtime{background:#d1e7dd;padding:.4rem .6rem;border-radius:3px;margin:.4rem 0}\n'
    + '.missing{color:#dc3545;font-style:italic}\n'
    + '.flag{display:inline-block;padding:.1rem .4rem;border-radius:3px;font-size:.8rem;font-weight:bold;margin-left:.3rem}\n'
    + '.flag.red{background:#dc3545;color:#fff}.flag.amber{background:#fd7e14;color:#fff}.flag.blue{background:#0d6efd;color:#fff}\n'
    + 'a,.drive-link{color:#0d6efd}\n'
    + '.checklist{list-style:none;padding:0}.checklist li{padding:.3rem 0;font-size:1rem}\n'
    + '</style>\n</head>\n<body>\n'
    + '<h1>Daily Brief — ' + dayName() + ' ' + d + '</h1>\n'
    + bodyParts.join('\n')
    + '\n<footer style="margin-top:2rem;font-size:.8rem;color:#6c757d">Generated '
    + new Date().toISOString().slice(0, 19).replace('T', ' ')
    + '</footer>\n</body>\n</html>';
}

// ─── Main ─────────────────────────────────────────────────────────────────────

function main() {
  const ctx       = loadJson(CONTEXT);
  const standing  = loadJson(STANDING);
  const uploadLog = loadUploadLog();
  const log       = loadJson(BRIEF_LOG) || { entries: [] };
  const periods   = loadTodayPeriods(ctx);

  const html = buildHtml([
    section(1, "Today's Lessons",       'lessons',   sec1(periods, ctx, standing, uploadLog, log)),
    section(2, 'Tutor Time',            'tutor',     sec2(standing, log)),
    section(3, 'Urgent Today',          'urgent',    sec3(log, ctx)),
    section(4, 'AI-Suggested Tasks',    'tasks',     sec4(ctx, log, periods)),
    section(5, 'Upcoming Deadlines',    'deadlines', sec5(ctx, log)),
    section(6, 'Y12/13 Accountability', 'y12',       sec6()),
    section(7, 'End of Day Checklist',  'checklist', sec7(periods)),
  ]);

  // --preview: print to terminal, no Drive write (N2)
  if (PREVIEW) {
    console.log(html);
    return;
  }

  // M18: fallback to terminal if Drive not mounted
  if (!DRIVE_UP) {
    process.stderr.write('WARNING: G:\\ not mounted — printing to terminal instead.\n');
    console.log(html);
    return;
  }

  // M1: write to Drive, create folder if needed
  if (!fs.existsSync(DRIVE_BRIEF))
    fs.mkdirSync(DRIVE_BRIEF, { recursive: true });

  const outFile = path.join(DRIVE_BRIEF, isoDate() + '.html');
  fs.writeFileSync(outFile, html, 'utf8');
  console.log('Brief written to: ' + outFile);
}

main();
