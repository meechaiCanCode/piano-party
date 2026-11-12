"use server";
import { getUserByUsername, isBanActive } from "@/server/db/user";
import { setUserBan, PERMANENT_BAN } from "@/server/db/admin";
import { getCurrentUser } from "@/server/db/session";
import { revalidatePath } from "next/cache";

export type BanState = { message: string; expires?: string | null };

function formatBanEnd(expires: string | null | undefined) {
  const dateFmt = new Intl.DateTimeFormat(undefined, {
    month: "numeric",
    day: "numeric",
    year: "numeric",     // full year: 3000, not 00
    hour: "numeric",
    minute: "2-digit",
  });
  if (expires === undefined) return "";
  if (expires === null) return " permanently";
  return `${dateFmt.format(new Date(expires))}`;
}

export async function ban(_prev: BanState, formData: FormData): Promise<BanState> {
    const username = formData.get("username") as string;

    const banner = await getCurrentUser();
    if (!banner?.isAdmin) {
      return { message: "You're not an admin!" };
    }
    if (username == banner.username) {
      return { message: "You can't ban yourself!" };
    }
    const target = await getUserByUsername(username);
    if (target?.isAdmin) {
          return { message: "Why would you ban an admin?" };
    }

    const raw = formData.get("expires") as string | null;
    const expiry = raw ? new Date(raw) : PERMANENT_BAN;
    if (isNaN(expiry.getTime())) return { message: "Invalid date." };
    if (expiry.getTime() <= Date.now()) return { message: "Ban end must be in the future." };

    const user = target && await setUserBan(target.id, expiry);
    revalidatePath("/admin");
    if (!user) return { message: `No user found with username "${username}".` };
  return { message: `Banned user "${user.username}"`, expires: raw ? expiry.toISOString() : null };
}

export async function unban(_prev: BanState, formData: FormData): Promise<BanState> {
  const username = formData.get("username") as string;
  const user = await getUserByUsername(username);
  const unbanner = await getCurrentUser();

  if (!unbanner?.isAdmin) {
    return { message: "You're not an admin!" };
  }
  if (!user) {
    return { message: `User "${username}" does not exist.` };
  }

  if (!user.banExpires) {
    return { message: `User "${username}" not banned.`}
  }
  const timeStr = formatBanEnd(user.banExpires.toISOString());
  if (!isBanActive(user)) {
    return {message: `User "${username}"'s ban has expired. (${timeStr})`}
  }

  const unbanned = await setUserBan(user.id, null);
  revalidatePath("/admin");
  if (!unbanned) return {message: `Could not unban "${username}".`}

  return { message: `User "${username}" unbanned.` };
}

export async function moderate(prev: BanState, formData: FormData): Promise<BanState> {
  return formData.get("intent") === "unban" ? unban(prev, formData) : ban(prev, formData);
}
