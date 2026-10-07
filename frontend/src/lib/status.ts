import type { ApplicationStatus, LetterCode } from "@/types/api";

export type Tone = "neutral" | "info" | "warning" | "success" | "danger";

export const STATUS_META: Record<ApplicationStatus, { label: string; description: string; tone: Tone }> = {
  DRAFT: { label: "Draft", description: "Pengajuan belum dikirim.", tone: "neutral" },
  MENUNGGU_VERIFIKASI: {
    label: "Menunggu Verifikasi",
    description: "Pengajuan sedang menunggu pemeriksaan admin.",
    tone: "info",
  },
  PERLU_PERBAIKAN: {
    label: "Perlu Perbaikan",
    description: "Admin meminta perbaikan data atau dokumen.",
    tone: "warning",
  },
  DISETUJUI: { label: "Disetujui", description: "Pengajuan lolos pemeriksaan admin.", tone: "success" },
  DIPROSES: {
    label: "Sedang Diproses",
    description: "Surat sedang dicetak, ditandatangani, dan distempel.",
    tone: "info",
  },
  SIAP_DIAMBIL: {
    label: "Siap Diambil",
    description: "Surat selesai dan tersedia untuk diambil.",
    tone: "success",
  },
  SELESAI: { label: "Selesai", description: "Proses pengajuan surat telah selesai.", tone: "success" },
  DITOLAK: { label: "Ditolak", description: "Pengajuan ditolak oleh admin.", tone: "danger" },
};

export const TIMELINE_STEPS: ApplicationStatus[] = [
  "DRAFT",
  "MENUNGGU_VERIFIKASI",
  "DISETUJUI",
  "DIPROSES",
  "SIAP_DIAMBIL",
  "SELESAI",
];

export const TIMELINE_LABELS: Record<ApplicationStatus, string> = {
  DRAFT: "Pengajuan Dibuat",
  MENUNGGU_VERIFIKASI: "Menunggu Verifikasi",
  PERLU_PERBAIKAN: "Perlu Perbaikan",
  DISETUJUI: "Disetujui",
  DIPROSES: "Sedang Diproses",
  SIAP_DIAMBIL: "Siap Diambil",
  SELESAI: "Selesai",
  DITOLAK: "Ditolak",
};

export const ACTIVE_STATUSES: ApplicationStatus[] = [
  "MENUNGGU_VERIFIKASI",
  "DISETUJUI",
  "DIPROSES",
  "SIAP_DIAMBIL",
];

export const TONE_BADGE: Record<Tone, string> = {
  neutral: "bg-divider-soft text-ink-muted-80",
  info: "bg-info-soft text-info",
  warning: "bg-warning-soft text-warning",
  success: "bg-success-soft text-success",
  danger: "bg-danger-soft text-danger",
};

export const TONE_DOT: Record<Tone, string> = {
  neutral: "bg-ink-muted-48",
  info: "bg-info",
  warning: "bg-warning",
  success: "bg-success",
  danger: "bg-danger",
};

/** Gabungan status yang menuntut tindakan admin; dipakai filter `status=` (dipisah koma). */
export const ACTION_NEEDED_STATUSES = "MENUNGGU_VERIFIKASI,DISETUJUI,DIPROSES";

export const LETTER_ROUTES: Record<LetterCode, string> = {
  SKK: "/surat/keterangan-kuliah",
  SKL: "/surat/keterangan-lulus",
  SIPI: "/surat/izin-penelitian",
};

export const FIELD_LABELS: Record<string, string> = {
  semester: "Semester",
  tahunAjaran: "Tahun Ajaran",
  tanggalYudisium: "Tanggal Yudisium",
  ipk: "IPK",
  predikatKelulusan: "Predikat Kelulusan",
  judulTesis: "Judul Tesis",
  tujuanSurat: "Ditujukan Kepada",
  kotaTujuan: "Kota Tujuan",
  // field lama (pengajuan sebelum perubahan template)
  tahunAkademik: "Tahun Akademik",
  keperluan: "Keperluan Surat",
  tanggalLulus: "Tanggal Lulus",
  nomorIjazah: "Nomor Ijazah",
  judulPenelitian: "Judul Penelitian",
  instansiTujuan: "Instansi Tujuan",
  alamatInstansi: "Alamat Instansi",
  lokasiPenelitian: "Lokasi Penelitian",
  dosenPembimbing: "Dosen Pembimbing",
  tanggalMulai: "Tanggal Mulai Penelitian",
  tanggalSelesai: "Tanggal Selesai Penelitian",
  nomorTelepon: "Nomor Telepon",
  email: "Email",
  alamat: "Alamat",
};

export const DOCUMENT_LABELS: Record<string, string> = {
  proposal: "Proposal Penelitian",
  pendukung: "Dokumen Pendukung",
};

export const DATE_FIELDS = new Set(["tanggalYudisium", "tanggalLulus", "tanggalMulai", "tanggalSelesai"]);
