import type { MetadataRoute } from "next";

// The demo is not meant to be indexed.
export default function robots(): MetadataRoute.Robots {
  return { rules: { userAgent: "*", disallow: "/" } };
}
