import { getCurrentUser } from "@/server/db/session"
import styles from "./admin.module.css";
import { BanForm } from "./BanForm";

export async function AdminPage() {
    const user = await getCurrentUser();
    if(user && user.isAdmin){
        return (
            <div className={styles.card}>
                <h1>Hello {user.username}!</h1>
                <p>Welcome to your admin dashboard</p>
                <BanForm/>
            </div>
        );
    } else {
        return (
            <p className={styles.card}>You're not an admin. It was worth a shot, though!</p>
        );
    }
  
}

