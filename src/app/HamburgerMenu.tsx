import Link from "next/link";
import styles from "./navbar.module.css";
import { logout } from "./logout/actions";

export function HamburgerMenu({ username, isAdmin }: { username: string; isAdmin: boolean }) {
  return (
    <div className={styles.authButtons}>
      <a className={styles.account}  href="/profile">{username}</a>
      <button id={styles.popover}  popoverTarget="account-menu" className={styles.account}>
        <img src="/images/burger.svg" alt="" />
      </button>
      <nav id="account-menu" popover="auto" className={styles.dropdown}>
        <a href="/profile">Profile</a>
        <a href="/settings">Settings</a>
        {isAdmin && <a href="/admin">Admin Dashboard</a>}
        <form action={logout}>
          <button type="submit">Log out</button>
        </form>
      </nav>
    </div>
  );
}
