import type { MetadataRoute } from "next"

export default function sitemap(): MetadataRoute.Sitemap {
  const siteUrl = process.env.AUTH_URL ?? "https://collvy.com"
  return [
    { url: siteUrl,              lastModified: new Date(), changeFrequency: "monthly", priority: 1 },
    { url: `${siteUrl}/login`,   lastModified: new Date(), changeFrequency: "yearly",  priority: 0.3 },
    { url: `${siteUrl}/register`,lastModified: new Date(), changeFrequency: "yearly",  priority: 0.5 },
  ]
}
