import Link from "next/link";
import styles from "./navbar.module.css";
import { getCurrentUser } from "@/server/db/session";
import { HamburgerMenu } from "./HamburgerMenu";

export async function Navbar(){
  const user = await getCurrentUser();

  return (
      <div className={styles.navbar}>
      <Link href={user ? "/home" : "/"} className={styles.title}><img src="/images/logo-notext-white.svg" alt="Piano Party" />Piano Party</Link>
        <input type="text" className={styles.search} placeholder="Search Title, Composer, Genre" ></input>
        {user ? (
        <div className={styles.userActions}>
          <span className={styles.streak}>
            <img src={user.streak > 0 ? "/images/Streak.svg" : "/images/InactiveStreak.svg"} alt="Streak" />
            {user.streak}
          </span>
          <HamburgerMenu username={user.username} isAdmin={user.isAdmin}/>
        </div>
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
