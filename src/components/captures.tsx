"use client";

import { useCallback, useEffect, useRef, useState, type CSSProperties } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { BrandMark } from "./brand-mark";
import { PhotoImage } from "./photo-image";
import { PhotoDialog } from "./photo-dialog";
import { photos, rolls, photoDate, frameNumber, type Photo, type Roll } from "@/data/captures";

type View = "table" | "rolls" | "all";
const favorites = photos.filter((photo) => photo.favorite);
const tablePhotos = favorites.length ? favorites : photos;
const activeRolls = rolls.filter((roll) => photos.some((photo) => photo.roll === roll.id));
const since = photos.map((photo) => photo.date.slice(0, 4)).filter((year) => /^\d{4}$/.test(year)).sort()[0] ?? "—";
const spots = [[6, 8], [30, 32], [54, 6], [74, 30], [18, 52], [48, 50]];
const mobileSpots = [[6, 4], [51, 8], [10, 34], [53, 37], [6, 64], [51, 66]];

export function Captures() {
  const router = useRouter();
  const search = useSearchParams();
  const rawView = search.get("view");
  const view: View = rawView === "rolls" || rawView === "all" ? rawView : "table";
  const photo = photos.find((item) => item.slug === search.get("photo"));
  const openedHere = useRef(false);
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
  const open = (item: Photo) => {
    lastFocus.current = document.activeElement as HTMLElement;
    openedHere.current = true;
    router.push(url({ photo: item.slug }), { scroll: false });
  };
  const close = useCallback(() => {
    if (openedHere.current) router.back();
    else router.replace(url({ photo: null }), { scroll: false });
  }, [router, url]);
  const navigate = useCallback((direction: number) => {
    if (!photo) return;
    const index = photos.indexOf(photo);
    router.replace(url({ photo: photos[(index + direction + photos.length) % photos.length].slug }), { scroll: false });
  }, [photo, router, url]);
  const restoreFocus = useCallback(() => { lastFocus.current?.focus({ preventScroll: true }); }, []);
  return <>
    <a className="skip-link" href="#main">Skip to captures</a>
    <header><div className="wrap"><a className="mark" href="https://tapanshah.me" aria-label="Tapan Shah — home"><BrandMark className="h-6 w-10" /></a><nav aria-label="Main navigation"><a href="https://tapanshah.me">Home</a><Link className="on" href="/" aria-current="page">Captures</Link><a href="https://tapanshah.me/blog">Blog</a></nav></div></header>
    <main className="wrap" id="main">
      <section className="hero" aria-labelledby="title"><div><h1 id="title">Captures</h1><p>Things I noticed, mostly on the way somewhere else. Pick one up, flip it over, there&apos;s usually a story.</p></div><div className="stats"><div><b>{photos.length}</b>photos</div><div><b>{new Set(photos.map((item) => item.place)).size}</b>places</div><div><b>{since}</b>since</div></div></section>
      <nav className="view-switcher" aria-label="Photo views">{([['table', 'Table'], ['rolls', 'Rolls'], ['all', 'Contact sheet']] as const).map(([value, label]) => <button key={value} aria-pressed={view === value} onClick={() => router.push(url({ view: value }), { scroll: false })}>{label}</button>)}</nav>
      {photos.length === 0 && <p className="py-12 text-sm text-muted-foreground">No published photos yet.</p>}
      {view === "table" && <PrintTable open={open} />}
      {view === "rolls" && <section aria-labelledby="rolls-heading"><div className="section-h"><h2 id="rolls-heading">Rolls</h2><span>one roll per trip · swipe or use arrows</span></div>{activeRolls.map((roll) => <FilmRoll key={roll.id} roll={roll} open={open} />)}</section>}
      {view === "all" && <ContactSheet open={open} />}
      <footer>© 2026 <a href="https://tapanshah.me">Tapan Shah</a> · if you scrolled this far, <a href="https://tapanshah.me/#contact">we should probably talk.</a></footer>
    </main>
    {photo && <PhotoDialog photo={photo} close={close} navigate={navigate} restoreFocus={restoreFocus} />}
  </>;
}

function PrintTable({ open }: { open: (photo: Photo) => void }) {
  const table = useRef<HTMLDivElement>(null);
  const top = useRef(20);
  useEffect(() => {
    const element = table.current;
    if (!element) return;
    const observer = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) { element.classList.add("entered"); observer.disconnect(); }
    }, { threshold: 0.2 });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  return <div ref={table} className="print-table" aria-label={favorites.length ? "Favorite prints" : "Published prints"}><p className="sr-only">Drag to move. Click, Enter or Space to flip. Double-click or press O to open. Arrow keys move a focused print.</p>{tablePhotos.map((photo, i) => <Print key={photo.slug} photo={photo} index={i} open={open} raise={() => ++top.current} />)}<div className="table-hint">drag · click to flip · double-click / O to open</div></div>;
}

function Print({ photo, index, open, raise }: { photo: Photo; index: number; open: (photo: Photo) => void; raise: () => number }) {
  const [flipped, setFlipped] = useState(false);
  const drag = useRef<{ x: number; y: number; left: number; top: number; moved: boolean } | null>(null);
  const suppressClick = useRef(false);
  const move = (element: HTMLElement, x: number, y: number) => {
    const table = element.parentElement!;
    // Store proportional positions so dragged prints remain in bounds on resize.
    element.style.left = `${Math.max(12, Math.min(table.clientWidth - element.offsetWidth - 12, x)) / table.clientWidth * 100}%`;
    element.style.top = `${Math.max(12, Math.min(table.clientHeight - element.offsetHeight - 35, y)) / table.clientHeight * 100}%`;
  };
  const style = { "--r": `${(index * 53) % 19 - 9}deg`, "--x": `${spots[index % spots.length][0]}%`, "--y": `${spots[index % spots.length][1]}%`, "--mx": `${mobileSpots[index % mobileSpots.length][0]}%`, "--my": `${mobileSpots[index % mobileSpots.length][1]}%`, "--delay": `${index * 140}ms`, zIndex: index + 10 } as CSSProperties;
  return <div role="button" tabIndex={0} aria-pressed={flipped} aria-label={`${photo.title}. ${flipped ? photo.story : ""} Enter to flip, O to open, arrow keys to move.`} className={`print ${flipped ? "flip" : ""}`} style={style}
    onFocus={(event) => { event.currentTarget.style.zIndex = String(raise()); }}
    onPointerDown={(event) => {
      if (event.button !== 0) return;
      const el = event.currentTarget;
      el.focus({ preventScroll: true }); el.setPointerCapture(event.pointerId);
      drag.current = { x: event.clientX, y: event.clientY, left: el.offsetLeft, top: el.offsetTop, moved: false };
      suppressClick.current = false;
    }}
    onPointerMove={(event) => {
      const start = drag.current;
      if (!start) return;
      const dx = event.clientX - start.x, dy = event.clientY - start.y;
      if (Math.abs(dx) + Math.abs(dy) > 5) start.moved = true;
      if (start.moved) { event.currentTarget.classList.add("dragging"); move(event.currentTarget, start.left + dx, start.top + dy); }
    }}
    onPointerUp={(event) => { suppressClick.current = drag.current?.moved ?? false; drag.current = null; event.currentTarget.classList.remove("dragging"); }}
    onPointerCancel={(event) => { drag.current = null; suppressClick.current = true; event.currentTarget.classList.remove("dragging"); }}
    onLostPointerCapture={(event) => { drag.current = null; event.currentTarget.classList.remove("dragging"); }}
    onClick={() => { if (!suppressClick.current) setFlipped((value) => !value); }}
    onDoubleClick={() => { if (!suppressClick.current) open(photo); }}
    onKeyDown={(event) => {
      if (event.key === "Enter" || event.key === " ") { event.preventDefault(); setFlipped((value) => !value); }
      if (event.key.toLowerCase() === "o") { event.preventDefault(); open(photo); }
      if (event.key.startsWith("Arrow")) { event.preventDefault(); const el = event.currentTarget; move(el, el.offsetLeft + (event.key === "ArrowLeft" ? -12 : event.key === "ArrowRight" ? 12 : 0), el.offsetTop + (event.key === "ArrowUp" ? -12 : event.key === "ArrowDown" ? 12 : 0)); }
    }}>
    <div className="inner"><div className="face front" aria-hidden={flipped}><span className="tape" /><PhotoImage photo={photo} className="img" sizes="190px" /><div className="cap">{photo.place.split(',')[0]}</div></div><div className="face back" aria-hidden={!flipped}><div className="t">{photo.story}</div><div className="m">{photo.title}<br />{photoDate(photo.date)}</div></div></div>
  </div>;
}

function FilmRoll({ roll, open }: { roll: Roll; open: (photo: Photo) => void }) {
  const items = photos.filter((photo) => photo.roll === roll.id);
  const [current, setCurrent] = useState(0);
  const strip = useRef<HTMLDivElement>(null);
  const prepareStrip = () => {
    const element = strip.current;
    if (!element || element.classList.contains("navigated")) return;
    const first = element.firstElementChild as HTMLElement;
    const previousLeft = first.offsetLeft;
    // Add room to center the first frame only after interaction, preserving the viewport.
    element.style.scrollSnapType = "none";
    element.classList.add("navigated");
    element.scrollLeft += first.offsetLeft - previousLeft;
    requestAnimationFrame(() => { element.style.scrollSnapType = ""; });
  };
  const go = (index: number) => {
    prepareStrip();
    const element = strip.current;
    const frame = element?.children[Math.max(0, Math.min(items.length - 1, index))] as HTMLElement | undefined;
    if (element && frame) element.scrollTo({ left: frame.offsetLeft + frame.offsetWidth / 2 - element.clientWidth / 2, behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth" });
  };
  return <section className="roll" aria-label={roll.name}><div className="roll-head"><h3>{roll.name}</h3><span className="meta">{items.length} frames · {roll.meta}</span></div><div className="film"><span className="edge" aria-hidden="true">KODAK PORTRA 400 · {roll.meta.split('·')[1].trim()}</span><div ref={strip} className="strip" onPointerMove={(event) => { if (event.buttons || event.pointerType === "touch") prepareStrip(); }} onWheel={(event) => { if (event.deltaX || event.shiftKey) prepareStrip(); }} tabIndex={0} aria-label={`${roll.name}. Left and right arrows select a frame; Enter opens it.`}
    onScroll={() => {
      const el = strip.current!;
      const center = el.scrollLeft + el.clientWidth / 2;
      let nearest = 0, distance = Infinity;
      Array.from(el.children).forEach((child, i) => { const frame = child as HTMLElement; const d = Math.abs(frame.offsetLeft + frame.offsetWidth / 2 - center); if (d < distance) { distance = d; nearest = i; } });
      setCurrent(nearest);
    }}
    onKeyDown={(event) => { if (event.key === "ArrowLeft" || event.key === "ArrowRight") { event.preventDefault(); go(current + (event.key === "ArrowLeft" ? -1 : 1)); } else if (event.key === "Enter" && event.target === event.currentTarget) { event.preventDefault(); open(items[current]); } }}>
      {items.map((photo, i) => <button key={photo.slug} className={`cell ${current === i ? "mid" : ""}`} aria-label={`${photo.title}. ${current === i ? "Open photo" : "Center frame"}`} aria-current={current === i ? "true" : undefined} onClick={() => current === i ? open(photo) : go(i)}><PhotoImage photo={photo} /><span className="no">{String(i + 1).padStart(2, '0')}A</span></button>)}
    </div></div><div className="strip-caption" aria-live="polite"><b>{items[current].title}</b><small>{items[current].place} · {photoDate(items[current].date)}</small></div><div className="roll-nav"><button aria-label={`Previous frame in ${roll.name}`} disabled={current === 0} onClick={() => go(current - 1)}>‹</button><button aria-label={`Next frame in ${roll.name}`} disabled={current === items.length - 1} onClick={() => go(current + 1)}>›</button></div></section>;
}

function ContactSheet({ open }: { open: (photo: Photo) => void }) {
  type FilterGroup = "Places" | "Tags" | "Years";
  const [filter, setFilter] = useState<{ group: FilterGroup; value: string } | null>(null);
  const validValue = (value: string) => value.trim() !== "" && value.trim().toUpperCase() !== "TODO";
  const groups: { label: FilterGroup; values: string[] }[] = [
    { label: "Places", values: [...new Set(photos.map((photo) => photo.place).filter(validValue))] },
    { label: "Tags", values: [...new Set(photos.flatMap((photo) => photo.collections).filter(validValue))] },
    { label: "Years", values: [...new Set(photos.map((photo) => photo.date.slice(0, 4)).filter((year) => /^\d{4}$/.test(year)))].sort().reverse() }
  ];
  const matches = (photo: Photo, group: FilterGroup, value: string) => group === "Places" ? photo.place === value : group === "Tags" ? photo.collections.includes(value) : photo.date.slice(0, 4) === value;
  const visible = filter ? photos.filter((photo) => matches(photo, filter.group, filter.value)) : photos;
  return <section aria-labelledby="sheet-heading"><div className="section-h"><h2 id="sheet-heading">Contact sheet</h2><span aria-live="polite">{visible.length} of {photos.length} frames</span></div><div className="filters" role="group" aria-label="Filter by place, collection or year">
    <div><button aria-pressed={filter === null} onClick={() => setFilter(null)}>All<span>{photos.length}</span></button></div>
    {groups.map(({ label, values }) => <div className="filter-row" role="group" aria-labelledby={`filter-${label}`} key={label}>
      <span className="filter-label" id={`filter-${label}`}>{label}</span>
      <div className="filter-chips">{values.map((value) => <button key={value} aria-pressed={filter?.group === label && filter.value === value} onClick={() => setFilter({ group: label, value })}>{value}<span>{photos.filter((photo) => matches(photo, label, value)).length}</span></button>)}</div>
    </div>)}
  </div><div className="grid grid-cols-3 gap-2 md:grid-cols-6 md:gap-3 contact-grid">{visible.map((photo) => <button key={photo.slug} className="contact-frame" aria-label={`Open ${photo.title}`} onClick={() => open(photo)}><PhotoImage photo={photo} sizes="(max-width: 767px) 30vw, 170px" /><span className="frame-label"><span>{frameNumber(photo)}</span><span>{photo.place.split(',')[0]}</span></span></button>)}</div></section>;
}
