import { DatabaseError } from "pg"
import { pool } from "../db"
import { getCurrentUser } from "./session"

export type AttemptConstructor = {
    songId : number,

    songCompleted : boolean,
    timePlayed : Date,

    score : number,
    notesHit : number,
    notesMissed : number,
    notesIncorrect : number,
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
export async function logNewAttempt(newAttempt : AttemptConstructor): Promise<Attempt | string> 
{
    const currentUser = await getCurrentUser()
    if (!currentUser)
        return "User is not logged in";
    if (newAttempt.score < 0)
        return "Score is negative";
    if (!Number.isInteger(newAttempt.notesHit) || newAttempt.notesHit < 0)
        return "Notes hit is not a positive integer";
    if (!Number.isInteger(newAttempt.notesMissed) || newAttempt.notesHit < 0)
        return "Notes missed is not a positive integer";
    if (!Number.isInteger(newAttempt.notesHit) || newAttempt.notesHit < 0)
        return "Notes incorrect is not a positive integer";
    try {
        const result = await pool.query(`INSERT INTO Attempts (user_id, song_id, song_completed, time_played, score, notes_hit, notes_missed, notes_incorrect) RETURNING ${ATTEMPT_FIELDS}`)
        return result.rows[0]
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