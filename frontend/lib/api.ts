export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:8000";

const TOKEN_KEY = "aegisai_token";

// NOTE: localStorage is readable by any script on the page (XSS). Fine for a
// student project; for production move the token into an httpOnly cookie.
export const getToken = (): string | null =>
  typeof window === "undefined" ? null : window.localStorage.getItem(TOKEN_KEY);

export const setToken = (token: string) => window.localStorage.setItem(TOKEN_KEY, token);

export const clearToken = () => window.localStorage.removeItem(TOKEN_KEY);

/** fetch() against the API with the Bearer token attached; sends you to /login on 401. */
export async function apiFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const headers = new Headers(init.headers);
  const token = getToken();
  if (token) headers.set("Authorization", `Bearer ${token}`);

  const res = await fetch(`${API_URL}${path}`, { ...init, headers });

  if (res.status === 401 && typeof window !== "undefined") {
    clearToken();
    // Hard navigation on purpose: it also throws away any in-memory state of the old session.
    // eslint-disable-next-line @next/next/no-location-assign-relative-destination
    window.location.href = "/login";
  }
  return res;
}

/** Pull a readable message out of the different error shapes the API returns. */
export function errorMessage(data: unknown, fallback = "Something went wrong"): string {
  if (!data || typeof data !== "object") return fallback;
  const d = data as { detail?: unknown; error?: { message?: string } };
  if (typeof d.detail === "string") return d.detail;
  if (Array.isArray(d.detail) && d.detail[0]?.msg) return String(d.detail[0].msg);
  if (d.error?.message) return d.error.message;
  return fallback;
}
