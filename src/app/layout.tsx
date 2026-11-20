import type { Metadata } from "next";
import "./globals.css";
import {Navbar} from "./navbar/Navbar";
import {Footer} from "./Footer";
import { Cascadia_Mono, Fraunces, IBM_Plex_Sans } from "next/font/google";
import { getCurrentUser } from "@/server/db/session";

export const metadata: Metadata = {
  title: "Piano Party",
  description: "Learn piano with gamified sheet-music playing on the web.",
}

const display = Fraunces({ subsets: ["latin"], weight: ["500", "600"], variable: "--font-display" });
const body = Cascadia_Mono({ subsets: ["latin"], weight: ["400", "500", "600"], variable: "--font-body" });

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const currentUser = await getCurrentUser();

  return (
    <html lang="en" className={`${display.variable} ${body.variable}`}>
      <body>
        <Navbar user={currentUser}/>
        {children}
        <Footer/>
      </body>
    </html>
  );
}
