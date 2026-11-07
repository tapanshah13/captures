import type { Metadata, Viewport } from "next";
import { GeistSans } from "geist/font/sans";
import { PALETTE } from "@/data/captures";
import { GeistSerifTriangle } from "geist/font/serif/triangle";
import { GeistMono } from "geist/font/mono";
import { Caveat } from "next/font/google";
import "./globals.css";

const caveat = Caveat({ variable: "--font-caveat", subsets: ["latin"], weight: "500", display: "swap" });
export const metadata: Metadata = {
  title: "Captures · Tapan Shah",
  description: "Things I noticed, mostly on the way somewhere else. Photographs and stories by Tapan Shah.",
};
export const viewport: Viewport = {
  colorScheme: "light dark",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f7f1ee" },
    { media: "(prefers-color-scheme: dark)", color: "#100c0b" },
  ],
};

// Runs before body paint; storage failure must not prevent system-theme selection.
const themeScript = `(function(){
  var media=window.matchMedia('(prefers-color-scheme: dark)'),chosen=null;
  try{var saved=localStorage.getItem('captures-theme');if(saved==='light'||saved==='dark')chosen=saved;}catch(e){}
  function apply(){var theme=chosen||(media.matches?'dark':'light');document.documentElement.dataset.theme=theme;
    document.querySelectorAll('meta[name="theme-color"]').forEach(function(meta){meta.content=theme==='light'?'#f7f1ee':'#100c0b';});}
  apply();
  document.addEventListener('DOMContentLoaded',apply,{once:true});
  media.addEventListener('change',function(){if(!chosen)apply();});
  window.addEventListener('captures-theme-change',function(event){chosen=event.detail;apply();});
  window.addEventListener('storage',function(event){if(event.key==='captures-theme'||event.key===null){chosen=event.newValue==='light'||event.newValue==='dark'?event.newValue:null;apply();}});
})();`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="en" data-palette={PALETTE} suppressHydrationWarning className={`${GeistSans.variable} ${GeistMono.variable} ${GeistSerifTriangle.variable} ${caveat.variable}`}><head><script dangerouslySetInnerHTML={{ __html: themeScript }} /></head><body suppressHydrationWarning>{children}</body></html>;
}
