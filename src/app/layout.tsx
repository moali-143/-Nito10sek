import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "10 sekunder på instinkt",
  description: "Test tidsfølelsen din: stopp klokken så nær 10 sekunder du kan.",
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="nb">
      <body>{children}</body>
    </html>
  );
}
