#!/usr/bin/env node
'use strict';
// PostToolUse hook — runs the regression harness (npm test) after the renderer
// files are edited, so a change to build.js / graph_gen.py is verified at once.
// Only fires for those files; every other Edit/Write is ignored (the test costs
// a few seconds, no point running it on a doc or JSON tweak).
//
// stdin: PostToolUse JSON { tool_name, tool_input: { file_path }, ... }
// Exit 0 = nothing to do OR tests passed. Exit 2 = tests failed (stderr is fed
// back to Claude so the break is noticed immediately).

const { spawnSync } = require('child_process');
const path = require('path');

const ROOT = path.resolve(__dirname, '../..');
// Basenames that should trigger a re-test when edited.
const RENDERER_FILES = new Set(['build.js', 'graph_gen.py']);

let raw = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', d => { raw += d; });
process.stdin.on('end', () => {
  let filePath = '';
  try {
    const j = JSON.parse(raw || '{}');
    filePath = (j.tool_input && j.tool_input.file_path)
      || (j.tool_response && j.tool_response.filePath) || '';
  } catch { /* no/!JSON stdin — nothing to do */ }

  // build.js's code lives in references/builder/ since 2026-10-23: any part there counts too.
  const isPart = /[\\/]references[\\/]builder[\\/][^\\/]+\.js$/.test(filePath);
  if (!filePath || !(RENDERER_FILES.has(path.basename(filePath)) || isPart)) process.exit(0);

  console.error(`[regression] ${path.basename(filePath)} changed — running npm test ...`);
  const r = spawnSync('npm', ['test'], {
    cwd: ROOT, encoding: 'utf8', shell: true,
    env: Object.assign({}, process.env, { NO_UPLOAD: '1' }),
  });
  const out = (r.stdout || '') + (r.stderr || '');

  if (r.status === 0) {
    console.error('[regression] npm test PASSED — renderer change is safe.');
    process.exit(0);
  }
  // Surface the failing tail to Claude via stderr + exit 2.
  console.error('[regression] npm test FAILED after the renderer change:\n' + out.trim().split('\n').slice(-25).join('\n'));
  process.exit(2);
});
