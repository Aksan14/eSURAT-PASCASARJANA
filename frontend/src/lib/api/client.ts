import axios, { AxiosError } from "axios";
import type { Envelope } from "@/types/api";

export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080";
export const WS_URL = process.env.NEXT_PUBLIC_WS_URL ?? "ws://localhost:8080/ws";

const TOKEN_KEY = "pps.persuratan.token";

export const tokenStore = {
  get(): string | null {
    if (typeof window === "undefined") return null;
    return window.localStorage.getItem(TOKEN_KEY);
  },
  set(t: string) {
    window.localStorage.setItem(TOKEN_KEY, t);
  },
  clear() {
    window.localStorage.removeItem(TOKEN_KEY);
  },
};

export const http = axios.create({
  baseURL: API_URL,
  timeout: 30_000,
});

http.interceptors.request.use((cfg) => {
  const t = tokenStore.get();
  if (t) cfg.headers.Authorization = `Bearer ${t}`;
  return cfg;
});

/** Error terstruktur dari envelope backend. */
export class ApiError extends Error {
  status: number;
  errors?: Record<string, string>;
  constructor(status: number, message: string, errors?: Record<string, string>) {
    super(message);
    this.status = status;
    this.errors = errors;
  }
}

let onUnauthorized: (() => void) | null = null;
export function setUnauthorizedHandler(fn: () => void) {
  onUnauthorized = fn;
}

http.interceptors.response.use(
  (res) => res,
  (err: AxiosError<Envelope<unknown>>) => {
    const status = err.response?.status ?? 0;
    const body = err.response?.data;
    if (status === 401) {
      tokenStore.clear();
      onUnauthorized?.();
    }
    const msg =
      body?.message ??
      (status === 0
        ? "Tidak dapat terhubung ke server. Periksa koneksi atau pastikan backend berjalan."
        : err.message);
    return Promise.reject(new ApiError(status, msg, body?.errors));
  },
);

/** Bangun URL yang membawa token sebagai query — untuk iframe / <a> yang tak bisa set header. */
export function tokenizedUrl(path: string, params: Record<string, string | undefined> = {}) {
  const u = new URL(path, API_URL);
  const t = tokenStore.get();
  if (t) u.searchParams.set("token", t);
  for (const [k, v] of Object.entries(params)) if (v) u.searchParams.set(k, v);
  return u.toString();
}
