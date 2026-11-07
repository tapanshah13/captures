"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { PrintTable } from "./print-table";
import { ThemeToggle } from "./theme-toggle";
import { BrandMark } from "./brand-mark";
import { PhotoImage } from "./photo-image";
import { PhotoDialog } from "./photo-dialog";
import { TABLE_SURFACE, photos, rolls, photoDate, frameNumber, type Photo, type Roll } from "@/data/captures";

type View = "table" | "rolls" | "all";
const activeRolls = rolls.filter((roll) => photos.some((photo) => photo.roll === roll.id));
const since = photos.map((photo) => photo.date.slice(0, 4)).filter((year) => /^\d{4}$/.test(year)).sort()[0] ?? "—";
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
    <header><div className="wrap"><a className="mark" href="https://tapanshah.me" aria-label="Tapan Shah — home"><BrandMark className="h-6 w-10" /></a><nav aria-label="Main navigation"><a href="https://tapanshah.me">Home</a><Link className="on" href="/" aria-current="page">Captures</Link><a href="https://tapanshah.me/blog">Blog</a><ThemeToggle /></nav></div></header>
    <main className="wrap" id="main">
      <section className="hero" aria-labelledby="title"><div><h1 id="title">Captures<span className="hero-dot" aria-hidden="true">.</span></h1><p>Things I noticed, mostly on the way somewhere else. Pick one up, flip it over, there&apos;s usually a story.</p></div><div className="stats"><div className="favorites-stat"><b>{photos.filter((item) => item.favorite).length}</b><span className="favorite-dot" aria-hidden="true" /> favorites</div><div><b>{photos.length}</b>photos</div><div><b>{new Set(photos.map((item) => item.place)).size}</b>places</div><div><b>{since}</b>since</div></div></section>
      <nav className="view-switcher" aria-label="Photo views">{([['table', 'Table'], ['rolls', 'Rolls'], ['all', 'Contact sheet']] as const).map(([value, label]) => <button key={value} aria-pressed={view === value} onClick={() => router.push(url({ view: value }), { scroll: false })}>{label}</button>)}</nav>
      {photos.length === 0 && <p className="py-12 text-sm text-muted-foreground">No published photos yet.</p>}
      {view === "table" && <PrintTable surface={TABLE_SURFACE} open={open} />}
      {view === "rolls" && <section aria-labelledby="rolls-heading"><div className="section-h"><h2 id="rolls-heading">Rolls</h2><span>one roll per trip · swipe or use arrows</span></div>{activeRolls.map((roll) => <FilmRoll key={roll.id} roll={roll} open={open} />)}</section>}
      {view === "all" && <ContactSheet open={open} />}
      <footer>© 2026 <a href="https://tapanshah.me">Tapan Shah</a> · if you scrolled this far, <a href="https://tapanshah.me/#contact">we should probably talk.</a></footer>
    </main>
    {photo && <PhotoDialog photo={photo} close={close} navigate={navigate} restoreFocus={restoreFocus} />}
  </>;
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
