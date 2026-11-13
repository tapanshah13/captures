import type { Metadata } from "next";
import { Suspense } from "react";
import { connection } from "next/server";
import { Captures } from "@/components/captures";
import { photos, rolls } from "@/data/captures";
import { SITE_URL, SITE_TITLE, SITE_DESCRIPTION } from "@/data/site";

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };
export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const { photo: slug, trip: tripId, view } = await searchParams;
  const photo = photos.find((item) => item.slug === slug);
  const trip = (!view || view === "trips") ? rolls.find((item) => item.id === tripId && photos.some((frame) => frame.roll === item.id)) : undefined;
  const title = photo ? `${photo.title} — Captures — Tapan Shah` : trip ? `${trip.name} — Captures — Tapan Shah` : SITE_TITLE;
  const description = photo?.story || trip?.intro || SITE_DESCRIPTION;
  const canonical = new URL(SITE_URL);
  if (trip) {
    canonical.searchParams.set("view", "trips");
    canonical.searchParams.set("trip", trip.id);
  }
  if (photo) canonical.searchParams.set("photo", photo.slug);
  const images = [{
    url: trip ? `/share/trips/${encodeURIComponent(trip.id)}` : "/opengraph-image",
    width: 1200, height: 630,
    alt: trip ? `${trip.name} — Captures by Tapan Shah` : "Captures — Tapan Shah. Three pinned photographs in tilted polaroid frames.",
  }];
  return {
    title, description,
    alternates: { canonical: canonical.toString() },
    openGraph: { title, description, type: "website", siteName: "Captures", url: canonical.toString(), images },
    twitter: { card: "summary_large_image", title, description, images },
  };
}
export default function Page() {
  return <><Suspense fallback={<main className="wrap py-14" aria-busy="true">Loading Captures…</main>}><Captures /></Suspense><Suspense fallback={null}><PhotoMetadataRequest /></Suspense></>;
}

// Cache Components requires an explicit request boundary for URL-specific metadata.
async function PhotoMetadataRequest() {
  await connection();
  return null;
}
