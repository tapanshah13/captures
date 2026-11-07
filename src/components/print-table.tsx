"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState, useId, type CSSProperties } from "react";
import Link from "next/link";
import { photos, type Photo } from "@/data/captures";
import { PhotoImage } from "./photo-image";

const dateValue = (photo: Photo) => Date.parse(photo.date) || 0;
const pile = photos.filter((photo) => photo.favorite).sort((a, b) => dateValue(b) - dateValue(a));
type Position = { x: number; y: number; rotation: number; width: number; height: number };

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
  const top = useRef(20);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const [positions, setPositions] = useState<Position[]>([]);
  const initialLayout = useRef<Position[] | null>(null);
  const lastWidth = useRef<number | null>(null);
  const [flipped, setFlipped] = useState<Record<string, boolean>>({});
  const [shuffling, setShuffling] = useState(false);
  const animating = useRef(false);
  const makeScatter = useCallback((order = pile.map((_, i) => i)) => {
    const element = board.current;
    if (!element) return [];
    const width = element.clientWidth, height = element.clientHeight;
    const mobile = window.matchMedia("(max-width: 760px)").matches;
    let next: Position[] = [];
    // Thirty candidates per print; shrink only when the mat cannot fit readable prints.
    for (let scale = 1; scale >= .5; scale -= .04) {
      next = [];
      for (const index of order) {
        const photo = pile[index];
        const landscape = (photo.width ?? 3) > (photo.height ?? 4);
        const cardWidth = Math.min(mobile ? (landscape ? 160 : 120) : (landscape ? 220 : 170), width * .65) * scale;
        let best: Position | undefined, bestScore = Infinity;
        for (let attempt = 0; attempt < 30; attempt++) {
          const p = { x: 0, y: 0, width: cardWidth, height: (cardWidth - 18) / (landscape ? 1.5 : .8) + 43, rotation: Math.random() * 28 - 14 };
          const min = clampPosition(-width, -height, p, width, height);
          const max = clampPosition(width, height, p, width, height);
          const candidate = { ...p, x: min.x + Math.random() * (max.x - min.x), y: min.y + Math.random() * (max.y - min.y) };
          const score = visibilityScore([...next, candidate]);
          const cost = score.penalty * 10000 + score.overlap;
          if (cost < bestScore) { best = candidate; bestScore = cost; }
        }
        if (best) next.push(best);
      }
      if (visibilityScore(next).penalty === 0) break;
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
      if (initialLayout.current === null) initialLayout.current = makeScatter();
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
    const order = pile.map((_, i) => i);
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
      <div className={`pile-stack${shuffling ? " is-shuffling" : ""}`} inert={shuffling}>{pile.map((photo, i) => positions[i] && <PilePrint key={photo.slug} photo={photo} index={i} position={positions[i]} busy={shuffling} flipped={!!flipped[photo.slug]} flip={() => flip(photo.slug)} raise={() => ++top.current} open={open} />)}</div>
      {surface !== "linen" && <span className="mat-label">A2 · SELF-HEALING · 1 SQ = 1 IN</span>}
    </div>
    <div className="pile-controls"><button className="shuffle-button" disabled={shuffling} onClick={shuffle}><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M3 6h3c5 0 7 12 12 12h3m-4-4 4 4-4 4M3 18h3c2 0 3-2 4-4m4-4c1-2 2-4 4-4h3m-4-4 4 4-4 4" /></svg>shuffle pile</button><button disabled={shuffling} onClick={flipAll}><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M3 10a9 9 0 1 1 2 8M3 4v6h6" /></svg>flip all</button><span>drag · click to flip · double-click to open</span></div>
  </section>;
}

function PilePrint({ photo, index, position, busy, flipped, flip, raise, open }: { photo: Photo; index: number; position: Position; busy: boolean; flipped: boolean; flip: () => void; raise: () => number; open: (photo: Photo) => void }) {
  const drag = useRef<{ id: number; x: number; y: number; left: number; top: number; moved: boolean } | null>(null);
  const clickTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const elementRef = useRef<HTMLDivElement>(null);
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
  const instructionId = useId();
  const cancelClick = useCallback(() => { if (clickTimer.current !== null) clearTimeout(clickTimer.current); clickTimer.current = null; }, []);
  useEffect(() => {
    cancelClick();
    elementRef.current?.classList.remove("is-pressed");
    return cancelClick;
  }, [busy, position, cancelClick]);
  const style = { visibility: "hidden", left: position.x, top: position.y, width: position.width, height: position.height, "--rotation": `${position.rotation}deg` } as CSSProperties;
  const move = (element: HTMLElement, x: number, y: number) => {
    const parent = element.parentElement!;
    const point = clampPosition(x, y, position, parent.clientWidth, parent.clientHeight);
    element.style.left = `${point.x}px`; element.style.top = `${point.y}px`;
  };
  const stampDate = /^\d{4}-\d{2}-\d{2}/.test(photo.date) ? `${photo.date.slice(5, 7)}.${photo.date.slice(8, 10)}.${photo.date.slice(2, 4)}` : "UNDATED";
  return <div ref={elementRef} className={`pile-print${flipped ? " is-flipped" : ""}`} style={style} tabIndex={0} role="group" aria-label={`${photo.title}. ${flipped ? "Back" : "Front"}.`} aria-describedby={instructionId}
    onDragStart={(event) => event.preventDefault()}
    onFocus={(event) => { event.currentTarget.style.zIndex = String(raise()); }}
    onBlur={(event) => { event.currentTarget.classList.remove("is-pointer-focused"); }}
    onPointerDown={(event) => {
      if (busy || event.button !== 0 || !event.isPrimary || (event.target as HTMLElement).closest("a")) return;
      const element = event.currentTarget;
      element.classList.add("is-pointer-focused");
      element.focus({ preventScroll: true }); element.style.zIndex = String(raise());
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
      event.currentTarget.classList.remove("is-pointer-focused");
      if (event.key === " ") { event.preventDefault(); cancelClick(); flip(); }
      if (event.key === "Enter" || event.key.toLowerCase() === "o") { event.preventDefault(); cancelClick(); elementRef.current?.classList.remove("is-pressed"); open(photo); }
      if (event.key.startsWith("Arrow")) { event.preventDefault(); const el = event.currentTarget; move(el, el.offsetLeft + (event.key === "ArrowLeft" ? -12 : event.key === "ArrowRight" ? 12 : 0), el.offsetTop + (event.key === "ArrowUp" ? -12 : event.key === "ArrowDown" ? 12 : 0)); }
    }}>
    <span id={instructionId} className="sr-only">Space to flip, Enter to open</span>
    <div className="pile-inner">
      <div className="pile-face pile-front" aria-hidden={flipped}><PhotoImage photo={photo} sizes="(max-width: 760px) 160px, 220px" /><span className="pile-title">{photo.title}</span>{index % 3 === 2 && <span className="pile-tape" />}</div>
      <div className="pile-face pile-back" aria-hidden={!flipped} inert={!flipped}>
        <div className="pile-note"><strong>{photo.title}</strong><p>{photo.story}</p></div>
        <Link href={`/?view=table&photo=${encodeURIComponent(photo.slug)}`} tabIndex={flipped ? 0 : -1} onClick={(event) => { cancelClick(); if (!event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey) { event.preventDefault(); open(photo); } }}>open →</Link>
        <span className="pile-stamp">{photo.place} · {stampDate}</span>
      </div>
    </div>
  </div>;
}
