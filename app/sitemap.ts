import type { MetadataRoute } from "next";

import { buildSitemapEntries } from "@/lib/seo";

export const revalidate = 60 * 60 * 24;

export default function sitemap(): MetadataRoute.Sitemap {
	return buildSitemapEntries();
}
