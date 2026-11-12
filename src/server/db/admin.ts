import { pool } from "@/server/db";
import { getUserByUserId, isBanActive, User, USER_FIELDS } from "./user";

/**
 * Checks if a given user is banned. Users are considered banned if their banExpires field is set to a future date. They are considered unbanned if their banExpires field is set to a past date or null.
 * @param userId User to check
 * @returns True if the user is banned, false otherwise. Null if no user was found
 */
export async function isUserBanned(userId : string | null) : Promise<boolean | null> {
  if (!userId)
    return null;
  const user = await getUserByUserId(userId);
  if (!user)
    return null;
  return isBanActive(user);
}

/**
 * Bans a given user. More recent ban sentences will overwrite older bans.
 * @param userId User to ban
 * @param banExpiry Time until the end of a user's ban. Set to null to remove the ban.
 * @returns Banned user, null if no user was found or operation was unsuccessful
 */
export async function setUserBan(userId: string | null, banExpiry : Date | null) : Promise<User | null> {
  if (!userId)
    return null;
  const result = await pool.query<User>(`UPDATE Users SET ban_expires = $1 WHERE id = $2 RETURNING ${USER_FIELDS}`, [banExpiry, userId]);
  return result.rows[0] ?? null;
}