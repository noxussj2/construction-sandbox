import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "小小建造场",
  description: "在深色实木工作桌上探索持续运转的体素建筑工地，体验昼夜、天气与机械协作。",
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
