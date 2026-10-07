"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ChevronLeft, ChevronRight, Search } from "lucide-react";
import { useAdminApplications } from "@/hooks/queries";
import type { ApplicationStatus, LetterCode } from "@/types/api";
import { ACTION_NEEDED_STATUSES, STATUS_META } from "@/lib/status";
import { formatDate } from "@/lib/utils";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/field";
import { StatusBadge } from "@/components/ui/badge";
import { Card, EmptyState, Skeleton } from "@/components/ui/card";

export default function AdminPengajuanPage() {
  return (
    <Suspense fallback={null}>
      <Inner />
    </Suspense>
  );
}

function useDebounced<T>(value: T, ms = 350) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return v;
}

function Inner() {
  const params = useSearchParams();
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<string>(params.get("status") ?? "");
  const [letterCode, setLetterCode] = useState<LetterCode | "">("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [page, setPage] = useState(1);
  const dq = useDebounced(q);

  // Reset ke halaman 1 setiap filter berubah.
  const filterKey = `${dq}|${status}|${letterCode}|${dateFrom}|${dateTo}`;
  const [prevKey, setPrevKey] = useState(filterKey);
  if (filterKey !== prevKey) {
    setPrevKey(filterKey);
    setPage(1);
  }

  const { data, isLoading, isFetching } = useAdminApplications({
    q: dq,
    status,
    letter_code: letterCode,
    date_from: dateFrom,
    date_to: dateTo,
    page,
    per_page: 20,
  });
  const items = data?.items ?? [];
  const meta = data?.meta;

  return (
    <>
      <PageHeader eyebrow="Administrasi" title="Daftar Pengajuan" description="Cari dan saring seluruh pengajuan surat mahasiswa." />

      <Card className="mb-6 p-4">
        <div className="grid gap-3 md:grid-cols-[1fr_200px_200px_160px_160px]">
          <div className="relative">
            <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-ink-muted-48" />
            <Input
              placeholder="Cari nomor pengajuan, NIM, nama…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className="rounded-pill pl-11"
              aria-label="Pencarian"
            />
          </div>
          <Select value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Status">
            <option value="">Semua status</option>
            <option value={ACTION_NEEDED_STATUSES}>Butuh Tindakan</option>
            {(Object.keys(STATUS_META) as ApplicationStatus[])
              .filter((s) => s !== "DRAFT")
              .map((s) => (
                <option key={s} value={s}>
                  {STATUS_META[s].label}
                </option>
              ))}
          </Select>
          <Select value={letterCode} onChange={(e) => setLetterCode(e.target.value as LetterCode | "")} aria-label="Jenis surat">
            <option value="">Semua jenis</option>
            <option value="SKK">Surat Keterangan Kuliah</option>
            <option value="SKL">Surat Keterangan Lulus</option>
            <option value="SIPI">Surat Pengantar Izin Penelitian</option>
          </Select>
          <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} aria-label="Dari tanggal" />
          <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} aria-label="Sampai tanggal" />
        </div>
      </Card>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1040px] border-collapse text-left">
            <thead>
              <tr className="border-b border-divider-soft text-caption text-ink-muted-48">
                {["No. Pengajuan", "No. Surat", "Mahasiswa", "Jenis Surat", "Tanggal", "Status", ""].map((h) => (
                  <th key={h} className="px-5 py-3 font-semibold">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className={isFetching && !isLoading ? "opacity-60 transition-opacity" : ""}>
              {isLoading &&
                Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i} className="border-b border-divider-soft">
                    {Array.from({ length: 7 }).map((_, j) => (
                      <td key={j} className="px-5 py-4">
                        <Skeleton className="h-4 w-full" />
                      </td>
                    ))}
                  </tr>
                ))}
              {!isLoading &&
                items.map((a) => (
                  <tr key={a.id} className="group border-b border-divider-soft last:border-0 hover:bg-parchment">
                    <td className="px-5 py-4 align-middle">
                      <Link href={`/admin/pengajuan/${a.id}`} className="whitespace-nowrap text-caption font-semibold text-ink">
                        {a.application_number}
                      </Link>
                    </td>
                    <td className="whitespace-nowrap px-5 py-4 align-middle text-caption">
                      {a.letter_number ? (
                        <span className="text-ink">{a.letter_number}</span>
                      ) : (
                        <span className="text-ink-muted-48">—</span>
                      )}
                    </td>
                    <td className="px-5 py-4 align-middle">
                      <div className="flex flex-col">
                        <span className="text-caption text-ink">{a.student.nama}</span>
                        <span className="text-fine text-ink-muted-48">{a.student.nim}</span>
                      </div>
                    </td>
                    <td className="px-5 py-4 align-middle text-caption text-ink">{a.letter_name}</td>
                    <td className="whitespace-nowrap px-5 py-4 align-middle text-caption text-ink-muted-80">
                      {formatDate(a.submitted_at ?? a.created_at)}
                    </td>
                    <td className="px-5 py-4 align-middle">
                      <StatusBadge status={a.status} />
                    </td>
                    <td className="px-5 py-4 text-right align-middle">
                      <Link
                        href={`/admin/pengajuan/${a.id}`}
                        className="inline-flex items-center gap-1 text-caption text-primary hover:underline"
                      >
                        Detail <ChevronRight className="size-4" />
                      </Link>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
        {!isLoading && items.length === 0 && (
          <EmptyState title="Tidak ada hasil" description="Ubah kata kunci atau filter." />
        )}
        {meta && meta.total > 0 && (
          <div className="flex items-center justify-between border-t border-divider-soft px-5 py-3">
            <span className="text-fine text-ink-muted-48">
              Menampilkan {(meta.page - 1) * meta.per_page + 1}–{Math.min(meta.page * meta.per_page, meta.total)} dari{" "}
              {meta.total}
            </span>
            <div className="flex items-center gap-2">
              <Button variant="pearl" size="sm" disabled={meta.page <= 1} onClick={() => setPage((p) => p - 1)}>
                <ChevronLeft className="size-4" /> Sebelumnya
              </Button>
              <span className="px-2 text-caption text-ink-muted-80">
                {meta.page} / {meta.total_pages}
              </span>
              <Button
                variant="pearl"
                size="sm"
                disabled={meta.page >= meta.total_pages}
                onClick={() => setPage((p) => p + 1)}
              >
                Berikutnya <ChevronRight className="size-4" />
              </Button>
            </div>
          </div>
        )}
      </Card>
    </>
  );
}
