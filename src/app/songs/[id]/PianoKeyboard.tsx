"use client";

import { useEffect, useRef, useState } from "react";
import { KeyboardShortcuts, MidiNumbers, Piano } from "./react-piano-custom";
import "./react-piano-custom/styles.css";

const noteRange = {
    first: MidiNumbers.fromNote("c3"),
    last: MidiNumbers.fromNote("b4"),
};

const keyboardShortcuts = KeyboardShortcuts.create({
    firstNote: noteRange.first,
    lastNote: noteRange.last,
    keyboardConfig: [
    ...KeyboardShortcuts.BOTTOM_ROW,
    ...KeyboardShortcuts.QWERTY_ROW,
],
});

type PianoKeyboardProps = {
    onNotePress?: (midiNumber: number) => void;
};

export default function PianoKeyboard({ onNotePress }: PianoKeyboardProps) {
    const [sample, setSample] = useState<{
        context: AudioContext;
        buffer: AudioBuffer;
    } | null>(null);

    const playing = useRef(new Map<number, {
        source: AudioBufferSourceNode;
        gain: GainNode;
    }>());
    const [error, setError] = useState("");

    useEffect(() => {
        const context = new AudioContext();
        const request = new AbortController();

        async function loadSample() {
            try {
                const response = await fetch("/audio/piano/A3.mp3", {
                    signal: request.signal,
                });
                if (!response.ok) throw new Error("Piano sample could not load.");
                const buffer = await context.decodeAudioData(await response.arrayBuffer());
                if (!request.signal.aborted) setSample({ context, buffer });
            } catch {
                if (!request.signal.aborted) setError("Piano audio could not load.");
            }
        }

        void loadSample();

        return () => {
            request.abort();
            void context.close();
        };
    }, []);

    function stopNote(midiNumber: number) {
        const note = playing.current.get(midiNumber);
        if (!note) return;

        playing.current.delete(midiNumber);

        const now = note.source.context.currentTime;
        const end = now + 0.2;
        note.gain.gain.setValueAtTime(1, now);
        note.gain.gain.exponentialRampToValueAtTime(0.001, end);
        note.source.stop(end);
    }

    function playNote(midiNumber: number) {
        if (!sample) return;
        onNotePress?.(midiNumber);

        const { context, buffer } = sample;
        if (context.state === "suspended") {
            void context.resume().catch(() => setError("Piano audio could not start."));
        }

        stopNote(midiNumber);
        const source = context.createBufferSource();
        source.buffer = buffer;
        source.playbackRate.value = 2 ** ((midiNumber - 57) / 12); // A3 is MIDI 57
        const gain = context.createGain();
        source.connect(gain);
        gain.connect(context.destination);

        const note = { source, gain };
        playing.current.set(midiNumber, note);

        source.onended = () => {
            if (playing.current.get(midiNumber) === note) {
                playing.current.delete(midiNumber);
            }
            source.disconnect();
            gain.disconnect();
        };
        source.start();
    }

    return (
        <div style={{ width: "min(720px, 92vw)", marginInline: "auto", overflowX: "auto" }}>
            {error && <p role="alert">{error}</p>}
            <Piano
                noteRange={noteRange}
                keyboardShortcuts={keyboardShortcuts}
                width={540}
                disabled={!sample}
                playNote={playNote}
                stopNote={stopNote}
            />
        </div>
    );
}