"use client";

import { useEffect } from "react";
import { realtime } from "@/lib/websocket/client";
import { useAuthStore } from "@/stores/auth";
import { notifyRealtime } from "@/components/notification/realtime-toast";
import { useInvalidateAll } from "./queries";

/** Buka koneksi WS selama user login; refresh cache + toast saat event masuk. */
export function useRealtime() {
  const user = useAuthStore((s) => s.user);
  const invalidate = useInvalidateAll();

  useEffect(() => {
    if (!user) return;
    const base = user.role === "admin" ? "/admin/pengajuan" : "/pengajuan";
    realtime.connect();
    const off = realtime.subscribe((ev) => {
      invalidate();
      notifyRealtime(ev, `${base}/${ev.data.application_id}`);
    });
    return () => {
      off();
      realtime.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);
}
