"use client";

import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { photos, SHOW_DRIFT_WALL, type Photo } from "@/data/captures";
import { PhotoImage } from "./photo-image";

const GAP = 3;
const capturedAt = (photo: Photo) => Date.parse(photo.date) || 0;
const newest = [...photos].sort((a, b) => capturedAt(b) - capturedAt(a));
const ratio = (photo: Photo) => Math.max(.5, Math.min(2.5, (photo.width || 1) / (photo.height || 1)));
type Tile = { photo: Photo; x: number; y: number; width: number; height: number };
type Open = (photo: Photo, source: HTMLElement) => void;
const tileDateFormat = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });

function tileDate(value: string) {
  if (!value) return "";
  const date = new Date(`${value.slice(0, 10)}T00:00:00Z`);
  return Number.isFinite(date.getTime()) ? tileDateFormat.format(date).toLowerCase() : "";
}

// Consume chronological runs; all rows use the image ratios, never equal columns.
function layout(width: number, target: number) {
  const tiles: Tile[] = [];
  let index = 0, y = 0, featureCount = 0;
  function takeRow(start: number, available: number) {
    let end = start, sum = 0;
    while (end < newest.length) {
      sum += ratio(newest[end++]);
      if (sum * target + GAP * (end - start - 1) >= available) break;
    }
    return { start, end, sum, gaps: GAP * (end - start - 1) };
  }
  function placeRow(row: ReturnType<typeof takeRow>, x: number, top: number, available: number, height: number) {
    for (let i = row.start; i < row.end; i++) {
      const tileWidth = ratio(newest[i]) * height;
      tiles.push({ photo: newest[i], x, y: top, width: Math.min(tileWidth, available), height });
      x += tileWidth + GAP;
    }
  }
  while (index < newest.length && width > 0) {
    const photo = newest[index];
    const r = ratio(photo);
    const expectedBig = r * (2 * target + GAP);
    if (photo.favorite && newest.length - index >= 6 && expectedBig <= width * .55) {
      const side = width - expectedBig - GAP;
      const first = takeRow(index + 1, side);
      const second = takeRow(first.end, side);
      if (second.end > second.start) {
        // Solve the shared width so both justified rows and the favorite end together.
        const shared = (width - GAP - r * GAP + r * (first.gaps / first.sum + second.gaps / second.sum))
          / (1 + r * (1 / first.sum + 1 / second.sum));
        const h1 = (shared - first.gaps) / first.sum;
        const h2 = (shared - second.gaps) / second.sum;
        const height = h1 + GAP + h2;
        const bigWidth = height * r;
        if (h1 > 0 && h2 > 0 && bigWidth <= width * .55 && (second.end < newest.length || Math.max(h1, h2) <= target)) {
          const right = featureCount++ % 2 === 1;
          tiles.push({ photo, x: right ? shared + GAP : 0, y, width: bigWidth, height });
          const sideX = right ? 0 : bigWidth + GAP;
          placeRow(first, sideX, y, shared, h1);
          placeRow(second, sideX, y + h1 + GAP, shared, h2);
          index = second.end;
          y += height + GAP;
          continue;
        }
      }
    }
    const row = takeRow(index, width);
    const fitted = (width - row.gaps) / row.sum;
    const fill = (row.sum * target + row.gaps) / width;
    const height = row.end === newest.length && fill < .75 ? Math.min(target, fitted) : fitted;
    placeRow(row, 0, y, width, height);
    index = row.end;
    y += height + GAP;
  }
  const height = Math.max(0, y - GAP);
  const bottomRight = Math.max(0, ...tiles.filter((tile) => Math.abs(tile.y + tile.height - height) < .01).map((tile) => tile.x + tile.width));
  return { tiles, height, bottomRight };
}

function PhotoTile({ photo, open, style, duplicate = false, wall = false }: {
  photo: Photo; open: Open; style?: CSSProperties; duplicate?: boolean; wall?: boolean;
}) {
  const date = wall ? "" : tileDate(photo.date);
  return <button type="button" className="everything-tile" style={style}
    tabIndex={duplicate ? -1 : 0} aria-hidden={duplicate ? true : undefined} aria-label={`view ${photo.title}${photo.favorite ? ", favorite" : ""}`}
    onClick={(event) => open(photo, event.currentTarget)}>
    <div className="everything-image-clip"><PhotoImage photo={photo} decorative={duplicate} sizes={wall ? "(max-width: 760px) 215px, 358px" : `${Math.ceil(Number(style?.width) || 640)}px`} loading={wall ? "eager" : "lazy"} /></div>
    {date && <time className="everything-date" dateTime={photo.date.slice(0, 10)}>{date}</time>}
  </button>;
}

export function Dump({ open, photoOpen }: { open: Open; photoOpen: boolean }) {
  const container = useRef<HTMLDivElement>(null);
  const selection = useRef<Photo[] | null>(null);
  const [wallPhotos, setWallPhotos] = useState<Photo[]>([]);
  const [size, setSize] = useState({ width: 0, rowHeight: 170 });
  useEffect(() => {
    if (!SHOW_DRIFT_WALL) return;
    if (!selection.current) {
      const fill = photos.filter((photo) => !photo.favorite);
      for (let i = fill.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [fill[i], fill[j]] = [fill[j], fill[i]];
      }
      selection.current = [...photos.filter((photo) => photo.favorite), ...fill].slice(0, 40);
    }
    setWallPhotos(selection.current);
  }, []);
  useEffect(() => {
    const element = container.current;
    if (!element) return;
    const mobile = window.matchMedia("(max-width: 760px)");
    const measure = () => {
      const width = element.clientWidth, rowHeight = mobile.matches ? 110 : 170;
      setSize((previous) => previous.width === width && previous.rowHeight === rowHeight ? previous : { width, rowHeight });
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    mobile.addEventListener("change", measure);
    return () => { observer.disconnect(); mobile.removeEventListener("change", measure); };
  }, []);
  const bento = useMemo(() => layout(size.width, size.rowHeight), [size]);
  return <section className="everything" aria-label="Dump">
    {SHOW_DRIFT_WALL && <div className={`everything-wall${photoOpen ? " is-paused" : ""}`}>
      <div className="everything-lanes">
        {[0, 1, 2, 3].map((lane) => {
          const items = wallPhotos.filter((_, index) => index % 4 === lane);
          const laneHeight = (size.rowHeight === 110 ? [67, 86, 67, 56] : [112, 143, 112, 93])[lane];
          const runWidth = items.reduce((sum, photo) => sum + ratio(photo) * laneHeight + 10, 0);
          // Repeat short lanes within each half so the loop never exposes a blank edge.
          const repeats = runWidth ? Math.max(1, Math.ceil(size.width / runWidth)) : 1;
          return <div className={`everything-lane everything-lane-${lane}`} key={lane}>
            <div className="everything-track">
              {[0, 1].map((copy) => <div className="everything-lane-copy" key={copy} aria-hidden={copy === 1 ? true : undefined}>
                {Array.from({ length: repeats }, (_, repeat) => items.map((photo) => <PhotoTile key={`${repeat}-${photo.slug}`} photo={photo} open={open} wall duplicate={copy === 1 || repeat > 0} style={{ aspectRatio: ratio(photo) }} />))}
              </div>)}
            </div>
          </div>;
        })}
      </div>
      <div className="everything-wall-title"><h2>Dump<span aria-hidden="true">▲</span></h2><p>hover to pause</p></div>
      <a className="everything-scroll" href="#everything-all">scroll for all {photos.length} ↓</a>
    </div>}
    <div ref={container} id="everything-all" className="everything-bento" style={{ height: bento.height }}>
      {bento.tiles.map((tile) => <PhotoTile key={tile.photo.slug} photo={tile.photo} open={open}
        style={{ left: tile.x, top: tile.y, width: tile.width, height: tile.height,
          borderBottomRightRadius: Math.abs(tile.y + tile.height - bento.height) < .01 && Math.abs(tile.x + tile.width - bento.bottomRight) < .01 ? 10 : undefined }} />)}
    </div>
  </section>;
}
