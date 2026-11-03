import { notFound } from "next/navigation";
import { pool } from "@/server/db";

export default async function SongPage({
    params,
}: {
    params: Promise<{ id: string }>;
}) {
    const { id } = await params;
    if (!/^\d+$/.test(id) || Number(id) > 2147483647) notFound();

    const { rows } = await pool.query(
        `SELECT title, composer, style, tempo, key_tonic, key_mode,
                time_numerator, time_denominator, difficulty
         FROM songs
         WHERE id = $1`,
        [id]
    );

    const song = rows[0];
    if (!song) notFound();

    return (
        <main>
            <article>
                <h1>{song.title}</h1>
                <p>Composer: {song.composer || "Unknown"}</p>
                <p>Genre: {song.style || "Unspecified"}</p>
                <p>Tempo: {song.tempo != null ? `${song.tempo} BPM` : "Unknown"}</p>
                <p>Key: {[song.key_tonic, song.key_mode].filter(Boolean).join(" ") || "Unknown"}</p>
                <p>Time signature: {song.time_numerator && song.time_denominator
                    ? `${song.time_numerator}/${song.time_denominator}`
                    : "Unknown"}</p>
                <p>Difficulty: {song.difficulty ?? "Unrated"}</p>
            </article>
        </main>
    );
}