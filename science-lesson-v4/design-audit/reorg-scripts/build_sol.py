"""Build scheme-of-learning.json from the parsed pacing data plus the hand-verified
mapping of pacing labels to Patryk's actual Drive folder names.

The mapping is hand-written because pacing labels and folder names genuinely disagree
(see Trap 1 in the plan): pacing numbering is unreliable, so topics are matched by title.
"""
import json, os, re, collections

HERE = os.path.dirname(os.path.abspath(__file__))
PARSED = json.load(open(os.path.join(HERE, "pacing_parsed.json"), encoding="utf8"))

# pacing label (lowercased, trimmed) -> (subject, drive topic folder, note)
# "" folder means: no folder on Drive yet / not a taught topic (revision, exams, fairs)
MAP = {
    # ---------- Year 7 ----------
    "year7": {
        "intro to science":   ("Science Skills", "Introduction to Science", "NEW - folder does not exist yet"),
        "p1 forces":          ("Physics", "P1 Forces", ""),
        "b1 cells":           ("Biology", "B1 Cells", ""),
        "c1 particles":       ("Chemistry", "C1 Particles", ""),
        "c1 a,e,c & m":       ("Chemistry", "C2 Atoms, Elements, Compounds and Mixtures", "pacing says C1, folder is C2"),
        "p2 energy":          ("Physics", "P2 Energy", ""),
        "b2 body systems":    ("Biology", "B2 Body Systems", ""),
        "c2 separating":      ("Chemistry", "C3 Separating Mixtures", "pacing says C2, folder is C3"),
        "b3 human repro":     ("Biology", "B3 Human and Plant Reproduction", "human half of the folder"),
        "p3 sound waves":     ("Physics", "P3 Sound and Waves", ""),
        "c3 reactions":       ("Chemistry", "C4 Introduction to Reactions", "pacing says C3, folder is C4"),
        "b4 interdep'ce":     ("Biology", "B4 Interdependence", ""),
        "b5 plant repro":     ("Biology", "B3 Human and Plant Reproduction", "plant half of the same folder"),
        "p4 earth in space":  ("Physics", "P4 Earth in Space", ""),
    },
    # ---------- Year 8 ----------
    "year8": {
        "c1 acids & alkalis":        ("Chemistry", "C1 Acids and Alkalis", ""),
        "p1 motion & pressure":      ("Physics", "P1 Motion and Pressure", ""),
        "b1 resp & photo":           ("Biology", "B1 Respiration and Photosythesis", "folder name has a typo: Photosythesis"),
        "c1 periodic table":         ("Chemistry", "C2 Periodic Table", "pacing says C1, folder is C2"),
        "p3 light":                  ("Physics", "P3 Light", ""),
        "b2 health & digestion":     ("Biology", "B2 Health and Digestion", ""),
        "c3 m, nm & energy":         ("Chemistry", "C3 Metals, Non Metals and Chemical Energy", ""),
        "b3 vari, inher & evo":      ("Biology", "B3 Inheritance, Variation and Evolution", ""),
        "p2 energy resources":       ("Physics", "P2 Energy Resources", ""),
        "p4 electricity & magnetism": ("Physics", "P4 Electricity + P5 Magnets", "pacing merges two folders"),
        "c4 atmosphere & earth":     ("Chemistry", "C4 Atmosphere and Resources", "C5 Earths Resources may also apply"),
    },
    # ---------- Year 9 ----------
    "year9": {
        "p3 particles l1-13":            ("Physics", "P3 Particles", "13 lessons; folder currently has 12"),
        "b1 cells l1-7":                 ("Biology", "B1 Cells", "first block, lessons 1-7"),
        "b1 cells l8-16":                ("Biology", "B1 Cells", "second block, lessons 8-16"),
        "c1 atomic structure l1-13":     ("Chemistry", "C1 Atomic Structure", "13 lessons; folder currently has 14"),
        "p4 atomic structure":           ("Physics", "P4 Atomic Strucutre", "folder name has a typo: Strucutre"),
        "b2 organisation l1-7":          ("Biology", "B2 Organisation", "first block, lessons 1-7"),
        "b2 organisation l8-14":         ("Biology", "B2 Organisation", "second block, lessons 8-14"),
        "c2 bonding & structure l1-13":  ("Chemistry", "C2 Bonding and Structure", ""),
        "maths for physics":             ("Physics", "", "skills block, no topic folder"),
    },
    # ---------- Year 10 ----------
    "year10": {
        "p1 - energy l1-11":        ("Physics", "P1 Energy", ""),
        "p2 electricity l1-16":     ("Physics", "P2 Electricity", ""),
        "c5 energy changes l1-5":   ("Chemistry", "C5 Energy Changes", "Combined only - Patryk teaches this for 10C-2"),
        "p5 forces l1-20":          ("Physics", "P5 Forces", "COMBINED tier: 20 lessons"),
        "p5 forces l1-25":          ("Physics", "P5 Forces", "SEPARATE tier: 25 lessons - the 5 extra need a (Separate) tag"),
    },
    # ---------- Year 11 ----------
    "year11": {
        "forces recap":         ("Physics", "P5 Forces", "recap of Year 10 content"),
        "p6 waves l1-13":       ("Physics", "P6 Waves", ""),
        "p7 magnetism l1-11":   ("Physics", "P7 Magnetism", ""),
        "p8 space l1-5":        ("Physics", "P8 Space", ""),
    },
}

# Who actually delivers each subject for each of Patryk's classes.
# Source: classes-2026-27.json specialism rules, confirmed by Patryk 2026-07-22.
# NOTE: a pacing COLUMN means different things per sheet. For Year 10/11 each teacher has
# their own column, so the column already IS that teacher's strand. For the shared Year 8
# and 9 classes there is ONE column for the whole class, listing both teachers' topics
# interleaved, so it must be filtered by these rules to get Patryk's own list.
OWNERSHIP = {
    "year7":  {"columnIsPatrykOnly": True,  "patrykSubjects": ["Physics", "Chemistry", "Biology", "Science Skills"],
               "note": "7Ml - Patryk is the sole teacher, so every topic is his."},
    "year8":  {"columnIsPatrykOnly": False, "patrykSubjects": ["Physics", "Biology"],
               "note": "8XP: Ms Sole (SLS) takes Chemistry, Patryk takes Biology + Physics. "
                       "8AG: Mr Hollis (LHO) takes Chemistry and Biology, Patryk takes Physics only. "
                       "The two classes run the SAME topics in ROTATED order (a carousel), so they are "
                       "never on the same topic at the same time."},
    "year9":  {"columnIsPatrykOnly": False, "patrykSubjects": ["Physics", "Chemistry", "Biology"],
               "note": "9AS: Ms Milland (AM) takes Biology, Patryk takes Physics + Chemistry. "
                       "9XS: Patryk is sole teacher, so he needs every Year 9 topic regardless."},
    "year10combined": {"columnIsPatrykOnly": True, "patrykSubjects": ["Physics", "Chemistry"],
               "note": "10C-2 is a THREE-way split: PTO 5 lessons, RBA 3, BCO 2, each running a "
                       "different topic in parallel. Patryk's strand is NOT purely Physics - it "
                       "includes C5 Energy Changes. Do not infer ownership from subject here."},
    "year10separate": {"columnIsPatrykOnly": True, "patrykSubjects": ["Physics"],
               "note": "10S-2 splits by specialism: EJA Biology, LHO Chemistry, PTO all the Physics."},
    "year11separate": {"columnIsPatrykOnly": True, "patrykSubjects": ["Physics"],
               "note": "11S2 splits by specialism: EJA Biology, SLS Chemistry, PTO Physics only."},
}

SHEET_TO_YEAR = {
    "Year 7 Pacing": ("year7", "7Ml"),
    "Year 8 Pacing": ("year8", "8XP + 8AG"),
    "Year 9 Pacing": ("year9", "9AS + 9XS"),
    "Year 10 Combined Pacing": ("year10combined", "10C-2"),
    "Year 10 Separates Pacing": ("year10separate", "10S-2"),
    "Year 11 Separates Pacing": ("year11separate", "11S2"),
}
YEAR_KEY = {"year10combined": "year10", "year10separate": "year10", "year11separate": "year11"}

NON_TEACHING = re.compile(
    r"revision|assessment|exam|mock|go through|improvement|holiday|science fair|catch up|recap$", re.I
)

def norm(s):
    return re.sub(r"\s+", " ", s.strip().lower())

out = {
    "_meta": {
        "generatedFrom": [
            "Science Pacing All Years 2026-27.xlsx (columns marked PTO)",
            "Y12 A-level physics PACING - 2026-27.docx (column 'Module 1 and 4 PTO/AJS')",
            "Yr13 A-level physics PACING - 2026-27.docx (column 'Teacher AJS/PTO Modules 5')",
        ],
        "generatedOn": "2026-07-22",
        "academicYear": "2026-2027",
        "warning": "Pacing topic NUMBERS disagree with Patryk's folder numbers. Always match by TITLE. "
                   "Folder names below are the authority for where files go.",
    },
    "keyStage3and4": {},
    "keyStage5": {},
}

for sheet, data in PARSED.items():
    if sheet not in SHEET_TO_YEAR:
        continue
    key, cls = SHEET_TO_YEAR[sheet]
    ykey = YEAR_KEY.get(key, key)
    mapping = MAP.get(ykey, {})

    seq, seen = [], set()
    unmapped = set()
    for w in data["weeks"]:
        topic = w["patryk"].strip()
        if not topic or NON_TEACHING.search(topic):
            continue
        n = norm(topic)
        if n in mapping:
            subject, folder, note = mapping[n]
        else:
            subject, folder, note = ("?", "", "UNMAPPED - needs a decision")
            unmapped.add(topic)
        sig = (n, folder)
        if sig in seen:
            # already recorded; just extend the week list
            for s in seq:
                if s["_sig"] == list(sig):
                    s["weeks"].append(w["weekOf"])
            continue
        seen.add(sig)
        own = OWNERSHIP.get(key, {})
        teaches = own.get("columnIsPatrykOnly", True) or subject in own.get("patrykSubjects", [])
        seq.append({
            "_sig": list(sig),
            "order": len(seq) + 1,
            "pacingLabel": topic,
            "subject": subject,
            "driveTopicFolder": folder,
            "patrykTeaches": teaches,
            "note": note,
            "weeks": [w["weekOf"]],
        })
    for s in seq:
        s["firstTaught"] = s["weeks"][0]
        s["weekCount"] = len(s["weeks"])
        del s["_sig"], s["weeks"]

    out["keyStage3and4"][key] = {
        "class": cls,
        "ownership": OWNERSHIP.get(key, {}),
        "teacherColumns": data.get("blockTeachers", {}),
        "patrykColumns": data.get("patrykColumns", []),
        "teachingSequence": seq,
        "unmappedLabels": sorted(unmapped),
    }

# ---------- Key Stage 5, read by hand from the two pacing documents ----------
out["keyStage5"] = {
    "year12": {
        "class": "12C", "examBoard": "OCR Physics A",
        "patrykOwns": "Module 1 and Module 4 (column 'PTO/AJS'); FCA takes Modules 2 and 3",
        "driveRoot": "Lessons/Year 12",
        "teachingSequence": [
            {"order": 1, "term": 1, "chapter": "Chapter 11 - Waves 1", "sections": ["11.1 Progressive waves", "11.2 Wave properties", "11.3 Reflection and refraction", "11.4 Diffraction and polarisation", "11.5 Intensity", "11.6 Electromagnetic waves", "11.7 Polarisation of electromagnetic waves", "11.8 Refractive index", "11.9 Total internal reflection"], "practicals": ["PAG 5.3 Determining the frequency and wavelength of a wave using an oscilloscope"]},
            {"order": 2, "term": "1-2", "chapter": "Chapter 12 - Waves 2", "sections": ["12.1 Superposition of waves", "12.2 Interference", "12.3 The Young double-slit experiment", "12.4 Stationary waves", "12.5 Harmonics", "12.6 Stationary waves in air columns"], "practicals": ["PAG 5.1 Determining the wavelength of light with a diffraction grating"]},
            {"order": 3, "term": 2, "chapter": "Chapter 8 - Charge and Current", "sections": ["8.1 Current and charge", "8.2 Moving charges", "8.3 Kirchhoff's first law", "8.4 Mean drift velocity"], "practicals": []},
            {"order": 4, "term": "2-3", "chapter": "Chapter 9 - Energy, Power and Resistance", "sections": ["9.1 Circuit symbols (not a lesson)", "9.2 Potential difference and EMF", "9.3 The electron gun (not a lesson)", "9.4 Resistance", "9.5 I-V characteristics", "9.6 Diodes", "9.7 Resistance and resistivity", "9.8 The thermistor", "9.9 The LDR", "9.10 Electrical energy and power", "9.11 Paying for electricity"], "practicals": ["PAG 4.1 Investigating Resistance", "PAG 3.1 Determining the resistivity"]},
            {"order": 5, "term": 4, "chapter": "Chapter 10 - Electrical Circuits", "sections": ["10.1 Kirchhoff's laws and circuits", "10.2 Combining resistors", "10.3 Analysing circuits", "10.4 Internal resistance", "10.5 Potential divider circuits", "10.6 Sensing circuits"], "practicals": []},
            {"order": 6, "term": 4, "chapter": "Chapter 13 - Quantum Physics", "sections": ["13.1 The photon model", "13.2 The photoelectric effect", "13.3 Einstein's photoelectric effect equation", "13.4 Wave-particle duality"], "practicals": ["PAG 6.1 Determining the Planck Constant (may slip until after Y12 exams)"]},
            {"order": 7, "term": 5, "chapter": "Chapter 14 - Thermal Physics", "sections": ["14.1 Temperature", "14.2 Solids, liquids and gases", "14.3 Internal energy", "14.4 Specific heat capacity", "14.5 Specific latent heat"], "practicals": []},
            {"order": 8, "term": 6, "chapter": "Chapter 15 - Ideal Gases", "sections": ["15.1 The kinetic theory", "15.2 Gas laws", "15.3 Root mean square speed", "15.4 The Boltzmann constant"], "practicals": ["PAG 8.1 Estimating absolute zero"]},
        ],
        "practicalsNotPatryks": ["PAG 1.1 Investigating g", "PAG 2.1 Determining the Young's Modulus of a Metal"],
    },
    "year13": {
        "class": "13D", "examBoard": "OCR Physics A",
        "patrykOwns": "Module 5, plus part of Module 6 (column 'AJS/PTO'); FCA takes the rest of Module 6",
        "driveRoot": "Lessons/Year 13",
        "resolvedMismatch": "The existing Year 13 folders (Chapter 17 Oscillations, 21 Capacitance, 22 Electric "
                    "Fields, 23 Magnetic Fields) are FCA's chapters for 2026-27, left over from a previous split. "
                    "DECIDED 2026-07-22: the pacing document wins. Build the six chapters below. Leave the old "
                    "folders in place untouched - do not delete them.",
        "teachingSequence": [
            {"order": 1, "term": 1, "chapter": "Chapter 19 - Stars", "sections": ["19.1 Objects in the universe", "19.2 The life cycle of stars", "19.3 The Hertzsprung-Russell diagram", "19.4 Energy levels in atoms", "19.5 Spectra", "19.6 Analysing starlight", "19.7 Stellar luminosity"], "practicals": []},
            {"order": 2, "term": 1, "chapter": "Chapter 20 - Cosmology", "sections": ["20.1 Astronomical distances", "20.2 The Doppler effect", "20.3 Hubble's law", "20.4 The Big Bang theory", "20.5 Evolution of the Universe"], "practicals": []},
            {"order": 3, "term": 2, "chapter": "Chapter 24 - Particle Physics", "sections": ["24.1 Alpha-particle scattering experiment", "24.2 The nucleus", "24.3 Antiparticles, hadrons, and leptons", "24.4 Quarks", "24.5 Beta decay"], "practicals": []},
            {"order": 4, "term": "2-3", "chapter": "Chapter 25 - Radioactivity", "sections": ["25.1 Radioactivity", "25.2 Nuclear decay equations", "25.3 Half-life and activity", "25.4 Radioactive decay calculations", "25.5 Modelling radioactive decay", "25.6 Radioactive dating"], "practicals": ["PAG 7.2 Investigating the absorption of alpha, beta and gamma"]},
            {"order": 5, "term": 3, "chapter": "Chapter 26 - Nuclear Physics", "sections": ["26.1 Einstein's mass-energy equations", "26.2 Binding energy", "26.3 Nuclear fission", "26.4 Nuclear fusion"], "practicals": []},
            {"order": 6, "term": "3-4", "chapter": "Chapter 27 - Medical Imaging", "sections": ["27.4 The gamma camera (taught early, on Mock paper 2)", "27.1 X-rays", "27.2 Interaction of X-rays with matter", "27.3 CAT scans", "27.5 PET scans"], "practicals": []},
        ],
        "practicalsNotPatryks": ["PAG 8.1 Estimating absolute zero", "PAG 10.1 Factors affecting SHM", "PAG 9.1 Charging / discharging capacitors", "PAG 9.2 Capacitors in series / parallel", "PAG 11.1 Investigating transformers", "PAG 12 Research"],
    },
}

dest = os.path.join("c:/Users/magda/claude-projects/science-lesson-v4", "scheme-of-learning.json")
with open(dest, "w", encoding="utf8") as f:
    json.dump(out, f, indent=2, ensure_ascii=False)

print(f"Written -> {dest}\n")
for k, v in out["keyStage3and4"].items():
    print(f"{k:<20} {v['class']:<14} {len(v['teachingSequence'])} topics")
    if v["unmappedLabels"]:
        print(f"    UNMAPPED: {v['unmappedLabels']}")
