import { http } from "./client";
import type {
  AdminListQuery,
  AdminStatsResponse,
  ApplicationResponse,
  CreateApplicationRequest,
  DocumentResponse,
  Envelope,
  LetterTypeResponse,
  LoginRequest,
  LoginResponse,
  MeResponse,
  NoteRequest,
  NotificationResponse,
  Pagination,
  ProcessRequest,
  StatusSummaryResponse,
  StudentProfileResponse,
  UpdateApplicationRequest,
  UpdateProfileRequest,
} from "@/types/api";

const unwrap = <T>(p: Promise<{ data: Envelope<T> }>) => p.then((r) => r.data.data);

// ---- /api/auth ----
export const authApi = {
  login: (body: LoginRequest) => unwrap<LoginResponse>(http.post("/api/auth/login", body)),
  logout: () => unwrap<null>(http.post("/api/auth/logout")),
  me: () => unwrap<MeResponse>(http.get("/api/auth/me")),
};

// ---- /api/student ----
export const studentApi = {
  profile: () => unwrap<StudentProfileResponse>(http.get("/api/student/profile")),
  updateProfile: (body: UpdateProfileRequest) =>
    unwrap<StudentProfileResponse>(http.put("/api/student/profile", body)),
};

// ---- /api/letter-types ----
export const letterTypeApi = {
  list: () => unwrap<LetterTypeResponse[]>(http.get("/api/letter-types")),
  get: (idOrCode: string) => unwrap<LetterTypeResponse>(http.get(`/api/letter-types/${idOrCode}`)),
};

// ---- /api/applications (mahasiswa) ----
export const applicationApi = {
  list: () => unwrap<ApplicationResponse[]>(http.get("/api/applications")),
  summary: () => unwrap<StatusSummaryResponse>(http.get("/api/applications/summary")),
  get: (id: string) => unwrap<ApplicationResponse>(http.get(`/api/applications/${id}`)),
  create: (body: CreateApplicationRequest) =>
    unwrap<ApplicationResponse>(http.post("/api/applications", body)),
  update: (id: string, body: UpdateApplicationRequest) =>
    unwrap<ApplicationResponse>(http.put(`/api/applications/${id}`, body)),
  uploadDocument: (id: string, documentType: string, file: File) => {
    const fd = new FormData();
    fd.append("document_type", documentType);
    fd.append("file", file);
    return unwrap<DocumentResponse>(
      http.post(`/api/applications/${id}/documents`, fd, {
        headers: { "Content-Type": "multipart/form-data" },
      }),
    );
  },
  submit: (id: string) => unwrap<ApplicationResponse>(http.post(`/api/applications/${id}/submit`)),
};

// ---- /api/admin/applications ----
export const adminApi = {
  list: async (q: AdminListQuery) => {
    const r = await http.get<Envelope<ApplicationResponse[]>>("/api/admin/applications", {
      params: Object.fromEntries(Object.entries(q).filter(([, v]) => v !== "" && v != null)),
    });
    return { items: r.data.data, meta: r.data.meta as Pagination };
  },
  summary: () => unwrap<StatusSummaryResponse>(http.get("/api/admin/applications/summary")),
  stats: () => unwrap<AdminStatsResponse>(http.get("/api/admin/applications/stats")),
  get: (id: string) => unwrap<ApplicationResponse>(http.get(`/api/admin/applications/${id}`)),
  approve: (id: string) => unwrap<ApplicationResponse>(http.post(`/api/admin/applications/${id}/approve`)),
  revision: (id: string, body: NoteRequest) =>
    unwrap<ApplicationResponse>(http.post(`/api/admin/applications/${id}/revision`, body)),
  reject: (id: string, body: NoteRequest) =>
    unwrap<ApplicationResponse>(http.post(`/api/admin/applications/${id}/reject`, body)),
  process: (id: string, body: ProcessRequest) =>
    unwrap<ApplicationResponse>(http.post(`/api/admin/applications/${id}/process`, body)),
  ready: (id: string) => unwrap<ApplicationResponse>(http.post(`/api/admin/applications/${id}/ready`)),
  complete: (id: string) => unwrap<ApplicationResponse>(http.post(`/api/admin/applications/${id}/complete`)),
};

// ---- /api/notifications ----
export const notificationApi = {
  list: () => unwrap<NotificationResponse[]>(http.get("/api/notifications")),
  markRead: (id: string) => unwrap<null>(http.put(`/api/notifications/${id}/read`)),
  markAllRead: () => unwrap<null>(http.put("/api/notifications/read-all")),
};
