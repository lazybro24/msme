import type { MetadataRoute } from "next";
import { site } from "@/content/site";

const publicPaths = [
  "/",
  "/about",
  "/awards",
  "/jury",
  "/event",
  "/nominate",
  "/contact",
  "/award-rules",
  "/privacy",
  "/terms",
];

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  return publicPaths.map((path) => ({
    url: path === "/" ? site.url : `${site.url}${path}`,
    lastModified: now,
    changeFrequency: path === "/" ? "weekly" : "monthly",
    priority: path === "/" ? 1 : 0.7,
  }));
}
