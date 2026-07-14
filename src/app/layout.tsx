import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { PwaRegister } from "@/components/pwa-register";
import "./globals.css";

import { BottomNav } from "@/components/bottom-nav";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "RallyTrack",
  description:
    "Digitális tripmaster veterán autós túrákhoz: túrakövetés, trip számláló, itiner és stopper — offline is.",
};

export const viewport: Viewport = {
  themeColor: "#fafafa",
  // Extend under the home indicator so the bottom nav's safe-area padding applies.
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="hu"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full bg-zinc-50 text-zinc-900">
        <PwaRegister />
        {/* App shell: single mobile column; bottom padding keeps content clear of the fixed nav. */}
        <main className="mx-auto min-h-dvh w-full max-w-md px-4 pb-28">
          {children}
        </main>
        <BottomNav />
      </body>
    </html>
  );
}
