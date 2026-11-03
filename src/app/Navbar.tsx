import Link from "next/link";
import styles from "./navbar.module.css";
import { getCurrentUser } from "@/server/db/session";

export async function Navbar(){
  const user = await getCurrentUser();

  return (
      <div className={styles.navbar}>
        <Link href="/" className={styles.title}><img src="/images/logo-notext-white.svg" alt="Piano Party" />Piano Party</Link>
        <input type="text" className={styles.search} placeholder="Search Title, Composer, Genre" ></input>
        {user ? (
          <span className={styles.account}>{user.username}<img src="/images/burger.svg"/></span>    
        ) : (
            <div className={styles.authButtons}>
              <Link href="/signup" className={styles.account}>
                Signup
              </Link>
              
            <Link href="/login" className={styles.account}>
              Login
            </Link>
            </div>
        )}
      </div>
  );
}
