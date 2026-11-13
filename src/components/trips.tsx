"use client";

import { useLayoutEffect, useState } from "react";
import Link from "next/link";
import { photos, rolls, tripDateRange, type Photo } from "@/data/captures";
import { PhotoImage } from "./photo-image";

const newestPhotoDate = (id: string) => Math.max(0, ...photos.filter((photo) => photo.roll === id).map((photo) => Date.parse(photo.date) || 0));
const trips = rolls.filter((trip) => photos.some((photo) => photo.roll === trip.id))
  .sort((a, b) => newestPhotoDate(b.id) - newestPhotoDate(a.id));
const tripUrl = (id: string) => `/?view=trips&trip=${encodeURIComponent(id)}`;

export function Trips({ tripId, open }: { tripId: string | null; open: (photo: Photo) => void }) {
  const trip = trips.find((item) => item.id === tripId);
  if (!trip) return <section className="trips-enter" aria-label="Trips">
    {tripId && <p className="trip-missing">That trip isn’t here. Explore the trips below.</p>}
    <div className="trips-grid">{trips.map((item, index) => {
      const frames = photos.filter((photo) => photo.roll === item.id);
      const cover = frames.find((photo) => photo.slug === item.cover) ?? frames[0];
      return <Link className="trip-card" href={tripUrl(item.id)} key={item.id}>
        <div className="trip-cover">
          <PhotoImage photo={cover} objectPosition={item.coverPosition} sizes="(width < 600px) calc(100vw - 40px), (width < 860px) calc((100vw - 58px) / 2), (max-width: 1080px) calc((100vw - 76px) / 3), 335px" />
          <div className="trip-cover-caption"><h3>{item.name} <span aria-hidden="true">▲</span></h3><p>{tripDateRange(item.id)} · {frames.length} frames</p></div>
          <div className="trip-thumbs" aria-hidden="true">{[...frames.filter((photo) => photo.slug !== cover.slug), cover].slice(0, 3).map((photo) => <div className="trip-thumb" key={photo.slug}><PhotoImage photo={photo} sizes="34px" decorative /></div>)}</div>
        </div>
        <div className="trip-card-note"><p>{item.tagline}</p><span className="trip-stamp">{item.place.split(/[,·&]/)[0].trim()}<br />trip {String(index + 1).padStart(2, "0")}</span></div>
      </Link>;
    })}</div>
  </section>;

  const frames = photos.filter((photo) => photo.roll === trip.id)
    .sort((a, b) => (Date.parse(a.date) || 0) - (Date.parse(b.date) || 0));
  const cover = frames.find((photo) => photo.slug === trip.cover) ?? frames[0];
  const dates = tripDateRange(trip.id);
  const cameras = [...new Set(frames.map((photo) => photo.exif?.camera).filter((camera): camera is string => !!camera?.trim()))];
  const index = trips.indexOf(trip);
  const previous = trips[(index - 1 + trips.length) % trips.length];
  const next = trips[(index + 1) % trips.length];
  return <article className="trip-page trips-enter" aria-labelledby="trip-title">
    <Link className="trip-back" href="/?view=trips">← all trips</Link>
    <div className="trip-cover trip-hero">
      <PhotoImage photo={cover} objectPosition={trip.coverPosition} sizes="(max-width: 1080px) calc(100vw - 40px), 1040px" loading="eager" />
      <div className="trip-cover-caption"><h2 id="trip-title">{trip.name} <span aria-hidden="true">▲</span></h2><p>{trip.place} · {dates}</p></div>
    </div>
    <div className="trip-context"><p className="trip-intro">{trip.intro}</p><dl className="trip-facts">
      <div><dt>Photos</dt><dd>{frames.length} frames</dd></div>
      <div><dt>Dates</dt><dd>{dates}</dd></div>
      <div><dt>Camera</dt><dd>{cameras.join(" · ") || "Not recorded"}</dd></div>
    </dl></div>
    <TripMasonry frames={frames} open={open} />
    {trips.length > 1 && <nav className="trip-pagination" aria-label="Trip navigation"><Link href={tripUrl(previous.id)} aria-label={`Previous trip: ${previous.name}`}>← previous trip<span>{previous.name}</span></Link><Link href={tripUrl(next.id)} aria-label={`Next trip: ${next.name}`}>next trip →<span>{next.name}</span></Link></nav>}
  </article>;
}

function useTripColumns() {
  const [count, setCount] = useState<number | null>(null);
  useLayoutEffect(() => {
    const mobile = window.matchMedia("(width < 600px)");
    const tablet = window.matchMedia("(width < 860px)");
    const update = () => setCount(mobile.matches ? 1 : tablet.matches ? 2 : 3);
    update();
    mobile.addEventListener("change", update);
    tablet.addEventListener("change", update);
    return () => {
      mobile.removeEventListener("change", update);
      tablet.removeEventListener("change", update);
    };
  }, []);
  return count;
}

function TripMasonry({ frames, open }: { frames: Photo[]; open: (photo: Photo) => void }) {
  const columnCount = useTripColumns();
  // CSS selects the correct server-rendered layout before hydration, avoiding a
  // visible three-column-to-mobile rearrangement. Keep only that layout afterward.
  const layouts = columnCount === null ? [3, 2, 1] : [columnCount];
  return <>{layouts.map((count) => {
    const columns: { photo: Photo; frameIndex: number }[][] = Array.from({ length: Math.min(count, frames.length) }, () => []);
    const heights = columns.map(() => 0);
    frames.forEach((photo, frameIndex) => {
      const shortest = heights.indexOf(Math.min(...heights));
      columns[shortest].push({ photo, frameIndex });
      // Normalize a ~33px caption and 20px gap to a typical 334px column.
      heights[shortest] += (photo.height ?? 2) / (photo.width ?? 3) + 53 / 334;
    });
    return <div className={`trip-masonry trip-masonry-${count}`} key={count}>
      {columns.map((column, index) => <div className="trip-photo-column" key={index}>
        {column.map(({ photo, frameIndex }) => <button className="trip-frame" key={photo.slug} onClick={() => open(photo)} aria-label={`Open ${photo.title}, frame ${String(frameIndex + 1).padStart(2, "0")}A`}>
          <div style={{ aspectRatio: `${photo.width ?? 3} / ${photo.height ?? 2}` }}><PhotoImage photo={photo} sizes="(width < 600px) calc(100vw - 40px), (width < 860px) calc((100vw - 60px) / 2), (max-width: 1080px) calc((100vw - 80px) / 3), 334px" /></div>
          <span className="trip-frame-caption"><span>{photo.title}</span><small>{String(frameIndex + 1).padStart(2, "0")}A</small></span>
        </button>)}
      </div>)}
    </div>;
  })}</>;
}
