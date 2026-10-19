"use client";
import { useActionState, useState } from "react";
import { login } from "./actions";
import styles from "./login.module.css";

const initialState = { error: "" };

export function PasswordField() {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <div className={styles.field}>
      <label className={styles.label} htmlFor="password">Password</label>
      <div className={styles.passwordRow}>
        <input
          id="password"
          name="password"
          type={showPassword ? "text" : "password"}
          required
          autoComplete="current-password"
        />
        <button
          type="button"
          onClick={() => setShowPassword((prev) => !prev)}
          aria-label={showPassword ? "Hide password" : "Show password"}
        >
          {showPassword ? "Hide" : "Show"}
        </button>
      </div>
    </div>
  );
}

export function LoginForm() {
  const [state, formAction, pending] = useActionState(login, initialState);

  return (
    <form action={formAction} className={styles.form}>
      <div className={styles.field}>
        <label className={styles.label} htmlFor="username">Username</label>
        <input id="username" name="username" type="text" required autoComplete="username" />
      </div>
      <PasswordField/>
      {state.error && <p className={styles.error}>{state.error}</p>}
      <button type="submit" disabled={pending}>
        {pending ? "Signing in…" : "Log in"}
      </button>
    </form>
  );
}

