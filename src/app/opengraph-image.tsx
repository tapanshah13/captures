import { renderShareImage } from "@/lib/share-image";

export const alt = "Captures — Tapan Shah. Three pinned photographs in tilted polaroid frames.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OpenGraphImage() {
  return renderShareImage();
}
