/**
 * Beechen Cliff school-Drive lesson uploader — Google Apps Script web app.
 * Deploy ON YOUR SCHOOL ACCOUNT (script.google.com → paste → Deploy → Web app →
 * Execute as: Me → Anyone with the link). Full walkthrough: specs/next-year-system.md §3.
 *
 * Receives POSTed files from home (references/push-to-school.js) and places them
 * under ROOT_FOLDER_NAME in your school My Drive, creating topic/lesson folders
 * along the path as needed (your own structure — creation is by design here).
 * Idempotent: a file with the same name in the same folder is REPLACED, never duplicated.
 * Every upload is appended to an "Upload Log" sheet created next to the root folder.
 */

var SECRET = 'CHANGE-ME-before-deploying';          // must match school-uploader.json at home
var ROOT_FOLDER_NAME = 'Lessons 2026-2027';         // created in My Drive if missing

function doPost(e) {
  var out = { ok: false };
  try {
    var body = JSON.parse(e.postData.contents);
    if (body.secret !== SECRET) {
      out.error = 'bad secret';
      return respond_(out);
    }
    // body: { secret, folder: "Year 8/Physics/P1 Forces/Lesson 1 - Speed",
    //         filename: "Speed.pptx", contentBase64: "...", mimeType: "..." }
    var folder = ensurePath_(body.folder);
    var bytes = Utilities.base64Decode(body.contentBase64);
    var blob = Utilities.newBlob(bytes, body.mimeType || 'application/octet-stream', body.filename);

    // Idempotent replace: trash any existing file of the same name first.
    var existing = folder.getFilesByName(body.filename);
    var replaced = false;
    while (existing.hasNext()) { existing.next().setTrashed(true); replaced = true; }

    var file = folder.createFile(blob);
    log_([new Date(), body.folder, body.filename, bytes.length, replaced ? 'replaced' : 'new']);
    out.ok = true;
    out.replaced = replaced;
    out.fileId = file.getId();
  } catch (err) {
    out.error = String(err);
    try { log_([new Date(), 'ERROR', out.error, '', '']); } catch (ignore) {}
  }
  return respond_(out);
}

// GET = health check, so you can paste the URL in a browser and see it respond.
function doGet() {
  return ContentService.createTextOutput('uploader alive: ' + ROOT_FOLDER_NAME)
    .setMimeType(ContentService.MimeType.TEXT);
}

function ensurePath_(relPath) {
  var folder = getOrCreateChild_(DriveApp.getRootFolder(), ROOT_FOLDER_NAME);
  var parts = String(relPath || '').split('/').filter(function (p) { return p.trim(); });
  for (var i = 0; i < parts.length; i++) folder = getOrCreateChild_(folder, parts[i].trim());
  return folder;
}

function getOrCreateChild_(parent, name) {
  var it = parent.getFoldersByName(name);
  return it.hasNext() ? it.next() : parent.createFolder(name);
}

function log_(row) {
  var name = 'Lesson Upload Log';
  var files = DriveApp.getRootFolder().getFilesByName(name);
  var ss = files.hasNext()
    ? SpreadsheetApp.open(files.next())
    : SpreadsheetApp.create(name);
  ss.getSheets()[0].appendRow(row);
}

function respond_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
