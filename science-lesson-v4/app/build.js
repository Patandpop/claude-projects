// node app/build.js [outDir]
//   Builds the installed app (lanes/design-installed-app.md) from app/src into app/dist (or outDir).
//   Cloudflare Pages runs this on every push: build command "node app/build.js", output folder "app/dist".
//   Plain copy, no framework: every file in app/src is copied as it is, and {{BUILD_STAMP}} becomes the build
//   date and time (shown in Settings and on the test page, so Patryk can tell which copy he has).
//   Nothing here holds data: the app's data stays in his Google account; the key is typed once per device.
'use strict';
const fs = require('fs');
const path = require('path');

const src = path.join(__dirname, 'src');
const out = path.resolve(process.argv[2] || path.join(__dirname, 'dist'));
const TEXT = /\.(html|js|css|json|webmanifest|svg|txt)$|^_headers$/;

const now = new Date();
const stamp = `${now.getUTCDate()} ${now.toLocaleString('en-GB', { month: 'short', timeZone: 'UTC' })} ${String(now.getUTCHours()).padStart(2, '0')}:${String(now.getUTCMinutes()).padStart(2, '0')} UTC`;

// the build folder is made fresh each time, but only ever a folder this script made (it leaves a marker file)
const MARK = '.app-build';
if (fs.existsSync(out) && fs.readdirSync(out).length && !fs.existsSync(path.join(out, MARK))) {
  console.error(`Refusing to empty ${out}: it was not made by app/build.js`); process.exit(1);
}
fs.rmSync(out, { recursive: true, force: true });
fs.mkdirSync(out, { recursive: true }); fs.writeFileSync(path.join(out, MARK), stamp + '\n');
let n = 0;
(function copy(from, to) {
  fs.mkdirSync(to, { recursive: true });
  for (const f of fs.readdirSync(from)) {
    const a = path.join(from, f), b = path.join(to, f);
    if (fs.statSync(a).isDirectory()) { copy(a, b); continue; }
    if (TEXT.test(f)) fs.writeFileSync(b, fs.readFileSync(a, 'utf8').split('{{BUILD_STAMP}}').join(stamp));
    else fs.copyFileSync(a, b);
    n++;
  }
})(src, out);
console.log(`app built: ${n} files in ${path.relative(process.cwd(), out) || '.'} (build ${stamp})`);
