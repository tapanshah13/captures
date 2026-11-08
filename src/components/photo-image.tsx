"use client";

import Image from "next/image";
import { useEffect, useRef } from "react";
import { photos, type Photo } from "@/data/captures";

export function PhotoImage({ photo, className = "", sizes = "260px", develop = false }: { photo: Photo; className?: string; sizes?: string; develop?: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  const isPhotoView = className.includes("lb-img");
  const targets = isPhotoView ? [1280, 2048] as const : [640, 1280] as const;
  const renditions = photo.sizes ? Array.from(new Map(targets.map((width) => [
    Math.min(width, photo.width ?? width), photo.sizes![width],
  ] as const)).entries()) : [];
  const srcSet = renditions.map(([width, src]) => `${src} ${width}w`).join(", ");
  useEffect(() => {
    const element = ref.current;
    if (!element || !develop) return;
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
  }, [develop]);
  // Explicit candidates serve prebuilt WebPs directly, without another compression pass.
  return <div ref={ref} style={{ ...(className.includes("lb-img") && photo.width && photo.height ? { aspectRatio: `${photo.width} / ${photo.height}` } : {}), ...(photo.blurDataURL ? { backgroundImage: `url(${photo.blurDataURL})`, backgroundSize: "cover", backgroundPosition: "center" } : {}) }} className={`photo-image ${develop ? "develop" : "photo-fade"} g${photos.findIndex((item) => item.slug === photo.slug) % 12 + 1} ${className}`}>
    {photo.src ? (renditions.length ? (
      // eslint-disable-next-line @next/next/no-img-element -- pre-optimized WebP with srcset
      <img
      src={photo.sizes![isPhotoView ? 2048 : 640]} srcSet={srcSet} sizes={sizes}
      alt={photo.title} loading={isPhotoView ? "eager" : "lazy"} decoding="async"
      style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}
      onLoad={() => { if (!develop) ref.current?.classList.add("image-loaded"); }}
    />) : <Image onLoad={() => { if (!develop) ref.current?.classList.add("image-loaded"); }} src={photo.src} alt={photo.title} fill sizes={sizes} unoptimized placeholder={photo.blurDataURL ? "blur" : "empty"} blurDataURL={photo.blurDataURL} />) : <span className="sr-only">Sample image: {photo.title}</span>}
  </div>;
}
