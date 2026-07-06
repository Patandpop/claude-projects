'use strict';
// pptx-constants.js — PPTX/DOCX layout and colour constants shared by test-review.js
// build.js keeps its own copy so it stays self-contained as a claude.ai skill.

const SW = 13.33, SH = 7.5;
const NAV_H = 0.55, ACC_H = 0.04;
const BOT_H = 0.35, BOT_Y = SH - BOT_H;
const TOP = NAV_H + ACC_H + 0.12;
const GAP = 0.10, MX = 0.45;
const CW = SW - 2 * MX;
const FONT = 'Trebuchet MS';
const NAVY = '0D1B5E', NAVY2 = '152347', DONOW_BAR = '25408D';
const GOLD = 'FABB2E', BG = 'EDF2FA', PURPLE_BG = '4A148C', PURPLE_PEN = '6A0DAD';
const TEAL = '00838F', AMBER = 'E65100';
const TIER_PPTX = { developing: '2E7D32', reaching: 'E65100', mastering: 'B71C1C' };
const TIER_DOCX = { developing: '1E5C2D', reaching: 'C05A00', mastering: '9B1B1B' };
const GOLD2 = { color: GOLD, width: 2 };
const STAGE = { donow: NAVY, engage: '1B5E20', learn: 'F9A825', build: 'E65100', apply: 'B71C1C', review: '1B5E20' };
const STAGE_LABEL = { donow: 'DO NOW', engage: 'ENGAGE', learn: 'LEARN', build: 'BUILD', apply: 'APPLY', review: 'REVIEW' };

module.exports = { SW, SH, NAV_H, ACC_H, BOT_H, BOT_Y, TOP, GAP, MX, CW, FONT, NAVY, NAVY2, DONOW_BAR, GOLD, BG, PURPLE_BG, PURPLE_PEN, TEAL, AMBER, TIER_PPTX, TIER_DOCX, GOLD2, STAGE, STAGE_LABEL };
