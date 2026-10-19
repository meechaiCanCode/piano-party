import { LoginForm } from "./LoginForm";
import styles from "./login.module.css";

export default function LoginPage() {
  return (
    <main className={styles.page}>
        <div className={styles.card}>
          <h1 className={styles.title}>Piano Party</h1>
          <LoginForm/>
        </div>
    </main>
  );
}
