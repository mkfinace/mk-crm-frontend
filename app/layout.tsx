import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "MK Finance Cars",
  description: "New Car Website - MK Finance",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col font-sans">{children}</body>
    </html>
  );
}
