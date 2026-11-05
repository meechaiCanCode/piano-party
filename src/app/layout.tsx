import type { Metadata } from "next";
import "./globals.css";
import {Navbar} from "./Navbar";
import {Footer} from "./Footer";

import "@fontsource/cascadia-mono/400.css";
import "@fontsource/cascadia-mono/500.css";
import "@fontsource/cascadia-mono/600.css";
import "@fontsource/fraunces/500.css";
import "@fontsource/fraunces/600.css";

export const metadata: Metadata = {
  title: "Piano Party",
  description: "Learn piano with gamified sheet-music playing on the web.",
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <Navbar/>
        {children}
        <Footer/>
      </body>
    </html>
  );
}
