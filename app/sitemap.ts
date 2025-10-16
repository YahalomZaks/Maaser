import type { MetadataRoute } from "next";

import { buildSitemapEntries } from "@/lib/seo";

// Static revalidate for the sitemap (24 hours)
export const revalidate = 86400;

export default function sitemap(): MetadataRoute.Sitemap {
	return buildSitemapEntries();
}
