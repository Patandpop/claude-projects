'use strict';
const fs = require('fs');
const DOC = 'C:/Users/magda/claude-projects/science-lesson-v4/Physics - Atomic Structure - Nuclear Fission and Fusion.doc';
const raw = fs.readFileSync(DOC, 'latin1');
console.log('len', raw.length);
for (const w of ['pict', 'shppict', 'emfblip', 'pngblip', 'jpegblip', 'object']) {
  console.log(w, (raw.split('\\' + w).length - 1));
}
console.log('Total occurrences', (raw.match(/Total/g) || []).length);
console.log('Mark scheme', (raw.match(/Mark scheme/gi) || []).length);
console.log('Mark schemes', (raw.match(/Mark schemes/gi) || []).length);
