// Package dto mendefinisikan kontrak request & response API.
//
// Satu file per domain:
//   - auth_dto.go          login
//   - student_dto.go       profil mahasiswa
//   - letter_type_dto.go   jenis surat
//   - application_dto.go   pengajuan (mahasiswa & admin berbagi response)
//   - admin_dto.go         aksi admin, filter daftar, paginasi
//   - notification_dto.go  notifikasi
//
// Aturan:
//   - Struct *Request membawa tag `json` + `validate`; dipakai handler via bindValidate.
//   - Struct *Response adalah bentuk JSON keluar; model GORM TIDAK dikirim langsung.
//   - Fungsi *FromModel memetakan model → response; hanya dto yang boleh
//     mengetahui bentuk JSON, service hanya mengembalikan dto.
package dto

// Pagination metadata daftar berhalaman.
type Pagination struct {
	Page       int   `json:"page"`
	PerPage    int   `json:"per_page"`
	Total      int64 `json:"total"`
	TotalPages int   `json:"total_pages"`
}

// Paginated membungkus item + metadata.
type Paginated[T any] struct {
	Items []T        `json:"items"`
	Meta  Pagination `json:"meta"`
}
