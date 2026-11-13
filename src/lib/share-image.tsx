import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { PALETTE_COLORS, photos, photoAlt, type Photo, type Roll } from "@/data/captures";

export const shareSize = { width: 1200, height: 630 };
const font = readFile(join(process.cwd(), "src/assets/share/GeistSerif-Triangle.ttf"));

async function sharePhoto(photo: Photo) {
  "use cache";
  const bytes = await readFile(join(process.cwd(), "src/assets/share", `${photo.slug}.jpg`));
  return `data:image/jpeg;base64,${bytes.toString("base64")}`;
}

export async function renderShareImage(trip?: Roll) {
  const frames = trip ? photos.filter((photo) => photo.roll === trip.id) : [];
  const selected = trip
    ? [frames.find((photo) => photo.slug === trip.cover) ?? frames[0]].filter((photo): photo is Photo => !!photo)
    : photos.filter((photo) => photo.pinned).slice(0, 3);
  const [fontData, sources] = await Promise.all([font, Promise.all(selected.map(sharePhoto))]);
  const colors = PALETTE_COLORS.dark;
  return new ImageResponse(
    <div style={{ display: "flex", width: "100%", height: "100%", background: colors.bg, color: colors.text, fontFamily: "Geist Serif Triangle", position: "relative", overflow: "hidden" }}>
      <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", width: 650, padding: "64px 0 64px 64px" }}>
        {trip && <div style={{ display: "flex", fontSize: 25, marginBottom: 24 }}>Captures · Tapan Shah</div>}
        <div style={{ display: "flex", alignItems: "baseline", fontSize: trip ? 76 : 100, lineHeight: 1.05, letterSpacing: "-3px", flexWrap: "wrap" }}>
          {trip?.name ?? "Captures"}<span style={{ color: colors.accent, fontSize: 28, marginLeft: 8 }}>▲</span>
        </div>
        <div style={{ display: "flex", fontSize: 27, lineHeight: 1.4, marginTop: 28, maxWidth: 465 }}>{trip?.tagline ?? "Things I noticed, mostly on the way somewhere else."}</div>
        <div style={{ display: "flex", fontSize: 20, marginTop: 40, color: colors.accent }}>captures.tapanshah.me</div>
      </div>
      {selected.map((photo, index) => {
        const width = trip ? 420 : 245;
        const imageHeight = trip ? 370 : 245;
        return <div key={photo.slug} style={{ display: "flex", flexDirection: "column", position: "absolute", left: trip ? 715 : [690, 870, 765][index], top: trip ? 98 : [70, 185, 325][index], padding: "12px 12px 42px", background: "#f4f1ea", boxShadow: "0 12px 28px rgba(0,0,0,.4)", transform: `rotate(${trip ? 5 : [-11, 10, -4][index]}deg)` }}>
          {/* eslint-disable-next-line @next/next/no-img-element -- Satori renders embedded image bytes. */}
          <img src={sources[index]} alt={photoAlt(photo)} width={width - 24} height={imageHeight} style={{ objectFit: "cover", objectPosition: trip?.coverPosition ?? "center" }} />
        </div>;
      })}
    </div>,
    { ...shareSize, fonts: [{ name: "Geist Serif Triangle", data: Uint8Array.from(fontData).buffer, weight: 400, style: "normal" }], headers: { "Cache-Control": "public, max-age=3600, s-maxage=86400" } },
  );
}
