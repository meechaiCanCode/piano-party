import {AdminPage} from "./AdminPage";
import styles from "./admin.module.css";

export default function AdminDashboard(){
    return(
        <main className={styles.page}>
            <AdminPage/>
        </main>
    );
}
