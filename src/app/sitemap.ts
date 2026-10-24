import type { MetadataRoute } from "next";
import { getBrands, searchProducts } from "@/lib/catalog";
import { siteUrl } from "@/lib/env";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [products, brands] = await Promise.all([searchProducts({ limit: 60 }), getBrands()]);
  const staticPaths = ["/", "/shop", "/brands", "/help/delivery"];
  return [
    ...staticPaths.map((p) => ({ url: `${siteUrl}${p}` })),
    ...(products.ok ? products.data.map((p) => ({ url: `${siteUrl}/products/${p.slug}` })) : []),
    ...(brands.ok ? brands.data.map((b) => ({ url: `${siteUrl}/brands/${b.slug}` })) : []),
  ];
}
