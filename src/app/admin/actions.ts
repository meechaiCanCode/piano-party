"use server";
import {banUser} from "@/server/db/user";

export type BanState = { message: string };

export async function ban(_prev: BanState, formData: FormData): Promise<BanState> {
    const username = formData.get("username") as string;

    const user = await banUser(username);

    if (!user) return { message: `No user found with username "${username}".` };
    return { message: `Banned user "${user.username}" (id: ${user.id}).` };
}
