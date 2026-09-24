import { API_URL, getToken } from "@/lib/api";

/**
 * Build a browser-openable URL for a protected API file.
 * Uses ?token= because <a href> / <img src> cannot send Authorization headers.
 */
export function authFileUrl(url?: string | null) {
  if (!url) return "";
  if (/^https?:\/\//i.test(url)) return url;

  let path = url.startsWith("/") ? url : `/${url}`;
  if (path.startsWith("/uploads/")) {
    path = `/api/files/${path.slice("/uploads/".length)}`;
  }

  const base = `${API_URL}${path}`;
  const token = getToken();
  if (!token) return base;
  return `${base}${base.includes("?") ? "&" : "?"}token=${encodeURIComponent(token)}`;
}
