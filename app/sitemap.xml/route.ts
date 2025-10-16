import { buildSitemapEntries } from "@/lib/seo";

const XML_HEADER = '<?xml version="1.0" encoding="UTF-8"?>';

function formatIso(date: Date | string | undefined): string {
  if (!date) {
    return new Date().toISOString();
  }
  if (typeof date === "string") {
    return date;
  }
  return date.toISOString();
}

// Next.js requires config exports to be static literals (no expressions)
export const revalidate = 86400; // 24 hours

export async function GET(): Promise<Response> {
  const entries = buildSitemapEntries();

  const urlSet = entries
    .map((entry) => {
      const lines = [
        "  <url>",
        `    <loc>${entry.url}</loc>`,
        `    <lastmod>${formatIso(entry.lastModified)}</lastmod>`,
      ];

      if (entry.changeFrequency) {
        lines.push(`    <changefreq>${entry.changeFrequency}</changefreq>`);
      }

      if (typeof entry.priority === "number") {
        lines.push(`    <priority>${entry.priority}</priority>`);
      }

      const alternates = entry.alternates?.languages ?? {};
      Object.entries(alternates).forEach(([lang, href]) => {
        lines.push(`    <xhtml:link rel="alternate" hreflang="${lang}" href="${href}" />`);
      });

      lines.push("  </url>");
      return lines.join("\n");
    })
    .join("\n");

  const xml = `${XML_HEADER}
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">
${urlSet}
</urlset>`;

  return new Response(xml, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=3600",
    },
  });
}
