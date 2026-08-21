import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SSHS Ambassadors",
  description: "Connecting SSHS to the World: The Voice of Korea’s Young Scientists",
  other: { "codex-preview": "development" },
  icons: { icon: "/favicon.svg", shortcut: "/favicon.svg" },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
