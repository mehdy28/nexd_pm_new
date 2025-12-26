// app/sitemap.ts
import { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = "https://nexdpm.com";
  const now = new Date();

  return [
    {
      url: baseUrl,
      lastModified: now,
      changeFrequency: "yearly",
      priority: 1,
    },
    {
      url: `${baseUrl}/blog`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.8,
    },

    // ✅ Add only PUBLIC marketing pages below
    // {
    //   url: `${baseUrl}/pricing`,
    //   lastModified: now,
    // },
    // {
    //   url: `${baseUrl}/features`,
    //   lastModified: now,
    // },
  ];
}
