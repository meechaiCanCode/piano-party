"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Score, ScoreSystem } from "@/server/renderScore";
import PianoKeyboard from "./PianoKeyboard";
import styles from "./player.module.css";

const SAMPLE_MIDI = [21, 33, 45, 57, 69, 81, 93, 105];
const VISIBLE_SYSTEMS = 2;
const SYSTEM_PADDING = 4;
const HIGHLIGHT = "#1769f6";
const LOOKAHEAD = 2;
const SCHEDULE_INTERVAL = 250;
const HIT_WINDOW = 0.15;

type Status = "idle" | "loading" | "playing" | "paused";
type Sample = { midi: number; buffer: AudioBuffer };
type Change = { at: number; key: string; delta: number; system?: number };
type Band = { width: number; offset: number };

function nearestSample(pitch: number, samples: Sample[]) {
    let best = samples[0];
    for (const sample of samples) {
        if (Math.abs(sample.midi - pitch) < Math.abs(best.midi - pitch)) {
            best = sample;
        }
    }
    return best;
}

function systemY(
    pages: Score["pages"],
    bands: Band[],
    system: ScoreSystem,
    edge: "top" | "bottom",
) {
    const band = bands[system.page];
    return band.offset + (system[edge] - pages[system.page].viewBox.y) / band.width;
}

function camera(pages: Score["pages"], systems: ScoreSystem[]) {
    let total = 0;
    const bands = pages.map(page => {
        const width = page.viewBox.width || 1;
        const band = { width, offset: total };
        total += page.viewBox.height / width;
        return band;
    });

    let height = 0;
    const lastFirst = Math.max(0, systems.length - VISIBLE_SYSTEMS);
    for (let i = 0; i < systems.length && i <= lastFirst; i++) {
        const first = systems[i];
        const last = systems[Math.min(i + VISIBLE_SYSTEMS - 1, systems.length - 1)];
        const top = systemY(pages, bands, first, "top") - SYSTEM_PADDING / bands[first.page].width;
        const bottom = systemY(pages, bands, last, "bottom") + SYSTEM_PADDING / bands[last.page].width;
        height = Math.max(height, bottom - top);
    }

    return { bands, height: height || 1, total };
}

export default function SongPlayer({ pages, notes, systems }: Score) {
    const [status, setStatus] = useState<Status>("idle");
    const [system, setSystem] = useState(0);
    const [feedback, setFeedback] = useState("");
    const [error, setError] = useState("");

    const stack = useRef<HTMLDivElement>(null);
    const heads = useRef(new Map<string, SVGElement[]>());
    const active = useRef(new Map<string, number>());
    const hits = useRef(new Set<number>());

    const audio = useRef<AudioContext | null>(null);
    const master = useRef<GainNode | null>(null);
    const samples = useRef<Sample[]>([]);
    const origin = useRef(0);
    const nextNote = useRef(0);
    const nextChange = useRef(0);
    const firstCandidate = useRef(0);
    const scheduler = useRef(0);
    const frame = useRef(0);
    const toggling = useRef(false);

    const { bands, height, total } = useMemo(() => camera(pages, systems), [pages, systems]);

    const first = Math.min(system, Math.max(0, systems.length - VISIBLE_SYSTEMS));
    const visible = systems[first];
    const top = visible
        ? Math.max(0, systemY(pages, bands, visible, "top") - SYSTEM_PADDING / bands[visible.page].width)
        : 0;
    const scroll = total ? (top / total) * 100 : 0;

    const changes = useMemo(() => {
        const list: Change[] = [];
        for (const note of notes) {
            list.push({ at: note.start, key: note.key, delta: 1, system: note.system });
            list.push({ at: note.end, key: note.key, delta: -1 });
        }
        return list.sort((a, b) => a.at - b.at || b.delta - a.delta);
    }, [notes]);

    // Keep the SVG elements stable when feedback or playback controls update.
    const scorePages = useMemo(() => pages.map((page, index) => (
        <div
            key={index}
            className={styles.page}
            dangerouslySetInnerHTML={{ __html: page.svg }}
        />
    )), [pages]);

    useEffect(() => {
        const found = new Map<string, SVGElement[]>();
        for (const head of stack.current?.querySelectorAll<SVGElement>("[data-note]") ?? []) {
            const key = head.getAttribute("data-note");
            if (!key) continue;

            const group = found.get(key);
            if (group) group.push(head);
            else found.set(key, [head]);
        }
        heads.current = found;
    }, [pages]);

    const stopTimers = useCallback(() => {
        window.clearInterval(scheduler.current);
        cancelAnimationFrame(frame.current);
    }, []);

    const closeAudio = useCallback(() => {
        stopTimers();
        const context = audio.current;
        audio.current = null;
        master.current = null;
        if (context && context.state !== "closed") void context.close();
    }, [stopTimers]);

    useEffect(() => closeAudio, [closeAudio]);

    function finish() {
        closeAudio();
        active.current.clear();
        for (const group of heads.current.values()) {
            for (const head of group) head.style.color = "";
        }
        setStatus("idle");
    }

    function checkNote(pitch: number) {
        const context = audio.current;
        if (status !== "playing" || context?.state !== "running") return;

        const elapsed = context.currentTime - origin.current;

        // Notes are ordered by start time. Skip notes too old to match again.
        while (
            firstCandidate.current < notes.length &&
            notes[firstCandidate.current].start < elapsed - HIT_WINDOW
        ) {
            firstCandidate.current++;
        }

        let best = -1;
        let bestDistance = Infinity;

        for (let i = firstCandidate.current; i < notes.length; i++) {
            const note = notes[i];
            if (note.start > elapsed + HIT_WINDOW) break;
            if (note.pitch !== pitch || hits.current.has(i)) continue;

            const distance = Math.abs(note.start - elapsed);
            if (distance < bestDistance) {
                best = i;
                bestDistance = distance;
            }
        }

        if (best === -1) {
            setFeedback(`No match · ${hits.current.size} correct`);
            return;
        }

        hits.current.add(best);
        setFeedback(`Hit! · ${hits.current.size} correct`);
    }

    function schedule() {
        const context = audio.current;
        const output = master.current;
        if (!context || !output) return;

        const horizon = context.currentTime - origin.current + LOOKAHEAD;

        while (nextNote.current < notes.length && notes[nextNote.current].start <= horizon) {
            const note = notes[nextNote.current++];
            const sample = nearestSample(note.pitch, samples.current);
            const source = context.createBufferSource();
            source.buffer = sample.buffer;
            source.playbackRate.value = 2 ** ((note.pitch - sample.midi) / 12);

            const gain = context.createGain();
            const from = origin.current + note.start;
            const to = Math.max(from + 0.03, origin.current + note.end);
            const level = 0.5 * Math.min(1, Math.max(0.05, note.velocity / 127));
            const release = Math.max(from + 0.006, to - 0.12);

            gain.gain.setValueAtTime(0, from);
            gain.gain.linearRampToValueAtTime(level, from + 0.005);
            gain.gain.setValueAtTime(level, release);
            gain.gain.linearRampToValueAtTime(0, to);

            source.connect(gain).connect(output);
            source.onended = () => {
                source.disconnect();
                gain.disconnect();
            };
            source.start(from);
            source.stop(to + 0.02);
        }
    }

    function tick() {
        const context = audio.current;
        if (!context) return;

        const elapsed = context.currentTime - origin.current;
        while (nextChange.current < changes.length && changes[nextChange.current].at <= elapsed) {
            const change = changes[nextChange.current++];
            const count = (active.current.get(change.key) ?? 0) + change.delta;

            if (count > 0) active.current.set(change.key, count);
            else active.current.delete(change.key);

            for (const head of heads.current.get(change.key) ?? []) {
                head.style.color = count > 0 ? HIGHLIGHT : "";
            }
            if (change.system !== undefined) setSystem(change.system);
        }

        // Let a short final note use its full late-hit window.
        const lastStart = notes[notes.length - 1].start;
        if (nextChange.current === changes.length && elapsed >= lastStart + HIT_WINDOW) {
            finish();
        } else {
            frame.current = requestAnimationFrame(tick);
        }
    }

    function runTimers() {
        schedule();
        scheduler.current = window.setInterval(schedule, SCHEDULE_INTERVAL);
        frame.current = requestAnimationFrame(tick);
    }

    async function start() {
        setStatus("loading");
        const context = new AudioContext();
        audio.current = context;
        await context.resume();

        if (!samples.current.length) {
            const loaded = await Promise.all(SAMPLE_MIDI.map(async (midi, i) => {
                const response = await fetch(`/audio/piano/A${i}.mp3`);
                if (!response.ok) throw new Error("Could not load piano audio.");
                const buffer = await context.decodeAudioData(await response.arrayBuffer());
                return { midi, buffer };
            }));
            if (audio.current !== context) return;
            samples.current = loaded;
        }

        if (audio.current !== context) return;
        const output = context.createGain();
        output.gain.value = 0.8;
        output.connect(context.createDynamicsCompressor()).connect(context.destination);
        master.current = output;

        origin.current = context.currentTime + 0.2;
        nextNote.current = 0;
        nextChange.current = 0;
        firstCandidate.current = 0;
        hits.current.clear();
        setFeedback("");
        setSystem(0);
        setStatus("playing");
        runTimers();
    }

    async function toggle() {
        if (toggling.current || !notes.length) return;
        toggling.current = true;
        setError("");

        try {
            const context = audio.current;
            if (status === "playing" && context) {
                stopTimers();
                await context.suspend();
                if (audio.current === context) setStatus("paused");
            } else if (status === "paused" && context) {
                await context.resume();
                if (audio.current !== context) return;
                setStatus("playing");
                runTimers();
            } else if (status === "idle") {
                await start();
            }
        } catch {
            finish();
            setError("Playback could not continue.");
        } finally {
            toggling.current = false;
        }
    }

    const buttonLabel = {
        idle: "Play",
        loading: "Loading…",
        playing: "Pause",
        paused: "Resume",
    }[status];

    return (
        <section className={styles.player} aria-label="Sheet music player">
            <div className={styles.controls}>
                <button
                    type="button"
                    className={styles.button}
                    onClick={() => void toggle()}
                    disabled={status === "loading" || !notes.length}
                >
                    {buttonLabel}
                </button>
                {feedback && <span className={styles.status} role="status">{feedback}</span>}
                {!notes.length && <span className={styles.status}>No playable score for this song.</span>}
                {error && <span className={styles.error} role="alert">{error}</span>}
            </div>

            <div className={styles.window} style={{ aspectRatio: String(1 / height) }}>
                <div
                    ref={stack}
                    className={styles.stack}
                    style={{ transform: `translateY(-${scroll}%)` }}
                >
                    {scorePages}
                </div>
            </div>

            <PianoKeyboard onNotePress={checkNote} />
        </section>
    );
}