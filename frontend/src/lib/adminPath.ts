/**
 * Obscure admin console base path — not linked from public UI.
 * Bookmark: /3e8e287e2388/login
 */
export const ADMIN_PATH = "3e8e287e2388";
export const ADMIN_BASE = `/${ADMIN_PATH}`;

export function adminHref(subpath = ""): string {
  if (!subpath || subpath === "/") return ADMIN_BASE;
  const clean = subpath.startsWith("/") ? subpath : `/${subpath}`;
  return `${ADMIN_BASE}${clean}`;
}
