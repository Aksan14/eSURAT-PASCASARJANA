"use client";

import Link from "next/link";
import {
  ArrowRight,
  BellRing,
  CalendarDays,
  CheckCheck,
  ChevronRight,
  ClipboardCheck,
  Clock3,
  FileStack,
  Inbox,
  RotateCcw,
  Stamp,
  TrendingUp,
  XCircle,
} from "lucide-react";
import { useAdminApplications, useAdminStats, useAdminSummary } from "@/hooks/queries";
import type { ApplicationStatus, LetterCode } from "@/types/api";
import { PageHeader, SectionTitle } from "@/components/layout/page-header";
import { Card, EmptyState, Skeleton } from "@/components/ui/card";
import { ApplicationRow, ApplicationRowSkeleton } from "@/components/surat/application-row";
import { DonutChart, LineChart } from "@/components/charts/charts";
import { ACTION_NEEDED_STATUSES } from "@/lib/status";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Konfigurasi kartu status: warna lembut + ikon + tautan ke daftar terfilter.
// ---------------------------------------------------------------------------

type Tone = { bg: string; fg: string; ring: string; bar: string };
const TONES: Record<"blue" | "amber" | "green" | "violet" | "teal" | "red" | "slate", Tone> = {
  blue: { bg: "bg-[#e8f1fb]", fg: "text-[#0066cc]", ring: "ring-[#0066cc]/15", bar: "#0066cc" },
  amber: { bg: "bg-[#fdf1e3]", fg: "text-[#b35c00]", ring: "ring-[#b35c00]/15", bar: "#e08a1e" },
  green: { bg: "bg-[#e6f4ec]", fg: "text-[#1d7a46]", ring: "ring-[#1d7a46]/15", bar: "#1d7a46" },
  violet: { bg: "bg-[#efeafd]", fg: "text-[#5b3fc4]", ring: "ring-[#5b3fc4]/15", bar: "#7a5af5" },
  teal: { bg: "bg-[#e3f5f3]", fg: "text-[#0f766e]", ring: "ring-[#0f766e]/15", bar: "#14b8a6" },
  red: { bg: "bg-[#fdecea]", fg: "text-[#c0271f]", ring: "ring-[#c0271f]/15", bar: "#c0271f" },
  slate: { bg: "bg-[#f5f5f7]", fg: "text-[#1d1d1f]", ring: "ring-[#1d1d1f]/10", bar: "#1d1d1f" },
};

const STATUS_CARDS: { status: ApplicationStatus; label: string; tone: keyof typeof TONES; icon: typeof Inbox; hint: string }[] = [
  { status: "MENUNGGU_VERIFIKASI", label: "Menunggu Verifikasi", tone: "blue", icon: Inbox, hint: "Perlu tindakan Anda" },
  { status: "PERLU_PERBAIKAN", label: "Perlu Perbaikan", tone: "amber", icon: RotateCcw, hint: "Menunggu mahasiswa" },
  { status: "DISETUJUI", label: "Disetujui", tone: "violet", icon: ClipboardCheck, hint: "Siap diproses" },
  { status: "DIPROSES", label: "Sedang Diproses", tone: "teal", icon: Stamp, hint: "Cetak, ttd, stempel" },
  { status: "SIAP_DIAMBIL", label: "Siap Diambil", tone: "green", icon: BellRing, hint: "Menunggu diambil" },
  { status: "SELESAI", label: "Selesai", tone: "green", icon: CheckCheck, hint: "Masuk arsip" },
  { status: "DITOLAK", label: "Ditolak", tone: "red", icon: XCircle, hint: "Tidak diproses" },
];

const TYPE_COLORS: Record<LetterCode, string> = { SKK: "#0066cc", SKL: "#1d7a46", SIPI: "#e08a1e" };
const BULAN = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];

export default function AdminDashboard() {
  const summary = useAdminSummary();
  const stats = useAdminStats();
  const queue = useAdminApplications({ status: "MENUNGGU_VERIFIKASI", per_page: 6 });
  const recent = useAdminApplications({ per_page: 6 });

  const s = summary.data ?? {};
  const total = Object.values(s).reduce((a, b) => a + (b ?? 0), 0);
  const actionNeeded = (s.MENUNGGU_VERIFIKASI ?? 0) + (s.DISETUJUI ?? 0) + (s.DIPROSES ?? 0);
  const st = stats.data;

  const monthLabels = st?.monthly.map((m) => BULAN[Number(m.month.slice(5)) - 1]) ?? [];
  const typeData = (st?.by_letter_type ?? []).map((t) => ({ label: t.name, value: t.count, color: TYPE_COLORS[t.code] ?? "#7a7a7a" }));

  return (
    <>
      <PageHeader
        eyebrow="Administrasi"
        title="Dashboard Admin"
        description="Pantau antrean, tren pengajuan, dan kinerja layanan surat. Data diperbarui secara realtime."
        actions={
          <Link href="/admin/pengajuan" className="inline-flex items-center gap-1 text-body text-primary hover:underline">
            Semua pengajuan <ChevronRight className="size-4" />
          </Link>
        }
      />

      {/* ---- Baris 1: ringkasan utama ---- */}
      <div className="grid gap-4 md:grid-cols-4">
        <HeroStat
          label="Total Pengajuan"
          value={total}
          sub={st ? `${st.today} hari ini · ${st.this_week} minggu ini` : undefined}
          icon={FileStack}
          dark
        />
        <KpiStat
          label="Butuh Tindakan"
          value={actionNeeded}
          sub="Verifikasi, proses, dan cetak"
          icon={ClipboardCheck}
          tone="blue"
          href={`/admin/pengajuan?status=${ACTION_NEEDED_STATUSES}`}
        />
        <KpiStat
          label="Rata-rata Penyelesaian"
          value={st ? (st.avg_process_days > 0 ? (st.avg_process_days < 1 ? "< 1 hari" : `${st.avg_process_days.toFixed(1)} hari`) : "—") : undefined}
          sub="Dari dikirim hingga selesai"
          icon={Clock3}
          tone="teal"
        />
        <KpiStat
          label="Tingkat Penyelesaian"
          value={st ? (st.completion_rate > 0 || (s.DITOLAK ?? 0) > 0 ? `${Math.round(st.completion_rate * 100)}%` : "—") : undefined}
          sub="Selesai dibanding ditolak"
          icon={TrendingUp}
          tone="green"
        />
      </div>

      {/* ---- Baris 2: status per tahap (klik → daftar terfilter) ---- */}
      <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-7">
        {STATUS_CARDS.map((c) => {
          const t = TONES[c.tone];
          const v = s[c.status] ?? 0;
          return (
            <Link
              key={c.status}
              href={c.status === "SELESAI" ? "/admin/arsip" : `/admin/pengajuan?status=${c.status}`}
              className="group press flex flex-col gap-3 rounded-lg border border-hairline bg-canvas p-4 transition-shadow hover:shadow-paper"
            >
              <div className="flex items-center justify-between">
                <span className={cn("flex size-8 items-center justify-center rounded-md", t.bg, t.fg)}>
                  <c.icon className="size-4" />
                </span>
                <ArrowRight className="size-4 text-ink-muted-48 opacity-0 transition-opacity group-hover:opacity-100" />
              </div>
              <div className="flex flex-col">
                <span className="text-[26px] font-semibold leading-none tracking-[-0.3px] text-ink">
                  {summary.isLoading ? "…" : v}
                </span>
                <span className="mt-1.5 text-fine font-semibold text-ink">{c.label}</span>
                <span className="text-fine text-ink-muted-48">{c.hint}</span>
              </div>
            </Link>
          );
        })}
      </div>

      {/* ---- Baris 3: grafik ---- */}
      <div className="mt-8 grid gap-6 lg:grid-cols-[1.6fr_1fr]">
        <Card className="min-w-0 p-6">
          <div className="mb-4 flex items-start justify-between gap-4">
            <div>
              <h3 className="text-tagline font-semibold text-ink">Pengajuan Surat per Bulan</h3>
              <p className="text-caption text-ink-muted-48">12 bulan terakhir · dikirim vs. selesai</p>
            </div>
            <Legend items={[{ label: "Dikirim", color: "#0066cc" }, { label: "Selesai", color: "#1d7a46" }]} />
          </div>
          {stats.isLoading || !st ? (
            <Skeleton className="h-[220px] w-full rounded-md" />
          ) : (
            <LineChart
              labels={monthLabels}
              series={[
                { key: "sub", label: "Dikirim", color: "#0066cc", values: st.monthly.map((m) => m.submitted) },
                { key: "done", label: "Selesai", color: "#1d7a46", values: st.monthly.map((m) => m.completed) },
              ]}
            />
          )}
        </Card>

        <Card className="min-w-0 p-6">
          <div className="mb-4">
            <h3 className="text-tagline font-semibold text-ink">Jenis Surat</h3>
            <p className="text-caption text-ink-muted-48">Distribusi seluruh pengajuan</p>
          </div>
          {stats.isLoading || !st ? (
            <Skeleton className="h-[180px] w-full rounded-md" />
          ) : (
            <DonutChart data={typeData} centerLabel="pengajuan" />
          )}
        </Card>
      </div>

      {/* ---- Baris 4: antrean & aktivitas ---- */}
      <div className="mt-8 grid gap-8 lg:grid-cols-2">
        <section className="min-w-0">
          <SectionTitle
            action={
              <Link
                href="/admin/pengajuan?status=MENUNGGU_VERIFIKASI"
                className="inline-flex items-center gap-1 text-caption text-primary hover:underline"
              >
                Lihat antrean <ChevronRight className="size-4" />
              </Link>
            }
          >
            <span className="inline-flex items-center gap-2">
              Antrean Verifikasi
              {(s.MENUNGGU_VERIFIKASI ?? 0) > 0 && (
                <span className="inline-flex h-6 min-w-6 items-center justify-center rounded-pill bg-primary px-2 text-fine font-semibold text-on-primary">
                  {s.MENUNGGU_VERIFIKASI}
                </span>
              )}
            </span>
          </SectionTitle>
          <Card className="divide-y divide-divider-soft overflow-hidden">
            {queue.isLoading ? (
              <ApplicationRowSkeleton />
            ) : !queue.data?.items.length ? (
              <EmptyState title="Antrean kosong" description="Tidak ada pengajuan yang menunggu verifikasi." />
            ) : (
              queue.data.items.map((a) => <ApplicationRow key={a.id} app={a} href={`/admin/pengajuan/${a.id}`} showStudent />)
            )}
          </Card>
        </section>

        <section className="min-w-0">
          <SectionTitle
            action={
              <span className="inline-flex items-center gap-1 text-caption text-ink-muted-48">
                <CalendarDays className="size-3.5" /> Terbaru
              </span>
            }
          >
            Aktivitas Terbaru
          </SectionTitle>
          <Card className="divide-y divide-divider-soft overflow-hidden">
            {recent.isLoading ? (
              <ApplicationRowSkeleton />
            ) : !recent.data?.items.length ? (
              <EmptyState title="Belum ada aktivitas" />
            ) : (
              recent.data.items.map((a) => <ApplicationRow key={a.id} app={a} href={`/admin/pengajuan/${a.id}`} showStudent />)
            )}
          </Card>
        </section>
      </div>
    </>
  );
}

// ---------------------------------------------------------------------------

function HeroStat({
  label,
  value,
  sub,
  icon: Icon,
  dark,
}: {
  label: string;
  value: React.ReactNode;
  sub?: string;
  icon: typeof Inbox;
  dark?: boolean;
}) {
  return (
    <Card className={cn("relative overflow-hidden p-6", dark && "border-transparent bg-ink text-on-dark")}>
      <div
        aria-hidden
        className="pointer-events-none absolute -right-10 -top-10 size-40 rounded-full opacity-30"
        style={{ background: "radial-gradient(circle, #2997ff 0%, transparent 70%)" }}
      />
      <div className="relative flex items-start justify-between">
        <span className="text-caption text-white/70">{label}</span>
        <span className="flex size-9 items-center justify-center rounded-md bg-white/10">
          <Icon className="size-4" />
        </span>
      </div>
      <div className="relative mt-3 text-display-md font-semibold tracking-[-0.374px]">{value}</div>
      {sub && <div className="relative mt-1 text-fine text-white/60">{sub}</div>}
    </Card>
  );
}

function KpiStat({
  label,
  value,
  sub,
  icon: Icon,
  tone,
  href,
}: {
  label: string;
  value?: React.ReactNode;
  sub?: string;
  icon: typeof Inbox;
  tone: keyof typeof TONES;
  href?: string;
}) {
  const t = TONES[tone];
  const body = (
    <>
      <div className="flex items-start justify-between">
        <span className="text-caption text-ink-muted-48">{label}</span>
        <span className={cn("flex size-9 items-center justify-center rounded-md", t.bg, t.fg)}>
          <Icon className="size-4" />
        </span>
      </div>
      <div className="mt-3 text-display-md font-semibold tracking-[-0.374px] text-ink">
        {value === undefined ? <Skeleton className="h-9 w-20" /> : value}
      </div>
      {sub && <div className="mt-1 text-fine text-ink-muted-48">{sub}</div>}
      <div className="mt-4 h-1 w-full overflow-hidden rounded-pill bg-divider-soft">
        <div className="h-full w-2/5 rounded-pill" style={{ background: t.bar }} />
      </div>
    </>
  );
  return href ? (
    <Link href={href} className="press block">
      <Card className="h-full p-6 transition-shadow hover:shadow-paper">{body}</Card>
    </Link>
  ) : (
    <Card className="p-6">{body}</Card>
  );
}

function Legend({ items }: { items: { label: string; color: string }[] }) {
  return (
    <ul className="flex items-center gap-4 text-fine text-ink-muted-80">
      {items.map((i) => (
        <li key={i.label} className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-full" style={{ background: i.color }} />
          {i.label}
        </li>
      ))}
    </ul>
  );
}
