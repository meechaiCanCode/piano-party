"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Score, ScoreSystem } from "@/server/renderScore";
import styles from "./player.module.css";

const SAMPLE_MIDI = [21, 33, 45, 57, 69, 81, 93, 105];
const VISIBLE_SYSTEMS = 2;
const SYSTEM_PADDING = 4;
const HIGHLIGHT = "#1769f6";
const LOOKAHEAD = 2;
const SCHEDULE_INTERVAL = 250;

type Sample = { midi: number; buffer: AudioBuffer };
type Change = { at: number; key: string; delta: number; system?: number };

function nearestSample(pitch: number, samples: Sample[]): Sample {
    let best = samples[0];
    for (const sample of samples) {
        if (Math.abs(sample.midi - pitch) < Math.abs(best.midi - pitch)) best = sample;
    }
    return best;
}

type Band = { width: number; offset: number };

function docTop(pages: Score["pages"], bands: Band[], system: ScoreSystem): number {
    const band = bands[system.page];
    return band.offset + (system.top - pages[system.page].viewBox.y) / band.width;
}

function docBottom(pages: Score["pages"], bands: Band[], system: ScoreSystem): number {
    const band = bands[system.page];
    return band.offset + (system.bottom - pages[system.page].viewBox.y) / band.width;
}

// Pages are stacked continuously; the window height is the tallest current + next pair.
function camera(pages: Score["pages"], systems: ScoreSystem[]) {
    let total = 0;
    const bands = pages.map(page => {
        const width = page.viewBox.width || 1;
        const band = { width, offset: total };
        total += page.viewBox.height / width;
        return band;
    });
    if (!systems.length) return { bands, height: 1, total };

    let height = 0;
    for (let first = 0; first <= Math.max(0, systems.length - VISIBLE_SYSTEMS); first++) {
        const last = Math.min(first + VISIBLE_SYSTEMS - 1, systems.length - 1);
        height = Math.max(
            height,
            docBottom(pages, bands, systems[last]) - docTop(pages, bands, systems[first]) +
                SYSTEM_PADDING / bands[systems[first].page].width +
                SYSTEM_PADDING / bands[systems[last].page].width
        );
    }
    return { bands, height: height || 1, total };
}

export default function SongPlayer({ pages, notes, systems }: Score) {
    const pageRefs = useRef<(HTMLDivElement | null)[]>([]);
    const byKey = useRef(new Map<string, SVGElement[]>());
    const audio = useRef<AudioContext | null>(null);
    const master = useRef<GainNode | null>(null);
    const samples = useRef<Sample[] | null>(null);
    const origin = useRef(0);
    const nextNote = useRef(0);
    const scheduler = useRef(0);
    const changes = useRef<Change[]>([]);
    const changeIndex = useRef(0);
    const active = useRef(new Map<string, number>());
    const frame = useRef(0);
    const systemRef = useRef(0);
    const [playing, setPlaying] = useState(false);
    const [paused, setPaused] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [system, setSystem] = useState(0);

    const { bands, height: cameraHeight, total } = camera(pages, systems);
    const first = Math.max(0, Math.min(system, systems.length - VISIBLE_SYSTEMS));
    const cameraTop = systems.length
        ? Math.max(0, docTop(pages, bands, systems[first]) - SYSTEM_PADDING / bands[systems[first].page].width)
        : 0;
    const scroll = total ? (cameraTop / total) * 100 : 0;

    const collectNotes = useCallback(() => {
        const found = new Map<string, SVGElement[]>();
        for (const host of pageRefs.current) {
            if (!host) continue;
            for (const head of host.querySelectorAll<SVGElement>("[data-note]")) {
                const key = head.getAttribute("data-note");
                if (!key) continue;
                const group = found.get(key);
                if (group) group.push(head);
                else found.set(key, [head]);
            }
        }
        byKey.current = found;
    }, []);

    const clearHighlights = useCallback(() => {
        active.current.clear();
        for (const heads of byKey.current.values()) {
            for (const head of heads) head.style.color = "";
        }
    }, []);

    const stopScheduler = useCallback(() => {
        if (scheduler.current) clearInterval(scheduler.current);
        scheduler.current = 0;
    }, []);

    const finish = useCallback(() => {
        if (frame.current) cancelAnimationFrame(frame.current);
        frame.current = 0;
        stopScheduler();
        clearHighlights();
        const context = audio.current;
        audio.current = null;
        master.current = null;
        if (context) void context.close();
        setPlaying(false);
        setPaused(false);
    }, [clearHighlights, stopScheduler]);

    // Schedule a short look-ahead instead of every note up front, so the audio
    // graph never holds thousands of nodes.
    // shortcut: main-thread timer; a stalled/background tab can starve the look-ahead.
    function schedule() {
        const context = audio.current;
        const output = master.current;
        const loaded = samples.current;
        if (!context || !output || !loaded) return;

        const horizon = context.currentTime - origin.current + LOOKAHEAD;
        while (nextNote.current < notes.length && notes[nextNote.current].start <= horizon) {
            const note = notes[nextNote.current++];
            const sample = nearestSample(note.pitch, loaded);
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
        const list = changes.current;
        while (changeIndex.current < list.length && list[changeIndex.current].at <= elapsed) {
            const change = list[changeIndex.current++];
            if (change.delta > 0) {
                active.current.set(change.key, (active.current.get(change.key) ?? 0) + 1);
                if (change.system !== undefined && change.system !== systemRef.current) {
                    systemRef.current = change.system;
                    setSystem(change.system);
                }
            } else {
                active.current.set(change.key, Math.max(0, (active.current.get(change.key) ?? 1) - 1));
            }

            const on = (active.current.get(change.key) ?? 0) > 0;
            for (const head of byKey.current.get(change.key) ?? []) {
                head.style.color = on ? HIGHLIGHT : "";
            }
        }

        if (changeIndex.current < list.length) {
            frame.current = requestAnimationFrame(tick);
        } else {
            finish();
        }
    }

    useEffect(() => {
        collectNotes();
    }, [collectNotes]);

    useEffect(() => () => {
        if (frame.current) cancelAnimationFrame(frame.current);
        if (scheduler.current) clearInterval(scheduler.current);
        const context = audio.current;
        audio.current = null;
        if (context) void context.close();
    }, []);

    async function loadSamples(context: AudioContext): Promise<Sample[]> {
        if (samples.current) return samples.current;
        const loaded = await Promise.all(SAMPLE_MIDI.map(async (midi, index) => {
            const response = await fetch(`/audio/piano/A${index}.mp3`);
            if (!response.ok) throw new Error("Could not load piano audio.");
            return { midi, buffer: await context.decodeAudioData(await response.arrayBuffer()) };
        }));
        samples.current = loaded;
        return loaded;
    }

    async function start() {
        if (loading || !notes.length) return;
        setLoading(true);
        setError("");

        const context = new AudioContext();
        audio.current = context;
        try {
            await context.resume();
            await loadSamples(context);

            const output = context.createGain();
            output.gain.value = 0.8;
            output.connect(context.createDynamicsCompressor()).connect(context.destination);
            master.current = output;
            origin.current = context.currentTime + 0.2;
            nextNote.current = 0;

            const list: Change[] = [];
            for (const note of notes) {
                list.push({ at: note.start, key: note.key, delta: 1, system: note.system });
                list.push({ at: note.end, key: note.key, delta: -1 });
            }
            list.sort((a, b) => a.at - b.at || b.delta - a.delta);

            changes.current = list;
            changeIndex.current = 0;
            clearHighlights();
            systemRef.current = 0;
            setSystem(0);
            setPlaying(true);
            setPaused(false);
            schedule();
            scheduler.current = window.setInterval(schedule, SCHEDULE_INTERVAL);
            frame.current = requestAnimationFrame(tick);
        } catch {
            stopScheduler();
            const open = audio.current;
            audio.current = null;
            master.current = null;
            if (open) void open.close();
            setPlaying(false);
            setPaused(false);
            setError("Playback could not start.");
        } finally {
            setLoading(false);
        }
    }

    async function toggle() {
        if (loading) return;

        if (paused) {
            const context = audio.current;
            if (!context) return;
            await context.resume();
            setPaused(false);
            schedule();
            scheduler.current = window.setInterval(schedule, SCHEDULE_INTERVAL);
            frame.current = requestAnimationFrame(tick);
            return;
        }

        if (playing) {
            const context = audio.current;
            if (!context) return;
            if (frame.current) cancelAnimationFrame(frame.current);
            stopScheduler();
            await context.suspend();
            setPaused(true);
            return;
        }

        await start();
    }

    return (
        <section className={styles.player} aria-label="Sheet music player">
            <div className={styles.controls}>
                <button
                    type="button"
                    className={styles.button}
                    onClick={() => void toggle()}
                    disabled={loading || !notes.length}
                >
                    {loading ? "Loading…" : paused ? "Resume" : playing ? "Pause" : "Play"}
                </button>
                {!notes.length && <span className={styles.status}>No playable score for this song.</span>}
                {error && <span className={styles.error} role="alert">{error}</span>}
            </div>
            <div className={styles.window} style={{ aspectRatio: String(1 / cameraHeight) }}>
                <div className={styles.stack} style={{ transform: `translateY(-${scroll}%)` }}>
                    {pages.map((page, index) => (
                        <div
                            key={index}
                            ref={element => { pageRefs.current[index] = element; }}
                            className={styles.page}
                            dangerouslySetInnerHTML={{ __html: page.svg }}
                        />
                    ))}
                </div>
            </div>
        </section>
    );
}
