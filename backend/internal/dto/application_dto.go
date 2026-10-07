package dto

import (
	"time"

	"github.com/google/uuid"

	"github.com/pascasarjana-unismuh/persuratan-backend/internal/model"
)

// ---- Request ----

type CreateApplicationRequest struct {
	LetterCode string            `json:"letter_code" validate:"required,oneof=SKK SKL SIPI"`
	Data       map[string]string `json:"data" validate:"required"`
}

type UpdateApplicationRequest struct {
	Data map[string]string `json:"data" validate:"required"`
}

// UploadDocumentRequest datang sebagai multipart form, bukan JSON.
type UploadDocumentRequest struct {
	DocumentType string `form:"document_type" validate:"required,max=50"`
}

// ---- Response ----

type StudentSummary struct {
	NIM          string `json:"nim"`
	Nama         string `json:"nama"`
	ProgramStudi string `json:"program_studi"`
	Fakultas     string `json:"fakultas"`
}

type DocumentResponse struct {
	ID           uuid.UUID `json:"id"`
	DocumentType string    `json:"document_type"`
	FileName     string    `json:"file_name"`
	MimeType     string    `json:"mime_type"`
	FileSize     int64     `json:"file_size"`
	UploadedAt   time.Time `json:"uploaded_at"`
	URL          string    `json:"url"`
}

type StatusHistoryResponse struct {
	ID            uuid.UUID               `json:"id"`
	Status        model.ApplicationStatus `json:"status"`
	Note          string                  `json:"note,omitempty"`
	ChangedByName string                  `json:"changed_by_name"`
	CreatedAt     time.Time               `json:"created_at"`
}

type ApplicationResponse struct {
	ID                uuid.UUID               `json:"id"`
	ApplicationNumber string                  `json:"application_number"`
	UserID            uuid.UUID               `json:"user_id"`
	Student           StudentSummary          `json:"student"`
	LetterTypeID      uuid.UUID               `json:"letter_type_id"`
	LetterCode        string                  `json:"letter_code"`
	LetterName        string                  `json:"letter_name"`
	Status            model.ApplicationStatus `json:"status"`
	Data              map[string]string       `json:"data"`
	Documents         []DocumentResponse      `json:"documents"`
	History           []StatusHistoryResponse `json:"history"`
	AdminNote         string                  `json:"admin_note,omitempty"`
	LetterNumber      string                  `json:"letter_number,omitempty"`
	// LetterNumberSuggestion: usulan nomor surat berstruktur template (hanya untuk admin, sebelum nomor ditetapkan).
	LetterNumberSuggestion string     `json:"letter_number_suggestion,omitempty"`
	HasLetterFile          bool       `json:"has_letter_file"`
	SubmittedAt            *time.Time `json:"submitted_at"`
	ProcessedAt            *time.Time `json:"processed_at"`
	CompletedAt            *time.Time `json:"completed_at"`
	CreatedAt              time.Time  `json:"created_at"`
	UpdatedAt              time.Time  `json:"updated_at"`
}

// StatusSummaryResponse hitung jumlah pengajuan per status.
type StatusSummaryResponse map[model.ApplicationStatus]int64

// AdminStatsResponse data grafik dashboard admin.
type AdminStatsResponse struct {
	Monthly        []MonthlyStat    `json:"monthly"`          // 12 bulan terakhir, urut lama→baru
	ByLetterType   []LetterTypeStat `json:"by_letter_type"`   // seluruh pengajuan non-draft
	Today          int64            `json:"today"`            // diajukan hari ini
	ThisWeek       int64            `json:"this_week"`        // diajukan 7 hari terakhir
	AvgProcessDays float64          `json:"avg_process_days"` // rata-rata diajukan→selesai (hari)
	CompletionRate float64          `json:"completion_rate"`  // selesai / (selesai+ditolak), 0–1
}

type MonthlyStat struct {
	Month     string `json:"month"` // "2026-10"
	Submitted int64  `json:"submitted"`
	Completed int64  `json:"completed"`
}

type LetterTypeStat struct {
	Code  string `json:"code"`
	Name  string `json:"name"`
	Count int64  `json:"count"`
}

// ---- Mapper ----

func DocumentFromModel(d *model.Document) DocumentResponse {
	return DocumentResponse{
		ID: d.ID, DocumentType: d.DocumentType, FileName: d.FileName,
		MimeType: d.MimeType, FileSize: d.FileSize, UploadedAt: d.UploadedAt,
		URL: "/api/documents/" + d.ID.String(),
	}
}

func StatusHistoryFromModel(h *model.StatusHistory) StatusHistoryResponse {
	return StatusHistoryResponse{
		ID: h.ID, Status: h.Status, Note: h.Note, ChangedByName: h.ChangedByName, CreatedAt: h.CreatedAt,
	}
}

// ApplicationDataMap meratakan baris EAV menjadi map (dipakai service & mapper).
func ApplicationDataMap(a *model.Application) map[string]string {
	data := make(map[string]string, len(a.Data))
	for _, d := range a.Data {
		data[d.FieldName] = d.FieldValue
	}
	return data
}

func ApplicationFromModel(a *model.Application) ApplicationResponse {
	st := StudentSummary{NIM: a.User.NIM, Nama: a.User.Name}
	if a.User.Profile != nil {
		st.ProgramStudi = a.User.Profile.ProgramStudi
		st.Fakultas = a.User.Profile.Fakultas
	}
	docs := make([]DocumentResponse, 0, len(a.Documents))
	for i := range a.Documents {
		docs = append(docs, DocumentFromModel(&a.Documents[i]))
	}
	hist := make([]StatusHistoryResponse, 0, len(a.Histories))
	for i := range a.Histories {
		hist = append(hist, StatusHistoryFromModel(&a.Histories[i]))
	}
	return ApplicationResponse{
		ID: a.ID, ApplicationNumber: a.ApplicationNumber, UserID: a.UserID, Student: st,
		LetterTypeID: a.LetterTypeID, LetterCode: a.LetterType.Code, LetterName: a.LetterType.Name,
		Status: a.Status, Data: ApplicationDataMap(a), Documents: docs, History: hist,
		AdminNote: a.AdminNote, LetterNumber: a.LetterNumber, HasLetterFile: a.LetterFilePath != "",
		SubmittedAt: a.SubmittedAt, ProcessedAt: a.ProcessedAt, CompletedAt: a.CompletedAt,
		CreatedAt: a.CreatedAt, UpdatedAt: a.UpdatedAt,
	}
}

func ApplicationsFromModel(as []model.Application) []ApplicationResponse {
	out := make([]ApplicationResponse, 0, len(as))
	for i := range as {
		out = append(out, ApplicationFromModel(&as[i]))
	}
	return out
}
