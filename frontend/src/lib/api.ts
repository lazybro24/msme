export const API_URL =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") || "http://localhost:4000";

const TOKEN_KEY = "msme_token";
const USER_KEY = "msme_user";

export type AuthUser = {
  id: string;
  email: string;
  fullName: string;
  roles: string[];
  orgName?: string;
  mobile?: string;
  designation?: string;
  mfaEnabled?: boolean;
  recommendedSlugs?: string[];
  categoryCodes?: string[];
  expertise?: string;
  affiliation?: string;
  bio?: string;
  linkedin?: string;
  website?: string;
  photoUrl?: string;
  conductAcceptedAt?: string;
  active?: boolean;
  notes?: string;
};

export function getToken() {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function getStoredUser(): AuthUser | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as AuthUser;
  } catch {
    return null;
  }
}

export function setSession(token: string, user: AuthUser) {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function clearSession() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

export async function api<T>(
  path: string,
  options: RequestInit & { auth?: boolean } = {},
): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };
  if (options.auth !== false) {
    const token = getToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  }
  const res = await fetch(`${API_URL}${path}`, { ...options, headers });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = (data as { error?: unknown }).error;
    let message: string;
    if (typeof err === "string") {
      message = err;
    } else if (err && typeof err === "object") {
      const flat = err as { formErrors?: string[]; fieldErrors?: Record<string, string[]> };
      const parts = [
        ...(flat.formErrors ?? []),
        ...Object.entries(flat.fieldErrors ?? {}).flatMap(([k, v]) =>
          (v ?? []).map((m) => `${k}: ${m}`),
        ),
      ];
      message = parts.length ? parts.join("; ") : JSON.stringify(err);
    } else {
      message = `Request failed (${res.status})`;
    }
    throw new Error(message);
  }
  return data as T;
}

export async function apiPost<T>(path: string, body: unknown, auth = true): Promise<T> {
  return api<T>(path, { method: "POST", body: JSON.stringify(body), auth });
}

export async function apiGet<T>(path: string, auth = true): Promise<T> {
  return api<T>(path, { method: "GET", auth });
}

export async function apiPatch<T>(path: string, body: unknown, auth = true): Promise<T> {
  return api<T>(path, { method: "PATCH", body: JSON.stringify(body), auth });
}

export async function apiPut<T>(path: string, body: unknown, auth = true): Promise<T> {
  return api<T>(path, { method: "PUT", body: JSON.stringify(body), auth });
}

export async function apiDelete<T>(path: string, auth = true): Promise<T> {
  return api<T>(path, { method: "DELETE", auth });
}
