import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "HotSeat — Verbal Assessment",
  description: "Formative verbal assessment tool for college courses",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-[#0a0e14] text-slate-200 antialiased">
        {children}
      </body>
    </html>
  );
}
