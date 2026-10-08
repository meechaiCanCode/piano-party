import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Piano Party",
  description: "Learn piano with gamified sheet-music playing on the web.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
