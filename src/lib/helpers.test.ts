import { describe, expect, it } from "vitest";
import { deliveryFeeFor } from "@/components/cart/cart-summary";
import { resolveSiteUrl } from "./env";
import { formatMoney, formatPriceRange } from "./money";
import { safeNext } from "./safe-redirect";
import { stockLabel, stockLevel } from "./stock";

describe("formatMoney", () => {
  it("formats piastres as Egyptian pounds", () => {
    expect(formatMoney(64000)).toMatch(/EGP\s?640/);
    expect(formatMoney(120000)).toMatch(/1,200/);
    expect(formatMoney(4250)).toMatch(/42\.5/);
  });

  it("shows a range as a starting price", () => {
    expect(formatPriceRange(64000, 89000)).toMatch(/^From EGP\s?640/);
    expect(formatPriceRange(64000, 64000)).not.toMatch(/From/);
  });
});

describe("stock", () => {
  it("labels sold out, low and plentiful stock", () => {
    expect(stockLevel(0)).toBe("out");
    expect(stockLabel(0)).toBe("Sold out");
    expect(stockLevel(3)).toBe("low");
    expect(stockLabel(3)).toBe("Only 3 left");
    expect(stockLevel(30)).toBe("in");
    expect(stockLabel(30)).toBe("In stock");
  });
});

describe("safeNext", () => {
  it("allows same-site paths", () => {
    expect(safeNext("/checkout")).toBe("/checkout");
    expect(safeNext("/orders/abc?placed=1")).toBe("/orders/abc?placed=1");
  });

  it("falls back for anything that could leave the site", () => {
    expect(safeNext("https://evil.example")).toBe("/account");
    expect(safeNext("//evil.example")).toBe("/account");
    expect(safeNext("/\\evil.example")).toBe("/account");
    expect(safeNext(null)).toBe("/account");
  });
});

describe("resolveSiteUrl", () => {
  it("prefers the explicit setting and drops a trailing slash", () => {
    expect(
      resolveSiteUrl({ NEXT_PUBLIC_SITE_URL: "https://shop.example/", VERCEL_URL: "x.vercel.app" }),
    ).toBe("https://shop.example");
  });

  it("uses the production domain on production deployments", () => {
    expect(
      resolveSiteUrl({
        VERCEL_ENV: "production",
        VERCEL_PROJECT_PRODUCTION_URL: "dewe.example",
        VERCEL_URL: "dewe-abc123.vercel.app",
      }),
    ).toBe("https://dewe.example");
  });

  it("uses the branch address on previews", () => {
    expect(
      resolveSiteUrl({
        VERCEL_ENV: "preview",
        VERCEL_BRANCH_URL: "dewe-git-feature.vercel.app",
        VERCEL_URL: "dewe-abc123.vercel.app",
      }),
    ).toBe("https://dewe-git-feature.vercel.app");
  });

  it("falls back to localhost outside Vercel", () => {
    expect(resolveSiteUrl({})).toBe("http://localhost:3000");
  });
});

describe("deliveryFeeFor", () => {
  const settings = {
    currency: "EGP",
    deliveryFeeCents: 6000,
    freeDeliveryThresholdCents: 100000,
    codEnabled: true,
    maxQuantityPerItem: 10,
  };

  it("charges the flat fee below the free-delivery threshold", () => {
    expect(deliveryFeeFor(99999, settings)).toBe(6000);
  });

  it("is free at or above the threshold", () => {
    expect(deliveryFeeFor(100000, settings)).toBe(0);
  });

  it("always charges the fee when there is no threshold", () => {
    expect(deliveryFeeFor(500000, { ...settings, freeDeliveryThresholdCents: null })).toBe(6000);
  });
});
