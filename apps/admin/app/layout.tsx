import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Idx Admin",
  description: "Operator console for document corpus and forms",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi">
      <body>{children}</body>
    </html>
  );
}