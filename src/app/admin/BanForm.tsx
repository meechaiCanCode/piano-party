"use client";
import { useActionState } from "react";
import { moderate, BanState} from "./actions";
import styles from "./admin.module.css";

const initialState: BanState = { message: "" };

function formatBanEnd(expires: string | null | undefined) {
  const dateFmt = new Intl.DateTimeFormat(undefined, {
    dateStyle: "short",   // "11/12/2026"
    timeStyle: "short",    // "1:24 PM"
  });
  if (expires === undefined) return "";
  if (expires === null) return " permanently";
  return ` until ${dateFmt.format(new Date(expires))}`;
}

export function BanForm() {
  const [state, formAction, pending] = useActionState(moderate, initialState);

  return (
    <form action={formAction} className={styles.form}>
        <div className={styles.row}>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="username">Ban user</label>
            <input id="username" name="username" type="text" required />
          </div>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="expires">until</label>
            <input id="expires" name="expires" type="datetime-local" />
          </div>
      </div>
      <div className={styles.row}>
        <button type="submit" name="intent" value="ban" className={styles.ban} disabled={pending}>
          {pending ? "Banning…" : "Ban"}
        </button>
        <button type="submit" name="intent" value="unban" className={styles.unban} disabled={pending}>
          {pending ? "Unbanning…" : "Unban"}
        </button>
      </div>
      <p style={{ visibility: state.message ? "visible" : "hidden" }} className={styles.error}>{state.message}{formatBanEnd(state.expires)}</p>
    </form>
  );
}
