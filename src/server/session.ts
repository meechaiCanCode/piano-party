import { cookies } from "next/headers";
import { getSession} from "./auth";

export async function getCurrentUserId() : Promise<string | null> {
  const token = (await cookies()).get("session")?.value;
  if (!token) return null;

  const session = await getSession(token);
  if (!session) return null;

  return session.userId;
}
