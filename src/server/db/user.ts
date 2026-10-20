import { pool } from "@/server/db";
import bcrypt from "bcryptjs";
import { DatabaseError } from "pg";
import { Session } from "@/server/db/session"

export type User = Readonly<{
    id : string,
    username : string,
    isAdmin : boolean
}>
export const USER_FIELDS = `id, username, "is_admin" AS isAdmin`;
export const USER_QUERY = `SELECT ${USER_FIELDS} FROM Users`;

/**
 * Gets user from the DB using a given username.
 * @param username 
 * @returns A User object, null if nothing found
 */
export async function getUserByUsername(
  username: string | null
): Promise< User | null> {
  if (!username) 
    return null;

  const result = await pool.query<User>(`${USER_QUERY} WHERE username = $1`, [username]);
  return result.rows[0] ?? null;
}

/**
 * Gets user from the DB using a given ID.
 * @param userId 
 * @returns A User object, null if nothing found
 */
export async function getUserByUserId(
  userId: string | null
): Promise< User | null> {
  if (!userId) 
    return null;

  const result = await pool.query<User>(`${USER_QUERY} WHERE id = $1`, [userId]);
  return result.rows[0] ?? null;
}

/**
 * Gets the User object associated with a given Session object.
 * @param session 
 * @returns A User object, null if nothing found
 */
export async function getUserBySession(
  session: Session | null
): Promise< User | null> {
  if (!session) 
    return null;

  const result = await pool.query<User>(`${USER_QUERY} WHERE id = $1`, [session.userId]);
  return result.rows[0] ?? null;
}

/**
 * Creates a new user in the database with the given username and password hash.
 * @param username 
 * @param password 
 * @returns A User object for the newly created user.
 */
export async function createUser(username : string, password : string): Promise<string | null> {
  try {
    const passwordHash = await bcrypt.hash(password, 12);
    const result = await pool.query("INSERT INTO Users (username, password_hash) VALUES ($1, $2) RETURNING id", [username, passwordHash]);
    return result.rows[0];
  }
  catch (e) {
    if (e instanceof DatabaseError && e.code === "23505") {
      return null;
    }

    throw e;
  }
}