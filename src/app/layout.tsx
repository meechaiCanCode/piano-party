import type { Metadata } from "next";
import "./globals.css";
import {Navbar} from "./Navbar";
import { Fraunces, IBM_Plex_Sans } from "next/font/google";

export const metadata: Metadata = {
  title: "Piano Party",
  description: "Learn piano with gamified sheet-music playing on the web.",
}

const display = Fraunces({ subsets: ["latin"], weight: ["500", "600"], variable: "--font-display" });
const body = IBM_Plex_Sans({ subsets: ["latin"], weight: ["400", "500", "600"], variable: "--font-body" });

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${display.variable} ${body.variable}`}>
      <body>
        <Navbar/>
        {children}
      </body>
    </html>
  );
}
