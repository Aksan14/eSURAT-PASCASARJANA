"use client";

import { toast } from "sonner";
import { AlertTriangle, BellRing, CheckCircle2, FileCheck2, Inbox, XCircle, type LucideIcon } from "lucide-react";
import type { WsEvent } from "@/types/api";
import { cn } from "@/lib/utils";

type Tone = "info" | "success" | "warning" | "danger";

const TONE: Record<Tone, { bar: string; iconBg: string; icon: string }> = {
  info: { bar: "bg-primary", iconBg: "bg-info-soft", icon: "text-primary" },
  success: { bar: "bg-success", iconBg: "bg-success-soft", icon: "text-success" },
  warning: { bar: "bg-warning", iconBg: "bg-warning-soft", icon: "text-warning" },
  danger: { bar: "bg-danger", iconBg: "bg-danger-soft", icon: "text-danger" },
};

/** Peta event WS → nada warna, ikon, dan judul manusiawi. */
function describe(ev: WsEvent): { tone: Tone; Icon: LucideIcon; title: string } {
  const s = ev.data.status;
  if (ev.event === "application.created") return { tone: "info", Icon: Inbox, title: "Pengajuan baru masuk" };
  if (ev.event === "application.revision.required" || s === "PERLU_PERBAIKAN")
    return { tone: "warning", Icon: AlertTriangle, title: "Perlu perbaikan" };
  if (s === "DITOLAK") return { tone: "danger", Icon: XCircle, title: "Pengajuan ditolak" };
  if (ev.event === "application.approved" || s === "DISETUJUI")
    return { tone: "success", Icon: CheckCircle2, title: "Pengajuan disetujui" };
  if (ev.event === "application.completed" || s === "SELESAI")
    return { tone: "success", Icon: FileCheck2, title: "Surat selesai" };
  if (s === "SIAP_DIAMBIL") return { tone: "success", Icon: FileCheck2, title: "Surat siap diambil" };
  if (s === "DIPROSES") return { tone: "info", Icon: BellRing, title: "Surat sedang diproses" };
  return { tone: "info", Icon: BellRing, title: "Pembaruan status" };
}

/** Toast realtime: bar warna di kiri, ikon bernada, judul tebal, nomor pengajuan, pesan. */
export function notifyRealtime(ev: WsEvent, href?: string) {
  const { tone, Icon, title } = describe(ev);
  const t = TONE[tone];

  toast.custom(
    (id) => (
      <div
        role="status"
        className="pointer-events-auto flex w-[400px] max-w-[calc(100vw-2rem)] overflow-hidden rounded-lg border border-black/[0.08] bg-white/95 shadow-[0_12px_40px_-8px_rgba(0,0,0,0.25)] backdrop-blur-xl"
      >
        <span className={cn("w-1.5 shrink-0", t.bar)} aria-hidden />
        <div className="flex flex-1 items-start gap-3.5 px-4 py-3.5">
          <span className={cn("mt-0.5 flex size-10 shrink-0 items-center justify-center rounded-full", t.iconBg)}>
            <Icon className={cn("size-5", t.icon)} strokeWidth={2.25} />
          </span>
          <div className="flex min-w-0 flex-1 flex-col gap-0.5">
            <div className="flex items-baseline justify-between gap-3">
              <span className="text-body font-semibold leading-tight text-ink">{title}</span>
              <span className="shrink-0 text-fine font-semibold tracking-wide text-ink-muted-48">
                {ev.data.application_number}
              </span>
            </div>
            <p className="text-caption leading-snug text-ink-muted-80">{ev.data.message}</p>
            {href && (
              <a
                href={href}
                onClick={() => toast.dismiss(id)}
                className="mt-1.5 inline-flex w-fit text-caption font-semibold text-primary hover:underline"
              >
                Lihat detail →
              </a>
            )}
          </div>
        </div>
      </div>
    ),
    {
      duration: 7000,
      unstyled: true,
      style: { background: "transparent", border: 0, boxShadow: "none", padding: 0, width: "auto" },
    },
  );
}
