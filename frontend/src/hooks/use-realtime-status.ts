"use client";

import { useSyncExternalStore } from "react";
import { realtime, type RealtimeStatus } from "@/lib/websocket/client";

const getServer = (): RealtimeStatus => "closed";

export function useRealtimeStatus(): RealtimeStatus {
  return useSyncExternalStore(realtime.subscribeStatus, realtime.getStatus, getServer);
}
