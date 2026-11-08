import Link from "next/link";
import { photos, rolls, tripDateRange, frameNumber, type Photo } from "@/data/captures";
import { PhotoImage } from "./photo-image";

const newestPhotoDate = (id: string) => Math.max(0, ...photos.filter((photo) => photo.roll === id).map((photo) => Date.parse(photo.date) || 0));
const trips = rolls.filter((trip) => photos.some((photo) => photo.roll === trip.id))
  .sort((a, b) => newestPhotoDate(b.id) - newestPhotoDate(a.id));
const tripUrl = (id: string) => `/?view=trips&trip=${encodeURIComponent(id)}`;

export function Trips({ tripId, open }: { tripId: string | null; open: (photo: Photo) => void }) {
  const trip = trips.find((item) => item.id === tripId);
  if (!trip) return <section className="trips-enter" aria-labelledby="trips-heading">
    <div className="section-h"><h2 id="trips-heading">Trips</h2><span>{trips.length} stories · {photos.length} frames</span></div>
    {tripId && <p className="trip-missing">That trip isn’t here. Explore the trips below.</p>}
    <div className="trips-grid">{trips.map((item, index) => {
      const frames = photos.filter((photo) => photo.roll === item.id);
      const cover = frames.find((photo) => photo.slug === item.cover) ?? frames[0];
      return <Link className="trip-card" href={tripUrl(item.id)} key={item.id}>
        <div className="trip-cover">
          <PhotoImage photo={cover} sizes="(max-width: 760px) calc(100vw - 40px), 510px" />
          <div className="trip-cover-caption"><h3>{item.name} <span aria-hidden="true">▲</span></h3><p>{tripDateRange(item.id)} · {frames.length} frames</p></div>
          <div className="trip-thumbs" aria-hidden="true">{frames.filter((photo) => photo.slug !== cover.slug).slice(0, 3).map((photo) => <div className="trip-thumb" key={photo.slug}><PhotoImage photo={photo} sizes="64px" /></div>)}</div>
        </div>
        <div className="trip-card-note"><p>{item.tagline}</p><span className="trip-stamp">{item.place.split(/[,·&]/)[0].trim()}<br />trip {String(index + 1).padStart(2, "0")}</span></div>
      </Link>;
    })}</div>
  </section>;

  const frames = photos.filter((photo) => photo.roll === trip.id);
  const cover = frames.find((photo) => photo.slug === trip.cover) ?? frames[0];
  const dates = tripDateRange(trip.id);
  const cameras = [...new Set(frames.map((photo) => photo.exif?.camera).filter((camera): camera is string => !!camera?.trim()))];
  const index = trips.indexOf(trip);
  const previous = trips[(index - 1 + trips.length) % trips.length];
  const next = trips[(index + 1) % trips.length];
  return <article className="trip-page trips-enter" aria-labelledby="trip-title">
    <Link className="trip-back" href="/?view=trips">← all trips</Link>
    <div className="trip-cover trip-hero">
      <PhotoImage photo={cover} sizes="(max-width: 1080px) calc(100vw - 40px), 1040px" loading="eager" />
      <div className="trip-cover-caption"><h2 id="trip-title">{trip.name} <span aria-hidden="true">▲</span></h2><p>{trip.place} · {dates}</p></div>
    </div>
    <div className="trip-context"><p className="trip-intro">{trip.intro}</p><dl className="trip-facts">
      <div><dt>Photos</dt><dd>{frames.length} frames</dd></div>
      <div><dt>Dates</dt><dd>{dates}</dd></div>
      <div><dt>Camera</dt><dd>{cameras.join(" · ") || "Not recorded"}</dd></div>
    </dl></div>
    <div className="trip-masonry">{frames.map((photo) => <button className="trip-frame" key={photo.slug} onClick={() => open(photo)} aria-label={`Open ${photo.title}, frame ${frameNumber(photo)}`}>
      <div style={{ aspectRatio: `${photo.width ?? 3} / ${photo.height ?? 2}` }}><PhotoImage photo={photo} sizes="(max-width: 480px) calc(100vw - 40px), (max-width: 760px) calc((100vw - 60px) / 2), 334px" /></div>
      <span className="trip-frame-caption"><span>{photo.title}</span><small>{frameNumber(photo)}</small></span>
    </button>)}</div>
    {trips.length > 1 && <nav className="trip-pagination" aria-label="Trip navigation"><Link href={tripUrl(previous.id)} aria-label={`Previous trip: ${previous.name}`}>← previous trip<span>{previous.name}</span></Link><Link href={tripUrl(next.id)} aria-label={`Next trip: ${next.name}`}>next trip →<span>{next.name}</span></Link></nav>}
  </article>;
}
