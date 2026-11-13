import Link from "next/link";

export default function NotFound() {
  return <main className="wrap not-found">
    <p className="not-found-code">404 · Captures</p>
    <h1>Lost the negative<span className="hero-dot">.</span></h1>
    <p>This frame isn’t here.</p>
    <Link href="/">← Back to Captures</Link>
  </main>;
}
