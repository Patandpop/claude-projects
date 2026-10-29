/* ------------------------------------------------------------- Day.gs (Lane C: the installed app's server side)
   lanes/design-installed-app.md section 5. This file is Lane C's, so Lane B's Code.gs edits never collide with it.

   The bridge (5.1). The planner's pages call the server through Google's in-page bridge (google.script.run), which
   only works inside an Apps Script page. The installed app lives on another site, so it sends a POST instead:
     body (sent as plain text, the shape Apps Script accepts from another site): {"key": "...", "fn": "init", "args": [...]}
     answer (JSON): {"ok": true, "result": ...}  or  {"ok": false, "error": "..."}
   Only the calls named below can be reached this way, and only with the planner key. Every call still checks the key
   itself as well, exactly as it does from the pages. GET is untouched: it still serves the pages and the board.

   The day screen, timer, capture and job calls (5.3) will live in this file too. */

const BRIDGE_CALLS = [
  // behaviour (the phone page)
  'init', 'openClass', 'logEvent', 'logMany', 'removeEvent', 'removeMany', 'positivesOver', 'getMode', 'setMode',
  'setLive', 'setLost', 'setSupport', 'getSilence', 'setLimit', 'showRecap', 'stopRecap', 'setTimer', 'adjustTimer',
  'stopTimer', 'setPause', 'endMode', 'getFriday', 'markEmailed', 'lessonMcqs', 'saveVote', 'removeVote',
  // the planner
  'loadAll', 'saveWeek', 'saveWeeks', 'saveLessonChanges', 'saveLessons', 'saveClassSetting', 'learnEquipment',
  'createLesson', 'renameAdded', 'sendRequest', 'pushHome', 'behaviourWeek', 'syncWeek', 'myEvents', 'homeworkList',
  'checkHomework', 'setHomework', 'homeworkStatus', 'markHomework', 'homeworkResults', 'setGradeBands',
  'turnOnDailyResults', 'setBehaviourUrl', 'exportXlsx'
];
// Ulhu: every public game call (gameLoad, gameTick, ...). Names ending in _ are private and never reachable.
const BRIDGE_GAME = /^game[A-Z][A-Za-z0-9]*$/;

function bridgeAllowed_(fn) {
  return typeof fn === 'string' && (BRIDGE_CALLS.indexOf(fn) >= 0 || BRIDGE_GAME.test(fn)) && typeof globalThis[fn] === 'function';
}
function bridgeOut_(obj) { return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON); }

function doPost(e) {
  let b;
  try { b = JSON.parse((e && e.postData && e.postData.contents) || ''); } catch (err) { return bridgeOut_({ ok: false, error: 'Bad request' }); }
  if (!b || typeof b !== 'object') return bridgeOut_({ ok: false, error: 'Bad request' });
  try { check_(b.key); } catch (err) { return bridgeOut_({ ok: false, error: 'Locked' }); }
  if (!bridgeAllowed_(b.fn)) return bridgeOut_({ ok: false, error: 'Not allowed: ' + String(b.fn).slice(0, 40) });
  const args = Array.isArray(b.args) ? b.args : [];
  try {
    const result = globalThis[b.fn].apply(null, [b.key].concat(args));
    return bridgeOut_({ ok: true, result: result === undefined ? null : result });
  } catch (err) {
    return bridgeOut_({ ok: false, error: String((err && err.message) || err) });
  }
}
