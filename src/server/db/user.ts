import { pool } from "@/server/db";
import bcrypt from "bcryptjs";
import { DatabaseError } from "pg";

export type User = Readonly<{
    id : string,
    username : string,
    isAdmin : boolean
}>
export const FIELD_QUERY = "id, username, 'is_admin' AS isAdmin";
export const USER_QUERY = `SELECT ${FIELD_QUERY} FROM Users`;


export async function getUserByUsername(
  username: string | null
): Promise< User | null> {
  if (!username) 
    return null;
  
  const result = await pool.query<User>(`${USER_QUERY} WHERE username = $1`, [username]);
  return result.rows[0] ?? null;
}

export async function getUserByUserId(
  userId: string | null
): Promise< User | null> {
  if (!userId) 
    return null;

  const result = await pool.query<User>(`${USER_QUERY} WHERE id = $1`, [userId]);
  return result.rows[0] ?? null;
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