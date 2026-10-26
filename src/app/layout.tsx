import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "M-Game Blockchain — 2D Turn-based RPG (Web2-first)",
  description:
    "เกม RPG ออนไลน์บนเบราว์เซอร์ พร้อมสถาปัตยกรรมสำหรับพาไป Kub Chain (EVM) ในอนาคต",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="th">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Kanit:wght@400;600;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
