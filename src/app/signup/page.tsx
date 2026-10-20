import { SignupForm } from "./SignupForm";
import styles from "./signup.module.css";

export default function SignupPage() {
    return (
        <main className = {styles.page}>
            <div className = {styles.card}>
                <h1 className = {styles.title}>Piano Party</h1>
                <SignupForm/>
            </div>
        </main>
    );
}