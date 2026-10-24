import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/env";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/checkout", "/account", "/orders", "/auth"] },
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}
