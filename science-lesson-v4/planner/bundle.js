// node planner/bundle.js — writes planner/dist/ with the three files to paste into Apps Script:
//   Code.gs, Planner.html, Logic.html (logic.js wrapped in a <script> tag).
'use strict';
const fs = require('fs');
const path = require('path');
const dir = __dirname, out = path.join(dir, 'dist');
fs.mkdirSync(out, { recursive: true });
fs.copyFileSync(path.join(dir, 'Code.gs'), path.join(out, 'Code.gs'));
fs.copyFileSync(path.join(dir, 'Planner.html'), path.join(out, 'Planner.html'));
fs.writeFileSync(path.join(out, 'Logic.html'), '<script>\n' + fs.readFileSync(path.join(dir, 'logic.js'), 'utf8') + '\n</script>\n');
// the behaviour app is part of the planner since 2026-10-12
['Behaviour.gs', 'Phone.html', 'BoardPage.html'].forEach((f) => fs.copyFileSync(path.join(dir, f), path.join(out, f)));
console.log('planner/dist/ ready: Code.gs, Planner.html, Logic.html, Behaviour.gs, Phone.html, BoardPage.html');
