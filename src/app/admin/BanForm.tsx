"use client";
import { useActionState } from "react";
import { ban, BanState } from "./actions";
import styles from "./admin.module.css";

const initialState: BanState = { message: "" };

export function BanForm() {
  const [state, formAction, pending] = useActionState(ban, initialState);

  return (
    <form action={formAction} className={styles.form}>
      <div className={styles.field}>
        <label className={styles.label} htmlFor="username">Ban user</label>
        <input id="username" name="username" type="text" required />
      </div>
      <button type="submit" className={styles.ban} disabled={pending}>
        {pending ? "Banning…" : "Ban"}
      </button>
      <p style={{ visibility: state.message ? "visible" : "hidden"}} className={styles.error}>{state.message}</p>
    </form>
  );
}
