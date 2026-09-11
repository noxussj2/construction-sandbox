import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "筑城之间 · 微缩建筑工地",
  description: "五名工人自动协作建造一栋小楼。观察取料、施工、休息与交付。",
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
