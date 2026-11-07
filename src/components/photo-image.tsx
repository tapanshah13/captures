"use client";

import Image from "next/image";
import { useEffect, useRef } from "react";
import { photos, type Photo } from "@/data/captures";

export function PhotoImage({ photo, className = "", sizes = "260px" }: { photo: Photo; className?: string; sizes?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let timer: ReturnType<typeof setTimeout>;
    const observer = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) {
        timer = setTimeout(() => element.classList.add("done"), motion.matches ? 0 : 200);
        observer.disconnect();
      }
    }, { threshold: 0.35 });
    observer.observe(element);
    return () => { observer.disconnect(); clearTimeout(timer); };
  }, []);
  // Remote sources work without a host allowlist; local /public photos use optimization.
  return <div ref={ref} style={className.includes("lb-img") && photo.width && photo.height ? { aspectRatio: `${photo.width} / ${photo.height}` } : undefined} className={`photo-image develop g${photos.findIndex((item) => item.slug === photo.slug) % 12 + 1} ${className}`}>
    {photo.src ? <Image src={photo.src} alt={photo.title} fill sizes={sizes} unoptimized={/^https?:\/\//.test(photo.src)} placeholder={photo.blurDataURL ? "blur" : "empty"} blurDataURL={photo.blurDataURL} /> : <span className="sr-only">Sample image: {photo.title}</span>}
  </div>;
}
