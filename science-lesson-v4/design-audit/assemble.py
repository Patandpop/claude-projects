#!/usr/bin/env python3
"""
Curate the 127 exported slides down to the unique slide DESIGNS, name each one,
and stitch them into a single PDF for design review.

Repeated auto-generated slides (do-now answers, visualiser, review tiers) appear once,
not eight times. Everything else is a distinct layout the renderer can produce.
"""
import pathlib
import shutil
from PIL import Image

# Pillow's PDF writer reaches into Image.SAVE["JPEG"] but does not trigger the lazy
# plugin registration itself, so force it up front or the save dies with KeyError.
Image.init()

ROOT = pathlib.Path(__file__).parent
RAW = ROOT / 'raw'
OUT = ROOT / 'slides'
PDF = ROOT / 'ALL-SLIDES.pdf'

# (deck, slide number, label)  — order here is the order in the PDF.
PICKS = [
    # ---- the frame every deck shares -------------------------------------
    ('Collision-theory',             1,  'title-and-do-now_KS4'),
    ('Animal-and-plant-cells',       1,  'title-and-do-now_KS3-year7'),
    ('Forces-and-motion',            1,  'title-and-do-now_do-now-variant-B-timed'),
    ('Rate-of-reaction-test-review', 1,  'title-and-do-now_review-lesson'),
    ('Collision-theory',             2,  'do-now-answers'),

    # ---- ENGAGE: all six hook styles + all three reveal layouts ----------
    ('Collision-theory',            3,  'engage_prediction_reveal-layout-A'),
    ('Forces-and-motion',           3,  'engage_mystery-image_reveal-layout-B'),
    ('Measuring-rate-of-reaction',  3,  'engage_news_reveal-fill-gap-layout'),
    ('Required-practical-rates',    3,  'engage_demo_no-reveal'),
    ('Enzymes',                     3,  'engage_video_with-link'),
    ('Animal-and-plant-cells',      3,  'engage_odd-one-out'),

    # ---- LEARN: all 11 layouts A to K, plus sub-variants ------------------
    ('Collision-theory',            4,  'learn-A_key-info-boxes-plus-keywords'),
    ('Measuring-rate-of-reaction',  4,  'learn-A_plain-body-no-boxes'),
    ('Measuring-rate-of-reaction',  5,  'learn-A_annotation-zone'),
    ('Collision-theory',            5,  'learn-B_write-in-book'),
    ('Collision-theory',            6,  'learn-C_revision-table_two-papers'),
    ('Measuring-rate-of-reaction',  6,  'learn-C_revision-table_single-full-width'),
    ('Collision-theory',            7,  'learn-D_copy-the-diagram'),
    ('Collision-theory',            8,  'learn-E_comparison-table'),
    ('Collision-theory',            9,  'learn-F_equation-callout'),
    ('Forces-and-motion',           4,  'learn-G_zigzag-flow'),
    ('Enzymes',                     4,  'learn-H_video'),
    ('Enzymes',                     5,  'learn-H_video-questions-answers'),
    ('Forces-and-motion',           5,  'learn-I_flowchart-vertical-with-cycle'),
    ('Measuring-rate-of-reaction',  7,  'learn-I_flowchart-horizontal'),
    ('Forces-and-motion',           6,  'learn-J_graph-sketch_UNDOCUMENTED'),
    ('Forces-and-motion',           7,  'learn-K_timeline_UNDOCUMENTED'),

    # ---- BUILD: all 21 activity types ------------------------------------
    ('Collision-theory',           10,  'build_mcq'),
    ('Collision-theory',           11,  'build_mcq-image_UNDOCUMENTED'),
    ('Collision-theory',           12,  'build_true-false'),
    ('Collision-theory',           13,  'build_true-false_answers'),
    ('Collision-theory',           14,  'build_sort'),
    ('Collision-theory',           15,  'build_sort_answers'),
    ('Collision-theory',           16,  'build_misconception'),
    ('Collision-theory',           17,  'build_big-fact'),
    ('Forces-and-motion',           8,  'build_reformat-flowchart'),
    ('Forces-and-motion',           9,  'build_reformat-flowchart_answers'),
    ('Forces-and-motion',          10,  'build_annotated-diagram'),
    ('Forces-and-motion',          11,  'build_worked-example'),
    ('Forces-and-motion',          12,  'build_guess-example'),
    ('Forces-and-motion',          13,  'build_practice-triangle'),
    ('Forces-and-motion',          14,  'build_error-analysis'),
    ('Forces-and-motion',          15,  'build_error-analysis_answer'),
    ('Measuring-rate-of-reaction',  8,  'build_graph-interpret'),
    ('Measuring-rate-of-reaction',  9,  'build_graph-results_UNDOCUMENTED'),
    ('Measuring-rate-of-reaction', 10,  'build_graph-with-data_UNDOCUMENTED'),
    ('Measuring-rate-of-reaction', 11,  'build_predict-then-check'),
    ('Measuring-rate-of-reaction', 12,  'build_predict-then-check_reveal'),
    ('Required-practical-rates',    6,  'build_practical_method-and-safety'),
    ('Required-practical-rates',    7,  'build_practical_questions-answers'),
    ('Required-practical-rates',    8,  'build_model-data-table_auto-generated'),
    ('Required-practical-rates',    9,  'build_correct-the-statement_handwriting'),

    # ---- BUILD: test-review slides (handwriting engine) -------------------
    ('Rate-of-reaction-test-review', 5, 'build_model-answer_short_handwriting'),
    ('Rate-of-reaction-test-review', 6, 'build_model-answer_calculation_handwriting'),
    ('Rate-of-reaction-test-review', 7, 'build_model-answer_graph'),
    ('Rate-of-reaction-test-review', 8, 'build_mark-the-answers_samples'),
    ('Rate-of-reaction-test-review', 9, 'build_mark-the-answers_marks-awarded'),

    # ---- WHITEBOARD rounds (revision decks only) --------------------------
    ('Rates-revision',              8,  'whiteboard-round_question'),
    ('Rates-revision',              9,  'whiteboard-round_answer'),

    # ---- VISUALISER ------------------------------------------------------
    ('Collision-theory',           18,  'visualiser_default'),
    ('Measuring-rate-of-reaction', 13,  'visualiser_custom-subtitle'),

    # ---- APPLY: all three layouts ----------------------------------------
    ('Collision-theory',           19,  'apply-A_three-tier-columns_with-textbook-chip'),
    ('Forces-and-motion',          17,  'apply-B_long-mastering-question-full-width'),
    ('Rates-revision',             17,  'apply-C_revision-layout'),
    ('Required-practical-rates',   11,  'apply-A_no-textbook-chip'),

    # ---- REVIEW: both layouts --------------------------------------------
    ('Collision-theory',           20,  'review_tier-1-developing'),
    ('Collision-theory',           21,  'review_tier-2-reaching'),
    ('Collision-theory',           22,  'review_tier-3-mastering'),
    ('Measuring-rate-of-reaction', 15,  'review_single-slide-questions-list'),

    # ---- IMAGE BANK ------------------------------------------------------
    ('Collision-theory',           23,  'image-bank_sources-and-assets'),
]

# Clear the contents rather than the directory itself: on Windows the folder can stay
# handle-locked by the shell/indexer even when every file inside is deletable.
OUT.mkdir(parents=True, exist_ok=True)
for old in OUT.glob('*.png'):
    old.unlink()

pages, index = [], []
missing = []
for i, (deck, n, label) in enumerate(PICKS, 1):
    src = RAW / deck / f'Slide{n}.PNG'
    if not src.exists():
        missing.append(str(src))
        continue
    name = f'{i:02d}_{label}.png'
    shutil.copy(src, OUT / name)
    pages.append(OUT / name)
    index.append(f'{i:02d}. {label}   (from {deck}, slide {n})')

if missing:
    raise SystemExit('MISSING SOURCE SLIDES:\n  ' + '\n  '.join(missing))

imgs = [Image.open(p).convert('RGB') for p in pages]
imgs[0].save(PDF, save_all=True, append_images=imgs[1:], resolution=150)

(ROOT / 'INDEX.txt').write_text(
    'ALL-SLIDES.pdf — every slide design the lesson builder can produce\n'
    f'{len(pages)} unique designs, curated from 127 rendered slides across 8 sample lessons.\n'
    'Repeated auto slides (do-now answers, visualiser, review tiers) appear once, not eight times.\n\n'
    + '\n'.join(index) + '\n',
    encoding='utf8')

print(f'{len(pages)} slides -> {PDF.name}')
