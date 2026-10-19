"use server";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import { findUserByUsername, createSession } from "@/server/auth";

type State = { error: string };

export async function login(_prev: State, formData: FormData): Promise<State> {
  const username = formData.get("username") as string;
  const password = formData.get("password") as string;

  const user = await findUserByUsername(username);
  if (!user) return { error: "Invalid username or password" };

  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) return { error: "Invalid username or password" };

  const token = await createSession(user.id);

  (await cookies()).set("session", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });

  redirect("/");
}
