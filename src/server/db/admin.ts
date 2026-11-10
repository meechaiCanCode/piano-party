import { pool } from "@/server/db";
import { getUserByUserId, User, USER_FIELDS } from "./user";

export async function isUserBanned(userId : string | null) : Promise<boolean | null> {
  if (!userId)
    return null;
  const user = await getUserByUserId(userId);
  if (!user)
    return null;
  return !!user.banExpires && user.banExpires.getTime() > Date.now();
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