'use strict';
// build.js part 17-main: output folder, main() (reads the JSON, builds each lesson, runs the uploader). Loaded by build.js in order; all parts share one scope.

/* =========================================================================
   OUTPUT PATH RESOLUTION
   ========================================================================= */

// Priority: meta.outputDir \u2192 CLI arg 2 \u2192 /mnt/user-data/outputs \u2192 cwd
function resolveOutputDir(L) {
  if (L.meta.outputDir) return L.meta.outputDir;
  if (process.argv[3]) return process.argv[3];
  if (fs.existsSync('/mnt/user-data/outputs')) return '/mnt/user-data/outputs';
  return process.cwd();
}

/* =========================================================================
   DRIVE FOLDER FOR THE LESSON NOTES (.path.txt, .manifest.json)
   ========================================================================= */

// A level (item 1.8, 2026-10-30): since the October reorganisation Drive has no subject level and
// the chapters sit in Module folders. At home the uploader's own lookup reads Drive (read only);
// without Drive (claude.ai) these folders, as listed on Drive on 2026-10-30, are used.
const ALEVEL_MODULES = {
  12: { 'Module 4 - Electrons, Waves and Photons': { 8: 'Charge and Current', 9: 'Energy, Power and Resistance', 10: 'Electrical Circuits', 11: 'Waves 1', 12: 'Waves 2', 13: 'Quantum Physics' },
        'Module 5 - Newtonian World and Astrophysics': { 14: 'Thermal Physics', 15: 'Ideal Gases' } },
  13: { 'Module 5 - Newtonian World and Astrophysics': { 17: 'Oscillations', 19: 'Stars', 20: 'Cosmology' },
        'Module 6 - Particles and Medical Physics': { 21: 'Capacitance', 22: 'Electric Fields', 23: 'Magnetic Fields', 24: 'Particle Physics', 25: 'Radioactivity', 26: 'Nuclear Physics', 27: 'Medical Imagining' } },
};

// The uploader's chapter lookup when it sits beside build.js (home), else null.
function alevelLookup() {
  if (process.env.ALEVEL_NO_DRIVE) return null;
  try { return require(path.join(__dirname, 'upload-to-drive.js')).alevelLessonDir || null; } catch (_) { return null; }
}

// The lesson's folder below Lessons/, as a list of folder names.
function lessonRel(meta, title, lookup) {
  const { year, subject, macrotopic, lessonNumber } = meta;
  const lesson = `Lesson ${lessonNumber} - ${title}`;
  if (+year < 12) return [`Year ${year}`, subject, macrotopic, lesson];
  if (lookup) {
    try {
      const m = /[\\/]Lessons[\\/](.+)$/.exec(lookup(year, macrotopic, lessonNumber, title) || '');
      if (m) return m[1].split(/[\\/]/);
    } catch (_) { /* Drive not readable: the table below */ }
  }
  const n = +(String(macrotopic).match(/(\d+)/) || [])[1];
  for (const [mod, chs] of Object.entries(ALEVEL_MODULES[+year] || {})) {
    if (chs[n]) return [`Year ${year}`, mod, `Chapter ${n} - ${chs[n]}`, lesson];
  }
  console.log(`  (A level: no module known for "${macrotopic}", so the Drive note has none)`);
  return [`Year ${year}`, macrotopic, lesson];
}

/* =========================================================================
   MAIN
   ========================================================================= */

async function main() {
  const jsonPath = process.argv[2];
  if (!jsonPath) {
    console.error('Usage: node build.js lesson-content.json [output-dir]');
    process.exit(1);
  }
  let lessons;
  try {
    lessons = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
  } catch (e) {
    console.error('Cannot read/parse ' + jsonPath + ': ' + e.message);
    process.exit(1);
  }
  if (!Array.isArray(lessons)) lessons = [lessons];

  const outDirsUsed = new Set(); // M7: collected for auto-upload after loop
  let ok = 0, fail = 0;
  for (let i = 0; i < lessons.length; i++) {
    const L = lessons[i];
    const label = (L && L.meta && (L.meta.class + ' / ' + (L.meta.topic || L.meta.title))) || ('lesson #' + (i + 1));
    try {
      if (!L || !L.meta) throw new Error('lesson is missing "meta"');
      // Filename = topic + ability label. NO class code, NO date.
      const split = String(L.meta.differentiation || 'none').toLowerCase() === 'split';
      const ability = L.meta.abilityLabel ? slug(L.meta.abilityLabel)
        : (split ? 'mixed_ability' : '');
      const base = slug(L.meta.topic || L.meta.title) + (ability ? '_' + ability : '');

      const outDir = resolveOutputDir(L);
      if (!fs.existsSync(outDir)) {
        // Local dirs are safe to create; Drive lesson folders are NEVER created here
        // (a wrong meta.outputDir would silently mint a duplicate folder chain on Drive).
        if (/^[Gg]:[\\\/]/.test(path.resolve(outDir))) {
          throw new Error('output dir is on Google Drive and does not exist — refusing to create it (fix meta.outputDir or create the folder yourself): ' + outDir);
        }
        fs.mkdirSync(outDir, { recursive: true });
        console.warn('[build] output dir did not exist — created: ' + outDir);
      }
      outDirsUsed.add(outDir);

      // 1 \u2014 PPTX (one version, for everyone)
      // 0 — Real exam questions (Patryk 2026-10-03), home only: exam-pick.js and the exam
      //     library are not packaged for claude.ai, so school builds skip this quietly. A lesson
      //     can opt out with meta.examQuestion:false or bring its own L.examQuestion.
      // Automatic Do Now (Patryk 2026-10-08), home only: `"doNow": {"auto": true}` fills the six
      // questions from what the class has covered (do-now-pick.js: spaced retrieval + one question from
      // last year's content). A Do Now written into the lesson is always used as written.
      const dnPickPath = path.join(__dirname, 'do-now-pick.js');
      if (L.doNow && L.doNow.auto && !arr(L.doNow.questions).length && fs.existsSync(dnPickPath)) {
        try {
          const cls = String((L.meta || {}).class || '').split(/[\/,]/)[0].trim();
          const r = require(dnPickPath).pick(cls, { date: (L.meta || {}).date, varyNumbers: L.doNow.varyNumbers !== false });
          L.doNow.questions = r.picked.map((p) => ({ q: p.q, a: p.a, marks: p.marks || 1 }));
          // new numbers on a calculation (2026-10-15): say so in the presenter notes, never on the slide
          const varied = r.picked.map((p, i) => (p.varied ? `Q${i + 1}: numbers changed from ${p.varied} (same wording, answer worked out again)` : null)).filter(Boolean);
          if (varied.length) { L.doNow.specPoints = arr(L.doNow.specPoints).concat(varied); console.log('  [do now] ' + varied.join('; ')); }
          console.log(`  [do now] ${r.picked.length} picked for ${cls} (${r.picked.map((p) => p.why).join(', ')})`);
        } catch (e) { buildWarn('automatic Do Now not picked: ' + e.message); }
      }
      const examPickPath = path.join(__dirname, 'exam-pick.js');
      let examPicked = null;
      if (L.examQuestion === undefined && (L.meta || {}).examQuestion !== false && fs.existsSync(examPickPath) && !process.env.NO_EXAM_PICK) {
        try {
          examPicked = require(examPickPath).pickForLesson(L);
          L.examQuestion = examPicked.board || null;
          if (L.examWorksheet === undefined) L.examWorksheet = examPicked.worksheet || null;
          if (examPicked.board) console.log(`  [exam] board: ${examPicked.board.examRef} (${examPicked.board.marks} marks)` +
            (examPicked.worksheet ? `; worksheet candidate: ${examPicked.worksheet.examRef}` : ''));
          else if (examPicked.why) console.log(`  [exam] none: ${examPicked.why}`);
        } catch (e) { buildWarn('exam question not picked: ' + e.message); }
      }
      // Never lose the exam question silently (Patryk 2026-10-12: Reflection and Refraction had none).
      // meta.examQuestion:false is a deliberate opt-out and stays quiet.
      const examYear = parseInt((L.meta || {}).year || (String((L.meta || {}).class || '').match(/^\d+/) || [])[0], 10);
      if (examYear >= 9 && examYear <= 11 && /^[BCP]\d+\b/.test(String((L.meta || {}).macrotopic || '')) &&
          fs.existsSync(examPickPath) && (L.meta || {}).examQuestion !== false &&
          !(L.examQuestion && arr(L.examQuestion.groups).length)) {
        buildWarn('NO EXAM QUESTION on this deck: ' + (process.env.NO_EXAM_PICK ? 'NO_EXAM_PICK is set'
          : !examPicked ? 'the lesson JSON already had an examQuestion key (delete it to auto-pick)'
          : (examPicked.why || 'none picked')));
      }

      const pptxPath = path.join(outDir, base + '.pptx');
      await buildPptx(L, pptxPath);
      console.log('  \u2713 ' + path.basename(pptxPath));

      // 2 \u2014 Worksheet (review/revision lessons: booklet only; standard lessons: companion worksheet)
      // 2026-07-11: revision lessons get the same answer-sheet treatment as review
      // lessons (Patryk's call \u2014 see backlog.md "Revision lesson output set change").
      const lessonTypeLower = String((L.meta || {}).lessonType || '').toLowerCase();
      const isReview = lessonTypeLower === 'review' || lessonTypeLower === 'revision';
      const deckOnly = lessonTypeLower === 'test';     // test lessons: the opening slides only (2026-10-14)
      if (!deckOnly) {
      const wsPath = path.join(outDir, base + '_worksheet.docx');
      await buildDocx(L, wsPath, 'standard');
      console.log('  \u2713 ' + path.basename(wsPath));

      // 3 \u2014 Third file:
      //   standard lessons \u2192 support worksheet (same questions, scaffolding added)
      //   review lessons    \u2192 model-answer sheet (booklet replaces the support slot)
      if (isReview) {
        const answersPath = path.join(outDir, base + '_answers.docx');
        await buildDocx(L, answersPath, 'answers');
        console.log('  \u2713 ' + path.basename(answersPath));
      } else {
        const supportPath = path.join(outDir, base + '_support_worksheet.docx');
        await buildDocx(L, supportPath, 'developing');
        console.log('  \u2713 ' + path.basename(supportPath));
      }

      // 3a \u2014 worksheet exam question (Patryk 2026-10-03): rebuild both sheets WITH it, keep it only
      //     if Word says both still fit 4 pages; otherwise rebuild without. Needs the page counter,
      //     so it only ever happens at home.
      const pcPath = path.join(__dirname, 'page-count.js');
      if (L.examWorksheet && !isReview && fs.existsSync(pcPath) && !process.env.NO_PAGECOUNT) {
        const supportP = path.join(outDir, base + '_support_worksheet.docx');
        L._examOnSheet = true;
        await buildDocx(L, wsPath, 'standard');
        await buildDocx(L, supportP, 'developing');
        const pcx = require(pcPath);
        const res = pcx.countPages([wsPath, supportP]);
        if (res.every((r) => r.pages != null && r.pages <= pcx.PAGE_LIMIT)) {
          L._examWorksheetUsed = true;
          console.log(`  [exam] worksheet question added (${L.examWorksheet.examRef}): ${res.map((r) => r.pages).join('/')} pages`);
        } else {
          L._examOnSheet = false;
          await buildDocx(L, wsPath, 'standard');
          await buildDocx(L, supportP, 'developing');
          console.log('  [exam] worksheet question left off: it would push the sheet past 4 pages');
        }
      }

      // 3b \u2014 4-page rule (Patryk 2026-10-03): ask Word for the real page count. Home only
      //     (page-count.js is not packaged); NO_PAGECOUNT=1 skips it (the test harness sets it).
      const pageCountPath = path.join(__dirname, 'page-count.js');
      if (fs.existsSync(pageCountPath) && !process.env.NO_PAGECOUNT && !isReview) {
        try {
          const pc = require(pageCountPath);
          const sheets = [[wsPath, 'standard'], [path.join(outDir, base + '_support_worksheet.docx'), 'developing']];
          for (const [sheet, mode] of sheets) {
            let res = pc.countPages([sheet])[0];
            // over 4 pages (Patryk 2026-10-23): leave the GUESS table off first, then (support) KEYS
            if (res.pages > pc.PAGE_LIMIT && L._guessOn && L._guessOn[mode]) {
              L._noGuess = Object.assign({}, L._noGuess, { [mode]: true });
              await buildDocx(L, sheet, mode);
              res = pc.countPages([sheet])[0];
              console.log(`  [pages] GUESS table left off the ${mode === 'developing' ? 'support' : 'standard'} sheet to fit 4 pages`);
            }
            if (res.pages > pc.PAGE_LIMIT && mode === 'developing' && !L._noKeys) {
              L._noKeys = true;
              await buildDocx(L, sheet, mode);
              res = pc.countPages([sheet])[0];
              console.log('  [pages] KEYS box left off the support sheet to fit 4 pages');
            }
            const v = pc.verdict(res);
            if (!v) continue;
            if (res.pages > pc.PAGE_LIMIT) buildWarn(v); else console.log('  ' + v);
          }
        } catch (e) { console.log('  [pages] page count skipped: ' + e.message); }
      }
      }   // end !deckOnly

      // 4 \u2014 Drive sidecar: one-line text file with the destination folder path.
      //     Only written when all Drive meta fields are present. Used by drive-upload.ps1.
      const { year, subject, macrotopic, lessonNumber } = L.meta;
      const lessonTitle = L.meta.title || L.meta.topic;
      if (year && subject && macrotopic && lessonNumber && lessonTitle) {
        const rel = lessonRel(L.meta, lessonTitle, alevelLookup());
        const drivePath = 'G:\\My Drive\\Beechen Cliff Science\\Lessons\\' + rel.join('\\');
        fs.writeFileSync(path.join(outDir, base + '.path.txt'), drivePath, 'utf8');
        console.log('  \u2713 ' + base + '.path.txt');
        // 4b \u2014 Manifest sidecar (2026/27 school-Drive uploader): which files belong in
        // which folder, consumed by references/push-to-school.js \u2192 Apps Script web app.
        // Same trigger as the sidecar; relative folder path (no G:\ \u2014 the school root differs).
        const revLower = String((L.meta || {}).lessonType || '').toLowerCase();
        const isRev = revLower === 'review' || revLower === 'revision';
        const manifest = {
          builtOn: new Date().toISOString().slice(0, 10),
          class: L.meta.class || null, year, subject, macrotopic, lessonNumber, title: lessonTitle,
          folder: rel.join('/'),
          files: deckOnly ? [base + '.pptx'] : [base + '.pptx', base + '_worksheet.docx',
                  base + (isRev ? '_answers.docx' : '_support_worksheet.docx')],
        };
        fs.writeFileSync(path.join(outDir, base + '.manifest.json'), JSON.stringify(manifest, null, 2), 'utf8');
      }

      // remember which exam questions this class has now seen (never repeated)
      if (examPicked && !process.env.NO_EXAM_LOG) {
        const used = [L.examQuestion && L.examQuestion.examRef, L._examWorksheetUsed && L.examWorksheet && L.examWorksheet.examRef].filter(Boolean);
        try { require(examPickPath).recordUse((L.meta || {}).class, used); } catch (e) { buildWarn('exam usage not saved: ' + e.message); }
      }
      ok++;
      flushBuildWarns(label);       // 2026-07-12: degraded-but-successful builds now say so out loud
    } catch (e) {
      fail++;
      console.error('  \u2717 FAILED: ' + label + ' \u00B7 ' + e.message);
      if (process.env.BUILD_DEBUG) console.error(e.stack);
      flushBuildWarns(label);
    }
  }
  console.log('\nDone. ' + ok + ' lesson(s) built, ' + fail + ' failed.');

  // M7: auto-upload to Drive — skipped on claude.ai (no uploader alongside build.js there)
  const uploaderPath = path.join(__dirname, 'upload-to-drive.js');
  if (fs.existsSync(uploaderPath) && !process.env.NO_UPLOAD) {
    const r = cp.spawnSync(process.execPath, [uploaderPath, jsonPath], { stdio: 'inherit' });
    if (r.status !== 0) console.warn('upload-to-drive: check above for copy errors.');
  }

  if (fail && !ok) process.exit(2);
}

if (!process.env.BUILD_NO_MAIN) main().catch((e) => { console.error(e); process.exit(2); });   // BUILD_NO_MAIN: test/run.js loads this part alone to check lessonRel
