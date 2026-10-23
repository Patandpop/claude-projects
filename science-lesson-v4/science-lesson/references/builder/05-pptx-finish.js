'use strict';
// build.js part 05-pptx-finish: after-save passes on the .pptx (finishText, click animations, font embedding) + tierColumn, reviewRow, protocol strip, silent footer. Loaded by build.js in order; all parts share one scope.
function isAnswerBox(sp) {
  const spPr = (sp.match(/<p:spPr>[\s\S]*?<\/p:spPr>/) || [''])[0];
  if (!/^<p:spPr>[\s\S]*?<a:solidFill><a:srgbClr val="0D1B5E"/.test(spPr.replace(/<a:ln[\s\S]*?<\/a:ln>/g, ''))) return false;
  if (!/<a:rPr[^>]*>[\s\S]*?<a:srgbClr val="(FABB2E|FFD60A)"/.test(sp)) return false;
  let gold = 0, all = 0;
  for (const r of sp.match(/<a:r>[\s\S]*?<\/a:r>/g) || []) {
    const raw = ((r.match(/<a:t>([^<]*)<\/a:t>/) || [])[1] || '').trim();
    if (/^(ANSWER|Answer:?)$/.test(raw)) continue;
    all += raw.length;
    if (/<a:srgbClr val="(FABB2E|FFD60A)"/.test(r)) gold += raw.length;
  }
  if (!all || gold / all < 0.5) return false;
  return !/IMAGE BANK|Read more/i.test((sp.match(/<a:t>([^<]*)<\/a:t>/g) || []).join(' '));
}
function finishText(pptxPath) {
  const zip = new AdmZip(pptxPath);
  let keys = 0, answers = 0;
  for (const e of zip.getEntries()) {
    if (!/^ppt\/slides\/slide\d+\.xml$/.test(e.entryName)) continue;
    let xml = e.getData().toString('utf8');
    const before = xml;
    xml = xml.replace(/<a:rPr lang="en-001" altLang="en-US"/g, () => { keys++; return '<a:rPr lang="en-GB"'; });
    // put the uFill in schema order: after fill/highlight, before latin/ea/cs/sym/hlinkClick
    xml = xml.replace(/<a:rPr lang="en-GB"([^>]*)>([\s\S]*?)<\/a:rPr>/g, (m0, attrs, inner) => {
      if (inner.includes('<a:uFill>') || !/ u="sng"/.test(attrs)) return m0;
      const uf = '<a:uFill><a:solidFill><a:srgbClr val="F9A825"/></a:solidFill></a:uFill>';
      const at = inner.search(/<a:(latin|ea|cs|sym|hlinkClick|hlinkMouseOver|rtl|extLst)\b/);
      return `<a:rPr lang="en-GB"${attrs}>` + (at < 0 ? inner + uf : inner.slice(0, at) + uf + inner.slice(at)) + '</a:rPr>';
    });
    if (!/<a:t>LEARN [·\-:]/.test(xml)) {
      xml = xml.replace(/<p:sp>[\s\S]*?<\/p:sp>/g, (sp) => {
        if (!isAnswerBox(sp)) return sp;
        answers++;
        return sp.replace(/(<a:rPr[^>]*>(?:(?!<\/a:rPr>)[\s\S])*?<a:srgbClr val=")FABB2E/g, '$1' + ANSWER);
      });
    }
    if (xml !== before) zip.updateFile(e.entryName, Buffer.from(xml, 'utf8'));
  }
  if (keys || answers) zip.writeZip(pptxPath);
  return { keys, answers };
}

function addRevealAnimations(pptxPath) {
  const zip = new AdmZip(pptxPath);
  let total = 0;
  for (const e of zip.getEntries()) {
    if (!/^ppt\/slides\/slide\d+\.xml$/.test(e.entryName)) continue;
    let xml = e.getData().toString('utf8');
    if (xml.includes('<p:timing')) continue;
    if (/<a:t>LEARN [·\-:]/.test(xml)) continue;   // Learn content is taught, not revealed
    const boxes = [];
    for (const sp of xml.match(/<p:sp>[\s\S]*?<\/p:sp>/g) || []) {
      const spPr = (sp.match(/<p:spPr>[\s\S]*?<\/p:spPr>/) || [''])[0];
      if (!/^<p:spPr>[\s\S]*?<a:solidFill><a:srgbClr val="0D1B5E"/.test(spPr.replace(/<a:ln[\s\S]*?<\/a:ln>/g, ''))) continue;
      if (!/<a:rPr[^>]*>[\s\S]*?<a:srgbClr val="(FABB2E|FFD60A)"/.test(sp)) continue;
      if (!/<a:t>[^<]*\S/.test(sp)) continue;
      // most of the box's text must be gold (an answer), not a gold label on a white question
      let gold = 0, all = 0;
      for (const r of sp.match(/<a:r>[\s\S]*?<\/a:r>/g) || []) {
        const raw = ((r.match(/<a:t>([^<]*)<\/a:t>/) || [])[1] || '').trim();
        if (/^(ANSWER|Answer:?)$/.test(raw)) continue;                  // the label on an answer box
        const t = raw.length;
        all += t;
        if (/<a:srgbClr val="(FABB2E|FFD60A)"/.test(r)) gold += t;
      }
      if (!all || gold / all < 0.5) continue;
      const text = (sp.match(/<a:t>([^<]*)<\/a:t>/g) || []).join(' ');
      if (/IMAGE BANK|Read more/i.test(text)) continue;                 // banners, not answers
      const id = (sp.match(/<p:cNvPr id="(\d+)"/) || [])[1];
      const off = sp.match(/<a:off x="(\d+)" y="(\d+)"/);
      if (id && off) boxes.push({ id, x: +off[1], y: +off[2] });
    }
    if (!boxes.length) continue;
    // reading order; boxes within ~0.1" of the same top count as one row
    boxes.sort((a, b) => (Math.abs(a.y - b.y) < 91440 ? a.x - b.x : a.y - b.y));
    let n = 3;
    const clicks = boxes.map((b) => {
      const [c1, c2, c3, c4] = [n++, n++, n++, n++];
      return `<p:par><p:cTn id="${c1}" fill="hold"><p:stCondLst><p:cond delay="indefinite"/></p:stCondLst><p:childTnLst>` +
        `<p:par><p:cTn id="${c2}" fill="hold"><p:stCondLst><p:cond delay="0"/></p:stCondLst><p:childTnLst>` +
        `<p:par><p:cTn id="${c3}" presetID="1" presetClass="entr" presetSubtype="0" fill="hold" grpId="0" nodeType="clickEffect">` +
        `<p:stCondLst><p:cond delay="0"/></p:stCondLst><p:childTnLst><p:set><p:cBhvr>` +
        `<p:cTn id="${c4}" dur="1" fill="hold"><p:stCondLst><p:cond delay="0"/></p:stCondLst></p:cTn>` +
        `<p:tgtEl><p:spTgt spid="${b.id}"/></p:tgtEl><p:attrNameLst><p:attrName>style.visibility</p:attrName></p:attrNameLst>` +
        `</p:cBhvr><p:to><p:strVal val="visible"/></p:to></p:set></p:childTnLst></p:cTn></p:par>` +
        `</p:childTnLst></p:cTn></p:par></p:childTnLst></p:cTn></p:par>`;
    }).join('');
    const timing = '<p:timing><p:tnLst><p:par><p:cTn id="1" dur="indefinite" restart="never" nodeType="tmRoot"><p:childTnLst>' +
      '<p:seq concurrent="1" nextAc="seek"><p:cTn id="2" dur="indefinite" nodeType="mainSeq"><p:childTnLst>' + clicks +
      '</p:childTnLst></p:cTn><p:prevCondLst><p:cond evt="onPrev" delay="0"><p:tgtEl><p:sldTgt/></p:tgtEl></p:cond></p:prevCondLst>' +
      '<p:nextCondLst><p:cond evt="onNext" delay="0"><p:tgtEl><p:sldTgt/></p:tgtEl></p:cond></p:nextCondLst></p:seq>' +
      '</p:childTnLst></p:cTn></p:par></p:tnLst><p:bldLst>' +
      boxes.map((b) => `<p:bldP spid="${b.id}" grpId="0" animBg="1"/>`).join('') + '</p:bldLst></p:timing>';
    // <p:timing> sits after <p:clrMapOvr> and before any <p:extLst> at the end of <p:sld>
    const tail = xml.lastIndexOf('<p:extLst>') > xml.lastIndexOf('</p:cSld>') ? xml.lastIndexOf('<p:extLst>') : xml.lastIndexOf('</p:sld>');
    xml = xml.slice(0, tail) + timing + xml.slice(tail);
    zip.updateFile(e.entryName, Buffer.from(xml, 'utf8'));
    total += boxes.length;
  }
  if (total) zip.writeZip(pptxPath);
  return total;
}

function embedCaveatFont(pptxPath) {
  try {
    if (!fs.existsSync(CAVEAT_REGULAR_PATH) || !fs.existsSync(CAVEAT_BOLD_PATH)) {
      console.error('[embedCaveatFont] Caveat TTF files missing next to build.js — skipping embed');
      return false;
    }
    const zip = new AdmZip(pptxPath);
    let pres = zip.readAsText('ppt/presentation.xml');
    let rels = zip.readAsText('ppt/_rels/presentation.xml.rels');
    let ct = zip.readAsText('[Content_Types].xml');

    const usedIds = [...rels.matchAll(/Id="rId(\d+)"/g)].map((m) => parseInt(m[1], 10));
    const nextId = Math.max(0, ...usedIds) + 1;
    const rIdReg = `rId${nextId}`, rIdBold = `rId${nextId + 1}`;

    rels = rels.replace('</Relationships>',
      `<Relationship Id="${rIdReg}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/font" Target="fonts/font1.fntdata"/>` +
      `<Relationship Id="${rIdBold}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/font" Target="fonts/font2.fntdata"/>` +
      '</Relationships>');

    ct = ct.replace('</Types>',
      '<Override PartName="/ppt/fonts/font1.fntdata" ContentType="application/x-fontdata"/>' +
      '<Override PartName="/ppt/fonts/font2.fntdata" ContentType="application/x-fontdata"/>' +
      '</Types>');

    if (!/embedTrueTypeFonts=/.test(pres)) {
      pres = pres.replace('<p:presentation ', '<p:presentation embedTrueTypeFonts="1" ');
    }
    const fontLst =
      '<p:embeddedFontLst><p:embeddedFont><p:font typeface="Caveat"/>' +
      `<p:regular r:id="${rIdReg}"/><p:bold r:id="${rIdBold}"/>` +
      '</p:embeddedFont></p:embeddedFontLst>';
    pres = /<p:notesSz[^/]*\/>/.test(pres)
      ? pres.replace(/(<p:notesSz[^/]*\/>)/, `$1${fontLst}`)
      : pres.replace('</p:presentation>', `${fontLst}</p:presentation>`);

    zip.updateFile('ppt/presentation.xml', Buffer.from(pres, 'utf8'));
    zip.updateFile('ppt/_rels/presentation.xml.rels', Buffer.from(rels, 'utf8'));
    zip.updateFile('[Content_Types].xml', Buffer.from(ct, 'utf8'));
    // EOT-wrapped, not raw TTF: PowerPoint silently ignores a raw .ttf here (see ttfToEot).
    zip.addFile('ppt/fonts/font1.fntdata', ttfToEot(fs.readFileSync(CAVEAT_REGULAR_PATH)));
    zip.addFile('ppt/fonts/font2.fntdata', ttfToEot(fs.readFileSync(CAVEAT_BOLD_PATH)));
    zip.writeZip(pptxPath);
    return true;
  } catch (e) {
    console.error('[embedCaveatFont] failed, leaving pptx unembedded:', e.message || e);
    return false;
  }
}

/* tierColumn(x, y, w, h, tier, questions[]) — ONE unified box, text reflows */
function tierColumn(slide, x, y, w, h, tier, questions) {
  txt(slide, tier.toUpperCase(), {
    x, y, w, h: 0.42, fill: { color: TIER_PPTX[tier] },
    color: 'FFFFFF', bold: true, fontSize: 13, align: 'center', valign: 'middle',
  });
  const allQText = questions.map((q, i) => `Q${i + 1}  ${q.q}${marksTag(q.marks)}`).join(' ');
  const colFs = autoFontSize(allQText, w, h - 0.42, { min: 10, max: 18 });
  const runs = [];
  questions.forEach((q, i) => {
    runs.push({ text: `Q${i + 1}  `, options: { bold: true, fontSize: colFs } });
    runs.push({ text: prettyText(q.q) + marksTag(q.marks), options: { fontSize: colFs, breakLine: true, paraSpaceAfter: 8 } }); // 2026-07-05: superscripts/symbols in tier questions
  });
  txt(slide, runs, {
    x, y: y + 0.42, w, h: h - 0.42, fill: { color: 'FFFFFF' }, line: GOLD2,
    color: '1A1A2E', align: 'left', valign: 'top', margin: 6, fit: 'shrink',
  });
}

/* reviewRow(y, h, tier, questionText, answerText) — tier=null → navy left cell */
function reviewRow(slide, y, h, tier, questionText, answerText) {
  const leftFill = tier ? TIER_PPTX[tier] : DONOW_BAR;
  const lw = CW * 0.35, rw = CW * 0.65 - 0.08;
  const q = prettyText(questionText), a = prettyText(answerText); // Bug 53: symbols + super/subscript in prose
  const qFs = autoFontSize(q, lw, h, { min: 12, max: 28 });
  txt(slide, q, {
    x: MX, y, w: lw, h, fill: { color: leftFill },
    color: 'FFFFFF', bold: true, fontSize: qFs, align: 'left', valign: 'middle',
    margin: 6, fit: 'shrink',
  });
  const aFs = autoFontSize(a, rw, h, { min: 12, max: 24 });
  txt(slide, a || '', {
    x: MX + lw + 0.08, y, w: rw, h, fill: { color: NAVY }, line: GOLD2,
    color: GOLD, align: 'left', valign: 'middle', margin: 6, fit: 'shrink', fontSize: aFs, // M2: gold text on navy
  });
}

/* MCQ protocol strip + Do Now silent-entry footer — mandatory routines */
function mcqProtocolStrip(slide, text) {
  txt(slide, text || 'THINK (silent)   \u2192   DECIDE   \u2192   SHOW on 3 \u2013 2 \u2013 1', {
    x: 0, y: BOT_Y - 0.45, w: SW, h: 0.45, fill: { color: NAVY },
    color: 'FFFFFF', fontSize: 14, align: 'center', valign: 'middle',
  });
}
function silentEntryFooter(slide) {
  txt(slide, 'Silent start \u00B7 pen out \u00B7 attempt all questions', {
    x: 0, y: BOT_Y - 0.32, w: SW, h: 0.30,
    color: '616161', fontSize: 12, align: 'center', valign: 'middle',
  });
}
