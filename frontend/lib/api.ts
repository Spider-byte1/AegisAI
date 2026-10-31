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

/**
 * Download a finished scan's PDF report. The endpoint needs the login token, so a plain
 * <a href> link cannot be used: fetch the file with the token, then save it from memory.
 * Throws an Error with a readable message when the report is not available.
 */
export async function downloadReport(scanId: number, target: string): Promise<void> {
  const res = await apiFetch(`/scanner/report/${scanId}`);
  if (!res.ok) {
    const data = await res.json().catch(() => null);
    throw new Error(errorMessage(data, "The report is not available"));
  }
  const url = URL.createObjectURL(await res.blob());
  const link = document.createElement("a");
  link.href = url;
  link.download = `aegisai-report-${target.replace(/[^a-zA-Z0-9.-]/g, "_")}-${scanId}.pdf`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

/** GET/POST JSON and return the typed body; throws ApiError with a readable message on failure. */
export async function apiJson<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await apiFetch(path, init);
  const data: unknown = await res.json().catch(() => null);
  if (!res.ok) throw new ApiError(errorMessage(data, "Request failed"), res.status);
  return data as T;
}
