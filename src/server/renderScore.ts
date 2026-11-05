import { execFile } from "node:child_process";
import { mkdtemp, readFile, readdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const CACHE = new Map<string, Promise<Score | null>>();
const SYSTEM_PADDING = 4;

export type ScoreNote = {
    start: number;
    end: number;
    pitch: number;
    velocity: number;
    key: string;
    system: number;
};

export type ScoreSystem = { page: number; top: number; bottom: number };
export type ViewBox = { x: number; y: number; width: number; height: number };
export type ScorePage = { svg: string; viewBox: ViewBox };
export type Score = { pages: ScorePage[]; notes: ScoreNote[]; systems: ScoreSystem[] };

type ParsedSystem = { top: number; bottom: number; center: number; keys: string[] };
type ParsedPage = { svg: string; viewBox: ViewBox; systems: ParsedSystem[] };
type PpNote = { moment: number; grace: number; pitch: number; key: string };

// Render scores once per server process. Scores are static repository files.
export function renderScore(filePath: string): Promise<Score | null> {
    const cached = CACHE.get(filePath);
    if (cached) return cached;

    const score = renderUncached(filePath).catch(error => {
        console.error("Could not render song", filePath, error);
        return null;
    });
    CACHE.set(filePath, score);
    void score.then(value => {
        if (!value) CACHE.delete(filePath);
    });
    return score;
}

async function renderUncached(filePath: string): Promise<Score | null> {
    const source = resolveSongPath(filePath);
    const settings = path.resolve(process.cwd(), "scripts", "player.ly");
    const unfold = path.resolve(process.cwd(), "scripts", "unfold.ly");
    const binary = process.env.LILYPOND_BIN || "lilypond";
    const temp = await mkdtemp(path.join(tmpdir(), "piano-party-"));
    const options = { cwd: temp, timeout: 120_000, maxBuffer: 64 * 1024 * 1024, windowsHide: true, encoding: "utf8" as const };

    try {
        const { stdout: layoutStdout } = await execFileAsync(binary, [
            "--svg",
            "--define-default=no-point-and-click",
            `--define-default=include-settings=${settings}`,
            "-o",
            "score",
            source,
        ], options);

        const files = await readdir(temp);
        const svgFiles = files.filter(file => /^score.*\.svg$/i.test(file)).sort(byPageNumber);
        if (!svgFiles.length) return null;

        // LilyPond leaves \repeat volta folded in MIDI. The printed score keeps the
        // repeat signs, so render a separate MIDI pass with repeats unfolded.
        // shortcut: \bar "|:" repeat marks are visual only; they need measure-level
        // wrapping if those scores should also repeat.
        let midiStdout = layoutStdout;
        let midiBase = "score";
        if ((await readFile(source, { encoding: "utf8" })).includes("\\repeat")) {
            try {
                const { stdout } = await execFileAsync(binary, [
                    "-f",
                    "midi",
                    "--define-default=no-point-and-click",
                    `--define-default=include-settings=${settings}`,
                    `--define-default=include-settings=${unfold}`,
                    "-o",
                    "playback",
                    source,
                ], options);
                if ((await readdir(temp)).some(file => /^playback(-\d+)?\.midi$/i.test(file))) {
                    midiStdout = stdout;
                    midiBase = "playback";
                }
            } catch {
                // Fall back to the layout pass's MIDI.
            }
        }

        const midiFiles = midiBase === "score" ? files : await readdir(temp);
        const midiFile = midiFiles.filter(file => new RegExp(`^${midiBase}(-\\d+)?\\.midi?$`, "i").test(file)).sort()[0];
        const ppnotes = parsePpNotes(midiStdout);
        const midiNotes = midiFile ? parseMidi(await readFile(path.join(temp, midiFile))) : [];

        const parsedPages: ParsedPage[] = [];
        for (const file of svgFiles) {
            const parsed = parseSvg(await readFile(path.join(temp, file), "utf8"));
            if (parsed.systems.length) parsedPages.push(parsed);
        }
        if (!parsedPages.length) return null;

        const systems = parsedPages.flatMap((page, pageIndex) =>
            page.systems.map(system => ({
                page: pageIndex,
                top: system.top,
                bottom: system.bottom,
                keys: system.keys,
            }))
        );

        return {
            pages: parsedPages.map(page => ({ svg: page.svg, viewBox: page.viewBox })),
            notes: alignNotes(midiNotes, ppnotes, systems),
            systems: systems.map(({ page, top, bottom }) => ({ page, top, bottom })),
        };
    } finally {
        await rm(temp, { recursive: true, force: true });
    }
}

function resolveSongPath(filePath: string): string {
    const root = process.cwd();
    const dataRoot = path.resolve(root, "data");
    const normalized = filePath.replaceAll("\\", "/");
    const source = path.resolve(root, "src/scripts", normalized);
    const relative = path.relative(dataRoot, source);

    if (relative === ".." || relative.startsWith(`..${path.sep}`) || path.isAbsolute(relative) ||
        path.extname(source).toLowerCase() !== ".ly") {
        throw new Error(`Invalid song path: ${filePath}`);
    }
    return source;
}

function pageNumber(file: string): number {
    return Number(/-(\d+)\.svg$/i.exec(file)?.[1] ?? 0);
}

function byPageNumber(a: string, b: string): number {
    return pageNumber(a) - pageNumber(b) || a.localeCompare(b);
}

function parsePpNotes(stdout: string): PpNote[] {
    const notes: PpNote[] = [];
    for (const match of stdout.matchAll(/PPNOTE\s+(-?\d+(?:\.\d+)?)\s+(-?\d+(?:\.\d+)?)\s+(\d+)\s+(\S+)/g)) {
        notes.push({
            moment: Number(match[1]),
            grace: Number(match[2]),
            pitch: Number(match[3]),
            key: match[4],
        });
    }
    return notes.sort((a, b) => (a.moment + a.grace) - (b.moment + b.grace));
}

function alignNotes(
    midiNotes: MidiNote[],
    ppnotes: PpNote[],
    systems: { keys: string[] }[]
): ScoreNote[] {
    const byPitch = new Map<number, PpNote[]>();
    for (const note of ppnotes) {
        const group = byPitch.get(note.pitch);
        if (group) group.push(note);
        else byPitch.set(note.pitch, [note]);
    }

    const notes: ScoreNote[] = midiNotes.map(note => {
        const candidates = byPitch.get(note.pitch);
        let key = "";
        if (candidates?.length) {
            let best = 0;
            let bestDistance = Infinity;
            for (let index = 0; index < candidates.length; index++) {
                const distance = Math.abs(candidates[index].moment + candidates[index].grace - note.onset);
                if (distance < bestDistance) {
                    best = index;
                    bestDistance = distance;
                }
            }
            key = candidates.splice(best, 1)[0].key;
        }
        return { start: note.start, end: note.end, pitch: note.pitch, velocity: note.velocity, key, system: 0 };
    });

    const systemsByKey = new Map<string, number[]>();
    systems.forEach((system, index) => {
        for (const key of system.keys) {
            const group = systemsByKey.get(key);
            if (group) group.push(index);
            else systemsByKey.set(key, [index]);
        }
    });

    // A repeat plays the same written note again, so its key maps back to the system
    // where it was engraved. Fall back to the previous system for unknown keys.
    let system = 0;
    for (const note of notes) {
        const candidates = note.key ? systemsByKey.get(note.key) : undefined;
        if (candidates?.length) system = candidates[0];
        note.system = system;
    }
    return notes;
}

export type MidiNote = { onset: number; start: number; end: number; pitch: number; velocity: number };

export function parseMidi(data: Buffer): MidiNote[] {
    if (data.length < 14 || data.toString("ascii", 0, 4) !== "MThd") {
        throw new Error("Invalid MIDI file");
    }
    const headerLength = data.readUInt32BE(4);
    const trackCount = data.readUInt16BE(10);
    const ticksPerQuarter = data.readUInt16BE(12);
    if (headerLength < 6 || !ticksPerQuarter || (ticksPerQuarter & 0x8000)) {
        throw new Error("Unsupported MIDI timing");
    }
    // LilyPond's MIDI timeline is expressed in whole notes.
    const division = ticksPerQuarter * 4;

    let position = 8 + headerLength;
    const tempos: { tick: number; tempo: number }[] = [];
    const raw: { startTick: number; endTick: number; pitch: number; velocity: number }[] = [];

    for (let track = 0; track < trackCount && position + 8 <= data.length; track++) {
        while (position + 8 <= data.length && data.toString("ascii", position, position + 4) !== "MTrk") {
            position += 8 + data.readUInt32BE(position + 4);
        }
        if (position + 8 > data.length) break;

        const length = data.readUInt32BE(position + 4);
        const end = Math.min(data.length, position + 8 + length);
        position += 8;

        let tick = 0;
        let running = 0;
        const active = new Map<number, { tick: number; velocity: number }[]>();

        while (position < end) {
            let delta = 0;
            let byte: number;
            do {
                byte = data[position++]!;
                delta = (delta << 7) | (byte & 0x7f);
            } while (byte & 0x80 && position < end);
            tick += delta;

            let status = data[position]!;
            if (status & 0x80) {
                position++;
                running = status;
            } else {
                status = running;
            }

            if ((status & 0xf0) === 0xf0) {
                if (status === 0xff) {
                    const type = data[position++]!;
                    let length = 0;
                    do {
                        byte = data[position++]!;
                        length = (length << 7) | (byte & 0x7f);
                    } while (byte & 0x80 && position < end);
                    if (type === 0x51 && length === 3 && position + 3 <= end) {
                        tempos.push({
                            tick,
                            tempo: (data[position]! << 16) | (data[position + 1]! << 8) | data[position + 2]!,
                        });
                    }
                    position += length;
                } else {
                    let length = 0;
                    do {
                        byte = data[position++]!;
                        length = (length << 7) | (byte & 0x7f);
                    } while (byte & 0x80 && position < end);
                    position += length;
                }
                continue;
            }

            const kind = status & 0xf0;
            const channel = status & 0x0f;
            if (kind === 0x80 || kind === 0x90) {
                if (position + 1 >= end) break;
                const pitch = data[position++]!;
                const velocity = data[position++]!;
                const id = channel * 128 + pitch;
                if (kind === 0x90 && velocity > 0) {
                    const queue = active.get(id);
                    if (queue) queue.push({ tick, velocity });
                    else active.set(id, [{ tick, velocity }]);
                } else {
                    const note = active.get(id)?.shift();
                    if (note) raw.push({ startTick: note.tick, endTick: tick, pitch, velocity: note.velocity });
                }
            } else if (kind === 0xa0 || kind === 0xb0 || kind === 0xe0) {
                position += 2;
            } else if (kind === 0xc0 || kind === 0xd0) {
                position += 1;
            } else {
                break;
            }
        }

        for (const [id, queue] of active) {
            for (const note of queue) {
                raw.push({ startTick: note.tick, endTick: tick, pitch: id % 128, velocity: note.velocity });
            }
        }
        position = end;
    }

    tempos.sort((a, b) => a.tick - b.tick);
    const tempoMap: { tick: number; tempo: number }[] = [];
    for (const tempo of tempos.length && tempos[0].tick === 0 ? tempos : [{ tick: 0, tempo: 500000 }, ...tempos]) {
        if (tempoMap.length && tempoMap[tempoMap.length - 1].tick === tempo.tick) {
            tempoMap[tempoMap.length - 1] = tempo;
        } else {
            tempoMap.push(tempo);
        }
    }

    function seconds(target: number): number {
        let result = 0;
        for (let index = 0; index < tempoMap.length; index++) {
            const segment = tempoMap[index];
            const next = tempoMap[index + 1];
            const stop = next ? Math.min(target, next.tick) : target;
            if (stop > segment.tick) {
                result += (stop - segment.tick) * segment.tempo * 4 / (division * 1_000_000);
            }
            if (!next || target <= next.tick) break;
        }
        return result;
    }

    return raw
        .sort((a, b) => a.startTick - b.startTick || a.pitch - b.pitch)
        .map(note => ({
            onset: note.startTick / division,
            start: seconds(note.startTick),
            end: Math.max(seconds(note.endTick), seconds(note.startTick) + 0.01),
            pitch: note.pitch,
            velocity: note.velocity,
        }));
}

function attribute(attributes: string, name: string): string | undefined {
    const match = new RegExp(`\\b${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)')`, "i").exec(attributes);
    return match?.[1] ?? match?.[2];
}

function numberAttribute(attributes: string, name: string): number {
    const value = Number(attribute(attributes, name));
    return Number.isFinite(value) ? value : 0;
}

function translate(transform: string | undefined): [number, number] {
    const match = /translate\(\s*([-+]?(?:\d+\.?\d*|\.\d+)(?:e[-+]?\d+)?)(?:[,\s]+([-+]?(?:\d+\.?\d*|\.\d+)(?:e[-+]?\d+)?))?\s*\)/i.exec(transform ?? "");
    return match ? [Number(match[1]), Number(match[2] ?? 0)] : [0, 0];
}

function stripText(svg: string): string {
    return svg
        .replace(/<text\b[\s\S]*?<\/text>/gi, "")
        .replace(/<title\b[\s\S]*?<\/title>/gi, "")
        .replace(/<desc\b[\s\S]*?<\/desc>/gi, "")
        .replace(/<script\b[\s\S]*?<\/script>/gi, "")
        .replace(/\son\w+\s*=\s*(?:"[^"]*"|'[^']*')/gi, "");
}

export function parseSvg(source: string): ParsedPage {
    const svg = stripText(source);
    const viewBoxMatch = /<svg\b[^>]*\bviewBox\s*=\s*["']([^"']+)["']/i.exec(svg);
    const viewBoxValues = viewBoxMatch?.[1].trim().split(/[\s,]+/).map(Number) ?? [];
    const viewBox = viewBoxValues.length === 4 && viewBoxValues.every(Number.isFinite)
        ? { x: viewBoxValues[0], y: viewBoxValues[1], width: viewBoxValues[2], height: viewBoxValues[3] }
        : { x: 0, y: 0, width: 0, height: 0 };

    const stack = [{ x: 0, y: 0 }];
    const lines: { x1: number; y1: number; x2: number; y2: number }[] = [];
    const heads: { key: string; y: number }[] = [];
    const markers: { top: number; bottom: number }[] = [];
    let pending: { key: string; y: number; depth: number } | null = null;

    const tagPattern = /<\s*(\/?)\s*([a-zA-Z][\w:-]*)([^>]*?)(\/?)\s*>/g;
    for (const match of svg.matchAll(tagPattern)) {
        const closing = match[1] === "/";
        const tag = match[2].toLowerCase();
        const attributes = match[3];
        const selfClosing = match[4] === "/" || attributes.trimEnd().endsWith("/");
        const parent = stack[stack.length - 1];

        if (closing) {
            if (pending && pending.depth === stack.length) {
                heads.push({ key: pending.key, y: pending.y });
                pending = null;
            }
            if (tag === "g" && stack.length > 1) stack.pop();
            continue;
        }

        const [ownX, ownY] = translate(attribute(attributes, "transform"));

        if (tag !== "g" && pending) {
            heads.push({ key: pending.key, y: parent.y + ownY });
            pending = null;
        }

        if (tag === "line") {
            lines.push({
                x1: numberAttribute(attributes, "x1"),
                y1: numberAttribute(attributes, "y1") + parent.y + ownY,
                x2: numberAttribute(attributes, "x2"),
                y2: numberAttribute(attributes, "y2") + parent.y + ownY,
            });
        } else if (tag === "rect") {
            // System-start brackets are tall thin rects at the left edge of each system.
            const width = numberAttribute(attributes, "width");
            const height = numberAttribute(attributes, "height");
            const absoluteX = parent.x + ownX + numberAttribute(attributes, "x");
            if (width < 1 && height > 10 && absoluteX < viewBox.width * 0.25) {
                const top = parent.y + ownY + numberAttribute(attributes, "y");
                markers.push({ top, bottom: top + height });
            }
        } else if (tag === "g") {
            const absoluteX = parent.x + ownX;
            const absoluteY = parent.y + ownY;
            if (pending) {
                heads.push({ key: pending.key, y: absoluteY });
                pending = null;
            }
            const noteKey = attribute(attributes, "data-note");
            if (noteKey) pending = { key: noteKey, y: absoluteY, depth: stack.length + 1 };
            if (!selfClosing) stack.push({ x: absoluteX, y: absoluteY });
        }
    }

    const systems = groupSystems(lines, viewBox, markers);
    for (const head of heads) {
        if (head.y <= 0 || !systems.length) continue;
        let nearest = systems[0];
        for (const system of systems) {
            if (Math.abs(system.center - head.y) < Math.abs(nearest.center - head.y)) nearest = system;
        }
        nearest.keys.push(head.key);
        nearest.top = Math.min(nearest.top, head.y - 1.5);
        nearest.bottom = Math.max(nearest.bottom, head.y + 1.5);
    }

    if (!systems.length) return { svg, viewBox, systems };

    // Crop the page to its systems so the client can stack pages and scroll
    // through them without page margins.
    const top = Math.max(viewBox.y, Math.min(...systems.map(system => system.top)) - SYSTEM_PADDING);
    const bottom = Math.min(viewBox.y + viewBox.height, Math.max(...systems.map(system => system.bottom)) + SYSTEM_PADDING);
    const height = Math.max(1, bottom - top);
    const cropped = cropSvg(svg, viewBox.x, top, viewBox.width, height);

    return { svg: cropped, viewBox: { x: viewBox.x, y: top, width: viewBox.width, height }, systems };
}

function cropSvg(svg: string, x: number, y: number, width: number, height: number): string {
    const root = /<svg\b[^>]*>/i.exec(svg);
    if (!root) return svg;
    const tag = root[0]
        .replace(/\sviewBox\s*=\s*("[^"]*"|'[^']*')/i, ` viewBox="${x} ${y} ${width} ${height}"`)
        .replace(/\swidth\s*=\s*("[^"]*"|'[^']*')/i, ` width="${width}"`)
        .replace(/\sheight\s*=\s*("[^"]*"|'[^']*')/i, ` height="${height}"`);
    return svg.slice(0, root.index) + tag + svg.slice(root.index + root[0].length);
}

function groupSystems(
    lines: { x1: number; y1: number; x2: number; y2: number }[],
    viewBox: ViewBox,
    markers: { top: number; bottom: number }[]
): ParsedSystem[] {
    const positions = lines
        .filter(line => Math.abs(line.y2 - line.y1) < 0.01 && Math.abs(line.x2 - line.x1) >= viewBox.width * 0.5)
        .map(line => (line.y1 + line.y2) / 2)
        .sort((a, b) => a - b);

    const unique: number[] = [];
    for (const position of positions) {
        if (!unique.length || Math.abs(position - unique[unique.length - 1]) > 0.05) unique.push(position);
    }

    const runs: number[][] = [];
    for (const position of unique) {
        const run = runs[runs.length - 1];
        const gap = run ? position - run[run.length - 1] : 0;
        if (run && gap >= 0.8 && gap <= 1.2) run.push(position);
        else runs.push([position]);
    }

    const staves: { top: number; bottom: number; center: number }[] = [];
    for (const run of runs) {
        for (let start = 0; start + 5 <= run.length; start += 5) {
            staves.push({
                top: run[start],
                bottom: run[start + 4],
                center: (run[start] + run[start + 4]) / 2,
            });
        }
    }
    staves.sort((a, b) => a.top - b.top);
    if (!staves.length) return [];

    // Prefer the system-start brackets: one tall marker spans every staff in a system.
    const merged: { top: number; bottom: number }[] = [];
    for (const marker of [...markers].sort((a, b) => a.top - b.top)) {
        const last = merged[merged.length - 1];
        if (last && marker.top < last.bottom && marker.bottom > last.top) {
            last.top = Math.min(last.top, marker.top);
            last.bottom = Math.max(last.bottom, marker.bottom);
        } else {
            merged.push({ ...marker });
        }
    }

    const grouped: { top: number; bottom: number }[] = [];
    const covered = new Set<(typeof staves)[number]>();
    for (const marker of merged) {
        const members = staves.filter(staff => staff.center >= marker.top - 1 && staff.center <= marker.bottom + 1);
        if (!members.length) continue;
        members.forEach(staff => covered.add(staff));
        grouped.push({
            top: Math.min(...members.map(staff => staff.top)),
            bottom: Math.max(...members.map(staff => staff.bottom)),
        });
    }

    if (!merged.length) {
        // Fallback for scores without brackets: split where the gap between staves jumps.
        const gaps = staves.slice(1).map((staff, index) => staff.top - staves[index].bottom);
        const sortedGaps = [...gaps].sort((a, b) => a - b);
        let threshold = 6.2;
        let bestRatio = 0;
        for (let index = 0; index + 1 < sortedGaps.length; index++) {
            const small = sortedGaps[index];
            const large = sortedGaps[index + 1];
            if (large - small < 0.7 || large < small * 1.2) continue;
            const ratio = large / small;
            if (ratio > bestRatio) {
                bestRatio = ratio;
                threshold = (small + large) / 2;
            }
        }

        let group = { top: staves[0].top, bottom: staves[0].bottom };
        for (let index = 0; index < gaps.length; index++) {
            if (gaps[index] > threshold) {
                grouped.push(group);
                group = { top: staves[index + 1].top, bottom: staves[index + 1].bottom };
            } else {
                group.bottom = staves[index + 1].bottom;
            }
        }
        grouped.push(group);
    } else {
        // Bracketed piano systems can share a page with solo staves.
        for (const staff of staves) {
            if (!covered.has(staff)) grouped.push({ top: staff.top, bottom: staff.bottom });
        }
    }

    grouped.sort((a, b) => a.top - b.top);
    return grouped.map(group => ({ ...group, center: (group.top + group.bottom) / 2, keys: [] }));
}
