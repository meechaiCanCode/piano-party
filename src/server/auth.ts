import { pool } from "@/server/db";
import bcrypt from "bcryptjs";
import { DatabaseError } from "pg";

/**
 * Retrieves the user UUID from the DB, given a valid username.
 * @param username 
 * @returns User UUID if found, null otherwise
 */
export async function findUserByUsername(
  username: string
): Promise<{ id : string, passwordHash : string } | null> {
  const result = await pool.query("SELECT id, password_hash AS \"passwordHash\" FROM Users WHERE username = $1", [username]);

  if (!result.rows[0])
    return null;
  return result.rows[0];
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
 * Gets the session associated with the given token.
 * @param token 
 * @returns An object containing the user id, when the session was created, and when it expires
 */
export async function getSession(
  token: string
): Promise<{ userId : string , timeCreated : Date, timeExpires: Date} | null > {
  const result = await pool.query<{ userId : string , timeCreated : Date, timeExpires: Date}>(
    "SELECT user_id AS \"userId\", time_created AS \"timeCreated\", time_expires AS \"timeExpires\" FROM Sessions WHERE token = $1", [token]
  );
  const sessionData = result.rows[0];

  if (!sessionData)
    return null;
  return sessionData;
}

/**
 * Gets the username of the associated user id.
 * @param userId 
 * @returns username, or null if no user is found
 */
export async function getUsername(userId : string): Promise<string | null> {
  const result = await pool.query("SELECT username FROM Users WHERE id = $1", [userId]);

  if (!result.rows[0])
    return null;
  return result.rows[0].username;
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

/**
 * Creates a new user in the database with the given username and password hash.
 * @param username 
 * @param passwordHash 
 * @returns The newly created user's id
 */
export async function createUser(username : string, password : string): Promise<string | null> {
  try {
    const passwordHash = await bcrypt.hash(password, 12);
    const result = await pool.query("INSERT INTO Users (username, password_hash) VALUES ($1, $2) RETURNING id", [username, passwordHash]);
    return result.rows[0].id;
  }
  catch (e) {
    if (e instanceof DatabaseError && e.code === "23505") {
      return null;
    }

    throw e;
  }
}