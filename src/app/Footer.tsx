import Link from "next/link";
import styles from "./footer.module.css";
import { getCurrentUser } from "@/server/db/session";

export async function Footer(){
  const user = await getCurrentUser();

  return (
      <div className={styles.footer}>
        <span>© {new Date().getFullYear()} The Note Nerds</span>

        <nav className={styles.links} aria-label="Footer">
            <Link href="/privacy">Privacy Policy</Link>
            <Link href="/terms">Terms of Service</Link>
            <Link href="/contact">Contact</Link>
        </nav>
      </div>
  );
}
