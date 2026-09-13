import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "第五顶安全帽",
  description: "五顶安全帽，一栋慢慢盖起的小楼。",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body className="antialiased">{children}</body>
    </html>
  );
}
