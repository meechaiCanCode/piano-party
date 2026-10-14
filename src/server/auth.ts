import { pool } from "@/server/db";
import { User, FIELD_QUERY } from "@/server/db/user";
import { DatabaseError } from "pg";

export type UserWithHash = Readonly<User & {passwordHash : string}>

/**
 * Retrieves the user UUID from the DB, given a valid username.
 * @param username 
 * @returns User UUID if found, null otherwise
 */
export async function findUserWithHashByUsername(
  username: string
): Promise<UserWithHash | null> {
  const result = await pool.query(`SELECT ${FIELD_QUERY}, password_hash AS 'passwordHash' FROM Users WHERE username = $1`, [username]);
  return result.rows[0] ?? null;
}