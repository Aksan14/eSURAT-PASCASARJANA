"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Controller, useForm, type FieldValues, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { ArrowLeft, ArrowRight, Check, Eye, FileText, Send } from "lucide-react";
import type { ApplicationResponse, DocumentResponse, StudentProfileResponse } from "@/types/api";
import type { FieldDef, LetterFormDef } from "@/lib/letter-forms";
import { applicationApi } from "@/lib/api";
import { ApiError } from "@/lib/api/client";
import { useInvalidateAll } from "@/hooks/queries";
import { DATE_FIELDS, DOCUMENT_LABELS, FIELD_LABELS } from "@/lib/status";
import { cn, formatBytes, formatDate } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { Dialog } from "@/components/ui/dialog";
import { Card, CardBody, CardHeader, CardTitle, DataList } from "@/components/ui/card";
import { DocumentViewer } from "@/components/surat/document-viewer";
import { FileInput } from "./file-input";

type Step = "isi" | "review";

/**
 * Wizard pengajuan. Mode baru: POST /applications → upload dokumen → submit.
 * Mode perbaikan (existing): PUT /applications/:id → upload (opsional) → submit.
 */
export function LetterForm({
  def,
  profile,
  existing,
}: {
  def: LetterFormDef;
  profile: StudentProfileResponse;
  existing?: ApplicationResponse;
}) {
  const router = useRouter();
  const invalidate = useInvalidateAll();
  const [step, setStep] = useState<Step>("isi");
  const [confirm, setConfirm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [progress, setProgress] = useState<string | null>(null);

  const defaults: FieldValues = {};
  // Mode: baru (tanpa existing), melanjutkan draft, atau perbaikan setelah catatan admin.
  const isRevision = existing?.status === "PERLU_PERBAIKAN";
  for (const f of def.fields) {
    if (f.type === "file") defaults[f.name] = undefined;
    else if (f.fixed) defaults[f.name] = f.defaultValue ?? "";
    else if (existing?.data[f.name] !== undefined) defaults[f.name] = existing.data[f.name];
    else defaults[f.name] = f.defaultValue ?? "";
  }

  // Mode perbaikan: berkas yang sudah tersimpan tidak wajib diunggah ulang.
  const baseResolver = zodResolver(def.schema) as Resolver<FieldValues>;
  const resolver: Resolver<FieldValues> = async (values, ctx, opts) => {
    const res = await baseResolver(values, ctx, opts);
    if (!existing) return res;
    const errs = { ...res.errors };
    for (const f of def.fields) {
      if (f.type === "file" && !values[f.name] && existingDoc(existing, f)) delete errs[f.name];
    }
    return Object.keys(errs).length === 0 ? { values, errors: {} } : { values: {}, errors: errs };
  };

  const { register, control, handleSubmit, getValues, formState } = useForm<FieldValues>({
    resolver,
    defaultValues: defaults,
    mode: "onBlur",
  });
  const errors = formState.errors as Record<string, { message?: string } | undefined>;

  async function onSubmitFinal() {
    setSubmitting(true);
    const values = getValues();
    const data: Record<string, string> = {};
    const files: { documentType: string; file: File }[] = [];
    for (const f of def.fields) {
      const v = values[f.name];
      if (f.type === "file") {
        if (v instanceof File && f.documentType) files.push({ documentType: f.documentType, file: v });
      } else data[f.name] = String(v ?? "");
    }

    try {
      let app: ApplicationResponse;
      if (existing) {
        setProgress("Menyimpan perubahan…");
        app = await applicationApi.update(existing.id, { data });
      } else {
        setProgress("Membuat pengajuan…");
        app = await applicationApi.create({ letter_code: def.code, data });
      }
      for (const [i, f] of files.entries()) {
        setProgress(`Mengunggah dokumen ${i + 1}/${files.length}…`);
        await applicationApi.uploadDocument(app.id, f.documentType, f.file);
      }
      setProgress("Mengirim pengajuan…");
      app = await applicationApi.submit(app.id);
      invalidate();
      toast.success(isRevision ? "Pengajuan dikirim ulang" : "Pengajuan terkirim", {
        description: `${app.application_number} · Menunggu verifikasi admin.`,
      });
      router.replace(`/pengajuan/${app.id}`);
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Gagal mengirim pengajuan.");
      setSubmitting(false);
      setProgress(null);
      setConfirm(false);
    }
  }

  const identity = [
    { label: "Nama Lengkap", value: profile.nama },
    { label: "NIM", value: profile.nim },
    { label: "Program Studi", value: profile.program_studi },
    { label: "Fakultas", value: profile.fakultas },
    { label: "Tempat, Tanggal Lahir", value: `${profile.tempat_lahir}, ${formatDate(profile.tanggal_lahir)}` },
  ];

  return (
    <>
      <Stepper current={step === "isi" ? 0 : 1} labels={[isRevision ? "Perbaiki Data" : existing ? "Lengkapi Data" : "Isi Data", "Review", "Kirim"]} />

      {step === "isi" && (
        <form onSubmit={handleSubmit(() => setStep("review"))} noValidate className="flex flex-col gap-6">
          {existing?.admin_note && (
            <div className="rounded-lg border border-warning/30 bg-warning-soft px-6 py-5">
              <p className="text-caption font-semibold text-warning">Catatan Admin</p>
              <p className="mt-1 text-body text-ink">“{existing.admin_note}”</p>
            </div>
          )}

          <Card>
            <CardHeader>
              <div>
                <CardTitle>Identitas Mahasiswa</CardTitle>
                <p className="mt-1 text-caption text-ink-muted-48">Diisi otomatis dari profil. Tidak dapat diubah di sini.</p>
              </div>
            </CardHeader>
            <CardBody>
              <DataList items={identity} columns={3} />
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Data Surat</CardTitle>
            </CardHeader>
            <CardBody className="grid grid-cols-1 gap-5 md:grid-cols-2">
              {def.fields.map((f) => (
                <Field
                  key={f.name}
                  label={f.label}
                  htmlFor={f.name}
                  required={f.required && !(f.type === "file" && existingDoc(existing, f))}
                  error={errors[f.name]?.message}
                  hint={f.hint}
                  className={cn(f.full && "md:col-span-2")}
                >
                  {renderField(f, { register, control, invalid: !!errors[f.name], existing })}
                </Field>
              ))}
            </CardBody>
          </Card>

          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-between">
            <Button type="button" variant="ghost" onClick={() => router.back()}>
              <ArrowLeft className="size-4" /> Kembali
            </Button>
            <Button type="submit">
              Lanjut ke Review <ArrowRight className="size-4" />
            </Button>
          </div>
        </form>
      )}

      {step === "review" && (
        <div className="flex flex-col gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Identitas Mahasiswa</CardTitle>
            </CardHeader>
            <CardBody>
              <DataList items={identity} columns={3} />
            </CardBody>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Data Surat</CardTitle>
            </CardHeader>
            <CardBody>
              <DataList
                items={def.fields
                  .filter((f) => f.type !== "file")
                  .map((f) => {
                    const v = getValues(f.name) as string;
                    return { label: FIELD_LABELS[f.name] ?? f.label, value: DATE_FIELDS.has(f.name) && v ? formatDate(v) : v };
                  })}
              />
            </CardBody>
          </Card>
          {def.fields.some((f) => f.type === "file") && (
            <ReviewDocuments
              items={def.fields
                .filter((f) => f.type === "file")
                .map((f) => ({
                  label: DOCUMENT_LABELS[f.documentType ?? ""] ?? f.label,
                  file: getValues(f.name) as File | undefined,
                  existing: existing?.documents.find((d) => d.document_type === f.documentType),
                }))}
            />
          )}

          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-between">
            <Button type="button" variant="ghost" onClick={() => setStep("isi")}>
              <ArrowLeft className="size-4" /> Edit
            </Button>
            <Button type="button" onClick={() => setConfirm(true)}>
              {isRevision ? "Kirim Ulang" : "Kirim Pengajuan"} <Send className="size-4" />
            </Button>
          </div>
        </div>
      )}

      <Dialog
        open={confirm}
        onClose={() => !submitting && setConfirm(false)}
        title="Konfirmasi Pengiriman"
        description={`${def.name} akan masuk antrean verifikasi admin.`}
      >
        <p className="text-body text-ink-muted-80">
          Pastikan seluruh data sudah benar. Setelah dikirim, pengajuan tidak dapat diubah kecuali admin meminta
          perbaikan.
        </p>
        {progress && <p className="mt-4 text-caption text-primary">{progress}</p>}
        <div className="mt-7 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Button variant="ghost" onClick={() => setConfirm(false)} disabled={submitting}>
            Batal
          </Button>
          <Button onClick={onSubmitFinal} loading={submitting}>
            Ya, Kirim
          </Button>
        </div>
      </Dialog>
    </>
  );
}

function Stepper({ current, labels }: { current: number; labels: string[] }) {
  return (
    <ol className="mb-8 flex items-center gap-3">
      {labels.map((label, i) => {
        const state = i < current ? "done" : i === current ? "current" : "pending";
        return (
          <li key={label} className="flex items-center gap-3">
            <span
              className={cn(
                "flex size-7 items-center justify-center rounded-full text-fine font-semibold",
                state === "done" && "bg-primary text-on-primary",
                state === "current" && "border-2 border-primary text-primary",
                state === "pending" && "border border-hairline text-ink-muted-48",
              )}
            >
              {state === "done" ? <Check className="size-3.5" strokeWidth={3} /> : i + 1}
            </span>
            <span className={cn("text-caption", state === "pending" ? "text-ink-muted-48" : "font-semibold text-ink")}>
              {label}
            </span>
            {i < labels.length - 1 && <span className="hidden h-px w-8 bg-hairline sm:block" aria-hidden />}
          </li>
        );
      })}
    </ol>
  );
}

function existingDoc(existing: ApplicationResponse | undefined, f: FieldDef) {
  if (!existing || f.type !== "file") return undefined;
  return existing.documents.find((d) => d.document_type === f.documentType)?.file_name;
}

type ReviewDoc = { label: string; file?: File; existing?: DocumentResponse };

/** Daftar dokumen pada langkah Review + popup pratinjau (berkas baru maupun yang sudah tersimpan). */
function ReviewDocuments({ items }: { items: ReviewDoc[] }) {
  const [active, setActive] = useState<ReviewDoc | null>(null);
  const name = (d: ReviewDoc) => d.file?.name ?? d.existing?.file_name;
  const size = (d: ReviewDoc) => d.file?.size ?? d.existing?.file_size;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Dokumen</CardTitle>
      </CardHeader>
      <ul className="divide-y divide-divider-soft">
        {items.map((d) => {
          const n = name(d);
          return (
            <li key={d.label} className="flex items-center gap-4 px-6 py-4">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-md bg-parchment">
                <FileText className="size-5 text-ink-muted-80" />
              </span>
              <div className="flex min-w-0 flex-1 flex-col">
                <span className="text-fine text-ink-muted-48">{d.label}</span>
                <span className="truncate text-body text-ink">{n ?? "—"}</span>
                {n && (
                  <span className="text-fine text-ink-muted-48">
                    {formatBytes(size(d) ?? 0)}
                    {!d.file && d.existing && " · tidak diubah"}
                  </span>
                )}
              </div>
              {n && (
                <Button type="button" variant="ghost" size="sm" onClick={() => setActive(d)} aria-label={`Lihat ${n}`}>
                  <Eye className="size-4" /> Lihat
                </Button>
              )}
            </li>
          );
        })}
      </ul>

      <Dialog
        open={active !== null}
        onClose={() => setActive(null)}
        title={active?.label ?? "Dokumen"}
        description={active ? `${name(active)} · ${formatBytes(size(active) ?? 0)}` : undefined}
        className="max-w-4xl"
      >
        {active && (
          <>
            {active.file ? (
              <DocumentViewer file={active.file} />
            ) : (
              <DocumentViewer path={active.existing!.url} mimeType={active.existing!.mime_type} />
            )}
            <div className="mt-5 flex justify-end">
              <Button type="button" variant="ghost" onClick={() => setActive(null)}>Tutup</Button>
            </div>
          </>
        )}
      </Dialog>
    </Card>
  );
}

function renderField(
  f: FieldDef,
  ctx: {
    register: ReturnType<typeof useForm<FieldValues>>["register"];
    control: ReturnType<typeof useForm<FieldValues>>["control"];
    invalid: boolean;
    existing?: ApplicationResponse;
  },
) {
  const common = { id: f.name, "aria-invalid": ctx.invalid, placeholder: f.placeholder };
  if (f.fixed) {
    return <Input {...common} readOnly tabIndex={-1} className="bg-parchment text-ink-muted-80" {...ctx.register(f.name)} />;
  }
  switch (f.type) {
    case "textarea":
      return <Textarea {...common} {...ctx.register(f.name)} />;
    case "date":
      return <Input type="date" {...common} {...ctx.register(f.name)} />;
    case "select":
      return (
        <Select {...common} {...ctx.register(f.name)}>
          <option value="">Pilih…</option>
          {f.options?.map((o) => (
            <option key={o} value={o}>
              {o}
            </option>
          ))}
        </Select>
      );
    case "file":
      return (
        <Controller
          name={f.name}
          control={ctx.control}
          render={({ field }) => (
            <FileInput
              id={f.name}
              value={field.value as File | undefined}
              onChange={field.onChange}
              accept={f.accept}
              invalid={ctx.invalid}
              existingName={existingDoc(ctx.existing, f)}
            />
          )}
        />
      );
    default:
      return <Input {...common} {...ctx.register(f.name)} />;
  }
}
