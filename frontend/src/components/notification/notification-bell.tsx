"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Bell, CheckCheck } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useNotifications, qk } from "@/hooks/queries";
import { notificationApi } from "@/lib/api";
import { useAuthStore } from "@/stores/auth";
import { cn, formatDate } from "@/lib/utils";

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const qc = useQueryClient();
  const role = useAuthStore((s) => s.user?.role);
  const { data = [] } = useNotifications();
  const unread = data.filter((n) => !n.is_read).length;
  const base = role === "admin" ? "/admin/pengajuan" : "/pengajuan";

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  const refresh = () => qc.invalidateQueries({ queryKey: qk.notifications });

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label={`Notifikasi, ${unread} belum dibaca`}
        aria-expanded={open}
        className="press relative flex size-10 items-center justify-center rounded-full text-ink hover:bg-black/5"
      >
        <Bell className="size-[18px]" />
        {unread > 0 && (
          <span className="absolute right-1.5 top-1.5 flex min-w-4 items-center justify-center rounded-full bg-danger px-1 text-[10px] font-semibold leading-4 text-on-primary ring-2 ring-white">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-[52px] z-40 w-[380px] max-w-[calc(100vw-2rem)] overflow-hidden rounded-lg border border-hairline bg-canvas shadow-paper">
          <div className="flex items-center justify-between border-b border-divider-soft px-5 py-3">
            <span className="text-caption font-semibold text-ink">Notifikasi</span>
            {unread > 0 && (
              <button
                className="inline-flex items-center gap-1 text-fine text-primary hover:underline"
                onClick={async () => {
                  await notificationApi.markAllRead();
                  refresh();
                }}
              >
                <CheckCheck className="size-3.5" /> Tandai semua dibaca
              </button>
            )}
          </div>
          <ul className="max-h-[420px] overflow-y-auto">
            {data.length === 0 && (
              <li className="px-5 py-10 text-center text-caption text-ink-muted-48">Belum ada notifikasi.</li>
            )}
            {data.map((n) => (
              <li key={n.id} className="border-b border-divider-soft last:border-0">
                <Link
                  href={n.application_id ? `${base}/${n.application_id}` : "#"}
                  onClick={async () => {
                    setOpen(false);
                    if (!n.is_read) {
                      await notificationApi.markRead(n.id);
                      refresh();
                    }
                  }}
                  className={cn("flex gap-3 px-5 py-4 hover:bg-parchment", !n.is_read && "bg-pearl")}
                >
                  <span
                    aria-hidden
                    className={cn("mt-2 size-1.5 shrink-0 rounded-full", n.is_read ? "bg-hairline" : "bg-primary")}
                  />
                  <span className="flex min-w-0 flex-col gap-0.5">
                    <span className="text-caption font-semibold text-ink">{n.title}</span>
                    <span className="text-caption text-ink-muted-80">{n.message}</span>
                    <span className="text-fine text-ink-muted-48">{formatDate(n.created_at, true)}</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
