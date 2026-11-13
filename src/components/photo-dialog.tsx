"use client";

import { useLayoutEffect, useRef } from "react";
import { PhotoImage } from "./photo-image";
import { photoDate, type Photo } from "@/data/captures";

type Props = { photo: Photo; close: () => void; navigate: (direction: number) => void; restoreFocus: () => void };
export function PhotoDialog({ photo, close, navigate, restoreFocus }: Props) {
  const dialog = useRef<HTMLDialogElement>(null);
  const pointer = useRef<{ x: number; y: number; moved: boolean; keep: boolean; swipe: boolean } | null>(null);
  useLayoutEffect(() => {
    const element = dialog.current!;
    element.showModal();
    element.focus({ preventScroll: true });
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { element.close(); document.body.style.overflow = overflow; restoreFocus(); };
  }, [restoreFocus]);
  const fields = Object.entries(photo.exif ?? {}).filter(([, value]) => value !== undefined && value !== "");
  return <dialog ref={dialog} className="lb" tabIndex={-1} aria-labelledby="photo-title" aria-describedby="photo-story" onCancel={(event) => { event.preventDefault(); close(); }}
    onPointerDownCapture={(event) => {
      pointer.current = event.isPrimary && event.button === 0 ? {
        x: event.clientX, y: event.clientY, moved: false,
        keep: !!(event.target as Element).closest('[data-photo-keep]'),
        swipe: event.pointerType !== "mouse" && !!(event.target as Element).closest('.lb-img'),
      } : null;
    }}
    onPointerMoveCapture={(event) => {
      const start = pointer.current;
      if (start && Math.hypot(event.clientX - start.x, event.clientY - start.y) > 4) start.moved = true;
    }}
    onPointerUpCapture={(event) => {
      const start = pointer.current;
      if (!start?.swipe) return;
      const dx = event.clientX - start.x, dy = event.clientY - start.y;
      if (Math.abs(dx) >= 50 && Math.abs(dx) > Math.abs(dy) * 1.5) {
        start.moved = true;
        start.swipe = false;
        navigate(dx < 0 ? 1 : -1);
      }
    }}
    onPointerCancel={() => { pointer.current = null; }}
    onClick={(event) => {
      const start = pointer.current;
      pointer.current = null;
      if (!start || start.keep || start.moved || Math.hypot(event.clientX - start.x, event.clientY - start.y) > 4) return;
      if ((event.target as Element).closest('[data-photo-keep]') || window.getSelection()?.toString()) return;
      close();
    }}
    onKeyDown={(event) => {
      if (event.key === "ArrowLeft" || event.key === "ArrowRight") { event.preventDefault(); navigate(event.key === "ArrowLeft" ? -1 : 1); }
      if (event.key === "Tab") {
        const controls = Array.from(dialog.current!.querySelectorAll<HTMLButtonElement>('button:not([disabled])'));
        const first = controls[0], last = controls[controls.length - 1];
        if (event.shiftKey && (document.activeElement === first || document.activeElement === dialog.current)) { event.preventDefault(); last.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
      }
    }}>
    <div className="lb-backdrop" aria-hidden="true" />
    <div className="lb-stage">
    <button data-photo-keep className="lb-btn lb-x" onClick={close} aria-label="Close photo (Escape)">✕</button>
    <div data-photo-keep className="lb-navigation" role="group" aria-label="Photo navigation">
    <button data-photo-keep className="lb-btn lb-prev" onClick={() => navigate(-1)} aria-label="Previous photo (left arrow)">‹</button>
    <button data-photo-keep className="lb-btn lb-next" onClick={() => navigate(1)} aria-label="Next photo (right arrow)">›</button>
    </div>
    <div className="lb-card"><div data-photo-keep style={{ display: "contents" }}><PhotoImage key={photo.slug} photo={photo} className="lb-img" sizes="(max-width: 760px) calc(100vw - 40px), (max-width: 1168px) calc((100vw - 156px) * 0.615385), 623px" /></div><div data-photo-keep className="lb-meta" aria-live="polite"><h2 id="photo-title">{photo.title}</h2><div className="where">{photo.place} · <time dateTime={photo.date}>{photoDate(photo.date)}</time></div>{fields.length > 0 && <dl className="exif">{fields.map(([label, value]) => <div key={label}><dt className="l">{label}</dt><dd className="v">{value}</dd></div>)}</dl>}<p className="story" id="photo-story">“{photo.story}”</p></div></div>
    </div>
  </dialog>;
}
