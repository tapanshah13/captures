import importedData from "./photos.json";

// Site palette. Options: darkroom. See docs/palettes/ for saved palettes like golden-hour.
export const PALETTE = "darkroom" as const;

// Table background. Options: mat (green cutting mat), mat-tinted (palette-tinted mat), linen (palette-tinted woven cloth). See docs/palettes/golden-hour.md → Table surfaces.
export const TABLE_SURFACE: "mat" | "mat-tinted" | "linen" = "mat-tinted";
export const SHOW_ROLLS = false; // Rolls view kept for later; set true to show the tab.

export type Photo = {
  slug: string;
  title: string;
  place: string;
  date: string;
  story: string;
  roll: string;
  collections: string[];
  favorite?: boolean;
  pinned?: boolean;
  hash?: string;
  src?: string;
  sizes?: Record<640 | 1280 | 2048, string>;
  width?: number;
  height?: number;
  blurDataURL?: string;
  exif?: { camera?: string; lens?: string; aperture?: string; shutter?: string; iso?: number | string };
};

export type Roll = { id: string; name: string; meta: string; place: string; tagline: string; intro: string; cover: string };

const importedPhotos: Photo[] = importedData;
const drafts = importedPhotos.filter((photo) => photo.title === "TODO");
if (process.env.NODE_ENV === "development" && drafts.length) {
  console.warn(`[Captures] ${drafts.length} unpublished photo(s) with TODO titles: ${drafts.map((photo) => photo.slug).join(", ")}`);
}
// A manifest containing only drafts intentionally produces an empty gallery.
export const photos: Photo[] = importedPhotos.filter((photo) => photo.title !== "TODO");

export function tripDateRange(id: string) {
  const dates = photos.filter((photo) => photo.roll === id)
    .map((photo) => new Date(photo.date.slice(0, 10) + "T00:00:00Z"))
    .filter((date) => Number.isFinite(date.getTime()))
    .sort((a, b) => a.getTime() - b.getTime());
  const format = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });
  const first = dates[0];
  const last = dates[dates.length - 1];
  const range = first ? (first.getTime() === last.getTime() ? format.format(first) : `${format.format(first)} – ${format.format(last)}`) : "Date not set";
  return range;
}

function rollMeta(id: string, number: number) {
  return `${tripDateRange(id)} · ROLL ${String(number).padStart(2, "0")}`;
}

export const rolls: Roll[] = [
  { id: "yosemite", name: "Yosemite", meta: rollMeta("yosemite", 1), place: "California, USA", tagline: "Three days, one granite wall, a lot of waterfalls.", intro: "Three days, one granite wall, a lot of waterfalls. Snow on the peaks, mist on my hoodie, and the same view everyone takes. Worth it every time.", cover: "img-0469" },
  { id: "coast", name: "Saltwater Hours", meta: rollMeta("coast", 2), place: "SoCal coast", tagline: "Not one trip — a habit.", intro: "Not one trip — a habit. Most evenings that ended near the ocean, waiting for the sun to do its thing and everyone else to stop and watch.", cover: "img-1784" },
  { id: "yard", name: "Around the Block", meta: rollMeta("yard", 3), place: "Long Beach & LA", tagline: "Skies from parking lots, street corners and the walk out of class.", intro: "Skies from parking lots, street corners and the walk out of class. Proof you don't need to travel for a good sunset.", cover: "img-5603" },
  { id: "postcards", name: "Postcards", meta: rollMeta("postcards", 4), place: "Everywhere", tagline: "One-offs from far away.", intro: "One-offs from far away. A beer flight by the water in Seattle, a lake sunset back home in Udaipur.", cover: "img-4679" },
  { id: "pnw", name: "Pacific Northwest", meta: rollMeta("pnw", 5), place: "Washington", tagline: "Waterfalls, glacier lakes and one very famous market.", intro: "Waterfalls, glacier lakes and one very famous market. Rainier wearing a cloud hat, Diablo Lake doing its unreal blue, and neon at Pike Place after closing.", cover: "img-1814" },
  { id: "chicago", name: "Chicago", meta: rollMeta("chicago", 6), place: "Chicago, IL", tagline: "Tall buildings, long sunsets, one coffee flight.", intro: "Tall buildings, long sunsets, one coffee flight. The grid lighting up from 100 floors, and rush hour that looked better than it felt.", cover: "img-4663" },
  { id: "tahoe", name: "Lake Tahoe", meta: rollMeta("tahoe", 7), place: "Lake Tahoe, CA", tagline: "Water this blue shouldn't be legal.", intro: "Water this blue shouldn't be legal. Emerald Bay through the pines, one tiny island, and a sign that was very clear about the dress code.", cover: "img-7302" },
  { id: "river", name: "River Evenings", meta: rollMeta("river", 8), place: "Northern California", tagline: "Slow rivers, loud sunsets.", intro: "Slow rivers, loud sunsets. A red footbridge, an old iron one, and a sky that kept changing its mind.", cover: "img-5644" },
  { id: "sedona", name: "Sedona", meta: rollMeta("sedona", 9), place: "Sedona, AZ", tagline: "Red rocks, big sky, no subtlety.", intro: "Red rocks, big sky, no subtlety. Cathedral Rock in the afternoon, then a sunset that split in two behind the ridge.", cover: "img-1474" },
  { id: "disney", name: "Disneyland", meta: rollMeta("disney", 10), place: "Anaheim, CA", tagline: "Mickey never sleeps.", intro: "Mickey never sleeps. Pixar Pier at night, lit up like a birthday cake.", cover: "img-3563" }
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
