"use server";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createUser } from "@/server/db/user";
import { createSession } from "@/server/db/session";

type State = { error: string };

export async function signup(_prev: State, formData: FormData): Promise<State> {
    const username = formData.get("username");
    const password = formData.get("password");
    const confirmPassword = formData.get("confirmPassword");

    if (typeof username !== "string" ||
        typeof password !== "string" ||
        typeof confirmPassword !== "string"
    ) {
        return { error: "Invalid form data" };
    }

    if (username.length < 3) {
        return { error: "Username must be at least 3 characters long." };
    }

    if (!/^[a-zA-Z0-9_]+$/.test(username)) {
        return { error: "Username can only contain letters, numbers, and underscores." };
    }

    if (password.length < 8) {
        return { error: "Password must be at least 8 characters long." };
    }

    if (password !== confirmPassword) {
        return { error: "Passwords do not match." };
    }

    const user = await createUser(username, password);

    if (!user) {
        return { error: "Username already exists." };
    }

    const token = (await createSession(user.id)).token;

      (await cookies()).set("session", token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: 60 * 60 * 24 * 7,
    });
    
    redirect("/");
}