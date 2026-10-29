'use strict';
// test-review-lesson.test.js — the test review lesson generator (workplan 2.11 and 2.13, 2026-10-29).
// Builds the worksheet and the review slide in memory only: never runs the script, so no Drive folder.
// Checks the review table shows each section's marks available, a total, a "your marks" and EBI column,
// the section headers carry their marks, and no em dash reaches pupils.

const path = require('path');
const GRN = '\x1b[32m', RED = '\x1b[31m', RST = '\x1b[0m';

async function run() {
  let fails = 0;
  const check = (c, m) => { console.log(`  ${c ? GRN + '✓' : RED + '✗'}${RST} ${m}`); if (!c) fails++; };
  console.log('── Test review lesson (marks per section)');
  const tr = require('../science-lesson/references/test-review-lesson.js');
  const { Packer } = require('docx');
  const JSZip = require('jszip');
  const subs = [{ questionNumber: '1', name: 'Wave properties', marks: 12, bookRef: 'p. 10' }, { questionNumber: '2', name: 'Polarisation', marks: 6 }];
  const core = { 'Wave properties': { set1: [{ q: 'Define amplitude.' }] }, Polarisation: { set1: [{ q: 'What is polarisation?' }] } };
  const xmlOf = async (doc) => (await JSZip.loadAsync(await Packer.toBuffer(doc))).file('word/document.xml').async('string');
  const plain = (x) => x.replace(/<w:tab\/>/g, ' ').replace(/<[^>]+>/g, '');
  const x = plain(await xmlOf(tr.buildWorksheet('Waves', subs, core, {})));
  check(/QuestionSectionMarks availableYour marksEBI/.test(x), 'the worksheet opens with the review table: Question, Section, Marks available, Your marks, EBI');
  check(/1Wave properties12/.test(x) && /2Polarisation6/.test(x) && /Total18/.test(x), 'each section shows its marks available, and the total (18)');
  check(/Q1: Wave properties {2}\(12 marks\)/.test(x) && /Q2: Polarisation {2}\(6 marks\)/.test(x), 'each section heading carries its marks');
  check(!/\u2014/.test(x), 'no em dash on the worksheet');
  const y = plain(await xmlOf(tr.buildWorksheet('Waves', subs.map((s) => ({ questionNumber: s.questionNumber, name: s.name })), core, {})));
  check(/QuestionSectionYour marksEBI/.test(y) && !/Marks available/.test(y), 'without marks in the content the table still lists the sections, with no marks column');
  return { fails, warns: 0 };
}

module.exports = { run };
if (require.main === module) run().then((r) => process.exit(r.fails ? 1 : 0));
