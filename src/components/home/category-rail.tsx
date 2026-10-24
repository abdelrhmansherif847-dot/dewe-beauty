import Link from "next/link";
import type { CSSProperties } from "react";
import { ProductArt } from "@/components/art/product-art";
import type { Category } from "@/lib/catalog";

const TILE_BACKGROUNDS = ["#F9E1E3", "#F7C9B8", "#F6E3D4", "#EFD3CF", "#F3DCC4"];
const SAMPLE_SLUG: Record<string, string> = {
  skincare: "dew-drop-hydrating-serum",
  makeup: "blush-bloom-cheek",
  lips: "rose-satin-lip-tint",
  fragrance: "blush-hour-eau",
  body: "peach-silk-body-oil",
};

export function CategoryRail({ categories }: { categories: Category[] }) {
  return (
    <div className="category-rail">
      {categories.map((c, i) => (
        <Link
          key={c.slug}
          href={`/shop?category=${c.slug}`}
          className="category-tile"
          data-reveal
          style={{ "--reveal-index": i, "--tile-bg": TILE_BACKGROUNDS[i % TILE_BACKGROUNDS.length] } as CSSProperties}
        >
          <div className="category-tile__art" aria-hidden="true">
            <ProductArt
              slug={SAMPLE_SLUG[c.slug] ?? c.slug}
              name={c.name}
              brandName="DEWÉ"
              categorySlug={c.slug}
              instance={`cat-${c.slug}`}
              decorative
            />
          </div>
          <span className="category-tile__meta">0{i + 1}</span>
          <span className="category-tile__name">{c.name}</span>
        </Link>
      ))}
    </div>
  );
}
