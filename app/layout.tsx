import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ほしいものマネージャー",
  description:
    "ほしいものを一度ためて、合計予算・必要度・期限を整理するための個人用ウィッシュリスト。衝動買いを抑え、購入の意思決定を助けます。",
  applicationName: "ほしいものマネージャー",
  appleWebApp: {
    capable: true,
    title: "ほしいもの",
    statusBarStyle: "default",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  // ズームは許可する（アクセシビリティのため無効化しない）
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f4f4f6" },
    { media: "(prefers-color-scheme: dark)", color: "#000000" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ja" className="h-full antialiased">
      <body className="min-h-full">{children}</body>
    </html>
  );
}
