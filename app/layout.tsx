import type { Metadata } from "next";
import {
  Cormorant_Garamond,
  Geist,
  Geist_Mono,
  Newsreader,
} from "next/font/google";
import { Theme } from "@radix-ui/themes";
import "@radix-ui/themes/styles.css";
import "./globals.css";

const geist = Geist({
  subsets: ["latin"],
  variable: "--font-ui",
  display: "swap",
});

const geistMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
});

const newsreader = Newsreader({
  subsets: ["latin"],
  variable: "--font-display",
  weight: ["400", "500", "600"],
  display: "swap",
});

const cormorant = Cormorant_Garamond({
  subsets: ["latin"],
  variable: "--font-brand",
  weight: ["400", "500", "600"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Mivo",
  description: "AI-powered editorial content studio",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        suppressHydrationWarning
        className={`${geist.variable} ${geistMono.variable} ${newsreader.variable} ${cormorant.variable} grain`}
      >
        <Theme
          appearance="dark"
          accentColor="jade"
          grayColor="sage"
          radius="medium"
          scaling="100%"
        >
          {children}
        </Theme>
      </body>
    </html>
  );
}
