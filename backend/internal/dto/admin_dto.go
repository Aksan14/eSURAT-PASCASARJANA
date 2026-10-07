package dto

import "strings"

// ---- Request ----

// AdminListQuery parameter query GET /api/admin/applications.
// Status boleh lebih dari satu, dipisah koma: status=MENUNGGU_VERIFIKASI,DISETUJUI
type AdminListQuery struct {
	Q          string `query:"q"`
	Status     string `query:"status" validate:"omitempty,statuslist"`
	LetterCode string `query:"letter_code" validate:"omitempty,oneof=SKK SKL SIPI"`
	DateFrom   string `query:"date_from" validate:"omitempty,datetime=2006-01-02"`
	DateTo     string `query:"date_to" validate:"omitempty,datetime=2006-01-02"`
	Page       int    `query:"page" validate:"omitempty,min=1"`
	PerPage    int    `query:"per_page" validate:"omitempty,min=1,max=100"`
}

// Statuses memecah Status menjadi daftar (tanpa entri kosong).
func (q AdminListQuery) Statuses() []string {
	if q.Status == "" {
		return nil
	}
	var out []string
	for _, s := range strings.Split(q.Status, ",") {
		if s = strings.TrimSpace(s); s != "" {
			out = append(out, s)
		}
	}
	return out
}

// NoteRequest dipakai revision & reject.
type NoteRequest struct {
	Note string `json:"note" validate:"required,min=10,max=1000"`
}

// ProcessRequest nomor surat resmi yang ditetapkan saat surat mulai diproses
// (struktur mengikuti @format-nomor template; usulan tersedia di letter_number_suggestion).
type ProcessRequest struct {
	LetterNumber string `json:"letter_number" validate:"required,min=3,max=100"`
}

// PrintQuery parameter GET /api/admin/applications/:id/print.
type PrintQuery struct {
	LetterNumber string `query:"letter_number"`
	Download     bool   `query:"download"`
}

// ---- Response ----

type AdminApplicationListResponse = Paginated[ApplicationResponse]
