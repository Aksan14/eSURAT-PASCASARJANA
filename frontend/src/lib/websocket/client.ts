import type { WsEvent } from "@/types/api";
import { WS_URL, tokenStore } from "@/lib/api/client";

type Listener = (ev: WsEvent) => void;
export type RealtimeStatus = "connecting" | "open" | "closed";

/**
 * Klien WebSocket ke backend `/ws?token=`.
 * Satu koneksi per tab, reconnect eksponensial, listener bisa banyak.
 */
class RealtimeClient {
  private ws: WebSocket | null = null;
  private listeners = new Set<Listener>();
  private statusListeners = new Set<() => void>();
  private _status: RealtimeStatus = "closed";
  private retry = 0;
  private timer: ReturnType<typeof setTimeout> | null = null;
  private closeTimer: ReturnType<typeof setTimeout> | null = null;
  private wanted = false;
  private refs = 0;

  /** Refcounted: beberapa komponen boleh memanggil connect(); socket ditutup saat semua lepas. */
  connect() {
    this.refs++;
    if (this.closeTimer) {
      clearTimeout(this.closeTimer);
      this.closeTimer = null;
    }
    this.wanted = true;
    this.open();
  }

  disconnect() {
    this.refs = Math.max(0, this.refs - 1);
    if (this.refs > 0) return;
    // Tunda sebentar: StrictMode melakukan unmount→mount cepat.
    this.closeTimer = setTimeout(() => {
      if (this.refs > 0) return;
      this.wanted = false;
      if (this.timer) clearTimeout(this.timer);
      this.ws?.close();
      this.ws = null;
    }, 150);
  }

  subscribe(fn: Listener) {
    this.listeners.add(fn);
    return () => {
      this.listeners.delete(fn);
    };
  }

  /** Untuk useSyncExternalStore. */
  getStatus = (): RealtimeStatus => this._status;
  subscribeStatus = (fn: () => void) => {
    this.statusListeners.add(fn);
    return () => {
      this.statusListeners.delete(fn);
    };
  };

  private setStatus(s: RealtimeStatus) {
    if (this._status === s) return;
    this._status = s;
    this.statusListeners.forEach((l) => l());
  }

  private open() {
    const token = tokenStore.get();
    if (!token || typeof window === "undefined") return;
    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) return;

    const ws = new WebSocket(`${WS_URL}?token=${encodeURIComponent(token)}`);
    this.ws = ws;
    this.setStatus("connecting");

    ws.onopen = () => {
      this.retry = 0;
      this.setStatus("open");
    };
    ws.onmessage = (e) => {
      try {
        const ev = JSON.parse(e.data) as WsEvent;
        this.listeners.forEach((l) => l(ev));
      } catch {
        /* abaikan frame non-JSON */
      }
    };
    ws.onclose = () => {
      this.ws = null;
      this.setStatus("closed");
      if (!this.wanted) return;
      const delay = Math.min(30_000, 1000 * 2 ** this.retry++);
      this.timer = setTimeout(() => this.open(), delay);
    };
    ws.onerror = () => ws.close();
  }
}

export const realtime = new RealtimeClient();
