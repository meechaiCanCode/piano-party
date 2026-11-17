import { User } from "@/server/db/user";
import { PERMANENT_BAN } from "@/server/db/admin";
import { BanTime } from "./BanTime";
import styles from "./admin.module.css";

export function BannedList({ users }: { users: User[] }) {
  if (users.length === 0) return <p className={styles.label}>No users are currently banned.</p>;

  return (
    <div className={styles.bannedList}>
      <table className={styles.bannedTable}>
        <thead>
          <tr><th>User</th><th>until</th></tr>
        </thead>
        <tbody>
          {users.map((u) => (
            <tr key={u.id}>
              <td>{u.username}</td>
              <td>
                <BanTime
                  iso={u.banExpires!.toISOString()}
                  permanent={u.banExpires!.getTime() >= PERMANENT_BAN.getTime()}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
