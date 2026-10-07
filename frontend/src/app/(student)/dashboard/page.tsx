"use client";

import Link from "next/link";
import { ArrowRight, ChevronRight } from "lucide-react";
import { useApplications, useApplicationSummary } from "@/hooks/queries";
import { useAuthStore } from "@/stores/auth";
import { ACTIVE_STATUSES } from "@/lib/status";
import { PageHeader, SectionTitle } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card, EmptyState, StatCard } from "@/components/ui/card";
import { ApplicationRow, ApplicationRowSkeleton } from "@/components/surat/application-row";

export default function StudentDashboard() {
  const user = useAuthStore((s) => s.user);
  const { data: apps = [], isLoading } = useApplications();
  const { data: summary = {} } = useApplicationSummary();

  const count = (keys: string[]) =>
    keys.reduce((n, k) => n + (summary[k as keyof typeof summary] ?? 0), 0);
  const total = Object.values(summary).reduce((a, b) => a + (b ?? 0), 0);
  const needsAction = apps.filter((a) => a.status === "PERLU_PERBAIKAN");
  const ready = apps.filter((a) => a.status === "SIAP_DIAMBIL");

  return (
    <>
      <PageHeader
        eyebrow={`Selamat datang, ${user?.name?.split(" ")[0] ?? ""}`}
        title="Dashboard"
        description="Ringkasan pengajuan surat Anda. Status diperbarui secara realtime."
        actions={
          <Link href="/surat">
            <Button>
              Ajukan Surat <ArrowRight className="size-4" />
            </Button>
          </Link>
        }
      />

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatCard value={total} label="Total Pengajuan" />
        <StatCard value={count(ACTIVE_STATUSES)} label="Sedang Berjalan" dot="bg-info" />
        <StatCard value={count(["PERLU_PERBAIKAN"])} label="Perlu Perbaikan" dot="bg-warning" />
        <StatCard value={count(["SELESAI"])} label="Selesai" dot="bg-success" />
      </div>

      {(needsAction.length > 0 || ready.length > 0) && (
        <section className="mt-10 flex flex-col gap-3">
          {needsAction.map((a) => (
            <Link
              key={a.id}
              href={`/pengajuan/${a.id}`}
              className="group flex items-center gap-4 rounded-lg border border-warning/30 bg-warning-soft px-6 py-4"
            >
              <div className="flex min-w-0 flex-1 flex-col">
                <span className="text-caption font-semibold text-warning">Perlu perbaikan</span>
                <span className="truncate text-body text-ink">
                  {a.letter_name} · {a.application_number}
                </span>
                {a.admin_note && <span className="truncate text-caption text-ink-muted-80">“{a.admin_note}”</span>}
              </div>
              <span className="inline-flex items-center gap-1 text-caption text-primary">
                Perbaiki <ChevronRight className="size-4" />
              </span>
            </Link>
          ))}
          {ready.map((a) => (
            <Link
              key={a.id}
              href={`/pengajuan/${a.id}`}
              className="group flex items-center gap-4 rounded-lg border border-success/30 bg-success-soft px-6 py-4"
            >
              <div className="flex min-w-0 flex-1 flex-col">
                <span className="text-caption font-semibold text-success">Surat siap diambil</span>
                <span className="truncate text-body text-ink">
                  {a.letter_name} · {a.application_number}
                </span>
              </div>
              <span className="inline-flex items-center gap-1 text-caption text-primary">
                Detail <ChevronRight className="size-4" />
              </span>
            </Link>
          ))}
        </section>
      )}

      <section className="mt-10">
        <SectionTitle
          action={
            <Link href="/riwayat" className="inline-flex items-center gap-1 text-caption text-primary hover:underline">
              Lihat semua <ChevronRight className="size-4" />
            </Link>
          }
        >
          Pengajuan Terbaru
        </SectionTitle>
        <Card className="divide-y divide-divider-soft overflow-hidden">
          {isLoading ? (
            <ApplicationRowSkeleton />
          ) : apps.length === 0 ? (
            <EmptyState
              title="Belum ada pengajuan"
              description="Mulai dengan memilih jenis surat yang ingin diajukan."
              action={
                <Link href="/surat">
                  <Button variant="secondary" size="sm">
                    Pilih Jenis Surat
                  </Button>
                </Link>
              }
            />
          ) : (
            apps.slice(0, 5).map((a) => <ApplicationRow key={a.id} app={a} href={`/pengajuan/${a.id}`} />)
          )}
        </Card>
      </section>
    </>
  );
}
