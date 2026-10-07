"use client";

import { useState } from "react";
import { toast } from "sonner";
import { BellRing, Check, CheckCheck, Download, Eye, RotateCcw, Stamp, X } from "lucide-react";
import type { ApplicationResponse } from "@/types/api";
import { adminApi } from "@/lib/api";
import { ApiError, tokenizedUrl } from "@/lib/api/client";
import { useInvalidateAll } from "@/hooks/queries";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Field, Input, Textarea } from "@/components/ui/field";
import { Card } from "@/components/ui/card";
import { DocumentViewer } from "@/components/surat/document-viewer";
import { PrintButton } from "@/components/surat/print-button";

type Action = "approve" | "revision" | "reject" | "process" | "ready" | "complete" | "preview";

export function AdminActionPanel({ app }: { app: ApplicationResponse }) {
  const invalidate = useInvalidateAll();
  const [action, setAction] = useState<Action | null>(null);
  const [note, setNote] = useState("");
  const suggestion = app.letter_number ?? app.letter_number_suggestion ?? "";
  const [letterNumber, setLetterNumber] = useState(suggestion);
  const [busy, setBusy] = useState(false);

  // Usulan nomor bisa berubah (surat lain diproses lebih dulu); ikuti usulan terbaru
  // selama admin belum mengetik nomor kustom.
  const [prevSuggestion, setPrevSuggestion] = useState(suggestion);
  if (suggestion !== prevSuggestion) {
    setPrevSuggestion(suggestion);
    if (letterNumber === prevSuggestion) setLetterNumber(suggestion);
  }

  async function run(fn: () => Promise<unknown>, ok: string) {
    setBusy(true);
    try {
      await fn();
      invalidate();
      toast.success(ok);
      setAction(null);
      setNote("");
    } catch (e) {
      if (e instanceof ApiError && e.status === 409) invalidate(); // segarkan usulan nomor
      toast.error(e instanceof ApiError ? e.message : "Gagal memperbarui status.");
    } finally {
      setBusy(false);
    }
  }

  const s = app.status;
  const canVerify = s === "MENUNGGU_VERIFIKASI";
  const canProcess = s === "DISETUJUI";
  const canReady = s === "DIPROSES";
  const canComplete = s === "SIAP_DIAMBIL";
  const canPreview = ["DISETUJUI", "DIPROSES", "SIAP_DIAMBIL", "SELESAI"].includes(s);
  const terminal = s === "SELESAI" || s === "DITOLAK";

  const printPath = `/api/admin/applications/${app.id}/print`;
  const previewParams = { letter_number: app.letter_number ? undefined : letterNumber };
  const downloadUrl = tokenizedUrl(printPath, { download: "true", ...previewParams });

  return (
    <Card className="flex flex-col gap-2 p-5">
      <p className="mb-1 text-caption font-semibold text-ink">Tindakan</p>

      {canVerify && (
        <>
          <Button onClick={() => setAction("approve")} className="w-full justify-between">
            Setujui <Check className="size-4" />
          </Button>
          <Button variant="secondary" onClick={() => setAction("revision")} className="w-full justify-between">
            Minta Perbaikan <RotateCcw className="size-4" />
          </Button>
          <Button variant="danger" onClick={() => setAction("reject")} className="w-full justify-between">
            Tolak <X className="size-4" />
          </Button>
        </>
      )}
      {canProcess && (
        <Button onClick={() => setAction("process")} className="w-full justify-between">
          Proses Surat <Stamp className="size-4" />
        </Button>
      )}
      {canReady && (
        <Button onClick={() => setAction("ready")} className="w-full justify-between">
          Surat Siap Diambil <BellRing className="size-4" />
        </Button>
      )}
      {canComplete && (
        <Button onClick={() => setAction("complete")} className="w-full justify-between">
          Tandai Selesai <CheckCheck className="size-4" />
        </Button>
      )}
      {canPreview && (
        <>
          <Button variant="secondary" onClick={() => setAction("preview")} className="w-full justify-between">
            {app.has_letter_file ? "Lihat Surat" : "Preview Surat"} <Eye className="size-4" />
          </Button>
          <a href={downloadUrl} className="w-full">
            <Button variant="pearl" className="w-full justify-between">
              Download PDF <Download className="size-4" />
            </Button>
          </a>
        </>
      )}

      {s === "PERLU_PERBAIKAN" && (
        <p className="text-caption text-ink-muted-80">Menunggu mahasiswa memperbaiki dan mengirim ulang.</p>
      )}
      {canReady && (
        <p className="text-caption text-ink-muted-80">
          Cetak surat, mintakan tanda tangan dan stempel pimpinan, lalu tekan <strong className="font-semibold text-ink">Surat Siap Diambil</strong> untuk memberi tahu mahasiswa.
        </p>
      )}
      {terminal && (
        <p className="text-caption text-ink-muted-80">
          Pengajuan telah {s === "SELESAI" ? "selesai" : "ditolak"}. Tidak ada tindakan lanjutan.
        </p>
      )}

      <Dialog open={action === "approve"} onClose={() => setAction(null)} title="Setujui Pengajuan">
        <p className="text-body text-ink-muted-80">
          Data dan dokumen telah diperiksa dan valid. Status menjadi <strong className="font-semibold text-ink">Disetujui</strong>; mahasiswa menerima notifikasi. Nomor surat ditetapkan saat <strong className="font-semibold text-ink">Proses Surat</strong>.
        </p>
        <Footer busy={busy} onCancel={() => setAction(null)} onOk={() => run(() => adminApi.approve(app.id), "Pengajuan disetujui.")} label="Setujui" />
      </Dialog>

      <Dialog open={action === "revision"} onClose={() => setAction(null)} title="Minta Perbaikan">
        <Field label="Catatan untuk mahasiswa" htmlFor="note" required hint="Minimal 10 karakter. Jelaskan data/dokumen yang perlu diperbaiki.">
          <Textarea id="note" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Contoh: Proposal belum memiliki halaman pengesahan…" />
        </Field>
        <Footer busy={busy} disabled={note.trim().length < 10} onCancel={() => setAction(null)} onOk={() => run(() => adminApi.revision(app.id, { note: note.trim() }), "Permintaan perbaikan dikirim.")} label="Kirim Catatan" />
      </Dialog>

      <Dialog open={action === "reject"} onClose={() => setAction(null)} title="Tolak Pengajuan">
        <Field label="Alasan penolakan" htmlFor="reason" required hint="Minimal 10 karakter.">
          <Textarea id="reason" value={note} onChange={(e) => setNote(e.target.value)} />
        </Field>
        <Footer busy={busy} danger disabled={note.trim().length < 10} onCancel={() => setAction(null)} onOk={() => run(() => adminApi.reject(app.id, { note: note.trim() }), "Pengajuan ditolak.")} label="Tolak" />
      </Dialog>

      <Dialog
        open={action === "process"}
        onClose={() => setAction(null)}
        title="Proses Surat"
        description="Tetapkan nomor surat. Sistem membuat PDF untuk dicetak, ditandatangani, dan distempel pimpinan."
      >
        <Field
          label="Nomor Surat"
          htmlFor="letterNumber"
          required
          hint="Struktur: No. urut / kode unit / bulan (Romawi) / tahun Hijriah / tahun Masehi. Diusulkan otomatis, dapat diubah."
        >
          <Input id="letterNumber" value={letterNumber} onChange={(e) => setLetterNumber(e.target.value)} />
        </Field>
        <p className="mt-4 text-caption text-ink-muted-80">
          Status menjadi <strong className="font-semibold text-ink">Sedang Diproses</strong>. Mahasiswa belum diminta mengambil surat sampai Anda menekan <strong className="font-semibold text-ink">Surat Siap Diambil</strong>.
        </p>
        <Footer busy={busy} disabled={letterNumber.trim().length < 3} onCancel={() => setAction(null)} onOk={() => run(() => adminApi.process(app.id, { letter_number: letterNumber.trim() }), "Surat sedang diproses. PDF siap dicetak.")} label="Proses & Buat PDF" />
      </Dialog>

      <Dialog
        open={action === "ready"}
        onClose={() => setAction(null)}
        title="Surat Siap Diambil"
        description="Pastikan surat fisik sudah ditandatangani dan distempel."
      >
        <p className="text-body text-ink-muted-80">
          Mahasiswa akan menerima notifikasi bahwa surat <strong className="font-semibold text-ink">{app.letter_name}</strong> ({app.letter_number}) sudah dapat diambil di Bagian Administrasi. Status menjadi <strong className="font-semibold text-ink">Siap Diambil</strong>.
        </p>
        <Footer busy={busy} onCancel={() => setAction(null)} onOk={() => run(() => adminApi.ready(app.id), "Notifikasi dikirim ke mahasiswa.")} label="Kirim Notifikasi" />
      </Dialog>

      <Dialog open={action === "complete"} onClose={() => setAction(null)} title="Tandai Selesai">
        <p className="text-body text-ink-muted-80">
          Surat telah diserahkan kepada mahasiswa. Pengajuan ditutup dengan status <strong className="font-semibold text-ink">Selesai</strong>.
        </p>
        <Footer busy={busy} onCancel={() => setAction(null)} onOk={() => run(() => adminApi.complete(app.id), "Pengajuan selesai.")} label="Selesai" />
      </Dialog>

      <Dialog
        open={action === "preview"}
        onClose={() => setAction(null)}
        title={app.has_letter_file ? "Surat Terbit" : "Pratinjau Surat"}
        description={app.letter_number ? `Nomor: ${app.letter_number}` : `Pratinjau dengan nomor usulan ${letterNumber || app.letter_number_suggestion || "—"}`}
        className="max-w-4xl"
      >
        {action === "preview" && <DocumentViewer path={printPath} params={previewParams} />}
        <div className="mt-5 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Button variant="ghost" onClick={() => setAction(null)}>Tutup</Button>
          <a href={downloadUrl}>
            <Button variant="secondary"><Download className="size-4" /> Download</Button>
          </a>
          <PrintButton path={printPath} params={previewParams} />
        </div>
      </Dialog>
    </Card>
  );
}

function Footer({
  busy,
  disabled,
  danger,
  onCancel,
  onOk,
  label,
}: {
  busy: boolean;
  disabled?: boolean;
  danger?: boolean;
  onCancel: () => void;
  onOk: () => void;
  label: string;
}) {
  return (
    <div className="mt-7 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
      <Button variant="ghost" onClick={onCancel} disabled={busy}>
        Batal
      </Button>
      <Button variant={danger ? "danger" : "primary"} onClick={onOk} loading={busy} disabled={disabled}>
        {label}
      </Button>
    </div>
  );
}
