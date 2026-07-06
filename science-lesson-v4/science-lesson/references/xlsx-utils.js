'use strict';
// xlsx-utils.js — shared XLSX parsing helpers (read-only)
// Used by: order-sheet.js, daily-brief.js

const AdmZip = require('adm-zip');

const LESSON_COLS = ['B','F','J','N','R'];
const CLASS_COLS  = { B:'E', F:'I', J:'M', N:'Q', R:'U' };

function decodeXmlEntities(s) {
  return s.replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&quot;/g,'"').replace(/&apos;/g,"'");
}

function parseSS(xml) {
  const ss = [];
  const re = /<si>([\s\S]*?)<\/si>/g;
  let m;
  while ((m = re.exec(xml)) !== null) {
    ss.push([...m[1].matchAll(/<t[^>]*>([^<]*)<\/t>/g)].map(x => decodeXmlEntities(x[1])).join(''));
  }
  return ss;
}

function xmlAttr(s, name) {
  const m = s.match(new RegExp(`${name}="([^"]*)"`));
  return m ? m[1] : null;
}

function parseRows(xml, ss) {
  const rows = {};
  const parts = xml.split(/(<row\b[^>]*>|<\/row>)/);
  let inRow = false, rn = 0;
  for (const part of parts) {
    if (part.startsWith('<row')) {
      inRow = true;
      rn = parseInt(xmlAttr(part, 'r') || '0');
    } else if (part === '</row>') {
      inRow = false;
    } else if (inRow && rn > 0) {
      const cells = {};
      const segs = part.split('<c ');
      for (let i = 1; i < segs.length; i++) {
        const seg = segs[i];
        const am = seg.match(/r="([A-Z]+)\d+"/);
        if (!am) continue;
        const vm = seg.match(/<v>([^<]*)<\/v>/);
        if (!vm) continue;
        let val = vm[1].trim();
        if (seg.includes('t="s"')) val = ss[parseInt(val)] || val;
        if (val) cells[am[1]] = val;
      }
      if (Object.keys(cells).length)
        rows[rn] = rows[rn] ? Object.assign(rows[rn], cells) : cells;
    }
  }
  return rows;
}

// Returns { zip, ss, ssXml, wbXml, rlXml, sheets }
// Callers that only read can ignore ssXml/wbXml/rlXml.
function loadXlsx(xlsxPath) {
  const zip   = new AdmZip(xlsxPath);
  const ssXml = zip.readAsText('xl/sharedStrings.xml');
  const ss    = parseSS(ssXml);
  const wbXml = zip.readAsText('xl/workbook.xml');
  const rlXml = zip.readAsText('xl/_rels/workbook.xml.rels');

  const rels = {};
  [...rlXml.matchAll(/<Relationship\b[^>]*>/g)].forEach(m => {
    const id  = xmlAttr(m[0], 'Id');
    const tgt = xmlAttr(m[0], 'Target');
    if (id && tgt) rels[id] = tgt.replace('worksheets/', '');
  });

  const sheets = [...wbXml.matchAll(/<sheet\b[^>]*>/g)].map(m => ({
    name: xmlAttr(m[0], 'name'),
    rId:  xmlAttr(m[0], 'r:id'),
    file: 'xl/worksheets/' + rels[xmlAttr(m[0], 'r:id')]
  })).filter(s => s.name && !s.file.includes('undefined'));

  return { zip, ss, ssXml, wbXml, rlXml, sheets };
}

function isFilledSheet(name) {
  return /Order Sheet Week [AB9\s]+ - /i.test(name);
}

function sheetWeekType(name) {
  const m = name.match(/Order Sheet Week ([AB])/i);
  return m ? m[1].toUpperCase() : null;
}

function isNewFormat(rows) {
  const r4 = rows[4] || {};
  return !!(r4.B && /mon/i.test(r4.B));
}

function extractTimetable(rows) {
  const timetable = {};
  const days = ['Mon','Tue','Wed','Thu','Fri'];
  const nf = isNewFormat(rows);
  const starts = nf ? [4,9,14,19,24] : [4,8,12,16,20];
  const classOffset = nf ? 1 : 0;

  starts.forEach((startRow, di) => {
    const cr = rows[startRow + classOffset] || {};
    timetable[days[di]] = [];
    LESSON_COLS.forEach(lCol => {
      const cls = (cr[CLASS_COLS[lCol]] || '').trim();
      if (cls && cls.length > 1) {
        timetable[days[di]].push({ lessonCol: lCol, class: cls });
      }
    });
  });
  return timetable;
}

// Keys are cls.toUpperCase() — consistent with PATRYK_CLASSES_RAW lookup in order-sheet.js
function extractLessons(rows) {
  const result = {};
  const nf = isNewFormat(rows);
  const starts = nf ? [4,9,14,19,24] : [4,8,12,16,20];
  const classOffset = nf ? 1 : 0;
  const lessonOffset = nf ? 2 : 1;

  starts.forEach(startRow => {
    const cr  = rows[startRow + classOffset] || {};
    const lr  = rows[startRow + lessonOffset] || {};
    LESSON_COLS.forEach(lCol => {
      const cls    = (cr[CLASS_COLS[lCol]] || '').trim();
      const lesson = (lr[lCol] || '').trim();
      if (cls && lesson && lesson.toLowerCase() !== 'n/a' && lesson.length > 2) {
        result[cls.toUpperCase()] = lesson;
      }
    });
  });
  return result;
}

module.exports = {
  LESSON_COLS, CLASS_COLS,
  decodeXmlEntities, parseSS, xmlAttr, parseRows, loadXlsx,
  isFilledSheet, sheetWeekType, isNewFormat,
  extractTimetable, extractLessons,
};
