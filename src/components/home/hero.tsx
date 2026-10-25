import Link from "next/link";
import type { CSSProperties } from "react";
import { Spotlight } from "@/components/aceternity/spotlight-new";
import { ProductArt } from "@/components/art/product-art";
import { CashIcon, DropIcon, SparkleIcon } from "@/components/ui/icons";
import type { ProductSummary } from "@/lib/catalog";
import { formatPriceRange } from "@/lib/money";

const TITLE = [["Your", "everyday"], ["glow"]];

// Warm campaign light in the brand's champagne, peach and blush, kept faint so
// it reads as daylight on ivory rather than a glow effect.
const LIGHT = {
  gradientFirst:
    "radial-gradient(68.54% 68.72% at 55.02% 31.46%, rgb(235 196 154 / 0.28) 0, rgb(247 201 184 / 0.12) 28%, rgb(249 225 227 / 0) 45%)",
  gradientSecond:
    "radial-gradient(50% 50% at 50% 50%, rgb(235 196 154 / 0.18) 0, rgb(249 225 227 / 0.08) 80%, transparent 100%)",
  gradientThird:
    "radial-gradient(50% 50% at 50% 50%, rgb(247 201 184 / 0.16) 0, rgb(249 225 227 / 0.06) 80%, transparent 100%)",
};

/**
 * Cinematic but cheap: the headline rises word by word and the arch catches
 * one sweep of light, all in CSS so it runs before hydration and never blocks
 * the largest contentful paint. Behind it, two slow beams of warm light (the
 * Aceternity Spotlight) drift like studio light; they hold still when the
 * visitor prefers reduced motion.
 */
export function Hero({ spotlight }: { spotlight: ProductSummary | null }) {
  let wordIndex = 0;
  return (
    <section className="hero" aria-labelledby="hero-title">
      <div className="hero__light">
        <Spotlight {...LIGHT} duration={12} xOffset={70} />
      </div>
      <div className="container hero__grid">
        <div className="hero__copy">
          <p className="eyebrow hero__fade" style={{ "--i": 0 } as CSSProperties}>
            Multi-brand beauty · Skincare, colour, fragrance
          </p>
          <h1 id="hero-title" className="hero__title">
            {TITLE.map((line, li) => (
              <span className="line" key={li}>
                {line.map((word) => {
                  const i = wordIndex++;
                  return (
                    <span
                      key={word}
                      className={`word${word === "glow" ? " italic-accent" : ""}`}
                      style={{ "--i": i } as CSSProperties}
                    >
                      {word}
                      {" "}
                    </span>
                  );
                })}
              </span>
            ))}
          </h1>
          <p className="arabic hero__arabic hero__fade" lang="ar" style={{ "--i": 1 } as CSSProperties}>
            نضارتك. لمعتك. إنتِ.
          </p>
          <p className="lede hero__fade" style={{ "--i": 2 } as CSSProperties}>
            Skincare, makeup and fragrance from the brands we carry, chosen for skin that looks rested, dewy and like
            you. Pay in cash when it arrives.
          </p>
          <div className="hero__actions hero__fade" style={{ "--i": 3 } as CSSProperties}>
            <Link href="/collections/everyday-glow-edit" className="btn">
              Shop the glow edit
            </Link>
            <Link href="/brands" className="btn btn--ghost">
              Explore brands
            </Link>
          </div>
          <ul className="hero__facts hero__fade" style={{ "--i": 4 } as CSSProperties}>
            <li>
              <CashIcon size={18} /> Cash on delivery
            </li>
            <li>
              <DropIcon size={18} /> Live stock on every product
            </li>
            <li>
              <SparkleIcon size={18} /> Order history in your account
            </li>
          </ul>
        </div>

        <div className="hero__visual">
          <div className="hero__arch">
            {spotlight ? (
              <ProductArt
                slug={spotlight.slug}
                name={spotlight.name}
                brandName={spotlight.brandName}
                categorySlug={spotlight.categorySlug}
                instance="hero"
                decorative
              />
            ) : (
              <ProductArt slug="dewe-hero" name="DEWÉ" brandName="DEWÉ" categorySlug="skincare" instance="hero" decorative />
            )}
          </div>
          <span className="dew" style={{ width: 46, height: 46, left: "8%", top: "22%", animationDelay: "900ms" }} aria-hidden="true" />
          <span className="dew" style={{ width: 22, height: 22, left: "14%", top: "34%", animationDelay: "1100ms" }} aria-hidden="true" />
          <span className="dew" style={{ width: 30, height: 30, right: "4%", bottom: "28%", animationDelay: "1300ms" }} aria-hidden="true" />
          <svg className="glint" viewBox="0 0 24 24" style={{ right: "18%", top: "12%", animationDelay: "1.6s" }} aria-hidden="true">
            <path d="M12 0c.7 6 5.3 11.3 12 12-6.7.7-11.3 6-12 12-.7-6-5.3-11.3-12-12 6.7-.7 11.3-6 12-12Z" fill="currentColor" />
          </svg>
          {spotlight && (
            <Link
              href={`/products/${spotlight.slug}`}
              className="panel hero__fade hero__spotlight"
              style={{ "--i": 5 } as CSSProperties}
            >
              <span className="product-card__brand">{spotlight.brandName}</span>
              <span className="product-card__name" style={{ display: "block", fontSize: "1.1rem" }}>
                {spotlight.name}
              </span>
              <span className="product-card__price">{formatPriceRange(spotlight.minPriceCents, spotlight.maxPriceCents)}</span>
            </Link>
          )}
          <p className="hero__caption">Illustrative artwork. Product photography to follow.</p>
        </div>
      </div>
    </section>
  );
}
