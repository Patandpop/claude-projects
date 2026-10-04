// node planner/make-guide.js <screenshots-dir> — builds planner/Planner-guide.pptx, a flick-through
// guide to every part of the planner (Patryk 2026-10-04). Screenshots come from make-preview.js.
'use strict';
const path = require('path');
const PptxGenJS = require(path.join(__dirname, '..', 'node_modules', 'pptxgenjs'));
const shots = process.argv[2];
const img = (n) => path.join(shots, n + '.png');

const NAVY = '0D1B5E', GOLD = 'FABB2E', INK = '1A1A2E', MUTED = '5B6478', BG = 'F4F6FB', DARK = '0E1424';
const FONT = 'Century Gothic';
const pptx = new PptxGenJS();
pptx.layout = 'LAYOUT_WIDE';                     // 13.33 x 7.5
pptx.theme = { headFontFace: FONT, bodyFontFace: FONT };

function slide(title, kicker) {
  const s = pptx.addSlide();
  s.background = { color: BG };
  s.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: 13.33, h: 0.9, fill: { color: NAVY } });
  s.addText(title, { x: 0.45, y: 0.12, w: 10.5, h: 0.66, fontFace: FONT, fontSize: 26, bold: true, color: GOLD, valign: 'middle' });
  if (kicker) s.addText(kicker, { x: 10.2, y: 0.12, w: 2.7, h: 0.66, fontFace: FONT, fontSize: 12, color: 'FFFFFF', align: 'right', valign: 'middle' });
  return s;
}
const body = (s, runs, o) => s.addText(runs, Object.assign({ fontFace: FONT, fontSize: 16, color: INK, valign: 'top', paraSpaceAfter: 8 }, o));
const bullets = (items, size) => items.map((t) => (Array.isArray(t)
  ? { text: '', options: { breakLine: false } } : t)).length && items.map((t) => {
  const [head, rest] = Array.isArray(t) ? t : [null, t];
  return [head ? { text: head + '  ', options: { bold: true, color: NAVY, fontSize: size || 16 } } : null,
    { text: rest, options: { breakLine: true, fontSize: size || 16, color: INK } }].filter(Boolean);
}).flat();
const shot = (s, n, x, y, w) => s.addImage({ path: img(n), x, y, w, h: w * 900 / 1600, sizing: { type: 'contain', w, h: w * 900 / 1600 } });
const callout = (s, num, x, y) => {
  s.addShape(pptx.ShapeType.ellipse, { x, y, w: 0.42, h: 0.42, fill: { color: GOLD }, line: { color: NAVY, width: 2 } });
  s.addText(String(num), { x, y, w: 0.42, h: 0.42, fontFace: FONT, fontSize: 14, bold: true, color: NAVY, align: 'center', valign: 'middle' });
};

/* 1 — title */
{
  const s = pptx.addSlide();
  s.background = { color: DARK };
  s.addText('Your Planner', { x: 0.8, y: 2.0, w: 11.7, h: 1.2, fontFace: FONT, fontSize: 54, bold: true, color: GOLD });
  s.addText('A guide to every part, in the order you\'ll use them', { x: 0.8, y: 3.2, w: 11.7, h: 0.6, fontFace: FONT, fontSize: 22, color: 'FFFFFF' });
  s.addText('Flick through once, then keep it for when something is unfamiliar.', { x: 0.8, y: 4.0, w: 11.7, h: 0.5, fontFace: FONT, fontSize: 16, color: 'A9B3CC' });
}

/* 2 — what it does */
{
  const s = slide('What the planner does', 'the big picture');
  const box = (x, head, text) => {
    s.addShape(pptx.ShapeType.roundRect, { x, y: 1.4, w: 3.95, h: 3.9, fill: { color: 'FFFFFF' }, line: { color: GOLD, width: 2 }, rectRadius: 0.12 });
    s.addText(head, { x: x + 0.25, y: 1.6, w: 3.45, h: 0.6, fontFace: FONT, fontSize: 20, bold: true, color: NAVY });
    s.addText(text, { x: x + 0.25, y: 2.25, w: 3.45, h: 2.9, fontFace: FONT, fontSize: 15, color: INK, valign: 'top' });
  };
  box(0.45, '1. Plans each lesson', 'It knows every class\'s lessons in order and which ones you\'ve already taught (from your Planner.xlsx). Each period gets the next lesson, and lessons you missed in the topic you\'re on come first.');
  box(4.69, '2. Lets you change it', 'Click a lesson to see its whole topic and pick another, drag to move one, add tasks and meetings. Undo anything. Changes save by themselves and next week carries on from them.');
  box(8.93, '3. Makes the paperwork', 'Equipment per lesson for the technicians (Excel to email), a print list, your lessons in Google Calendar, and a build prompt for claude.ai.');
  body(s, 'It never skips a lesson without telling you, never goes back to a topic you\'ve finished, never suggests ICT, and counts a double lesson as one lesson.', { x: 0.45, y: 5.65, w: 12.4, h: 0.8, fontSize: 16, color: MUTED, italic: true });
}

/* 3 — screen at a glance */
{
  const s = slide('The screen at a glance', 'Week view');
  shot(s, 'plain', 0.45, 1.1, 8.6);
  callout(s, 1, 0.3, 1.0); callout(s, 2, 3.7, 1.0); callout(s, 3, 7.3, 1.0); callout(s, 4, 1.2, 2.2); callout(s, 5, 7.2, 1.7);
  body(s, bullets([
    ['1', 'Today, ◀ ▶ and the date box move between weeks.'],
    ['2', 'Week / Day / Classes switch what you see.'],
    ['3', 'Undo, and whether your changes are saved (they save by themselves). "⋯ More" holds everything else.'],
    ['4', 'The grid: days across, periods down, real times on the left (top KS3/Y9, bottom KS4/5 where they differ).'],
    ['5', 'The side panel: help when nothing is selected; the lesson, its technician details and its whole topic when one is.'],
  ], 14), { x: 9.25, y: 1.15, w: 3.8, h: 5.9 });
}

/* 4 — reading a lesson block */
{
  const s = slide('Reading a lesson', 'what the labels mean');
  s.addImage({ path: img('blocks'), x: 0.45, y: 1.3, w: 6.3, h: 6.3 * 330 / 680 });
  body(s, bullets([
    ['Coloured edge', 'each class has its own colour.'],
    ['Top line', 'class and the real time, e.g. 9XS 10:25-11:30.'],
    ['Bold line', 'the lesson; below it, the topic and lesson number (P1 Energy · L9).'],
    ['MISSED', 'a lesson you skipped earlier in this topic. The planner fills these in first.'],
    ['CHECK', 'the equipment is a guess. Open the lesson and fix it.'],
    ['NOT BUILT', 'the Drive folder has no slides yet, so build it before Monday.'],
    ['NO FOLDER', 'the technician guide lists this lesson but Drive has no folder for it.'],
    ['COVER', 'cover work for this lesson (it counts as taught).'],
    ['DOUBLE', 'the second half of a double lesson (same lesson, one event).'],
    ['+1 carry', 'something carried over from last lesson (e.g. unfinished review).'],
    ['Red block', 'an end-of-topic test. Blue: a revision lesson. Orange: cover. Dashed: free.'],
  ], 14), { x: 6.9, y: 1.15, w: 6.0, h: 6.0 });
}

/* 5 — changing a lesson */
{
  const s = slide('Changing a lesson', 'the whole topic, in order');
  shot(s, 'week', 0.45, 1.1, 8.6);
  body(s, bullets([
    ['1. Click the lesson', '"Choose the lesson" on the right lists EVERY lesson of its topic, in order.'],
    ['Each row tells you', 'green ✓ = taught (with the date and what you wrote in Planner.xlsx); a blue day = planned this week; ★ next = what belongs here; plain = still to teach.'],
    ['2. Click a lesson', 'to put it in this period. That class\'s later lessons this week move along, so the one you replaced is not lost.'],
    ['Other topics', 'pick one in the topic box, or type in the search box to search them all.'],
    ['Not in the list?', '"+ New lesson in this topic": type the title, choose what it goes after. It goes here and gets an empty folder on Drive (Lesson 3a - Title).'],
  ], 13), { x: 9.25, y: 1.15, w: 3.8, h: 5.9 });
}

/* 6 — technician details */
{
  const s = slide('Equipment, printing and books', 'for the technicians');
  shot(s, 'tech', 0.45, 1.1, 8.6);
  body(s, bullets([
    ['Always on show', 'straight under the lesson name, no scrolling. Top right says where it came from; "a guess: check it" in orange means fix it.'],
    ['Equipment', 'from the topic\'s technician guide on Drive, or your past orders.'],
    ['Sets / Printing / Textbooks', 'sets of 3, pairs (heat or acid) or demo; "+ pages" fills in the textbook pages.'],
    ['Saves itself', 'as soon as you click out of a box.'],
    ['Use this every time', 'tick it and your version becomes the default whenever this lesson comes round.'],
  ], 14), { x: 9.25, y: 1.15, w: 3.8, h: 5.9 });
}

/* 7 — moving */
{
  const s = slide('Moving lessons', 'drag and drop');
  shot(s, 'move', 0.45, 1.1, 8.6);
  body(s, bullets([
    ['Drag a lesson', 'onto another period. It asks:'],
    ['Move it here', 'the lesson moves; that class\'s other lessons this week move along in order. If the period belonged to another class, that class\'s lesson moves to its next free period. Nothing is lost.'],
    ['Swap the two', 'the two periods trade lessons.'],
    ['Onto an empty period', 'it just moves there.'],
    ['Changed your mind?', 'Undo in the black bar at the bottom, the Undo button, or Ctrl+Z.'],
  ], 14), { x: 9.25, y: 1.15, w: 3.8, h: 5.9 });
}

/* 8 — adding things */
{
  const s = slide('Adding lessons, tasks and meetings', 'the All day row');
  shot(s, 'extra', 0.45, 1.1, 8.6);
  body(s, bullets([
    ['Extra lesson', 'click an empty period (it says "+ add"), pick the class, type, Enter.'],
    ['Task / tests to mark / meeting / deadline', 'hover the All day row under a day and click "+ task / marking / meeting".'],
    ['Remove one', 'click it.'],
    ['Your own calendar', '⋯ More → Show my calendar puts your Google Calendar events in the All day row (read only).'],
  ], 14), { x: 9.25, y: 1.15, w: 3.8, h: 5.9 });
}

/* 9 — carry over */
{
  const s = slide('When a lesson doesn\'t finish', 'carry it over');
  body(s, bullets([
    ['Whole lesson to finish', 'click it, then "Didn\'t finish: continue next lesson". It goes into that class\'s next period too, and the rest of the week moves along.'],
    ['Just the review section', 'open "Notes and carry-over", then "Review not finished → next lesson" (or "Homework to collect → next lesson").'],
    ['What happens', 'that class\'s next lesson shows "+1 carry", and its build prompt tells claude.ai to put the unfinished part straight after the Do Now.'],
    ['No later lesson this week?', 'it tells you; add it as a note on next week\'s first lesson instead.'],
    ['Copy build prompt', '(button under the technician details) copies a ready prompt for claude.ai: class, topic, lesson, Drive folder, carry-overs and notes.'],
  ], 17), { x: 0.6, y: 1.3, w: 12.1, h: 5.8 });
}

/* 9b — nothing skipped */
{
  const s = slide('Making sure no lesson is skipped', 'the safety net');
  body(s, bullets([
    ['Complete lists', 'every lesson folder on Drive is in the list, however it is named, plus lessons the technician guide lists that have no folder yet (NO FOLDER). A check fails if one ever goes missing.'],
    ['Replacing moves, never deletes', 'when you put a different lesson in a period, cover with something else, clear it, or drag, the lesson that was there moves to the class\'s next period.'],
    ['Cover', 'asks: cover work for THIS lesson (counts as taught), or something else (the lesson moves on).'],
    ['It warns you', 'before a test, or a jump to the next topic, would leave lessons untaught. It lists them; Cancel keeps them.'],
    ['Ticks fix the record', 'tick a lesson you taught that wasn\'t recognised, or one you won\'t teach. Untick one that was wrongly matched: it gets planned again.'],
    ['After the first week', 'weeks in the planner are exact, so from then on it simply carries on in order. Only the old Planner.xlsx weeks involve reading your handwriting-style entries.'],
  ], 16), { x: 0.6, y: 1.25, w: 12.1, h: 6.0 });
}

/* 10 — classes view */
{
  const s = slide('Where every class is up to', 'Classes view');
  shot(s, 'classes', 0.45, 1.1, 8.6);
  body(s, bullets([
    ['Click Classes', '(or press C).'],
    ['One card per class', 'its current topic and the next one.'],
    ['Each topic', 'green = taught, gold outline = still to teach in the topic you\'re on, dashed = optional.'],
    ['Red, crossed out', 'never taught, in a topic you have finished. If you did teach it, tick it in the lesson list.'],
    ['Hover a number', 'to see the title, when it was taught and what you wrote.'],
  ], 14), { x: 9.25, y: 1.15, w: 3.8, h: 5.9 });
}

/* 11 — taught weeks */
{
  const s = slide('Weeks you\'ve already taught', 'from your Planner.xlsx');
  shot(s, 'taught', 0.45, 1.1, 8.6);
  body(s, bullets([
    ['Green "taught" badge', 'this week comes from what you filled in Planner.xlsx, exactly as you wrote it (covers included).'],
    ['Read only', 'nothing to change or save; it\'s history.'],
    ['Why it matters', 'the planner reads these weeks to work out which lessons each class has done.'],
    ['▶', 'goes to the next week, which is planned from there.'],
  ], 14), { x: 9.25, y: 1.15, w: 3.8, h: 5.9 });
}

/* 12 — More menu */
{
  const s = slide('The ⋯ More menu', 'everything else');
  shot(s, 'menu', 0.45, 1.1, 8.6);
  body(s, bullets([
    ['Send this week to Google Calendar', 'writes the saved week into its own "Lessons (Planner)" calendar. Sending again replaces that week. Your main calendar is never changed.'],
    ['Print list', 'what to photocopy, with quantities.'],
    ['Technicians\' Excel', 'the order sheet in their usual layout, ready to email.'],
    ['Re-plan this week', 'starts the week again from where each class is up to (Undo brings yours back).'],
    ['Import data', 'loads a fresh planner-data.json.'],
    ['Light / Dark mode', 'and keyboard shortcuts.'],
  ], 13), { x: 9.25, y: 1.15, w: 3.8, h: 5.9 });
}

/* 13 — how it decides */
{
  const s = slide('How it decides what comes next', 'the rules');
  body(s, bullets([
    ['Your order', 'each class follows your scheme of learning, only the topics you teach (co-teachers\' topics are skipped).'],
    ['Never back', 'once a class has started a later topic, earlier topics are finished for good.'],
    ['Fill the gaps', 'within the topic a class is on, every lesson gets taught; ones you missed come first (MISSED).'],
    ['Revision, then test', 'when a topic\'s lessons are all taught it plans a revision lesson, then the end-of-topic test. The Revision and Test buttons ask which topic, starting with the one the class is in at that point.'],
    ['Doubles', 'two periods in a row for the same class are one lesson.'],
    ['Holidays and INSET', 'no lessons (your 2026-27 dates). Week A/B carries on across holidays.'],
    ['Optional lessons', 'folders marked (Optional), DIRT and formative assessments are in the list but only taught if you pick them.'],
    ['No ICT', 'ICT, Chromebook or IT-room suggestions are removed from the equipment.'],
    ['Reading your Planner.xlsx', 'it understands your spellings ("Specifc", "Lifecylce"), abbreviations (TIR, PAG) and "Cover:" entries.'],
  ], 18), { x: 0.6, y: 1.25, w: 12.1, h: 6.0 });
}

/* 14 — weekly routine */
{
  const s = slide('Your weekly routine', 'about 10 minutes');
  body(s, bullets([
    ['1. Open the planner', 'it lands on next week, already planned.'],
    ['2. Glance at the flags', 'MISSED, CHECK, NOT BUILT and test slots.'],
    ['3. Adjust', 'click to change, drag to move, add tasks and marking.'],
    ['4. Fix equipment', 'for any CHECK lesson; tick "remember" so it\'s right next year.'],
    ['5. Nothing to save', 'it saves as you go (top right says "All changes saved").'],
    ['6. ⋯ More → Technicians\' Excel', 'and email it.'],
    ['7. ⋯ More → Send to Google Calendar', 'if you want it on your phone.'],
    ['8. Build the lessons', 'NOT BUILT ones first: click the lesson, Copy build prompt, paste into claude.ai.'],
  ], 17), { x: 0.6, y: 1.25, w: 12.1, h: 6.0 });
}

/* 15 — keeping it up to date + help */
{
  const s = slide('Keeping it up to date, and if something goes wrong', '');
  body(s, bullets([
    ['New lessons on Drive, or you filled more of Planner.xlsx', 'ask Claude "refresh the planner data", then ⋯ More → Import data.'],
    ['Claude changed the planner', 'ask Claude "rebuild the planner files", paste the 3 files into Apps Script, then Deploy → Manage deployments → ✏ → New version.'],
    ['"Locked"', 'the link is missing ?key=… at the end.'],
    ['"An unknown error has occurred"', 'open the link in an Incognito window signed into only your school account.'],
    ['"Old data file"', 'refresh the planner data and import it again.'],
    ['Anything else', 'screenshot it and send it to Claude.'],
  ], 16), { x: 0.6, y: 1.25, w: 12.1, h: 6.0 });
}

pptx.writeFile({ fileName: path.join(__dirname, 'Planner-guide.pptx') }).then((f) => console.log('written', f));
