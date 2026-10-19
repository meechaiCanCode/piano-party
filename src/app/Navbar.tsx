import Link from "next/link";
import styles from "./navbar.module.css";
import { getCurrentUserId } from "@/server/session";
import { getUsername } from "@/server/auth"

export async function Navbar(){
    const user_id = await getCurrentUserId();

    return (
        <div className={styles.navbar}>
          <Link href="/" className={styles.title}>Piano Party</Link>
          {user_id ? (
            <span className={styles.account}>{getUsername(user_id)}</span>    
          ) : (
            <Link href="/login" className={styles.account}>
              Login
            </Link>
          )}
        </div>
    );
}
