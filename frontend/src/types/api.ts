/**
 * Tipe = kontrak backend `internal/dto` (snake_case, apa adanya dari API).
 * Jangan ubah nama field di sini tanpa mengubah dto backend.
 */

export type Role = "mahasiswa" | "admin";

export type ApplicationStatus =
  | "DRAFT"
  | "MENUNGGU_VERIFIKASI"
  | "PERLU_PERBAIKAN"
  | "DISETUJUI"
  | "DIPROSES"
  | "SIAP_DIAMBIL"
  | "SELESAI"
  | "DITOLAK";

export type LetterCode = "SKK" | "SKL" | "SIPI";

// ---- envelope (pkg/response) ----
export interface Envelope<T> {
  success: boolean;
  message?: string;
  data: T;
  meta?: Pagination;
  errors?: Record<string, string>;
}

export interface Pagination {
  page: number;
  per_page: number;
  total: number;
  total_pages: number;
}

// ---- auth_dto ----
export interface LoginRequest {
  nim: string;
  password: string;
}

export interface UserResponse {
  id: string;
  nim: string;
  name: string;
  email: string;
  role: Role;
}

export interface LoginResponse {
  token: string;
  expires_at: string;
  user: UserResponse;
}

export interface MeResponse extends UserResponse {
  profile?: StudentProfileResponse;
}

// ---- student_dto ----
export interface StudentProfileResponse {
  id: string;
  user_id: string;
  nim: string;
  nama: string;
  program_studi: string;
  fakultas: string;
  tempat_lahir: string;
  tanggal_lahir: string | null;
  alamat: string;
  nomor_telepon: string;
  email: string;
}

export interface UpdateProfileRequest {
  alamat?: string;
  nomor_telepon?: string;
  email?: string;
}

// ---- letter_type_dto ----
export interface LetterTypeResponse {
  id: string;
  code: LetterCode;
  name: string;
  description: string;
  is_active: boolean;
  requires_document: boolean;
}

// ---- application_dto ----
export interface CreateApplicationRequest {
  letter_code: LetterCode;
  data: Record<string, string>;
}

export interface UpdateApplicationRequest {
  data: Record<string, string>;
}

export interface StudentSummary {
  nim: string;
  nama: string;
  program_studi: string;
  fakultas: string;
}

export interface DocumentResponse {
  id: string;
  document_type: string;
  file_name: string;
  mime_type: string;
  file_size: number;
  uploaded_at: string;
  url: string;
}

export interface StatusHistoryResponse {
  id: string;
  status: ApplicationStatus;
  note?: string;
  changed_by_name: string;
  created_at: string;
}

export interface ApplicationResponse {
  id: string;
  application_number: string;
  user_id: string;
  student: StudentSummary;
  letter_type_id: string;
  letter_code: LetterCode;
  letter_name: string;
  status: ApplicationStatus;
  data: Record<string, string>;
  documents: DocumentResponse[];
  history: StatusHistoryResponse[];
  admin_note?: string;
  letter_number?: string;
  /** Usulan nomor surat berstruktur template (admin, sebelum nomor ditetapkan). */
  letter_number_suggestion?: string;
  has_letter_file: boolean;
  submitted_at: string | null;
  processed_at: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export type StatusSummaryResponse = Partial<Record<ApplicationStatus, number>>;

export interface MonthlyStat {
  month: string; // "2026-10"
  submitted: number;
  completed: number;
}

export interface LetterTypeStat {
  code: LetterCode;
  name: string;
  count: number;
}

export interface AdminStatsResponse {
  monthly: MonthlyStat[];
  by_letter_type: LetterTypeStat[];
  today: number;
  this_week: number;
  avg_process_days: number;
  completion_rate: number;
}

// ---- admin_dto ----
export interface AdminListQuery {
  q?: string;
  /** Satu status, atau beberapa dipisah koma (mis. ACTION_NEEDED). */
  status?: string;
  letter_code?: LetterCode | "";
  date_from?: string;
  date_to?: string;
  page?: number;
  per_page?: number;
}

export interface NoteRequest {
  note: string;
}

export interface ProcessRequest {
  letter_number: string;
}

// ---- notification_dto ----
export interface NotificationResponse {
  id: string;
  application_id: string | null;
  title: string;
  message: string;
  is_read: boolean;
  created_at: string;
}

// ---- websocket (internal/websocket) ----
export interface WsEvent {
  event:
    | "application.status.updated"
    | "application.created"
    | "application.revision.required"
    | "application.approved"
    | "application.completed";
  data: {
    application_id: string;
    application_number: string;
    status: ApplicationStatus;
    message: string;
  };
}
