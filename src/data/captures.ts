import importedData from "./photos.json";

// Table background. Options: mat, linen. Will be controlled from the admin panel later.
export const TABLE_SURFACE: "mat" | "linen" = "mat";

export type Photo = {
  slug: string;
  title: string;
  place: string;
  date: string;
  story: string;
  roll: string;
  collections: string[];
  favorite?: boolean;
  hash?: string;
  src?: string;
  sizes?: Record<640 | 1280 | 2048, string>;
  width?: number;
  height?: number;
  blurDataURL?: string;
  exif?: { camera?: string; lens?: string; aperture?: string; shutter?: string; iso?: number | string };
};

export type Roll = { id: string; name: string; meta: string };

const importedPhotos: Photo[] = importedData;
const drafts = importedPhotos.filter((photo) => photo.title === "TODO");
if (process.env.NODE_ENV === "development" && drafts.length) {
  console.warn(`[Captures] ${drafts.length} unpublished photo(s) with TODO titles: ${drafts.map((photo) => photo.slug).join(", ")}`);
}
// A manifest containing only drafts intentionally produces an empty gallery.
export const photos: Photo[] = importedPhotos.filter((photo) => photo.title !== "TODO");

function rollMeta(id: string, number: number) {
  const dates = photos.filter((photo) => photo.roll === id)
    .map((photo) => new Date(photo.date.slice(0, 10) + "T00:00:00Z"))
    .filter((date) => Number.isFinite(date.getTime()))
    .sort((a, b) => a.getTime() - b.getTime());
  const format = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });
  const first = dates[0];
  const last = dates[dates.length - 1];
  const range = first ? (first.getTime() === last.getTime() ? format.format(first) : `${format.format(first)} – ${format.format(last)}`) : "Date not set";
  return `${range} · ROLL ${String(number).padStart(2, "0")}`;
}

export const rolls: Roll[] = [
  { id: "yosemite", name: "Yosemite", meta: rollMeta("yosemite", 1) },
  { id: "coast", name: "Saltwater Hours", meta: rollMeta("coast", 2) },
  { id: "yard", name: "Around the Block", meta: rollMeta("yard", 3) },
  { id: "postcards", name: "Postcards", meta: rollMeta("postcards", 4) }
];

// Preserve the capture's local wall time regardless of the viewer's timezone.
export function photoDate(date: string) {
  const wallTime = new Date(date.slice(0, 19) + "Z");
  if (!Number.isFinite(wallTime.getTime())) return "Date not set";
  const day = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" }).format(wallTime);
  const time = new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit", timeZone: "UTC" }).format(wallTime);
  return `${day} · ${time}`;
}

export function frameNumber(photo: Photo) {
  return `${String(photos.findIndex((item) => item.slug === photo.slug) + 1).padStart(2, "0")}A`;
}
