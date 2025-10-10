import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
	const baseUrl = "https://maasroti.com";
	const currentDate = new Date();

	// Main pages for both locales
	const routes = [
		// Hebrew routes
		{
			url: `${baseUrl}/he`,
			lastModified: currentDate,
			changeFrequency: "daily" as const,
			priority: 1,
		},
		{
			url: `${baseUrl}/he/signin`,
			lastModified: currentDate,
			changeFrequency: "monthly" as const,
			priority: 0.8,
		},
		{
			url: `${baseUrl}/he/signup`,
			lastModified: currentDate,
			changeFrequency: "monthly" as const,
			priority: 0.8,
		},
		{
			url: `${baseUrl}/he/dashboard`,
			lastModified: currentDate,
			changeFrequency: "daily" as const,
			priority: 0.9,
		},
		{
			url: `${baseUrl}/he/dashboard/income`,
			lastModified: currentDate,
			changeFrequency: "daily" as const,
			priority: 0.7,
		},
		{
			url: `${baseUrl}/he/dashboard/donations`,
			lastModified: currentDate,
			changeFrequency: "daily" as const,
			priority: 0.7,
		},
		{
			url: `${baseUrl}/he/dashboard/settings`,
			lastModified: currentDate,
			changeFrequency: "weekly" as const,
			priority: 0.6,
		},
		// English routes
		{
			url: `${baseUrl}/en`,
			lastModified: currentDate,
			changeFrequency: "daily" as const,
			priority: 1,
		},
		{
			url: `${baseUrl}/en/signin`,
			lastModified: currentDate,
			changeFrequency: "monthly" as const,
			priority: 0.8,
		},
		{
			url: `${baseUrl}/en/signup`,
			lastModified: currentDate,
			changeFrequency: "monthly" as const,
			priority: 0.8,
		},
		{
			url: `${baseUrl}/en/dashboard`,
			lastModified: currentDate,
			changeFrequency: "daily" as const,
			priority: 0.9,
		},
		{
			url: `${baseUrl}/en/dashboard/income`,
			lastModified: currentDate,
			changeFrequency: "daily" as const,
			priority: 0.7,
		},
		{
			url: `${baseUrl}/en/dashboard/donations`,
			lastModified: currentDate,
			changeFrequency: "daily" as const,
			priority: 0.7,
		},
		{
			url: `${baseUrl}/en/dashboard/settings`,
			lastModified: currentDate,
			changeFrequency: "weekly" as const,
			priority: 0.6,
		},
	];

	return routes;
}
