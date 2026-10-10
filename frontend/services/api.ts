import type { Dashboard, HistoryPage, ScanDetail, ScanSummary } from "./types";

export const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";
const TOKEN_KEY = "aegis_token";

export const auth = {
  get: () => (typeof window === "undefined" ? null : window.localStorage.getItem(TOKEN_KEY)),
  set: (t: string) => window.localStorage.setItem(TOKEN_KEY, t),
  clear: () => window.localStorage.removeItem(TOKEN_KEY),
};

export class ApiError extends Error {
  constructor(message: string, public status: number) {
    super(message);
  }
}

function errorMessage(data: unknown, fallback: string): string {
  const detail = (data as { detail?: unknown })?.detail;
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail) && detail[0]?.msg) return String(detail[0].msg);
  return fallback;
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = auth.get();
  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...init.headers,
    },
  });
  if (res.status === 204) return undefined as T;
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    if (res.status === 401 && token) {
      auth.clear();
      if (typeof window !== "undefined") window.location.href = "/login";
    }
    throw new ApiError(errorMessage(data, "Request failed"), res.status);
  }
  return data as T;
}

export const api = {
  login: (email: string, password: string) =>
    request<{ access_token: string }>("/auth/login", { method: "POST", body: JSON.stringify({ email, password }) }),
  register: (email: string, password: string, full_name: string) =>
    request("/auth/register", { method: "POST", body: JSON.stringify({ email, password, full_name }) }),
  me: () => request<{ email: string; full_name: string }>("/auth/me"),
  dashboard: () => request<Dashboard>("/dashboard/"),
  startScan: (target: string, authorized: boolean) =>
    request<ScanSummary>("/scanner/start", { method: "POST", body: JSON.stringify({ target, authorized }) }),
  scan: (id: number) => request<ScanDetail>(`/scanner/${id}`),
  history: (params: { page?: number; search?: string; risk_level?: string }) => {
    const q = new URLSearchParams();
    q.set("page", String(params.page ?? 1));
    if (params.search) q.set("search", params.search);
    if (params.risk_level) q.set("risk_level", params.risk_level);
    return request<HistoryPage>(`/history/?${q}`);
  },
  deleteScan: (id: number) => request<void>(`/history/${id}`, { method: "DELETE" }),
  downloadReport: async (filename: string) => {
    const res = await fetch(`${API_URL}/reports/download/${encodeURIComponent(filename)}`, {
      headers: { Authorization: `Bearer ${auth.get()}` },
    });
    if (!res.ok) throw new ApiError("Report could not be downloaded", res.status);
    const url = URL.createObjectURL(await res.blob());
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  },
};
