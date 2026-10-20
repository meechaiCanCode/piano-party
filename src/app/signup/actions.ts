"use server";
import { redirect } from "next/navigation";
import { createUser } from "@/server/db/user";

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

    const trimUser = username.trim();

    if (trimUser.length < 3) {
        return { error: "Username must be at least 3 characters long." };
    }

    if (password.length < 8) {
        return { error: "Password must be at least 8 characters long." };
    }

    if (password !== confirmPassword) {
        return { error: "Passwords do not match." };
    }

    const user = await createUser(trimUser, password);

    if (!user) {
        return { error: "Username already exists." };
    }

    redirect("/login");
}