import type { Metadata } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import { Caveat } from "next/font/google";
import "./globals.css";

const caveat = Caveat({ variable: "--font-caveat", subsets: ["latin"], weight: "500", display: "swap" });
export const metadata: Metadata = {
  title: "Captures · Tapan Shah",
  description: "Things I noticed, mostly on the way somewhere else. Photographs and stories by Tapan Shah.",
};
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="en" className={`dark ${GeistSans.variable} ${GeistMono.variable} ${caveat.variable}`}><body>{children}</body></html>;
}
