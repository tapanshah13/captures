import type { Metadata, Viewport } from "next";
import { GeistSans } from "geist/font/sans";
import type { CSSProperties } from "react";
import { SITE_URL, SITE_TITLE, SITE_DESCRIPTION } from "@/data/site";
import { PALETTE, PALETTE_COLORS } from "@/data/captures";
import { GeistSerifTriangle } from "geist/font/serif/triangle";
import { GeistMono } from "geist/font/mono";
import { Caveat } from "next/font/google";
import "./globals.css";

const caveat = Caveat({ variable: "--font-caveat", subsets: ["latin"], weight: "500", display: "swap" });
export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: SITE_TITLE,
  description: SITE_DESCRIPTION,
  alternates: { canonical: SITE_URL },
  openGraph: { type: "website", siteName: "Captures", title: SITE_TITLE, description: SITE_DESCRIPTION, url: SITE_URL },
  twitter: { card: "summary_large_image", title: SITE_TITLE, description: SITE_DESCRIPTION },
};
export const viewport: Viewport = {
  colorScheme: "light dark",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: PALETTE_COLORS.light.bg },
    { media: "(prefers-color-scheme: dark)", color: PALETTE_COLORS.dark.bg },
  ],
};

// Runs before body paint; storage failure must not prevent system-theme selection.
const themeScript = `(function(){
  var media=window.matchMedia('(prefers-color-scheme: dark)'),chosen=null;
  try{var saved=localStorage.getItem('captures-theme');if(saved==='light'||saved==='dark')chosen=saved;}catch(e){}
  function apply(){var theme=chosen||(media.matches?'dark':'light');document.documentElement.dataset.theme=theme;
    document.querySelectorAll('meta[name="theme-color"]').forEach(function(meta){meta.content=theme==='light'?'${PALETTE_COLORS.light.bg}':'${PALETTE_COLORS.dark.bg}';});}
  apply();
  document.addEventListener('DOMContentLoaded',apply,{once:true});
  media.addEventListener('change',function(){if(!chosen)apply();});
  window.addEventListener('captures-theme-change',function(event){chosen=event.detail;apply();});
  window.addEventListener('storage',function(event){if(event.key==='captures-theme'||event.key===null){chosen=event.newValue==='light'||event.newValue==='dark'?event.newValue:null;apply();}});
})();`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="en" data-palette={PALETTE} style={{ "--palette-dark-bg": PALETTE_COLORS.dark.bg, "--palette-light-bg": PALETTE_COLORS.light.bg, "--palette-dark-accent": PALETTE_COLORS.dark.accent, "--palette-light-accent": PALETTE_COLORS.light.accent, "--palette-dark-text": PALETTE_COLORS.dark.text, "--palette-light-text": PALETTE_COLORS.light.text } as CSSProperties} suppressHydrationWarning className={`${GeistSans.variable} ${GeistMono.variable} ${GeistSerifTriangle.variable} ${caveat.variable}`}><head><script dangerouslySetInnerHTML={{ __html: themeScript }} /></head><body suppressHydrationWarning>{children}</body></html>;
}
