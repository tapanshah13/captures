"use client";

import { useLayoutEffect, useRef } from "react";
import { PhotoImage } from "./photo-image";
import { photoDate, type Photo } from "@/data/captures";

type Props = { photo: Photo; close: () => void; navigate: (direction: number) => void; restoreFocus: () => void };
export function PhotoDialog({ photo, close, navigate, restoreFocus }: Props) {
  const dialog = useRef<HTMLDialogElement>(null);
  const closeButton = useRef<HTMLButtonElement>(null);
  useLayoutEffect(() => {
    const element = dialog.current!;
    element.showModal();
    closeButton.current?.focus();
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { element.close(); document.body.style.overflow = overflow; restoreFocus(); };
  }, [restoreFocus]);
  const fields = Object.entries(photo.exif ?? {}).filter(([, value]) => value !== undefined && value !== "");
  return <dialog ref={dialog} className="lb" aria-labelledby="photo-title" aria-describedby="photo-story" onCancel={(event) => { event.preventDefault(); close(); }}
    onClick={(event) => { if (event.target === event.currentTarget) close(); }}
    onKeyDown={(event) => {
      if (event.key === "ArrowLeft" || event.key === "ArrowRight") { event.preventDefault(); navigate(event.key === "ArrowLeft" ? -1 : 1); }
      if (event.key === "Tab") {
        const controls = Array.from(dialog.current!.querySelectorAll<HTMLButtonElement>('button:not([disabled])'));
        const first = controls[0], last = controls[controls.length - 1];
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
      }
    }}>
    <button ref={closeButton} className="lb-btn lb-x" onClick={close} aria-label="Close photo (Escape)">✕</button>
    <button className="lb-btn lb-prev" onClick={() => navigate(-1)} aria-label="Previous photo (left arrow)">‹</button>
    <button className="lb-btn lb-next" onClick={() => navigate(1)} aria-label="Next photo (right arrow)">›</button>
    <div className="lb-card"><PhotoImage develop key={photo.slug} photo={photo} className="lb-img" sizes="(max-width: 760px) 90vw, 620px" /><div className="lb-meta" aria-live="polite"><h2 id="photo-title">{photo.title}</h2><div className="where">{photo.place} · <time dateTime={photo.date}>{photoDate(photo.date)}</time></div>{fields.length > 0 && <dl className="exif">{fields.map(([label, value]) => <div key={label}><dt className="l">{label}</dt><dd className="v">{value}</dd></div>)}</dl>}<p className="story" id="photo-story">“{photo.story}”</p></div></div>
  </dialog>;
}
