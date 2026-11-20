"use client";

import Link from "next/link";
import styles from "./navbar.module.css";
import { User } from "@/server/db/user";
import { HamburgerMenu } from "../HamburgerMenu";
import { useRouter } from "next/navigation"

export function Navbar({ user }: { user: User | null }){
  const router = useRouter();

  function search(query : string)
  {
    router.push(`/home?search=${query}`);
  }

  return (
      <div className={styles.navbar}>
      <Link href={user ? "/home" : "/"} className={styles.title}><img src="/images/logo-notext-white.svg" alt="Piano Party" />Piano Party</Link>
        <input type="text" className={styles.search} placeholder="Search Title, Composer, Genre" 
        onKeyDown={(e)=> {
          if (e.key == "Enter") {
            search(e.currentTarget.value);
          }
        }}
        ></input>
        {user ? (
        <HamburgerMenu username={user.username} isAdmin={user.isAdmin}/>
        ) : (
            <div className={styles.authButtons}>
              <Link href="/signup" className={styles.account}>
                Signup
              </Link>

            <Link href="/login" className={styles.account}>
              Login
            </Link>
          </div>
        )}
      </div>
  );
}
