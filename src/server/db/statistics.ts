import { DatabaseError } from "pg"
import { pool } from "@/server/db"
import { getCurrentUser } from "./session"

export type AttemptConstructor = {
    songId : number,

    songCompleted : boolean,
    timePlayed : Date,

    score : number,
    notesHit : number,
    notesMissed : number,
    notesIncorrect : number
}

export type Attempt = Readonly<AttemptConstructor & {
    id : number,
    userId : string
}>

export const ATTEMPT_FIELDS = `id, user_id AS "userId", song_id AS "songId", song_completed AS "songCompleted", time_played AS "timePlayed", score, notes_hit AS "notesHit", notes_missed AS "notesMissed", notes_incorrect AS "notesIncorrect"`

/**
 * Logs a new song attempt into the DB as the currently logged in user
 * @param newAttempt 
 * @returns The newly created attempt, or an error message explaining why the attempt was not stored.
 */
export async function logAttempt(attempt : AttemptConstructor): Promise<Attempt | string> 
{
    const currentUser = await getCurrentUser()
    if (!currentUser)
        return "User is not logged in";
    if (attempt.score < 0)
        return "Score is negative";
    if (!Number.isInteger(attempt.notesHit) || attempt.notesHit < 0)
        return "Notes hit is not a positive integer";
    if (!Number.isInteger(attempt.notesMissed) || attempt.notesHit < 0)
        return "Notes missed is not a positive integer";
    if (!Number.isInteger(attempt.notesHit) || attempt.notesHit < 0)
        return "Notes incorrect is not a positive integer";
    try {
        const result = await pool.query(
            `INSERT INTO Attempts (user_id, song_id, song_completed, time_played, score, notes_hit, notes_missed, notes_incorrect) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING ${ATTEMPT_FIELDS}`,
            [
                currentUser.id, 
                attempt.songId,
                attempt.songCompleted, 
                attempt.timePlayed, 
                attempt.score, 
                attempt.notesHit, 
                attempt.notesMissed, 
                attempt.notesIncorrect
            ]);

        return result.rows[0];
    }
    catch (e) {
        if (e instanceof DatabaseError)
        {
            if (e.code === "23503") {
                return "Song id not found in database"
            }
            if (e.code === "23502") {
                return "One or more fields were null or undefined"
            }
        }
        throw e;
    }
}

export async function getAttemptsByUser(userId : string | null) : Promise<Attempt[]>
{
    if (!userId)
        return [];
    const result = await pool.query("SELECT * FROM Attempts WHERE user_id = $1", [userId]);
    return result.rows;
}