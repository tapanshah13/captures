"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState, type PointerEvent } from "react";
import { flushSync } from "react-dom";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Trips } from "./trips";
import { Dump } from "./dump";
import { PrintTable } from "./print-table";
import { ThemeToggle } from "./theme-toggle";
import { BrandMark } from "./brand-mark";
import { PhotoImage } from "./photo-image";
import { transitionPhoto, restoreTransitionPrint } from "./photo-transition";
import { PhotoDialog } from "./photo-dialog";
import { TABLE_SURFACE, SHOW_ROLLS, SHOW_CONTACT_SHEET, photos, rolls, photoDate, frameNumber, type Photo, type Roll } from "@/data/captures";

const cityLabels: Record<string, string> = {
  "Rakkan Ramen": "Long Beach",
  "Starbucks Reserve, Chicago": "Chicago",
  "Willis Tower, Chicago": "Chicago",
  "360 Chicago, IL": "Chicago",
  "Disney California Adventure": "Anaheim",
  "Secret Cove, Lake Tahoe": "Lake Tahoe",
  "Emerald Bay, Lake Tahoe": "Lake Tahoe",
  "Santa Monica Pier": "Santa Monica",
  "LA Memorial Coliseum": "Los Angeles",
  "Hollywood, Los Angeles": "Los Angeles",
  "San Pedro, Los Angeles": "Los Angeles",
  "South Bay, Los Angeles": "Los Angeles",
  "Pike Place Market, Seattle": "Seattle",
  "Jewel Changi, Singapore": "Singapore",
  "Yosemite National Park": "Yosemite",
  "Southern California coast": "SoCal coast",
};
const cityPlace = (place: string) => cityLabels[place] ?? place.split(",")[0].trim();
const placeCounts = new Map<string, number>();
for (const photo of photos) {
  const city = cityPlace(photo.place);
  if (city && city.toUpperCase() !== "TODO") placeCounts.set(city, (placeCounts.get(city) ?? 0) + 1);
}
const commonPlaces = [...placeCounts.keys()].sort((a, b) => placeCounts.get(b)! - placeCounts.get(a)! || a.localeCompare(b));

type View = "table" | "trips" | "rolls" | "sheet" | "dump";
const activeRolls = rolls.filter((roll) => photos.some((photo) => photo.roll === roll.id));
function PhotoCount() {
  const countRef = useRef<HTMLSpanElement>(null);
  useLayoutEffect(() => {
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const element = countRef.current;
    if (!element || motion.matches || photos.length === 0) return;
    let current = 0;
    element.textContent = "0";
    const timer = setInterval(() => {
      element.textContent = String(++current);
      if (current >= photos.length) clearInterval(timer);
    }, 45);
    const finish = () => {
      if (motion.matches) { clearInterval(timer); element.textContent = String(photos.length); }
    };
    motion.addEventListener("change", finish);
    return () => { clearInterval(timer); motion.removeEventListener("change", finish); };
  }, []);
  return <><span ref={countRef} aria-hidden="true">{photos.length}</span><span className="sr-only">{photos.length}</span></>;
}

export function Captures() {
  const router = useRouter();
  const search = useSearchParams();
  const rawView = search.get("view");
  const tripId = search.get("trip");
  const view: View = rawView === "rolls" ? (SHOW_ROLLS ? "rolls" : "dump")
    : rawView === "all" ? (SHOW_CONTACT_SHEET ? "sheet" : "dump")
    : rawView === "dump" || rawView === "everything" || rawView === "sheet" ? "dump"
    : rawView === "trips" || (!rawView && tripId) ? "trips" : "table";
  const isTripPage = view === "trips" && !!tripId;
  useEffect(() => {
    if (isTripPage) window.scrollTo({ top: 0, left: 0, behavior: "instant" });
  }, [isTripPage, tripId]);
  const routePhoto = photos.find((item) => item.slug === search.get("photo"));
  const [closingPhoto, setClosingPhoto] = useState<Photo>();
  const photo = routePhoto ?? closingPhoto;
  const openedHere = useRef(false);
  const transitionBusy = useRef(false);
  const activeTransition = useRef<Promise<void>>(Promise.resolve());
  const closing = useRef(false);
  const ownHistoryBack = useRef(false);
  useEffect(() => () => restoreTransitionPrint(), []);
  const originPrint = useRef<HTMLElement | null>(null);
  const lastFocus = useRef<HTMLElement | null>(null);
  const url = useCallback((changes: Record<string, string | null>) => {
    const params = new URLSearchParams(search.toString());
    params.set("view", view);
    for (const [key, value] of Object.entries(changes)) {
      if (value === null) params.delete(key); else params.set(key, value);
    }
    return `/?${params.toString()}`;
  }, [search, view]);
  useEffect(() => {
    if (rawView !== view) router.replace(url({ view }), { scroll: false });
  }, [rawView, view, router, url]);
  const open = (item: Photo, source?: HTMLElement) => {
    if (transitionBusy.current) return;
    lastFocus.current = source ?? document.activeElement as HTMLElement;
    const print = view === "sheet" || view === "trips" ? null : lastFocus.current?.closest<HTMLElement>(".pile-print, .everything-tile");
    originPrint.current = print && !print.classList.contains("is-flipped") ? print.querySelector<HTMLElement>(".photo-image") : null;
    openedHere.current = true;
    transitionBusy.current = true;
    activeTransition.current = transitionPhoto(() => {
      // Native history is integrated with useSearchParams by the App Router.
      window.history.pushState(null, "", url({ photo: item.slug }));
    }, originPrint.current, true).finally(() => { transitionBusy.current = closing.current; });
  };
  const close = useCallback((fromHistory = false) => {
    if (!photo || closing.current || (transitionBusy.current && !fromHistory)) return;
    closing.current = true;
    // Set in the close/popstate event, before the URL update can unmount the dialog.
    flushSync(() => setClosingPhoto(photo));
    const opening = activeTransition.current;
    transitionBusy.current = true;
    activeTransition.current = opening.then(() => transitionPhoto(async () => {
      if (!fromHistory) {
        if (openedHere.current) {
          ownHistoryBack.current = true;
          await new Promise<void>((resolve) => {
            window.addEventListener("popstate", () => resolve(), { once: true });
            window.history.back();
          });
        } else {
          window.history.replaceState(null, "", url({ photo: null }));
        }
        // Allow useSearchParams to commit the history update before dropping the retained photo.
        await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
      }
      flushSync(() => setClosingPhoto(undefined));
    }, originPrint.current, false)).finally(() => {
      ownHistoryBack.current = false;
      openedHere.current = false;
      closing.current = false;
      transitionBusy.current = false;
    });
  }, [photo, url]);
  useEffect(() => {
    const onPopState = () => {
      if (ownHistoryBack.current) return;
      if (!new URLSearchParams(window.location.search).has("photo")) close(true);
    };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, [close]);
  const navigate = useCallback((direction: number) => {
    if (!routePhoto || transitionBusy.current) return;
    const index = photos.indexOf(routePhoto);
    const next = photos[(index + direction + photos.length) % photos.length];
    window.history.replaceState(null, "", url({ photo: next.slug }));
  }, [routePhoto, url]);
  const restoreFocus = useCallback(() => { lastFocus.current?.focus({ preventScroll: true }); }, []);
  return <>
    <a className="skip-link" href="#main">Skip to captures</a>
    <header><div className="wrap"><Link className="mark" href="/" aria-label="Captures — home"><BrandMark className="h-6 w-10" /></Link><ThemeToggle /></div></header>
    <main className="wrap" id="main">
      {!isTripPage && <section className="hero" aria-labelledby="title"><div><h1 id="title">Captures<span className="hero-dot" aria-hidden="true">.</span></h1><p>Things I noticed, mostly on the way somewhere else. Pick one up, flip it over, there&apos;s usually a story.</p></div><div className="stats"><div className="photos-stat"><b><PhotoCount /></b><span className="stat-label"><span className="photos-dot" aria-hidden="true" />photos</span></div><div><b>{placeCounts.size}</b>places</div></div></section>}
      <div className="view-bar">
      <nav className="view-switcher" aria-label="Photo views">{([['table', 'Table'], ['trips', 'Trips'], ['rolls', 'Rolls'], ['sheet', 'Contact sheet'], ['dump', 'Dump']] as const).filter(([value]) => (SHOW_ROLLS || value !== "rolls") && (SHOW_CONTACT_SHEET || value !== "sheet")).map(([value, label]) => <button key={value} aria-pressed={view === value} onClick={() => router.push(url({ view: value, trip: null, photo: null }), { scroll: false })}><span className="tab-label">{view === value && <span className="tab-dot" aria-hidden="true" />}{label}</span></button>)}</nav>
      </div>
      {photos.length === 0 && <p className="py-12 text-sm text-muted-foreground">No published photos yet.</p>}
      {view === "table" && <PrintTable surface={TABLE_SURFACE} open={open} />}
      {view === "rolls" && <section aria-labelledby="rolls-heading"><div className="section-h"><h2 id="rolls-heading">Rolls</h2><span>one roll per trip · swipe or use arrows</span></div>{activeRolls.map((roll) => <FilmRoll key={roll.id} roll={roll} open={open} />)}</section>}
      {view === "trips" && <Trips key={search.get("trip") ?? "list"} tripId={search.get("trip")} open={open} />}
      {view === "sheet" && <ContactSheet open={open} />}
      {view === "dump" && <Dump open={open} photoOpen={!!photo} />}
      <footer>© 2026 <a href="https://tapanshah.me">Tapan Shah</a> · if you scrolled this far, <a href="https://tapanshah.me/#contact">we should probably talk.</a></footer>
    </main>
    {photo && <PhotoDialog photo={photo} close={() => close()} navigate={navigate} restoreFocus={restoreFocus} />}
  </>;
}

function FilmRoll({ roll, open }: { roll: Roll; open: (photo: Photo) => void }) {
  const items = photos.filter((photo) => photo.roll === roll.id);
  const [current, setCurrent] = useState(0);
  const section = useRef<HTMLElement>(null);
  const strip = useRef<HTMLDivElement>(null);
  const loupe = useRef<HTMLDivElement>(null);
  const destination = useRef<number | null>(null);
  const hideLoupe = useCallback(() => { if (loupe.current) loupe.current.hidden = true; }, []);
  const activeFrame = useRef(0);
  const positionStrip = useCallback((index: number, animate = false) => {
    const element = strip.current;
    const frame = element?.children[index] as HTMLElement | undefined;
    if (!element || !frame) return;
    const maxScroll = Math.max(0, element.scrollWidth - element.clientWidth);
    const left = Math.max(0, Math.min(maxScroll, frame.offsetLeft + frame.offsetWidth / 2 - element.clientWidth / 2));
    destination.current = index;
    element.scrollTo({ left, behavior: animate && !matchMedia("(prefers-reduced-motion: reduce)").matches ? "smooth" : "instant" });
  }, []);
  const go = useCallback((index: number) => {
    const selected = Math.max(0, Math.min(items.length - 1, index));
    activeFrame.current = selected;
    setCurrent(selected);
    hideLoupe();
    positionStrip(selected, true);
  }, [items.length, positionStrip, hideLoupe]);
  useLayoutEffect(() => {
    const element = strip.current;
    if (!element) return;
    const sheet = element.closest<HTMLElement>(".lightbox-sheet");
    const panel = sheet?.parentElement;
    const reposition = () => {
      if (sheet && panel) sheet.style.setProperty("--sheet-rotation", sheet.offsetWidth > panel.clientWidth * .7 ? "-.3deg" : "-.6deg");
      // The strip fills the sheet's content box, excluding its 24px side padding.
      positionStrip(activeFrame.current);
    };
    const settle = () => {
      if (destination.current === null) positionStrip(activeFrame.current, true);
    };
    reposition();
    const observer = new ResizeObserver(reposition);
    observer.observe(element);
    if (sheet) observer.observe(sheet);
    if (panel) observer.observe(panel);
    Array.from(element.children).forEach((frame) => observer.observe(frame));
    element.addEventListener("scrollend", settle);
    return () => { observer.disconnect(); element.removeEventListener("scrollend", settle); };
  }, [positionStrip]);
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey || document.querySelector(".lb[open]")) return;
      if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
      const target = event.target as HTMLElement;
      if (target.closest("input,textarea,select,[contenteditable=true]")) return;
      const focusedRoll = target.closest(".roll");
      const visible = Array.from(document.querySelectorAll<HTMLElement>(".roll")).filter((roll) => {
        const rect = roll.getBoundingClientRect();
        return rect.bottom > 0 && rect.top < innerHeight;
      });
      const nearest = visible.sort((a, b) => {
        const distance = (el: HTMLElement) => { const r = el.getBoundingClientRect(); return Math.abs((r.top + r.bottom) / 2 - innerHeight / 2); };
        return distance(a) - distance(b);
      })[0];
      if ((focusedRoll && visible.includes(focusedRoll as HTMLElement) ? focusedRoll : nearest) !== section.current) return;
      event.preventDefault();
      go(current + (event.key === "ArrowLeft" ? -1 : 1));
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("scroll", hideLoupe, true);
    return () => { window.removeEventListener("keydown", onKey); window.removeEventListener("scroll", hideLoupe, true); };
  }, [current, go, hideLoupe]);
  const magnify = (event: PointerEvent<HTMLButtonElement>, photo: Photo) => {
    const lens = loupe.current;
    if (!lens || event.pointerType !== "mouse" || !matchMedia("(min-width: 761px) and (hover: hover) and (pointer: fine)").matches || !photo.src) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const imageWidth = photo.width ?? 3, imageHeight = photo.height ?? 2;
    const frameWidth = event.currentTarget.offsetWidth, frameHeight = event.currentTarget.offsetHeight;
    // Undo the sheet's current tilt so the loupe samples the point under the cursor.
    const dx = event.clientX - (rect.left + rect.width / 2), dy = event.clientY - (rect.top + rect.height / 2);
    const sheet = event.currentTarget.closest<HTMLElement>(".lightbox-sheet")!;
    const angle = -parseFloat(getComputedStyle(sheet).getPropertyValue("--sheet-rotation")) * Math.PI / 180;
    const x = dx * Math.cos(angle) - dy * Math.sin(angle) + frameWidth / 2;
    const y = dx * Math.sin(angle) + dy * Math.cos(angle) + frameHeight / 2;
    const cover = Math.max(frameWidth / imageWidth, frameHeight / imageHeight);
    const width = imageWidth * cover, height = imageHeight * cover;
    lens.hidden = false;
    Object.assign(lens.style, {
      left: `${event.clientX - 80}px`, top: `${event.clientY - 80}px`,
      backgroundImage: `url(${JSON.stringify(photo.sizes?.[2048] ?? photo.src)})`,
      backgroundSize: `${width * 2.6}px ${height * 2.6}px`,
      backgroundPosition: `${80 - (x + (width - frameWidth) / 2) * 2.6}px ${80 - (y + (height - frameHeight) / 2) * 2.6}px`,
    });
  };
  const selected = items[current];
  const frameWidth = (photo: Photo) => (photo.width ?? 3) < (photo.height ?? 2) ? 144 : 210;
  return <section ref={section} className="roll" aria-label={roll.name}>
    <div className="roll-head"><h3>{roll.name}</h3><span className="meta">{items.length} frames · {roll.meta}</span></div>
    <div className="light-table surface-linen">
      <div className="lightbox-sheet">
      <div className="film"><span className="edge" aria-hidden="true">KODAK PORTRA 400 ▸ {items.length}</span>
        <div ref={strip} className="strip" tabIndex={0} aria-label={`${roll.name}. Left and right arrows select a frame; Enter opens it.`}
          onPointerDown={() => { destination.current = null; hideLoupe(); }}
          onWheel={() => { destination.current = null; }}
          onScroll={() => {
            const el = strip.current!;
            if (destination.current !== null || el.scrollWidth <= el.clientWidth) return;
            const center = el.scrollLeft + el.clientWidth / 2;
            let nearest = 0, distance = Infinity;
            Array.from(el.children).forEach((child, i) => { const frame = child as HTMLElement; const d = Math.abs(frame.offsetLeft + frame.offsetWidth / 2 - center); if (d < distance) { distance = d; nearest = i; } });
            activeFrame.current = nearest;
            setCurrent(nearest);
          }}
          onKeyDown={(event) => { if (event.key === "Enter" && event.target === event.currentTarget) { event.preventDefault(); open(selected); } }}>
          {items.map((photo, i) => <button key={photo.slug} className={`cell ${frameWidth(photo) === 144 ? "cell-portrait" : ""} ${current === i ? "mid" : ""}`} aria-label={`${photo.title}. ${current === i ? "Open photo" : "Select frame"}`} aria-current={current === i ? "true" : undefined}
            onClick={() => { hideLoupe(); if (current === i) open(photo); else go(i); }} onDoubleClick={() => { hideLoupe(); open(photo); }}
            onPointerMove={(event) => magnify(event, photo)} onPointerLeave={hideLoupe} onBlur={hideLoupe}>
            <PhotoImage photo={photo} sizes={`${frameWidth(photo)}px`} loading={i < 2 ? "eager" : "lazy"} /><span className="no">{String(i + 1).padStart(2, '0')}A ▸</span>
          </button>)}
        </div>
      </div>
      </div>
      <div className="strip-caption" aria-live="polite"><b>{selected.title}</b><small>{selected.place} · {photoDate(selected.date)} · FRAME {String(current + 1).padStart(2, '0')}A</small></div>
      <div className="roll-nav"><button aria-label={`Previous frame in ${roll.name}`} disabled={current === 0} onClick={() => go(current - 1)}>‹</button><button className="roll-open" onClick={() => open(selected)}>open</button><button aria-label={`Next frame in ${roll.name}`} disabled={current === items.length - 1} onClick={() => go(current + 1)}>›</button></div>
    </div>
    <div ref={loupe} className="roll-loupe" hidden aria-hidden="true" />
  </section>;
}

function ContactSheet({ open }: { open: (photo: Photo) => void }) {
  type FilterGroup = "Trips" | "Places" | "Tags" | "Years";
  const [showAllPlaces, setShowAllPlaces] = useState(false);
  const [filter, setFilter] = useState<{ group: FilterGroup; value: string } | null>(null);
  const grid = useRef<HTMLDivElement>(null);
  const previousFilter = useRef(filter);
  useEffect(() => {
    const previous = previousFilter.current;
    previousFilter.current = filter;
    if (previous?.group === filter?.group && previous?.value === filter?.value) return;
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const animations = Array.from(grid.current?.children ?? []).map((frame, index) => frame.animate([
      { opacity: 0, transform: "translateY(4px)" },
      { opacity: 1, transform: "translateY(0)" },
    ], { duration: 200, delay: index * 15, easing: "ease-out", fill: "backwards" }));
    return () => animations.forEach((animation) => animation.cancel());
  }, [filter]);
  const validValue = (value: string) => value.trim() !== "" && value.trim().toUpperCase() !== "TODO";
  const groups: { label: FilterGroup; values: string[] }[] = [
    { label: "Trips", values: [...activeRolls.map((roll) => roll.id), ""] },
    { label: "Places", values: showAllPlaces ? commonPlaces : commonPlaces.slice(0, 8) },
    { label: "Tags", values: [...new Set(photos.flatMap((photo) => photo.collections).filter(validValue))] },
    { label: "Years", values: [...new Set(photos.map((photo) => photo.date.slice(0, 4)).filter((year) => /^\d{4}$/.test(year)))].sort().reverse() }
  ];
  const matches = (photo: Photo, group: FilterGroup, value: string) => group === "Trips" ? (value === "" ? photo.roll == null : photo.roll === value) : group === "Places" ? cityPlace(photo.place) === value : group === "Tags" ? photo.collections.includes(value) : photo.date.slice(0, 4) === value;
  const visible = filter ? photos.filter((photo) => matches(photo, filter.group, filter.value)) : photos;
  return <section aria-labelledby="sheet-heading"><div className="section-h"><h2 id="sheet-heading">Contact sheet</h2><span aria-live="polite">{visible.length} of {photos.length} frames</span></div><div className="filters" role="group" aria-label="Filter by trip, place, collection or year">
    <div><button aria-pressed={filter === null} onClick={() => setFilter(null)}>All<span>{photos.length}</span></button></div>
    {groups.map(({ label, values }) => <div className="filter-row" role="group" aria-labelledby={`filter-${label}`} key={label}>
      <span className="filter-label" id={`filter-${label}`}>{label}</span>
      <div className="filter-chips">{values.map((value) => <button key={value} aria-pressed={filter?.group === label && filter.value === value} onClick={() => setFilter({ group: label, value })}>{label === "Trips" ? (value === "" ? "Loose" : activeRolls.find((roll) => roll.id === value)?.name) : value}<span>{photos.filter((photo) => matches(photo, label, value)).length}</span></button>)}{label === "Places" && commonPlaces.length > 8 && <button aria-expanded={showAllPlaces} onClick={() => setShowAllPlaces((expanded) => !expanded)}>{showAllPlaces ? "Show less" : `+ ${commonPlaces.length - 8} more`}</button>}</div>
    </div>)}
  </div><div ref={grid} className="grid grid-cols-3 gap-2 md:grid-cols-6 md:gap-3 contact-grid">{visible.map((photo) => <button key={photo.slug} className={`contact-frame${photo.favorite ? " is-favorite" : ""}`} aria-label={`Open ${photo.title}`} onClick={() => open(photo)}><PhotoImage photo={photo} sizes="(max-width: 767px) calc((100vw - 104px) / 3), (max-width: 1080px) calc((100vw - 196px) / 6), 147.34px" /><span className="frame-label"><span>{frameNumber(photo)}</span><span>{cityPlace(photo.place)}</span></span></button>)}</div></section>;
}
