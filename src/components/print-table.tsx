"use client";

import { useCallback, useEffect, useRef, useState, type CSSProperties } from "react";
import Link from "next/link";
import { photos, type Photo } from "@/data/captures";
import { PhotoImage } from "./photo-image";

const dateValue = (photo: Photo) => Date.parse(photo.date) || 0;
const pile = [...photos].sort((a, b) => Number(!!b.favorite) - Number(!!a.favorite) || dateValue(b) - dateValue(a)).slice(0, 12);
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
  let penalty = 0;
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
    // A small margin over 60% accounts for sampling at the paper edges.
    penalty += Math.max(0, covered - 36) ** 2;
  }
  return penalty;
}

export function PrintTable({ surface, open }: { surface: "mat" | "linen"; open: (photo: Photo) => void }) {
  const board = useRef<HTMLDivElement>(null);
  const top = useRef(20);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const [positions, setPositions] = useState<Position[]>([]);
  const [flipped, setFlipped] = useState<Record<string, boolean>>({});
  const scatter = useCallback(() => {
    const element = board.current;
    if (!element) return;
    const width = element.clientWidth, height = element.clientHeight;
    const mobile = window.matchMedia("(max-width: 760px)").matches;
    const columns = mobile ? 2 : 4, rows = Math.ceil(pile.length / columns);
    const candidate = (i: number, scale: number): Position => {
      const photo = pile[i];
      const landscape = (photo.width ?? 3) > (photo.height ?? 4);
      const cardWidth = Math.min(mobile ? (landscape ? 160 : 120) : (landscape ? 220 : 170), width * .65) * scale;
      const p = { x: 0, y: 0, width: cardWidth, height: ((cardWidth - 18) / (landscape ? 1.5 : .8) + 43), rotation: Math.random() * 28 - 14 };
      const x = (i % columns + .5) * width / columns - p.width / 2 + (Math.random() - .5) * .36 * width / columns;
      const y = 30 + Math.floor(i / columns) * (height - p.height - 60) / Math.max(1, rows - 1) + (Math.random() - .5) * 100;
      return { ...p, ...clampPosition(x, y, p, width, height) };
    };
    let next: Position[] = [];
    // Resample crowded cards rather than allowing a random pile to bury a photo.
    // On especially narrow mats, modestly reduce paper size only if needed.
    for (let scale = 1; scale >= .6; scale -= .04) {
      next = pile.map((_, i) => candidate(i, scale));
      let score = visibilityScore(next);
      for (let attempt = 0; score > 0 && attempt < 360; attempt++) {
        const index = attempt % next.length;
        const proposal = next.map((p, i) => i === index ? candidate(i, scale) : p);
        const proposedScore = visibilityScore(proposal);
        if (proposedScore <= score) { next = proposal; score = proposedScore; }
      }
      if (score === 0) break;
    }
    element.querySelectorAll<HTMLElement>(".pile-print").forEach((print) => { print.style.zIndex = ""; });
    setPositions(next);
  }, []);
  useEffect(() => {
    const frame = requestAnimationFrame(scatter);
    let timeout: ReturnType<typeof setTimeout>;
    const observer = new ResizeObserver(() => { clearTimeout(timeout); timeout = setTimeout(scatter, 200); });
    if (board.current) observer.observe(board.current);
    return () => { cancelAnimationFrame(frame); clearTimeout(timeout); observer.disconnect(); timers.current.forEach(clearTimeout); };
  }, [scatter]);
  const flip = (slug: string) => setFlipped((previous) => ({ ...previous, [slug]: !previous[slug] }));
  const flipAll = () => {
    timers.current.forEach(clearTimeout);
    const next = !pile.every((photo) => flipped[photo.slug]);
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    timers.current = pile.map((photo, i) => setTimeout(() => setFlipped((previous) => ({ ...previous, [photo.slug]: next })), reduced ? 0 : i * 60));
  };
  return <section className="table-board" aria-label={`${surface === "mat" ? "Cutting mat" : "Linen"} photo pile`}>
    <div ref={board} className={`pile-surface surface-${surface}`}><p className="sr-only">Drag prints to move them. Double-click or double-tap to flip. Focus a print and press Enter or Space to flip; use arrow keys to move it.</p>
      <div className="pile-stack">{pile.map((photo, i) => positions[i] && <PilePrint key={photo.slug} photo={photo} index={i} position={positions[i]} flipped={!!flipped[photo.slug]} flip={() => flip(photo.slug)} raise={() => ++top.current} open={open} />)}</div>
      {surface === "mat" && <span className="mat-label">A2 · SELF-HEALING · 1 SQ = 1 IN</span>}
    </div>
    <div className="pile-controls"><button onClick={scatter}><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M3 6h3c5 0 7 12 12 12h3m-4-4 4 4-4 4M3 18h3c2 0 3-2 4-4m4-4c1-2 2-4 4-4h3m-4-4 4 4-4 4" /></svg>shuffle pile</button><button onClick={flipAll}><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M3 10a9 9 0 1 1 2 8M3 4v6h6" /></svg>flip all</button><span>drag · double-click to flip</span></div>
  </section>;
}

function PilePrint({ photo, index, position, flipped, flip, raise, open }: { photo: Photo; index: number; position: Position; flipped: boolean; flip: () => void; raise: () => number; open: (photo: Photo) => void }) {
  const drag = useRef<{ id: number; x: number; y: number; left: number; top: number; moved: boolean } | null>(null);
  const lastTap = useRef<{ time: number; x: number; y: number } | null>(null);
  const style = { left: position.x, top: position.y, width: position.width, height: position.height, "--rotation": `${position.rotation}deg` } as CSSProperties;
  const move = (element: HTMLElement, x: number, y: number) => {
    const parent = element.parentElement!;
    const point = clampPosition(x, y, position, parent.clientWidth, parent.clientHeight);
    element.style.left = `${point.x}px`; element.style.top = `${point.y}px`;
  };
  const stampDate = /^\d{4}-\d{2}-\d{2}/.test(photo.date) ? `${photo.date.slice(5, 7)}.${photo.date.slice(8, 10)}.${photo.date.slice(2, 4)}` : "UNDATED";
  return <div className={`pile-print${flipped ? " is-flipped" : ""}`} style={style} tabIndex={0} role="group" aria-label={`${photo.title}. ${flipped ? "Back" : "Front"}. Enter or Space to flip.`}
    onDragStart={(event) => event.preventDefault()}
    onFocus={(event) => { event.currentTarget.style.zIndex = String(raise()); }}
    onPointerDown={(event) => {
      if (event.button !== 0 || !event.isPrimary || (event.target as HTMLElement).closest("a")) return;
      const element = event.currentTarget;
      element.focus({ preventScroll: true }); element.style.zIndex = String(raise());
      element.classList.add("is-dragging"); element.setPointerCapture(event.pointerId);
      drag.current = { id: event.pointerId, x: event.clientX, y: event.clientY, left: element.offsetLeft, top: element.offsetTop, moved: false };
    }}
    onPointerMove={(event) => {
      const start = drag.current;
      if (!start || start.id !== event.pointerId) return;
      const dx = event.clientX - start.x, dy = event.clientY - start.y;
      if (Math.hypot(dx, dy) > 5) start.moved = true;
      if (start.moved) move(event.currentTarget, start.left + dx, start.top + dy);
    }}
    onPointerUp={(event) => {
      const start = drag.current;
      if (!start || start.id !== event.pointerId) return;
      event.currentTarget.classList.remove("is-dragging"); drag.current = null;
      if (start.moved) { lastTap.current = null; return; }
      const previous = lastTap.current, time = performance.now();
      if (previous && time - previous.time < 350 && Math.hypot(event.clientX - previous.x, event.clientY - previous.y) < 20) { flip(); lastTap.current = null; }
      else lastTap.current = { time, x: event.clientX, y: event.clientY };
    }}
    onPointerCancel={(event) => { drag.current = null; lastTap.current = null; event.currentTarget.classList.remove("is-dragging"); }}
    onLostPointerCapture={(event) => { drag.current = null; event.currentTarget.classList.remove("is-dragging"); }}
    onKeyDown={(event) => {
      if (event.target !== event.currentTarget) return;
      if (event.key === "Enter" || event.key === " ") { event.preventDefault(); flip(); }
      if (event.key.startsWith("Arrow")) { event.preventDefault(); const el = event.currentTarget; move(el, el.offsetLeft + (event.key === "ArrowLeft" ? -12 : event.key === "ArrowRight" ? 12 : 0), el.offsetTop + (event.key === "ArrowUp" ? -12 : event.key === "ArrowDown" ? 12 : 0)); }
    }}>
    <div className="pile-inner">
      <div className="pile-face pile-front" aria-hidden={flipped}><PhotoImage photo={photo} sizes="(max-width: 760px) 160px, 220px" /><span className="pile-title">{photo.title}</span>{index % 3 === 2 && <span className="pile-tape" />}</div>
      <div className="pile-face pile-back" aria-hidden={!flipped} inert={!flipped}>
        <div className="pile-note"><strong>{photo.title}</strong><p>{photo.story}</p></div>
        <Link href={`/?view=table&photo=${encodeURIComponent(photo.slug)}`} tabIndex={flipped ? 0 : -1} onClick={(event) => { if (!event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey) { event.preventDefault(); open(photo); } }}>open →</Link>
        <span className="pile-stamp">{photo.place} · {stampDate}</span>
      </div>
    </div>
  </div>;
}
