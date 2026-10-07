"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { useAdminApplication } from "@/hooks/queries";
import { STATUS_META } from "@/lib/status";
import { formatDate } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader, CardTitle, EmptyState } from "@/components/ui/card";
import { StatusTimeline } from "@/components/status/status-timeline";
import {
  ApplicationDataSections,
  ApplicationSummaryHeader,
  DetailSkeleton,
} from "@/components/surat/application-detail";
import { AdminActionPanel } from "@/components/surat/admin-action-panel";

export default function AdminPengajuanDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data: app, isLoading, error } = useAdminApplication(id);

  if (isLoading) return <DetailSkeleton />;
  if (error || !app)
    return (
      <EmptyState
        title="Pengajuan tidak ditemukan"
        description={error instanceof Error ? error.message : undefined}
        action={
          <Link href="/admin/pengajuan">
            <Button variant="secondary" size="sm">Kembali ke Daftar</Button>
          </Link>
        }
      />
    );

  return (
    <>
      <Link href="/admin/pengajuan" className="mb-6 inline-flex items-center gap-1 text-caption text-primary hover:underline">
        <ArrowLeft className="size-4" /> Daftar Pengajuan
      </Link>
      <ApplicationSummaryHeader app={app} />

      {app.admin_note && (app.status === "PERLU_PERBAIKAN" || app.status === "DITOLAK") && (
        <div
          className={`mb-8 rounded-lg border px-6 py-5 ${
            app.status === "DITOLAK" ? "border-danger/30 bg-danger-soft" : "border-warning/30 bg-warning-soft"
          }`}
        >
          <span className={`text-caption font-semibold ${app.status === "DITOLAK" ? "text-danger" : "text-warning"}`}>
            Catatan Anda
          </span>
          <p className="mt-1 text-body text-ink">“{app.admin_note}”</p>
        </div>
      )}

      <div className="grid gap-8 lg:grid-cols-[1fr_360px]">
        <div className="flex flex-col gap-6">
          <ApplicationDataSections app={app} />
          <Card>
            <CardHeader>
              <CardTitle>Riwayat Status</CardTitle>
            </CardHeader>
            <ol className="divide-y divide-divider-soft">
              {[...app.history].reverse().map((h) => (
                <li key={h.id} className="grid gap-1 px-6 py-4 md:grid-cols-[200px_1fr]">
                  <span className="text-fine text-ink-muted-48">{formatDate(h.created_at, true)}</span>
                  <div className="flex flex-col gap-0.5">
                    <span className="text-caption font-semibold text-ink">
                      {STATUS_META[h.status].label}
                      <span className="font-normal text-ink-muted-48"> · {h.changed_by_name}</span>
                    </span>
                    {h.note && <span className="text-caption text-ink-muted-80">{h.note}</span>}
                  </div>
                </li>
              ))}
            </ol>
          </Card>
        </div>

        <aside className="flex flex-col gap-6 lg:sticky lg:top-[120px] lg:self-start">
          <AdminActionPanel app={app} />
          <Card>
            <CardHeader>
              <CardTitle>Timeline</CardTitle>
            </CardHeader>
            <CardBody>
              <StatusTimeline application={app} compact />
            </CardBody>
          </Card>
        </aside>
      </div>
    </>
  );
}
