"use server";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { deleteSession } from "@/server/db/session";

export async function logout() {
  const cookie = await cookies();
  const token = cookie.get("session")?.value;
  if (token) await deleteSession(token);
  cookie.delete("session");
  revalidatePath("/", "layout"); // refresh the navbar
  redirect("/");
}
