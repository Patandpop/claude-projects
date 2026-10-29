'use strict';
// do-now-own.test.js — Patryk's own Do Now store (science-lesson/references/do-now-own.js).
// Pure: parses deck XML shaped like build.js output, and the per-class de-duplication. Writes nothing.

const own = require('../science-lesson/references/do-now-own.js');

const GRN = '\x1b[32m', RED = '\x1b[31m', RST = '\x1b[0m';

function run() {
  let fails = 0;
  const pass = (m) => console.log(`  ${GRN}✓${RST} ${m}`);
  const fail = (m) => { console.log(`  ${RED}✗${RST} ${m}`); fails++; };
  const check = (c, m) => (c ? pass(m) : fail(m));
  console.log('── own Do Now store');

  const sp = (t) => `<p:sp><a:p><a:r><a:t>${t}</a:t></a:r></a:p></p:sp>`;
  const nav = ['DO NOW', 'ENGAGE', 'LEARN', 'BUILD', 'APPLY', 'REVIEW'].map(sp).join('');
  const s1 = nav + sp('Using Microscopes') + sp('Year 9  ·  Biology') + sp('DO NOW') + sp('1') + sp('What are plasmids?') + sp('2') + sp('Name a stain.') + sp('Silent start');
  const s2 = nav + sp('☞  Purple pen time · mark and correct your answers') + sp('What are plasmids?') + sp('Small rings of DNA.') +
    sp('Name a stain.') + sp('Iodine &amp; methylene blue') + sp('Learning objective:  Focus a microscope');
  const d = own.parseDeck(s1, s2);
  check(d.title === 'Using Microscopes' && d.year === 9 && d.subject === 'Biology', 'deck title, year and subject read from slide 1');
  check(d.questions.length === 2 && d.questions[1].a === 'Iodine & methylene blue', 'question + answer pairs read from the purple-pen slide');
  const d2 = own.parseDeck(s1, '');
  check(d2.questions.length === 2 && d2.questions[0].a === '', 'no answers slide: questions still read from slide 1');

  const data = { classes: {} };
  const recs = own.fromContent({ meta: { class: '7BYA / 7MLA', title: 'T' }, doNow: { questions: [{ q: 'What is a cell?', a: 'Unit of life' }] } }, '2026-10-07');
  check(recs.length === 2 && recs[0].recs[0].a === 'Unit of life', 'a shared lesson saves its Do Now for both classes, with answers');
  own.add(data, '9xs', [{ q: 'What are plasmids?' }]);
  const n = own.add(data, '9XS', [{ q: 'What are  plasmids' }, { q: 'Name a stain.' }]);
  check(n === 1 && data.classes['9XS'].length === 2, 'the same question is never stored twice for a class');
  // uploader tidy: only the school's own lesson deck moves to "Beechen Cliff Original Lesson"
  const up = require('../science-lesson/references/upload-to-drive.js');
  const mv = up.originalsToTuck(['EPIBA Microscopy.pptx', 'Cells.pptx', 'Cells_worksheet.docx', 'Suspect cards laminates.pptx', 'Support sheet.pptx', 'Method Sheet.pptx', 'Old.ppt'], ['New.pptx']);
  check(mv.join('|') === 'EPIBA Microscopy.pptx|Old.ppt', 'uploader moves only the school deck (never our decks, laminates, support or method sheets)');
  const ws = up.originalsToTuck(['RBA LPA Renewable sources.pptx', 'WS Renewable Resources table OCA.pptx', 'L3 WS for aliens.pptx', 'P6 L6 WS3 summary.pptx'], []);
  check(ws.join('|') === 'RBA LPA Renewable sources.pptx', 'uploader never moves "WS" worksheets (school short form)');
  const sc = up.originalsToTuck(['DELBAR Specialised cells.pptx', 'Specialised cells table.pptx', 'Cell Vacancies apply task.pptx', 'Specialised cells colour laminates.pptx'], []);
  check(sc.join('|') === 'DELBAR Specialised cells.pptx', 'uploader leaves tables and tasks (7MLA Specialised Cells, 2026-10-20)');
  return { fails, warns: 0 };
}

module.exports = { run };
if (require.main === module) process.exit(run().fails ? 1 : 0);
