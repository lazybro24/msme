import type { MetadataRoute } from "next";
import { site } from "@/content/site";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/nominate/login",
          "/nominate/dashboard",
          "/nominate/applications",
          "/nominate/documents",
          "/nominate/messages",
          "/nominate/profile",
          "/nominate/help",
          "/jury-portal",
          "/observer",
          "/secretariat",
          "/3e8e287e2388",
        ],
      },
    ],
    sitemap: `${site.url}/sitemap.xml`,
    host: site.url,
  };
}
