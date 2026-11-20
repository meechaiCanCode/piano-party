import { getCurrentUser } from "@/server/db/session"
import styles from "./admin.module.css";
import { BanForm } from "./BanForm";
import { BannedList } from "./BannedList";
import { getBannedUsers } from "@/server/db/admin";

export async function AdminPage() {
    const user = await getCurrentUser();
  if (user && user.isAdmin) {
    const banned = await getBannedUsers();
        return (
            <div className={styles.card}>
                <h1>Hello {user.username}!</h1>
                <p>Welcome to your admin dashboard</p>
                <p className={styles.hint}>(Empty date gives perma-bans)</p>
                <BanForm />
                <h2>Banned users</h2>
                <BannedList users={banned} />
            </div>
        );
    } else {
        return (
            <p className={styles.card}>You&apos;re not an admin. It was worth a shot, though!</p>
        );
    }
}
