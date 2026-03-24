import type { Metadata } from "next";
import { Cormorant_Garamond, Inter } from "next/font/google";
import { Theme } from "@radix-ui/themes";
import "@radix-ui/themes/styles.css";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap"
});

const cormorant = Cormorant_Garamond({
  subsets: ["latin"],
  variable: "--font-cormorant",
  weight: ["400", "500", "600"],
  display: "swap"
});

export const metadata: Metadata = {
  title: "mivo",
  description: "AI-powered editorial content studio"
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body suppressHydrationWarning className={`${inter.variable} ${cormorant.variable} grain`}>
        <Theme appearance="dark" accentColor="jade" grayColor="sage" radius="none" scaling="100%">
          {children}
        </Theme>
      </body>
    </html>
  );
}
