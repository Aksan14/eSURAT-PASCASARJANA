"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, PenLine } from "lucide-react";
import { useApplication, useProfile } from "@/hooks/queries";
import { LETTER_FORMS } from "@/lib/letter-forms";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader, CardTitle, EmptyState } from "@/components/ui/card";
import { StatusTimeline } from "@/components/status/status-timeline";
import {
  ApplicationDataSections,
  ApplicationSummaryHeader,
  DetailSkeleton,
} from "@/components/surat/application-detail";
import { LetterForm } from "@/components/forms/letter-form";

export default function PengajuanDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data: app, isLoading, error } = useApplication(id);
  const { data: profile } = useProfile();
  const [editing, setEditing] = useState(false);

  if (isLoading) return <DetailSkeleton />;
  if (error || !app)
    return (
      <EmptyState
        title="Pengajuan tidak ditemukan"
        description={error instanceof Error ? error.message : undefined}
        action={
          <Link href="/riwayat">
            <Button variant="secondary" size="sm">
              Kembali ke Riwayat
            </Button>
          </Link>
        }
      />
    );

  const needsFix = app.status === "PERLU_PERBAIKAN";
  const isDraft = app.status === "DRAFT";
  const editable = needsFix || isDraft;

  if (editing && editable && profile) {
    return (
      <>
        <button
          onClick={() => setEditing(false)}
          className="mb-6 inline-flex items-center gap-1 text-caption text-primary hover:underline"
        >
          <ArrowLeft className="size-4" /> {isDraft ? "Batal" : "Batal perbaikan"}
        </button>
        <ApplicationSummaryHeader app={app} />
        <LetterForm def={LETTER_FORMS[app.letter_code]} profile={profile} existing={app} />
      </>
    );
  }

  return (
    <>
      <Link href="/riwayat" className="mb-6 inline-flex items-center gap-1 text-caption text-primary hover:underline">
        <ArrowLeft className="size-4" /> Riwayat
      </Link>
      <ApplicationSummaryHeader app={app} />

      {isDraft && (
        <div className="mb-8 flex flex-col gap-4 rounded-lg border border-info/30 bg-info-soft px-6 py-5 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-col gap-1">
            <span className="text-caption font-semibold text-info">Draft — belum dikirim</span>
            <p className="text-body text-ink">
              Pengajuan ini belum masuk ke antrean admin. Lengkapi data dan dokumen, lalu kirim agar diverifikasi.
            </p>
          </div>
          <Button onClick={() => setEditing(true)} className="shrink-0">
            <PenLine className="size-4" /> Lanjutkan & Kirim
          </Button>
        </div>
      )}

      {(needsFix || app.status === "DITOLAK") && app.admin_note && (
        <div
          className={`mb-8 flex flex-col gap-4 rounded-lg border px-6 py-5 md:flex-row md:items-center md:justify-between ${
            needsFix ? "border-warning/30 bg-warning-soft" : "border-danger/30 bg-danger-soft"
          }`}
        >
          <div className="flex flex-col gap-1">
            <span className={`text-caption font-semibold ${needsFix ? "text-warning" : "text-danger"}`}>
              {needsFix ? "Catatan Admin — Perlu Perbaikan" : "Alasan Penolakan"}
            </span>
            <p className="text-body text-ink">“{app.admin_note}”</p>
          </div>
          {needsFix && (
            <Button onClick={() => setEditing(true)} className="shrink-0">
              <PenLine className="size-4" /> Perbaiki Pengajuan
            </Button>
          )}
        </div>
      )}

      {app.status === "SIAP_DIAMBIL" && (
        <div className="mb-8 rounded-lg border border-success/30 bg-success-soft px-6 py-5">
          <span className="text-caption font-semibold text-success">Surat Siap Diambil</span>
          <p className="mt-1 text-body text-ink">
            Silakan ambil surat fisik di Bagian Administrasi Program Pascasarjana pada jam kerja dengan menunjukkan
            nomor pengajuan <strong className="font-semibold">{app.application_number}</strong>.
          </p>
        </div>
      )}

      <div className="grid gap-8 lg:grid-cols-[1fr_360px]">
        <ApplicationDataSections app={app} />
        <aside className="lg:sticky lg:top-[120px] lg:self-start">
          <Card>
            <CardHeader>
              <CardTitle>Status Pengajuan</CardTitle>
            </CardHeader>
            <CardBody>
              <StatusTimeline application={app} />
            </CardBody>
          </Card>
          <p className="mt-3 text-fine text-ink-muted-48">Timeline diperbarui otomatis saat admin mengubah status.</p>
        </aside>
      </div>
    </>
  );
}
