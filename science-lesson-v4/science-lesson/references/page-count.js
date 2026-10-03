#!/usr/bin/env node
// page-count.js — true page count of built worksheets, measured by Microsoft Word.
//
// Patryk's hard rule: a worksheet is at most 4 pages (2026-10-03). A docx has no fixed page
// count until a word processor lays it out, so this asks Word itself (COM, invisible,
// read-only — the file is never modified) and also reports which page each section starts on,
// so an overrun can be traced to the section that caused it.
//
// Home-only: needs Windows + Word. Anywhere else (claude.ai sandbox) it returns null quietly.
//
//   node page-count.js a.docx [b.docx ...]        → prints "<pages>  <file>" per file
//   const { countPages } = require('./page-count'); countPages([paths]) → [{file, pages, sections}]
'use strict';

const fs = require('fs');
const path = require('path');
const cp = require('child_process');

const PAGE_LIMIT = 4;

// Section headings as build.js writes them on the worksheet (divider bars + tier labels).
const SECTION_RE = '^(DO NOW|ENGAGE|LEARN|BUILD|APPLY|REVIEW|VIDEO|PRACTICAL|METHOD|RESULTS|Developing|Reaching|Mastering|Exam question)';

const PS_SCRIPT = `
$ErrorActionPreference = 'Stop'
$files = $env:PAGECOUNT_FILES | ConvertFrom-Json
$re = $env:PAGECOUNT_SECTION_RE
$w = New-Object -ComObject Word.Application
$w.Visible = $false
$w.DisplayAlerts = 0
$out = @()
try {
  foreach ($f in $files) {
    $d = $null
    try {
      $d = $w.Documents.Open($f, $false, $true, $false)
      $d.Repaginate()
      $n = $d.ComputeStatistics(2)
      $secs = @()
      foreach ($p in $d.Paragraphs) {
        $t = $p.Range.Text.Trim()
        if ($t.Length -gt 0 -and $t.Length -lt 60 -and $t -match $re) {
          $secs += @{ title = $t; page = $p.Range.Information(3) }
        }
      }
      $out += @{ file = $f; pages = $n; sections = $secs }
    } catch {
      $out += @{ file = $f; pages = $null; error = $_.Exception.Message }
    } finally {
      if ($d) { $d.Close(0) }
    }
  }
} finally {
  $w.Quit()
  [System.Runtime.InteropServices.Marshal]::ReleaseComObject($w) | Out-Null
}
ConvertTo-Json -InputObject @($out) -Depth 5 -Compress
`;

function wordAvailable() {
  return process.platform === 'win32';
}

// If Word hangs (a hidden dialog) and the timeout kills PowerShell, the Word it started would
// be left running invisibly. Close ONLY automation-launched Word started by this run, never a
// Word window Patryk opened himself.
function killStrayWord(since) {
  const iso = since.toISOString();
  cp.spawnSync('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command',
    `Get-CimInstance Win32_Process -Filter "Name='WINWORD.EXE'" | Where-Object { $_.CommandLine -match '/Automation' -and $_.CreationDate -ge [datetime]'${iso}' } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force }`],
    { encoding: 'utf8', timeout: 30000 });
}

// Returns [{file, pages, sections:[{title,page}], error?}] — pages null when Word is unavailable.
function countPages(files) {
  const list = (Array.isArray(files) ? files : [files]).map((f) => path.resolve(f));
  if (!wordAvailable()) return list.map((file) => ({ file, pages: null, sections: [], error: 'Word not available' }));
  const startedAt = new Date();
  const r =cp.spawnSync('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', PS_SCRIPT], {
    encoding: 'utf8',
    env: Object.assign({}, process.env, { PAGECOUNT_FILES: JSON.stringify(list), PAGECOUNT_SECTION_RE: SECTION_RE }),
    timeout: 60000 + 20000 * list.length,
  });
  if (r.status !== 0 || !r.stdout.trim()) {
    killStrayWord(startedAt);
    const msg = (r.stderr || r.error || 'no output').toString().trim().split('\n')[0];
    return list.map((file) => ({ file, pages: null, sections: [], error: msg }));
  }
  let parsed;
  try { parsed = JSON.parse(r.stdout.trim()); } catch (e) {
    return list.map((file) => ({ file, pages: null, sections: [], error: 'unreadable Word output' }));
  }
  return [].concat(parsed).map((o) => ({ file: o.file, pages: o.pages, sections: [].concat(o.sections || []), error: o.error }));
}

// One-line verdict for build output. Over the limit → names where the overflow starts.
function verdict(res) {
  if (res.pages == null) return null;
  const name = path.basename(res.file);
  if (res.pages <= PAGE_LIMIT) return `[pages] ${name}: ${res.pages} page${res.pages === 1 ? '' : 's'} (limit ${PAGE_LIMIT})`;
  const spill = res.sections.filter((s) => s.page > PAGE_LIMIT).map((s) => s.title);
  return `[pages] OVER LIMIT — ${name}: ${res.pages} pages (limit ${PAGE_LIMIT}).` +
    (spill.length ? ` Spills past page ${PAGE_LIMIT} from: ${spill.join(', ')}.` : '');
}

module.exports = { countPages, verdict, PAGE_LIMIT };

if (require.main === module) {
  const files = process.argv.slice(2).filter((f) => fs.existsSync(f));
  if (!files.length) { console.error('usage: node page-count.js file.docx [...]'); process.exit(1); }
  for (const res of countPages(files)) {
    console.log(res.pages == null ? `?  ${res.file}  (${res.error})` : `${res.pages}  ${res.file}`);
    for (const s of res.sections) console.log(`     p${s.page}  ${s.title}`);
  }
}
