import type { Metadata } from "next";
import { Suspense } from "react";
import { connection } from "next/server";
import { Captures } from "@/components/captures";
import { photos } from "@/data/captures";

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };
export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const { photo: slug } = await searchParams;
  const photo = photos.find((item) => item.slug === slug);
  return photo
    ? { title: `${photo.title} · Captures · Tapan Shah`, description: photo.story }
    : { title: "Captures · Tapan Shah", description: "Things I noticed, mostly on the way somewhere else. Photographs and stories by Tapan Shah." };
}
export default function Page() {
  return <><Suspense fallback={<main className="wrap py-14" aria-busy="true">Loading Captures…</main>}><Captures /></Suspense><Suspense fallback={null}><PhotoMetadataRequest /></Suspense></>;
}

// Cache Components requires an explicit request boundary for URL-specific metadata.
async function PhotoMetadataRequest() {
  await connection();
  return null;
}
