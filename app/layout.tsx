import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SSHS Ambassadors",
  description: "서울과학고 학생홍보단의 캠퍼스 투어, 방문 설문, 부원 자료실",
  icons: { icon: "/favicon.svg", shortcut: "/favicon.svg" },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
