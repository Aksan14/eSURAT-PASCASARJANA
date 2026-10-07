"use client";

import { useState } from "react";
import { Download, Eye, FileText, Image as ImageIcon } from "lucide-react";
import type { ApplicationResponse, DocumentResponse } from "@/types/api";
import { DATE_FIELDS, DOCUMENT_LABELS, FIELD_LABELS } from "@/lib/status";
import { LETTER_FORMS } from "@/lib/letter-forms";
import { tokenizedUrl } from "@/lib/api/client";
import { formatBytes, formatDate } from "@/lib/utils";
import { Card, CardBody, CardHeader, CardTitle, DataList, Skeleton } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { DocumentViewer } from "@/components/surat/document-viewer";
import { PrintButton } from "@/components/surat/print-button";

export function ApplicationSummaryHeader({ app }: { app: ApplicationResponse }) {
  return (
    <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
      <div className="flex flex-col gap-2">
        <span className="text-caption text-ink-muted-48">{app.application_number}</span>
        <h1 className="text-display-md font-semibold tracking-[-0.374px] text-ink">{app.letter_name}</h1>
        <p className="text-caption text-ink-muted-80">
          Diajukan {formatDate(app.submitted_at ?? app.created_at, true)}
          {app.completed_at && ` · Selesai ${formatDate(app.completed_at, true)}`}
        </p>
      </div>
      <StatusBadge status={app.status} className="h-8 px-4 text-caption" />
    </div>
  );
}

export function ApplicationDataSections({ app }: { app: ApplicationResponse }) {
  const order = LETTER_FORMS[app.letter_code]?.fields.map((f) => f.name) ?? [];
  const rank = (k: string) => (order.indexOf(k) === -1 ? 999 : order.indexOf(k));
  const dataItems = Object.entries(app.data)
    .sort(([a], [b]) => rank(a) - rank(b))
    .map(([k, v]) => ({
      label: FIELD_LABELS[k] ?? k,
      value: DATE_FIELDS.has(k) && v ? formatDate(v) : v,
    }));

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Data Mahasiswa</CardTitle>
        </CardHeader>
        <CardBody>
          <DataList
            items={[
              { label: "Nama Lengkap", value: app.student.nama },
              { label: "NIM", value: app.student.nim },
              { label: "Program Studi", value: app.student.program_studi },
              { label: "Fakultas", value: app.student.fakultas },
            ]}
          />
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Data Surat</CardTitle>
        </CardHeader>
        <CardBody>
          <DataList items={dataItems} />
        </CardBody>
      </Card>

      {app.documents.length > 0 && <DocumentsCard documents={app.documents} />}

      {app.letter_number && (
        <Card>
          <CardHeader>
            <CardTitle>{app.processed_at ? "Surat Terbit" : "Nomor Surat"}</CardTitle>
          </CardHeader>
          <CardBody>
            <DataList
              items={[
                { label: "Nomor Surat", value: app.letter_number },
                { label: "Tanggal Terbit", value: app.processed_at ? formatDate(app.processed_at) : "Belum diproses" },
              ]}
            />
          </CardBody>
        </Card>
      )}
    </div>
  );
}

/** Daftar dokumen pendukung + popup pratinjau (PDF/gambar) dengan unduh & cetak langsung. */
function DocumentsCard({ documents }: { documents: DocumentResponse[] }) {
  const [active, setActive] = useState<DocumentResponse | null>(null);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Dokumen Pendukung</CardTitle>
      </CardHeader>
      <ul className="divide-y divide-divider-soft">
        {documents.map((d) => {
          const Icon = d.mime_type.startsWith("image/") ? ImageIcon : FileText;
          return (
            <li key={d.id} className="flex items-center gap-4 px-6 py-4">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-md bg-parchment">
                <Icon className="size-5 text-ink-muted-80" />
              </span>
              <div className="flex min-w-0 flex-1 flex-col">
                <span className="truncate text-body text-ink">{d.file_name}</span>
                <span className="text-fine text-ink-muted-48">
                  {DOCUMENT_LABELS[d.document_type] ?? d.document_type} · {formatBytes(d.file_size)} ·{" "}
                  {formatDate(d.uploaded_at, true)}
                </span>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setActive(d)} aria-label={`Lihat ${d.file_name}`}>
                <Eye className="size-4" /> Lihat
              </Button>
            </li>
          );
        })}
      </ul>

      <Dialog
        open={active !== null}
        onClose={() => setActive(null)}
        title={active ? (DOCUMENT_LABELS[active.document_type] ?? active.document_type) : "Dokumen"}
        description={active ? `${active.file_name} · ${formatBytes(active.file_size)}` : undefined}
        className="max-w-4xl"
      >
        {active && (
          <>
            <DocumentViewer path={active.url} mimeType={active.mime_type} />
            <div className="mt-5 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <Button variant="ghost" onClick={() => setActive(null)}>Tutup</Button>
              <a href={tokenizedUrl(active.url, { download: "true" })}>
                <Button variant="secondary"><Download className="size-4" /> Download</Button>
              </a>
              <PrintButton path={active.url} />
            </div>
          </>
        )}
      </Dialog>
    </Card>
  );
}

export function DetailSkeleton() {
  return (
    <div className="flex flex-col gap-8">
      <Skeleton className="h-4 w-24" />
      <div className="flex flex-col gap-3">
        <Skeleton className="h-3 w-40" />
        <Skeleton className="h-9 w-96 max-w-full" />
      </div>
      <div className="grid gap-8 lg:grid-cols-[1fr_360px]">
        <div className="flex flex-col gap-6">
          <Skeleton className="h-48 rounded-lg" />
          <Skeleton className="h-64 rounded-lg" />
        </div>
        <Skeleton className="h-96 rounded-lg" />
      </div>
    </div>
  );
}
