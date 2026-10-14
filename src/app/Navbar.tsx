import Link from "next/link";
import styles from "./navbar.module.css";
import { getCurrentSession } from "@/server/db/session";
import { getUserByUserId } from "@/server/db/user";

export async function Navbar(){
  const session = await getCurrentSession();
  const user = await getUserByUserId(session.userId);

  return (
      <div className={styles.navbar}>
        <Link href="/" className={styles.title}>Piano Party</Link>
        {user ? (
          <span className={styles.account}>{user.username}</span>    
        ) : (
          <Link href="/login" className={styles.account}>
            Login
          </Link>
        )}
      </div>
  );
}
