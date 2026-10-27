import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/site";

export default function sitemap(): MetadataRoute.Sitemap {
  const routes = [
    { path: "/yol-hesabi", priority: 1 },
    { path: "/sarj-butcesi", priority: 0.9 },
    { path: "/ev-ve-fatura", priority: 0.9 },
  ];

  return routes.map(({ path, priority }) => ({
    url: `${siteUrl}${path}`,
    lastModified: new Date(),
    changeFrequency: "weekly",
    priority,
  }));
}
