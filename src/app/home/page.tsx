import Link from "next/link";
import { pool } from "@/server/db";
import styles from "./page.module.css";

type Song = {
    id: number;
    title: string;
    composer: string | null;
    style: string | null;
};

export default async function Home({ searchParams, }: {
    searchParams: Promise<{ page?: string }>; }) {

    const params = await searchParams;
    const requestedPage = Number(params.page);
    const page = requestedPage > 0 ? requestedPage : 1;

    const { rows: songs } = await pool.query<Song>(
        `SELECT id, title, composer, style
        FROM songs
        ORDER BY id
        LIMIT 21 OFFSET $1`,
        [(page - 1) * 20]
    );

    return (
        <main className={styles.page}>
            <h1>Browse Songs</h1>

            <div className={styles.grid}>
                {songs.slice(0, 20).map((song) => (
                    <article key={song.id} className={styles.card}>
                        <h2>{song.title}</h2>
                        <p>{song.composer || "Unknown composer"}</p>
                        <p>{song.style || "Unspecified genre"}</p>
                    </article>
                ))}
            </div>

            <nav className={styles.pages}>
                {page > 1 && (<Link href={`/home?page=${page - 1}`}>Previous</Link>)}

                <span>Page {page}</span>
                
                {songs.length > 20 && (<Link href={`/home?page=${page + 1}`}>Next</Link>)}
            </nav>
        </main>
    );
}