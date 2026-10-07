import { z } from "zod";
import type { LetterCode } from "@/types/api";

export type FieldType = "text" | "textarea" | "date" | "select" | "file";

export interface FieldDef {
  name: string;
  label: string;
  type: FieldType;
  required?: boolean;
  placeholder?: string;
  hint?: string;
  options?: string[];
  accept?: string;
  /** untuk type=file: nilai `document_type` di backend */
  documentType?: string;
  /** nilai awal bila belum ada data */
  defaultValue?: string;
  /** nilai tetap sesuai template resmi — ditampilkan read-only, selalu memakai defaultValue */
  fixed?: boolean;
  full?: boolean;
}

export interface LetterFormDef {
  code: LetterCode;
  name: string;
  intro: string;
  fields: FieldDef[];
  schema: z.ZodType<Record<string, unknown>, Record<string, unknown>>;
}

const MAX_FILE = 5 * 1024 * 1024;

const fileSchema = (required: boolean) =>
  z
    .custom<File | undefined>(
      (v) => v === undefined || v === null || (typeof File !== "undefined" && v instanceof File),
      "Berkas tidak valid.",
    )
    .refine((f) => !required || !!f, "Dokumen wajib diunggah.")
    .refine((f) => !f || f.size <= MAX_FILE, "Ukuran maksimal 5 MB.")
    .refine((f) => !f || f.type === "application/pdf", "Format harus PDF.");

const req = (msg = "Wajib diisi.") => z.string().trim().min(1, msg);

/**
 * Definisi form per jenis surat — field mengikuti template resmi
 * (backend/templates/sources/*.doc). Data diri (nama, TTL, NIM, prodi)
 * tidak ditanya karena diisi otomatis dari profil mahasiswa.
 */
export const LETTER_FORMS: Record<LetterCode, LetterFormDef> = {
  SKK: {
    code: "SKK",
    name: "Surat Keterangan Kuliah",
    intro: "Menerangkan bahwa Anda mahasiswa aktif pada semester berjalan. Identitas diambil dari profil Anda.",
    fields: [
      { name: "semester", label: "Semester", type: "select", required: true, options: ["Ganjil", "Genap"] },
      { name: "tahunAjaran", label: "Tahun Ajaran", type: "text", required: true, placeholder: "2025-2026", hint: "Format: 2025-2026" },
    ],
    schema: z.object({
      semester: req("Pilih semester."),
      tahunAjaran: z.string().trim().regex(/^\d{4}-\d{4}$/, "Format: 2025-2026"),
    }),
  },
  SKL: {
    code: "SKL",
    name: "Surat Keterangan Lulus",
    intro: "Menerangkan bahwa Anda telah menyelesaikan studi. Isi sesuai berita acara yudisium.",
    fields: [
      { name: "tanggalYudisium", label: "Tanggal Yudisium", type: "date", required: true },
      { name: "ipk", label: "Indeks Prestasi Kumulatif (IPK)", type: "text", required: true, placeholder: "3.91", hint: "Dua angka desimal, contoh 3.91" },
      {
        name: "predikatKelulusan",
        label: "Predikat Kelulusan",
        type: "select",
        required: true,
        options: ["Memuaskan", "Sangat Memuaskan", "Dengan Pujian (Cumlaude)"],
      },
      { name: "judulTesis", label: "Judul Tesis", type: "textarea", required: true, full: true },
    ],
    schema: z.object({
      tanggalYudisium: req("Tanggal yudisium wajib diisi."),
      ipk: z.string().trim().regex(/^[0-4][.,]\d{2}$/, "Contoh: 3.91"),
      predikatKelulusan: req("Pilih predikat."),
      judulTesis: req().min(10, "Judul minimal 10 karakter."),
    }),
  },
  SIPI: {
    code: "SIPI",
    name: "Surat Pengantar Izin Penelitian",
    intro: "Surat pengantar dari Pascasarjana kepada LP3M agar diterbitkan surat izin penelitian. Lampirkan proposal yang telah disahkan pembimbing.",
    fields: [
      { name: "judulTesis", label: "Judul Tesis", type: "textarea", required: true, full: true },
      {
        name: "tujuanSurat",
        label: "Ditujukan Kepada",
        type: "text",
        required: true,
        fixed: true,
        defaultValue: "Ketua LP3M Universitas Muhammadiyah Makassar",
        hint: "Ditetapkan sesuai template resmi; tidak dapat diubah.",
      },
      { name: "kotaTujuan", label: "Kota Tujuan", type: "text", required: true, fixed: true, defaultValue: "Makassar" },
      { name: "fileProposal", label: "Dokumen Proposal Penelitian", type: "file", required: true, accept: "application/pdf", documentType: "proposal", hint: "PDF, maksimal 5 MB. Sertakan halaman pengesahan.", full: true },
      { name: "filePendukung", label: "Dokumen Pendukung Lainnya", type: "file", accept: "application/pdf", documentType: "pendukung", hint: "Opsional. PDF, maksimal 5 MB.", full: true },
    ],
    schema: z.object({
      judulTesis: req().min(10, "Judul minimal 10 karakter."),
      tujuanSurat: req(),
      kotaTujuan: req(),
      fileProposal: fileSchema(true),
      filePendukung: fileSchema(false),
    }),
  },
};
