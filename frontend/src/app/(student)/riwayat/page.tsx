"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useApplications } from "@/hooks/queries";
import type { ApplicationStatus } from "@/types/api";
import { ACTIVE_STATUSES } from "@/lib/status";
import { cn } from "@/lib/utils";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card, EmptyState } from "@/components/ui/card";
import { ApplicationRow, ApplicationRowSkeleton } from "@/components/surat/application-row";

type Tab = "SEMUA" | "AKTIF" | "PERLU_PERBAIKAN" | "SELESAI" | "DITOLAK";
const TABS: { key: Tab; label: string }[] = [
  { key: "SEMUA", label: "Semua" },
  { key: "AKTIF", label: "Berjalan" },
  { key: "PERLU_PERBAIKAN", label: "Perlu Perbaikan" },
  { key: "SELESAI", label: "Selesai" },
  { key: "DITOLAK", label: "Ditolak" },
];

export default function RiwayatPage() {
  const { data = [], isLoading } = useApplications();
  const [tab, setTab] = useState<Tab>("SEMUA");

  const filtered = useMemo(() => {
    if (tab === "SEMUA") return data;
    if (tab === "AKTIF") return data.filter((a) => ACTIVE_STATUSES.includes(a.status));
    return data.filter((a) => a.status === (tab as ApplicationStatus));
  }, [data, tab]);

  return (
    <>
      <PageHeader eyebrow="Arsip" title="Riwayat Pengajuan" description="Seluruh pengajuan surat yang pernah Anda buat." />

      {/* configurator-option-chip sebagai filter */}
      <div className="mb-6 flex gap-2 overflow-x-auto pb-1">
        {TABS.map((t) => {
          const active = t.key === tab;
          return (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={cn(
                "press whitespace-nowrap rounded-pill border px-4 py-2 text-caption",
                active ? "border-primary-focus border-2 bg-canvas font-semibold text-ink" : "border-hairline bg-canvas text-ink-muted-80 hover:border-ink-muted-48",
              )}
            >
              {t.label}
            </button>
          );
        })}
      </div>

      <Card className="divide-y divide-divider-soft overflow-hidden">
        {isLoading ? (
          <ApplicationRowSkeleton count={5} />
        ) : filtered.length === 0 ? (
          <EmptyState
            title="Tidak ada pengajuan"
            description={tab === "SEMUA" ? "Anda belum pernah mengajukan surat." : "Tidak ada pengajuan pada kategori ini."}
            action={
              tab === "SEMUA" && (
                <Link href="/surat">
                  <Button variant="secondary" size="sm">
                    Ajukan Surat
                  </Button>
                </Link>
              )
            }
          />
        ) : (
          filtered.map((a) => <ApplicationRow key={a.id} app={a} href={`/pengajuan/${a.id}`} />)
        )}
      </Card>
    </>
  );
}
