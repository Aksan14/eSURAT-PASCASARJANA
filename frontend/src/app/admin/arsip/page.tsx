"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Archive, ChevronLeft, ChevronRight, Download, Eye, Search } from "lucide-react";
import { useAdminApplications } from "@/hooks/queries";
import type { ApplicationResponse, LetterCode } from "@/types/api";
import { tokenizedUrl } from "@/lib/api/client";
import { formatDate } from "@/lib/utils";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Input, Select } from "@/components/ui/field";
import { Card, EmptyState, Skeleton } from "@/components/ui/card";
import { DocumentViewer } from "@/components/surat/document-viewer";
import { PrintButton } from "@/components/surat/print-button";

function useDebounced<T>(value: T, ms = 350) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return v;
}

const HEADERS = ["Nomor Surat", "Jenis Surat", "Mahasiswa", "Terbit", "Diserahkan", ""];

export default function AdminArsipPage() {
  const [q, setQ] = useState("");
  const [letterCode, setLetterCode] = useState<LetterCode | "">("");
  const [page, setPage] = useState(1);
  const [preview, setPreview] = useState<ApplicationResponse | null>(null);
  const dq = useDebounced(q);

  const filterKey = `${dq}|${letterCode}`;
  const [prevKey, setPrevKey] = useState(filterKey);
  if (filterKey !== prevKey) {
    setPrevKey(filterKey);
    setPage(1);
  }

  const { data, isLoading, isFetching } = useAdminApplications({
    q: dq,
    status: "SELESAI",
    letter_code: letterCode,
    page,
    per_page: 20,
  });
  const items = data?.items ?? [];
  const meta = data?.meta;

  const printPath = (a: ApplicationResponse) => `/api/admin/applications/${a.id}/print`;

  return (
    <>
      <PageHeader
        eyebrow="Administrasi"
        title="Arsip Surat"
        description="Seluruh surat yang telah diterbitkan dan diserahkan kepada mahasiswa. Pengajuan masuk ke arsip otomatis saat statusnya Selesai."
      />

      <Card className="mb-6 p-4">
        <div className="grid gap-3 md:grid-cols-[1fr_240px]">
          <div className="relative">
            <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-ink-muted-48" />
            <Input
              placeholder="Cari nomor surat, nomor pengajuan, NIM, nama…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className="rounded-pill pl-11"
              aria-label="Pencarian arsip"
            />
          </div>
          <Select value={letterCode} onChange={(e) => setLetterCode(e.target.value as LetterCode | "")} aria-label="Jenis surat">
            <option value="">Semua jenis</option>
            <option value="SKK">Surat Keterangan Kuliah</option>
            <option value="SKL">Surat Keterangan Lulus</option>
            <option value="SIPI">Surat Pengantar Izin Penelitian</option>
          </Select>
        </div>
      </Card>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] border-collapse text-left">
            <thead>
              <tr className="border-b border-divider-soft text-caption text-ink-muted-48">
                {HEADERS.map((h, i) => (
                  <th key={i} className="px-5 py-3 font-semibold">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className={isFetching && !isLoading ? "opacity-60 transition-opacity" : ""}>
              {isLoading &&
                Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i} className="border-b border-divider-soft">
                    {HEADERS.map((_, j) => (
                      <td key={j} className="px-5 py-4">
                        <Skeleton className="h-4 w-full" />
                      </td>
                    ))}
                  </tr>
                ))}
              {!isLoading &&
                items.map((a) => (
                  <tr key={a.id} className="border-b border-divider-soft last:border-0 hover:bg-parchment">
                    <td className="px-5 py-4 align-middle">
                      <div className="flex flex-col">
                        <span className="whitespace-nowrap text-caption font-semibold text-ink">{a.letter_number ?? "—"}</span>
                        <Link href={`/admin/pengajuan/${a.id}`} className="text-fine text-ink-muted-48 hover:text-primary hover:underline">
                          {a.application_number}
                        </Link>
                      </div>
                    </td>
                    <td className="px-5 py-4 align-middle text-caption text-ink">{a.letter_name}</td>
                    <td className="px-5 py-4 align-middle">
                      <div className="flex flex-col">
                        <span className="text-caption text-ink">{a.student.nama}</span>
                        <span className="text-fine text-ink-muted-48">{a.student.nim}</span>
                      </div>
                    </td>
                    <td className="px-5 py-4 align-middle text-caption text-ink-muted-80">
                      {a.processed_at ? formatDate(a.processed_at) : "—"}
                    </td>
                    <td className="px-5 py-4 align-middle text-caption text-ink-muted-80">
                      {a.completed_at ? formatDate(a.completed_at) : "—"}
                    </td>
                    <td className="px-5 py-4 text-right align-middle">
                      <div className="inline-flex items-center gap-1">
                        <Button variant="ghost" size="sm" onClick={() => setPreview(a)} aria-label={`Lihat surat ${a.letter_number ?? a.application_number}`}>
                          <Eye className="size-4" /> Lihat
                        </Button>
                        <a href={tokenizedUrl(printPath(a), { download: "true" })} aria-label={`Unduh surat ${a.letter_number ?? a.application_number}`}>
                          <Button variant="ghost" size="sm">
                            <Download className="size-4" /> Unduh
                          </Button>
                        </a>
                      </div>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
        {!isLoading && items.length === 0 && (
          <EmptyState
            title="Arsip masih kosong"
            description={dq || letterCode ? "Tidak ada surat yang cocok dengan pencarian." : "Surat akan muncul di sini setelah pengajuan ditandai Selesai."}
          />
        )}
        {meta && meta.total > 0 && (
          <div className="flex items-center justify-between border-t border-divider-soft px-5 py-3">
            <span className="inline-flex items-center gap-2 text-fine text-ink-muted-48">
              <Archive className="size-3.5" />
              {(meta.page - 1) * meta.per_page + 1}–{Math.min(meta.page * meta.per_page, meta.total)} dari {meta.total} surat
            </span>
            <div className="flex items-center gap-2">
              <Button variant="pearl" size="sm" disabled={meta.page <= 1} onClick={() => setPage((p) => p - 1)}>
                <ChevronLeft className="size-4" /> Sebelumnya
              </Button>
              <span className="px-2 text-caption text-ink-muted-80">
                {meta.page} / {meta.total_pages}
              </span>
              <Button variant="pearl" size="sm" disabled={meta.page >= meta.total_pages} onClick={() => setPage((p) => p + 1)}>
                Berikutnya <ChevronRight className="size-4" />
              </Button>
            </div>
          </div>
        )}
      </Card>

      <Dialog
        open={preview !== null}
        onClose={() => setPreview(null)}
        title={preview?.letter_name ?? "Surat"}
        description={preview ? `Nomor: ${preview.letter_number ?? "—"} · ${preview.student.nama} (${preview.student.nim})` : undefined}
        className="max-w-4xl"
      >
        {preview && (
          <>
            <DocumentViewer path={printPath(preview)} />
            <div className="mt-5 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <Button variant="ghost" onClick={() => setPreview(null)}>Tutup</Button>
              <Link href={`/admin/pengajuan/${preview.id}`}>
                <Button variant="pearl">Detail Pengajuan</Button>
              </Link>
              <a href={tokenizedUrl(printPath(preview), { download: "true" })}>
                <Button variant="secondary"><Download className="size-4" /> Unduh</Button>
              </a>
              <PrintButton path={printPath(preview)} />
            </div>
          </>
        )}
      </Dialog>
    </>
  );
}
