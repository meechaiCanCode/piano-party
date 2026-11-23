# /// script
# requires-python = ">=3.11"
# dependencies = [
#     "music21>=10.5,<11",
#     "ly-to-musicxml==0.1.1",
# ]
# ///
# Run with: uv run src/scripts/difficultySorter.py
# Also requires the LilyPond binary on PATH (not a Python package).
# ly-to-musicxml locates python-ly/ly/xml/xml-export.ily by walking up from
# each score, so the python-ly/ folder at the repo root is required.

import csv
import re
import shutil
import subprocess
import sys
import math
import statistics
import tempfile
import logging
import traceback
from pathlib import Path
from music21 import chord, converter, key, meter, tempo, note

BASE_DIR = Path(__file__).resolve().parent.parent.parent
FOLDER = BASE_DIR / "data" / "filtered_songs_ly"
XML_FOLDER = BASE_DIR / "data" / "converted_xml"
OUTPUT_CSV = BASE_DIR / "data" / "difficulty_rankings.csv"
LILYPOND_BIN = shutil.which("lilypond")
LOG_FILE = FOLDER.parent / "difficulty.log"
PASSAGE_MEASURES = 4
FALLBACK_QUARTER_LENGTH = 16
SUSTAINED_PASSAGES = 3
AVERAGE_WEIGHT = 0.50
PEAK_WEIGHT = 0.30
SUSTAINED_WEIGHT = 0.20

logging.basicConfig(
    filename = LOG_FILE,
    level = logging.DEBUG,
    format = "%(asctime)s [%(levelname)s] %(message)s",
    filemode = "w",
    encoding = "utf-8"
)

def read_metadata(path):
    text = path.read_text(encoding = "utf-8-sig", errors = "replace")
    def field(name):
        match = re.search(rf'\b{re.escape(name)}\s*=\s*"([^\"]*)"', text)
        return match.group(1) if match else "Unknown"
    tempo_match = re.search(r"\\tempo\s+(\d+)\s*=\s*(\d+)", text)
    bpm = None
    if tempo_match:
        beat_unit = int(tempo_match.group(1))
        if beat_unit:
            bpm = int(tempo_match.group(2)) * 4 / beat_unit
    return {"Title": field("title"), "Composer": field("composer"), "BPM": bpm}

def convert_to_xml(path):
    relative = path.relative_to(FOLDER)
    output = XML_FOLDER / relative.with_suffix(".musicxml")
    output.parent.mkdir(parents = True, exist_ok = True)
    output.unlink(missing_ok = True)
    result = subprocess.run(
        [
            sys.executable, "-m", "ly_to_musicxml", str(path.resolve()),
            "-o", str(output.resolve()), "--lilypond-bin", LILYPOND_BIN,
        ],
        capture_output = True, text = True, timeout = 180,
    )
    if result.returncode != 0 or not output.is_file() or output.stat().st_size == 0:
        raise RuntimeError((result.stderr or result.stdout).strip()[-500:] or "MusicXML conversion failed")
    return output

def convert_to_midi(path, temporary_folder):
    output_base = Path(temporary_folder) / "score"
    result = subprocess.run(
        [
            LILYPOND_BIN, "-dno-print-pages", "-dno-point-and-click",
            "-o", str(output_base), str(path.resolve()),
        ],
        cwd=path.parent, capture_output = True, text = True, timeout = 180,
    )
    midi_files = sorted(
        p for p in Path(temporary_folder).rglob("*")
        if p.suffix.lower() in (".mid", ".midi") and p.stat().st_size > 0
    )
    if not midi_files:
        raise RuntimeError((result.stderr or result.stdout).strip()[-1000:] or "No MIDI generated")
    if result.returncode != 0:
        logging.warning("LilyPond returned exit code %s but produced MIDI: %s", result.returncode, midi_files[0])
    return midi_files[0]

def key_difficulty(score):
    signatures = list(score.flatten().getElementsByClass(key.KeySignature))
    if not signatures:
        return 0.0
    sharps = signatures[0].sharps
    return min(abs(sharps) / 7, 1.0)

def time_signature_difficulty(score):
    signatures = list(score.flatten().getElementsByClass(meter.TimeSignature))
    if not signatures:
        return 0.0
    ts = signatures[0]
    numerator = ts.numerator
    denominator = ts.denominator
    if (numerator, denominator) in [(2, 4), (3, 4), (4, 4), (2, 2)]:
        return 0.0
    if (numerator, denominator) in [(6, 8), (9, 8), (12, 8)]:
        return 0.3
    if numerator in [5, 7, 11, 13]:
        return 1.0
    return 0.5

def analyze_technique(events):
    leaps = []
    chord_spans = []
    octave_count = 0
    previous_pitch = None
    for event in events:
        if isinstance(event, chord.Chord):
            pitches = sorted(p.midi for p in event.pitches)
            if not pitches:
                continue
            span = pitches[-1] - pitches[0]
            chord_spans.append(span)
            if span == 12:
                octave_count += 1
            current_pitch = sum(pitches) / len(pitches)
        else:
            current_pitch = event.pitch.midi
        if previous_pitch is not None:
            leaps.append(abs(current_pitch - previous_pitch))
        previous_pitch = current_pitch
    leap_score = (sum(x >= 12 for x in leaps) / len(leaps) if leaps else 0)
    def span_difficulty(semitones):
        if semitones <= 7:
            return 0.0
        elif semitones <= 9:
            return 0.1
        elif semitones == 10:
            return 0.2
        elif semitones == 11:
            return 0.35
        elif semitones == 12:
            return 0.5
        elif semitones == 13:
            return 0.75
        elif semitones == 14:
            return 0.85
        else:
            return 1.0
    chord_span_score = (0.7 *(sum(span_difficulty(x) for x in chord_spans) / len(chord_spans)) + 0.3 * max(span_difficulty(x) for x in chord_spans) if chord_spans else 0)
    octave_score = (octave_count / len(events) if events else 0)
    return leap_score, chord_span_score, octave_score

def peak_passage_difficulty(part, bpm):
    events = [e for e in part.flatten().notes if not e.duration.isGrace]
    if not events or not bpm:
        return 0
    window = 4.0
    onsets = sorted(float(e.offset) for e in events)
    peak_count = 0
    right = 0
    for left, start in enumerate(onsets):
        while (right < len(onsets) and onsets[right] < start + window):
            right += 1
        peak_count = max(peak_count, right - left)
    seconds = window * 60 / bpm
    peak_notes_per_second = peak_count / seconds
    return min(peak_notes_per_second / 10, 1.0)

def get_passage_windows(score):
    parts = list(score.parts) or [score]
    reference_measures = []
    for part in parts:
        measures = list(part.getElementsByClass("Measure"))
        if len(measures) > len(reference_measures):
            reference_measures = measures
    windows = []
    if reference_measures:
        score_end = float(score.highestTime)
        boundaries = sorted(set(float(m.offset) for m in reference_measures))
        if boundaries and boundaries[0] > 0:
            boundaries.insert(0, 0.0)
        boundaries.append(score_end)
        boundaries = sorted(set(boundaries))
        for i in range(0, len(boundaries) - 1, PASSAGE_MEASURES):
            start = boundaries[i]
            end_index = min(i + PASSAGE_MEASURES, len(boundaries) - 1)
            end = boundaries[end_index]
            if end > start:
                windows.append((start, end))
    if windows:
        return windows
    duration = float(score.highestTime)
    if duration <= 0:
        return []
    count = math.ceil(duration / FALLBACK_QUARTER_LENGTH)
    return [(i * FALLBACK_QUARTER_LENGTH, min((i + 1) * FALLBACK_QUARTER_LENGTH, duration)) for i in range(count)]

def score_passage(parts, start, end, bpm):
    duration_quarters = end - start
    if duration_quarters <= 0:
        return None
    seconds = duration_quarters * 60 / bpm
    total_events = 0
    fast_events = 0
    chord_events = 0
    max_notes_per_second = 0.0
    weighted_leaps = 0.0
    weighted_spans = 0.0
    weighted_octaves = 0.0
    for part in parts:
        events = [e for e in part.flatten().notes if (start <= float(e.offset) < end and not e.duration.isGrace)]
        if not events:
            continue
        event_count = len(events)
        total_events += event_count
        fast_events += sum(float(e.duration.quarterLength) <= 0.25 for e in events)
        chord_events += sum(isinstance(e, chord.Chord) for e in events)
        density = event_count / seconds
        max_notes_per_second = max(max_notes_per_second, density)
        leap_score, chord_span_score, octave_score = (analyze_technique(events))
        weighted_leaps += leap_score * event_count
        weighted_spans += chord_span_score * event_count
        weighted_octaves += octave_score * event_count
    if total_events == 0:
        return None
    fast_ratio = fast_events / total_events
    chord_ratio = chord_events / total_events
    leap_ratio = weighted_leaps / total_events
    chord_span_ratio = weighted_spans / total_events
    octave_ratio = weighted_octaves / total_events
    difficulty = (min(max_notes_per_second / 8, 1) * 40
                  + fast_ratio * 20
                  + chord_ratio * 15
                  + leap_ratio * 10
                  + chord_span_ratio * 10
                  + octave_ratio * 5
                )
    return round(min(max(difficulty, 0), 100), 2)

def combine_passage_scores(passage_scores):
    if not passage_scores:
        raise ValueError("No passages available")
    scores = sorted(passage_scores)
    count = len(scores)
    average = statistics.mean(scores)
    position = 0.90 * (count - 1)
    lower = math.floor(position)
    upper = math.ceil(position)
    peak = (
        scores[lower]
        + (scores[upper] - scores[lower])
        * (position - lower)
    )
    window = min(SUSTAINED_PASSAGES, count)
    sustained = max(statistics.mean(passage_scores[i:i + window]) for i in range(count - window + 1))
    final_score = (
        AVERAGE_WEIGHT * average
        + PEAK_WEIGHT * peak
        + SUSTAINED_WEIGHT * sustained
    )
    return {
        "Final": round(final_score, 2),
        "Average": round(average, 2),
        "Peak": round(peak, 2),
        "Sustained": round(sustained, 2),
        "Hardest": round(max(scores), 2),
    }

def classify(score, original_bpm):
    tempos = list(score.flatten().getElementsByClass(tempo.MetronomeMark))
    bpm = original_bpm
    if bpm is None and tempos:
        bpm = tempos[0].getQuarterBPM()
    if not bpm or bpm <= 0:
        bpm = 100
        logging.warning("Tempo unavailable, using default of 100bpm")
    parts = list(score.parts) or [score]
    total_notes = sum(len([e for e in part.flatten().notes if not e.duration.isGrace]) for part in parts)
    if total_notes == 0:
        raise ValueError("No playable notes found")
    windows = get_passage_windows(score)
    if not windows:
        raise ValueError("No valid passages found")
    passage_scores = []
    scored_windows = []
    for start, end in windows:
        score_value = score_passage(
            parts,
            start,
            end,
            bpm
        )
        if score_value is None:
            continue
        passage_scores.append(score_value)
        scored_windows.append((start, end))
    if not passage_scores:
        raise ValueError("No playable passages")
    metrics = combine_passage_scores(passage_scores)
    final_score = metrics["Final"]
    key_score = key_difficulty(score)
    time_score = time_signature_difficulty(score)
    final_score = min(
        100.0,
        final_score
        + key_score * 5
        + time_score * 5
    )
    if final_score < 25:
        difficulty = "Easy"
    elif final_score < 50:
        difficulty = "Intermediate"
    else:
        difficulty = "Advanced"
    logging.info(
        "PASSAGE ANALYSIS | "
        "Difficulty=%s | "
        "Final=%.2f | "
        "Average=%.2f | "
        "Peak=%.2f | "
        "Sustained=%.2f | "
        "Hardest=%.2f | "
        "Passages=%d | "
        "BPM=%.1f",
        difficulty,
        final_score,
        metrics["Average"],
        metrics["Peak"],
        metrics["Sustained"],
        metrics["Hardest"],
        len(passage_scores),
        bpm,
    )
    for i, ((start, end), value) in enumerate(zip(scored_windows, passage_scores), 1):
        logging.debug(
            "PASSAGE %d | "
            "Start=%.2f | "
            "End=%.2f | "
            "Difficulty=%.2f",
            i,
            start,
            end,
            value
        )
    return difficulty

def process_file(path):
    metadata = read_metadata(path)
    try:
        xml_path = convert_to_xml(path)
        score = converter.parse(str(xml_path))
        method = "MusicXML"
    except Exception as xml_error:
        logging.warning("MusicXML conversion failed for %s: \n%s", path, traceback.format_exc())
        print(f"  MusicXML unavailable ({str(xml_error).splitlines()[0][:120]}); trying MIDI")
        with tempfile.TemporaryDirectory() as temp_dir:
            midi_path = convert_to_midi(path, temp_dir)
            score = converter.parse(str(midi_path))
        method = "MIDI"
    difficulty = classify(score, metadata["BPM"])
    logging.info("SUCCESS | %s | %s | Method: %s", path.relative_to(FOLDER), difficulty, method)
    return {
        "File": str(path.relative_to(FOLDER)),
        "Title": metadata["Title"],
        "Composer": metadata["Composer"],
        "Difficulty": difficulty,
    }

def main():
    if not LILYPOND_BIN:
        raise RuntimeError("LilyPond is not on PATH")
    if not FOLDER.is_dir():
        raise FileNotFoundError(f"Sheet music folder not found: {FOLDER}")
    files = sorted(FOLDER.rglob("*.ly"))
    results = []
    failures = 0
    print(f"Found {len(files)} LilyPond files")
    for i, path in enumerate(files, 1):
        print(f"[{i}/{len(files)}] {path.relative_to(FOLDER)}")
        try:
            row = process_file(path)
            results.append(row)
            print(f"  -> {row['Difficulty']}")
        except Exception as exc:
            failures += 1
            logging.exception("FAILED | %s", path.relative_to(FOLDER))
            print(f" -> ERROR: "
                  f"{str(exc).splitlines()[0][:200]}")
    OUTPUT_CSV.parent.mkdir(parents = True, exist_ok = True)
    with OUTPUT_CSV.open("w", newline = "", encoding = "utf-8-sig") as f:
        writer = csv.DictWriter(f, fieldnames = ["File", "Title", "Composer", "Difficulty"])
        writer.writeheader()
        writer.writerows(results)
    print(f"\nComplete: {len(results)} ranked, {failures} failed")
    print(f"CSV: {OUTPUT_CSV}")


if __name__ == "__main__":
    main()
