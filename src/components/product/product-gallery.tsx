"use client";

import Image from "next/image";
import { AnimatePresence, m } from "motion/react";
import { useState } from "react";
import { PlaceholderTag, ProductArt } from "@/components/art/product-art";

type Frame =
  | { kind: "image"; key: string; url: string; alt: string }
  | { kind: "art"; key: string; view: "front" | "detail" | "texture"; label: string };

export function ProductGallery({
  slug,
  name,
  brandName,
  categorySlug,
  tint,
  images,
}: {
  slug: string;
  name: string;
  brandName: string;
  categorySlug: string | null;
  tint: string | null;
  images: { id: string; url: string; alt: string; isPlaceholder: boolean }[];
}) {
  const real = images.filter((i) => !i.isPlaceholder);
  const frames: Frame[] = real.length
    ? real.map((i) => ({ kind: "image", key: i.id, url: i.url, alt: i.alt || name }))
    : [
        { kind: "art", key: "front", view: "front", label: "Front view" },
        { kind: "art", key: "detail", view: "detail", label: "Detail view" },
        { kind: "art", key: "texture", view: "texture", label: "Texture" },
      ];
  const [index, setIndex] = useState(0);
  const active = frames[Math.min(index, frames.length - 1)];

  const render = (frame: Frame, thumb = false) =>
    frame.kind === "image" ? (
      <Image
        src={frame.url}
        alt={thumb ? "" : frame.alt}
        fill={!thumb}
        width={thumb ? 76 : undefined}
        height={thumb ? 95 : undefined}
        sizes={thumb ? "76px" : "(max-width: 900px) 100vw, 55vw"}
        priority={!thumb}
      />
    ) : (
      <ProductArt
        slug={slug}
        name={name}
        brandName={brandName}
        categorySlug={categorySlug}
        tint={tint}
        view={frame.view}
        instance={thumb ? `thumb-${frame.key}` : `stage-${tint ?? "x"}`}
        decorative={thumb}
      />
    );

  return (
    <div className="gallery" aria-roledescription="gallery" aria-label={`${name} images`}>
      <div className="gallery__thumbs" role="tablist" aria-label="Choose image">
        {frames.map((frame, i) => (
          <button
            key={frame.key}
            type="button"
            role="tab"
            className="gallery__thumb"
            aria-selected={i === index}
            aria-current={i === index}
            aria-label={frame.kind === "art" ? frame.label : `Image ${i + 1}`}
            onClick={() => setIndex(i)}
          >
            {render(frame, true)}
          </button>
        ))}
      </div>
      <div className="gallery__stage" role="tabpanel">
        <AnimatePresence initial={false} mode="popLayout">
          <m.div
            key={`${active.key}-${tint ?? ""}`}
            className="gallery__frame"
            initial={{ opacity: 0, scale: 1.03 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          >
            {render(active)}
          </m.div>
        </AnimatePresence>
        {active.kind === "art" && <PlaceholderTag />}
      </div>
    </div>
  );
}
