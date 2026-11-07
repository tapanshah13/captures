"use client";

import Image, { type ImageLoaderProps } from "next/image";
import { useEffect, useRef } from "react";
import { photos, type Photo } from "@/data/captures";

export function PhotoImage({ photo, className = "", sizes = "260px" }: { photo: Photo; className?: string; sizes?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const renditionLoader = photo.sizes ? ({ width }: ImageLoaderProps) => {
    const available = ([640, 1280, 2048] as const).map((target) => ({
      src: photo.sizes![target],
      width: Math.min(target, photo.width ?? target),
    }));
    // Select the smallest rendition that meets the request, capped at the original.
    return (available.find((image) => image.width >= width) ?? available[available.length - 1]).src;
  } : undefined;
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
  // The loader serves prebuilt WebPs directly, for local paths and future Blob URLs.
  return <div ref={ref} style={className.includes("lb-img") && photo.width && photo.height ? { aspectRatio: `${photo.width} / ${photo.height}` } : undefined} className={`photo-image develop g${photos.findIndex((item) => item.slug === photo.slug) % 12 + 1} ${className}`}>
    {photo.src ? <Image src={photo.src} alt={photo.title} fill sizes={sizes} loader={renditionLoader} unoptimized={!renditionLoader && /^https?:\/\//.test(photo.src)} placeholder={photo.blurDataURL ? "blur" : "empty"} blurDataURL={photo.blurDataURL} /> : <span className="sr-only">Sample image: {photo.title}</span>}
  </div>;
}
