"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState, useId, type CSSProperties } from "react";
import Link from "next/link";
import { photos, type Photo } from "@/data/captures";
import { PhotoImage } from "./photo-image";

const favorites = photos.filter((photo) => photo.favorite);
function pickPile() {
  const selected = photos.filter((photo) => photo.pinned).slice(0, 12);
  const shuffled = favorites.filter((photo) => !photo.pinned);
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  const rollCounts = new Map<string, number>();
  for (const photo of selected) if (photo.roll != null) rollCounts.set(photo.roll, (rollCounts.get(photo.roll) ?? 0) + 1);
  for (const photo of shuffled) {
    if (selected.length >= 12) break;
    const count = photo.roll == null ? 0 : rollCounts.get(photo.roll) ?? 0;
    if (count >= 2) continue;
    selected.push(photo);
    if (photo.roll != null) rollCounts.set(photo.roll, count + 1);
  }
  // Relax the trip limit only when it prevents filling the table.
  for (const photo of shuffled) {
    if (selected.length >= 12) break;
    if (!selected.includes(photo)) selected.push(photo);
  }
  return selected;
}
type Position = { x: number; y: number; rotation: number; width: number; height: number };

function PrintTape({ photo, seed }: { photo: Photo; seed: number }) {
  // Each property is stable across renders, resizes, flips and dragging.
  let hash = 2166136261;
  for (const char of `${photo.slug}:${seed}`) hash = Math.imul(hash ^ char.charCodeAt(0), 16777619);
  const random = () => {
    hash += 0x6d2b79f5;
    let value = Math.imul(hash ^ (hash >>> 15), 1 | hash);
    value ^= value + Math.imul(value ^ (value >>> 7), 61 | value);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
  const show = random() < .25;
  if (!photo.pinned && !show) return null;
  const shapes = [[76, 20], [48, 24], [104, 15], [54, 22], [60, 18]] as const;
  const shape = Math.floor(random() * shapes.length);
  const [width, height] = shapes[shape];
  const left = `${30 + random() * 40}%`;
  const rotation = -10 + random() * 18;
  return <span className="pile-tape" aria-hidden="true" style={{ left, "--tape-width": width, "--tape-height": height, "--tape-angle": `${shape === 4 ? 0 : rotation}deg` } as CSSProperties}>
    <span className="pile-tape-piece" style={shape === 4 ? { transform: "rotate(7deg)" } : undefined} />
    {shape === 4 && <span className="pile-tape-piece" style={{ transform: "rotate(-11deg)" }} />}
  </span>;
}

// Reserve space for rotated corners, lifted scale and tape, not just the card rectangle.
function clampPosition(x: number, y: number, p: Position, width: number, height: number) {
  const angle = Math.abs(p.rotation) * Math.PI / 180;
  const dx = (1.04 * (p.width * Math.cos(angle) + p.height * Math.sin(angle)) - p.width) / 2 + 12;
  const dy = (1.04 * (p.height * Math.cos(angle) + p.width * Math.sin(angle)) - p.height) / 2 + 12;
  return { x: Math.max(dx, Math.min(width - p.width - dx, x)), y: Math.max(dy, Math.min(height - p.height - dy, y)) };
}

// Sample the actual rotated paper, counting the union of all prints above it.
function visibilityScore(positions: Position[]) {
  const shapes = positions.map((p) => ({ ...p, cx: p.x + p.width / 2, cy: p.y + p.height / 2, sin: Math.sin(p.rotation * Math.PI / 180), cos: Math.cos(p.rotation * Math.PI / 180) }));
  let penalty = 0, overlap = 0;
  for (let i = 0; i < shapes.length - 1; i++) {
    const p = shapes[i];
    let covered = 0;
    for (let row = 0; row < 10; row++) for (let col = 0; col < 10; col++) {
      const x = ((col + .5) / 10 - .5) * p.width, y = ((row + .5) / 10 - .5) * p.height;
      const px = p.cx + x * p.cos - y * p.sin, py = p.cy + x * p.sin + y * p.cos;
      for (let j = i + 1; j < shapes.length; j++) {
        const other = shapes[j], dx = px - other.cx, dy = py - other.cy;
        if (Math.abs(dx * other.cos + dy * other.sin) < other.width / 2 && Math.abs(-dx * other.sin + dy * other.cos) < other.height / 2) { covered++; break; }
      }
    }
    // Target 60% visible paper, allowing a small sampling tolerance at the edges.
    penalty += Math.max(0, covered - 40) ** 2;
    overlap += covered;
  }
  return { penalty, overlap };
}

export function PrintTable({ surface, open }: { surface: "mat" | "mat-tinted" | "linen"; open: (photo: Photo) => void }) {
  const board = useRef<HTMLDivElement>(null);
  const [pile, setPile] = useState<Photo[]>([]);
  const currentPile = useRef<Photo[]>([]);
  const top = useRef(20);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const [positions, setPositions] = useState<Position[]>([]);
  const initialLayout = useRef<Position[] | null>(null);
  const lastWidth = useRef<number | null>(null);
  const [flipped, setFlipped] = useState<Record<string, boolean>>({});
  const [shuffling, setShuffling] = useState(false);
  const [tapeSeed, setTapeSeed] = useState(0);
  const animating = useRef(false);
  const makeScatter = useCallback((order = currentPile.current.map((_, i) => i)) => {
    const element = board.current;
    if (!element) return [];
    const width = element.clientWidth;
    const mobile = window.matchMedia("(max-width: 760px)").matches;
    const proportional = window.matchMedia("(max-width: 640px)").matches;
    const height = element.clientHeight - (proportional ? 28 : 0);
    let next: Position[] = [];
    // Thirty candidates per print; shrink only when the mat cannot fit readable prints.
    for (let scale = 1; scale >= .5; scale -= .04) {
      next = [];
      const printsPerRow = Math.max(1, Math.min(order.length, Math.floor(width / (Math.min(mobile ? 160 : 220, width * .65) * scale + 24))));
      const bandWidth = width / printsPerRow;
      for (const [rank, index] of order.entries()) {
        const photo = currentPile.current[index];
        const landscape = (photo.width ?? 3) > (photo.height ?? 4);
        const cardWidth = Math.min(mobile ? (landscape ? 160 : 120) : (landscape ? 220 : 170), width * .65) * scale;
        const desktopWidth = landscape ? 220 : 170;
        const frameScale = proportional ? cardWidth / desktopWidth : 1;
        let best: Position | undefined, bestScore = Infinity;
        for (let attempt = 0; attempt < 30; attempt++) {
          const p = { x: 0, y: 0, width: cardWidth, height: (cardWidth - 18 * frameScale) / (landscape ? 1.5 : .8) + 43 * frameScale, rotation: Math.random() * 28 - 14 };
          const min = clampPosition(-width, -height, p, width, height);
          const max = clampPosition(width, height, p, width, height);
          // Distribute print centers across every band before starting another row.
          const band = rank % printsPerRow;
          const minX = Math.max(min.x, band * bandWidth - cardWidth / 2);
          const maxX = Math.min(max.x, (band + 1) * bandWidth - cardWidth / 2);
          const candidate = { ...p, x: minX + Math.random() * (maxX - minX), y: min.y + Math.random() * (max.y - min.y) };
          const score = visibilityScore([...next, candidate]);
          const cost = score.penalty * 10000 + score.overlap;
          if (cost < bestScore) { best = candidate; bestScore = cost; }
        }
        if (best) next.push(best);
      }
      if (visibilityScore(next).penalty === 0) break;
    }
    if (proportional && next.length) {
      // Center the rotated paper bounds as one pile, preserving the overlaps.
      const edges = next.map((p) => {
        const angle = Math.abs(p.rotation) * Math.PI / 180;
        const halfWidth = (p.width * Math.cos(angle) + p.height * Math.sin(angle)) / 2;
        const center = p.x + p.width / 2;
        return { left: center - halfWidth, right: center + halfWidth };
      });
      const left = Math.min(...edges.map((edge) => edge.left));
      const right = Math.max(...edges.map((edge) => edge.right));
      const shift = (width - left - right) / 2;
      next = next.map((p) => ({ ...p, x: p.x + shift }));
    }
    const positionsByPhoto: Position[] = [];
    order.forEach((index, rank) => { positionsByPhoto[index] = next[rank]; });
    return positionsByPhoto;
  }, []);
  const resetStackOrder = useCallback(() => {
    board.current?.querySelectorAll<HTMLElement>(".pile-print").forEach((print) => { print.style.zIndex = ""; });
  }, []);
  const scatter = useCallback(() => {
    timers.current.forEach(clearTimeout);
    animating.current = false;
    setShuffling(false);
    resetStackOrder();
    setPositions(makeScatter());
  }, [makeScatter, resetStackOrder]);
  useEffect(() => {
    const element = board.current;
    if (!element) return;
    const frame = requestAnimationFrame(() => {
      if (initialLayout.current === null) {
        currentPile.current = pickPile();
        initialLayout.current = makeScatter();
      }
      setPile(currentPile.current);
      lastWidth.current = element.clientWidth;
      setPositions(initialLayout.current);
    });
    let timeout: ReturnType<typeof setTimeout>;
    const observer = new ResizeObserver(() => {
      const width = element.clientWidth;
      // Initial delivery and height-only/image changes must not reshuffle the pile.
      if (lastWidth.current === null || width === lastWidth.current) return;
      clearTimeout(timeout);
      timeout = setTimeout(() => {
        const nextWidth = element.clientWidth;
        if (nextWidth === lastWidth.current) return;
        lastWidth.current = nextWidth;
        scatter();
      }, 200);
    });
    observer.observe(element);
    return () => { cancelAnimationFrame(frame); clearTimeout(timeout); observer.disconnect(); timers.current.forEach(clearTimeout); };
  }, [makeScatter, scatter]);
  const shuffle = () => {
    if (animating.current || !board.current) return;
    timers.current.forEach(clearTimeout);
    currentPile.current = pickPile();
    setTapeSeed((seed) => seed + 1);
    setPile(currentPile.current);
    const order = currentPile.current.map((_, i) => i);
    for (let i = order.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [order[i], order[j]] = [order[j], order[i]];
    }
    // Score occlusion in the same back-to-front order used for the new z-indexes.
    const next = makeScatter(order);
    const prints = board.current.querySelectorAll<HTMLElement>(".pile-print");
    order.forEach((index) => { if (prints[index]) prints[index].style.zIndex = String(++top.current); });
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    animating.current = !reduced;
    setShuffling(!reduced);
    setFlipped({});
    setPositions(next);
    if (!reduced) timers.current = [setTimeout(() => {
      animating.current = false;
      setShuffling(false);
    }, 600)];
  };
  const flip = (slug: string) => setFlipped((previous) => ({ ...previous, [slug]: !previous[slug] }));
  const flipAll = () => {
    if (animating.current) return;
    timers.current.forEach(clearTimeout);
    const next = !pile.every((photo) => flipped[photo.slug]);
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    timers.current = pile.map((photo, i) => setTimeout(() => setFlipped((previous) => ({ ...previous, [photo.slug]: next })), reduced ? 0 : i * 60));
  };
  return <section className="table-board" aria-label={`${surface === "linen" ? "Linen" : surface === "mat-tinted" ? "Tinted mat" : "Cutting mat"} photo pile`}>
    <div ref={board} className={`pile-surface ${surface === "mat-tinted" ? "surface-mat surface-mat-tinted" : `surface-${surface}`}`}><p className="sr-only">Drag prints to move them. Click or tap to flip; double-click or double-tap to open. Space to flip, Enter to open; use arrow keys to move a focused print.</p>
      <div className={`pile-stack${shuffling ? " is-shuffling" : ""}`} inert={shuffling}>{pile.map((photo, i) => positions[i] && <PilePrint key={i} tapeSeed={tapeSeed} photo={photo} index={i} position={positions[i]} busy={shuffling} flipped={!!flipped[photo.slug]} flip={() => flip(photo.slug)} raise={() => ++top.current} open={open} />)}</div>
      {surface !== "linen" && <span className="mat-label">A2 · SELF-HEALING · 1 SQ = 1 IN</span>}
    </div>
    <div className="pile-controls"><button className="shuffle-button" disabled={shuffling} onClick={shuffle}><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M3 6h3c5 0 7 12 12 12h3m-4-4 4 4-4 4M3 18h3c2 0 3-2 4-4m4-4c1-2 2-4 4-4h3m-4-4 4 4-4 4" /></svg>shuffle pile</button><button disabled={shuffling} onClick={flipAll}><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M3 10a9 9 0 1 1 2 8M3 4v6h6" /></svg>flip all</button><span><span className="pile-hint-pointer">drag · click to flip · double-click to open</span><span className="pile-hint-touch">drag · tap to flip · double-tap to open</span></span></div>
  </section>;
}

function PilePrint({ photo, tapeSeed, index, position, busy, flipped, flip, raise, open }: { photo: Photo; tapeSeed: number; index: number; position: Position; busy: boolean; flipped: boolean; flip: () => void; raise: () => number; open: (photo: Photo) => void }) {
  const drag = useRef<{ id: number; x: number; y: number; left: number; top: number; moved: boolean } | null>(null);
  const clickTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const elementRef = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const print = elementRef.current;
    const title = print?.querySelector<HTMLElement>(".pile-title");
    const front = print?.querySelector<HTMLElement>(".pile-front");
    if (!print || !title || !front) return;
    let active = true;
    const fit = () => {
      if (!active) return;
      title.classList.remove("is-multiline");
      title.style.removeProperty("font-size");
      front.style.removeProperty("padding-bottom");
      const proportional = matchMedia("(max-width: 640px)").matches;
      const bottomStrip = parseFloat(getComputedStyle(front).paddingBottom);
      const captionOffset = parseFloat(getComputedStyle(title).bottom);
      if (title.scrollWidth <= title.clientWidth) return;
      title.classList.add("is-multiline");
      let size = parseFloat(getComputedStyle(title).fontSize);
      const minimum = proportional ? 11 : 1;
      while (title.offsetHeight > parseFloat(getComputedStyle(title).lineHeight) * 2 + 1 && size > minimum) {
        size = Math.max(minimum, size - .5);
        title.style.fontSize = `${size}px`;
      }
      // Grow only this print's caption band; its outer size and position stay fixed.
      front.style.paddingBottom = `${Math.max(bottomStrip, title.offsetHeight + captionOffset * 2)}px`;
    };
    fit();
    const observer = new ResizeObserver(fit);
    observer.observe(print, { box: "border-box" });
    const mobile = matchMedia("(max-width: 760px)");
    const proportional = matchMedia("(max-width: 640px)");
    mobile.addEventListener("change", fit);
    proportional.addEventListener("change", fit);
    document.fonts.ready.then(fit);
    document.fonts.addEventListener("loadingdone", fit);
    return () => {
      active = false;
      observer.disconnect();
      mobile.removeEventListener("change", fit);
      proportional.removeEventListener("change", fit);
      document.fonts.removeEventListener("loadingdone", fit);
    };
  }, [photo.title, position.width]);
  useLayoutEffect(() => {
    const element = elementRef.current;
    if (!element) return;
    const rotation = getComputedStyle(element).getPropertyValue("--rotation");
    const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const delay = reduced ? 0 : index * 30;
    element.style.visibility = "visible";
    const fade = element.animate([{ opacity: 0 }, { opacity: 1 }], { duration: reduced ? 150 : 250, delay, fill: "backwards" });
    const settle = reduced ? null : element.animate([
      { transform: `translateY(8px) rotate(calc(${rotation} + ${index % 2 ? 2 : -2}deg))` },
      { transform: `translateY(0) rotate(${rotation})` },
    ], { duration: 450, delay, easing: "cubic-bezier(.3,1.25,.5,1)", fill: "backwards" });
    // A user's first interaction takes precedence over the introductory motion.
    const stop = () => { fade.cancel(); settle?.cancel(); };
    element.addEventListener("pointerdown", stop);
    element.addEventListener("focus", stop);
    return () => { stop(); element.removeEventListener("pointerdown", stop); element.removeEventListener("focus", stop); };
  }, [index]);

  useLayoutEffect(() => {
    elementRef.current?.classList.remove("is-pressed");
  }, [flipped]);
  const previousFlipped = useRef(flipped);
  useLayoutEffect(() => {
    if (previousFlipped.current === flipped) return;
    const wasFlipped = previousFlipped.current;
    previousFlipped.current = flipped;
    const element = elementRef.current!;
    const inner = element.querySelector<HTMLElement>(".pile-inner")!;
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (!element.classList.contains("is-flipping")) {
      element.classList.add("is-flipping");
      inner.style.transition = "none";
      inner.style.transform = `rotateY(${wasFlipped ? 180 : 0}deg)`;
      // Establish the starting face before transitioning to the new flip state.
      inner.getBoundingClientRect();
      inner.style.removeProperty("transition");
      inner.style.removeProperty("transform");
    }
    const timer = setTimeout(() => element.classList.remove("is-flipping"), 700);
    return () => clearTimeout(timer);
  }, [flipped]);
  const instructionId = useId();
  const cancelClick = useCallback(() => { if (clickTimer.current !== null) clearTimeout(clickTimer.current); clickTimer.current = null; }, []);
  useEffect(() => {
    cancelClick();
    elementRef.current?.classList.remove("is-pressed");
    return cancelClick;
  }, [busy, position, cancelClick]);
  const style = { visibility: "hidden", left: position.x, top: position.y, width: position.width, height: position.height, "--desktop-print-width": (photo.width ?? 3) > (photo.height ?? 4) ? 220 : 170, "--rotation": `${position.rotation}deg` } as CSSProperties;
  const move = (element: HTMLElement, x: number, y: number) => {
    const parent = element.parentElement!;
    const bottomInset = window.matchMedia("(max-width: 640px)").matches ? 28 : 0;
    const point = clampPosition(x, y, position, parent.clientWidth, parent.clientHeight - bottomInset);
    element.style.left = `${point.x}px`; element.style.top = `${point.y}px`;
  };
  const stampDate = /^\d{4}-\d{2}-\d{2}/.test(photo.date) ? `${photo.date.slice(5, 7)}.${photo.date.slice(8, 10)}.${photo.date.slice(2, 4)}` : "UNDATED";
  return <div ref={elementRef} className={`pile-print${flipped ? " is-flipped" : ""}`} style={style} tabIndex={0} role="group" aria-label={`${photo.title}. ${flipped ? "Back" : "Front"}.`} aria-describedby={instructionId}
    onDragStart={(event) => event.preventDefault()}
    onFocus={(event) => { event.currentTarget.style.zIndex = String(raise()); }}
    onPointerDown={(event) => {
      if (busy || event.button !== 0 || !event.isPrimary || (event.target as HTMLElement).closest("a")) return;
      const element = event.currentTarget;
      element.style.zIndex = String(raise());
      element.classList.add("is-pressed"); element.setPointerCapture(event.pointerId);
      drag.current = { id: event.pointerId, x: event.clientX, y: event.clientY, left: element.offsetLeft, top: element.offsetTop, moved: false };
    }}
    onPointerMove={(event) => {
      const start = drag.current;
      if (!start || start.id !== event.pointerId) return;
      const dx = event.clientX - start.x, dy = event.clientY - start.y;
      if (Math.hypot(dx, dy) > 4) { start.moved = true; cancelClick(); }
      if (start.moved) { event.currentTarget.classList.add("is-dragging"); move(event.currentTarget, start.left + dx, start.top + dy); }
    }}
    onPointerUp={(event) => {
      const start = drag.current;
      if (!start || start.id !== event.pointerId) return;
      event.currentTarget.classList.remove("is-dragging"); drag.current = null;
      if (start.moved || Math.hypot(event.clientX - start.x, event.clientY - start.y) > 4) { cancelClick(); event.currentTarget.classList.remove("is-pressed"); return; }
      if (clickTimer.current !== null) { cancelClick(); event.currentTarget.classList.remove("is-pressed"); open(photo); }
      else clickTimer.current = setTimeout(() => { clickTimer.current = null; flip(); }, 240);
    }}
    onPointerCancel={(event) => { drag.current = null; cancelClick(); event.currentTarget.classList.remove("is-dragging", "is-pressed"); }}
    onLostPointerCapture={(event) => { drag.current = null; event.currentTarget.classList.remove("is-dragging"); }}
    onKeyDown={(event) => {
      if (busy || event.target !== event.currentTarget) return;
      if (event.key === " ") { event.preventDefault(); cancelClick(); flip(); }
      if (event.key === "Enter" || event.key.toLowerCase() === "o") { event.preventDefault(); cancelClick(); elementRef.current?.classList.remove("is-pressed"); open(photo); }
      if (event.key.startsWith("Arrow")) { event.preventDefault(); const el = event.currentTarget; move(el, el.offsetLeft + (event.key === "ArrowLeft" ? -12 : event.key === "ArrowRight" ? 12 : 0), el.offsetTop + (event.key === "ArrowUp" ? -12 : event.key === "ArrowDown" ? 12 : 0)); }
    }}>
    <span id={instructionId} className="sr-only">Space to flip, Enter to open</span>
    <div className="pile-lift">
    <div className="pile-inner">
      <div className="pile-face pile-front" aria-hidden={flipped}><PhotoImage photo={photo} sizes={`${position.width - 18}px`} /><span className="pile-title">{photo.title}</span><PrintTape photo={photo} seed={tapeSeed} /></div>
      <div className="pile-face pile-back" aria-hidden={!flipped} inert={!flipped}>
        <div className="pile-note"><strong>{photo.title}</strong><p>{photo.story}</p></div>
        <Link href={`/?view=table&photo=${encodeURIComponent(photo.slug)}`} tabIndex={flipped ? 0 : -1} onClick={(event) => { cancelClick(); if (!event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey) { event.preventDefault(); open(photo); } }}>open →</Link>
        <span className="pile-stamp">{photo.place} · {stampDate}</span>
      </div>
    </div>
    </div>
  </div>;
}
