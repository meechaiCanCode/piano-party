import { cookies } from "next/headers";
import { pool } from "@/server/db";
import { User, getUserBySession } from "./user";

export type Session = Readonly<{
  token : string,
  userId : string,
  timeCreated : Date,
  timeExpires : Date
}>
const SESSION_QUERY = `SELECT token, user_id AS "userId", time_created AS "timeCreated", time_expires AS "timeExpires" FROM Sessions`;

/**
 * Gets the session associated with the given token.
 * @param token 
 * @returns A Session object
 */
export async function getSessionByToken(
  token: string | null
): Promise< Session | null > {
  if (!token)
    return null

  const result = await pool.query<Session>(`${SESSION_QUERY} WHERE token = $1`, [token]);
  return result.rows[0] ?? null;
}

export async function getCurrentSession() : Promise<Session | null> {
  const token = (await cookies()).get("session")?.value;
  return await getSessionByToken(token ?? null) ?? null
}

export async function getCurrentUser() : Promise< User | null> {
  const user = await getUserBySession(await getCurrentSession());
  return user ?? null
}

/**
 * Creates a session for a given userId.
 * @param userId User to create a session for
 * @returns Token of newly created session
 */
export async function createSession(userId: string): Promise<string> {
  const result = await pool.query("INSERT INTO Sessions (user_id) VALUES ($1) RETURNING token", [userId]);

  return result.rows[0].token;
}

/**
 * Deletes the session associated with the given token.
 * @param token 
 */
export async function deleteSession(token: string): Promise<void> {
  pool.query("DELETE FROM Sessions WHERE token = $1", [token]);
}

/**
 * Deletes expired sessions from the DB.
 */
export async function pruneSessions(): Promise<void> {
  pool.query("DELETE FROM Sessions WHERE time_expires < now()")
}