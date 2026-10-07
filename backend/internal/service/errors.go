// Package service berisi aturan bisnis. Handler hanya memanggil service;
// service memanggil repository dan komponen infrastruktur (storage, ws, pdf).
//
// Satu file per domain:
//   - errors.go               tipe Error ber-kode HTTP + helper
//   - actor.go                identitas pemanggil dari JWT
//   - auth_service.go         login, me
//   - student_service.go      profil mahasiswa
//   - letter_type_service.go  jenis surat
//   - application_dto.go      DTO respons pengajuan
//   - application_service.go  alur mahasiswa (draft, upload, submit)
//   - admin_service.go        alur admin (state machine status, PDF, cetak)
//   - notification_service.go notifikasi
package service

import (
	"errors"
	"net/http"

	"github.com/pascasarjana-unismuh/persuratan-backend/internal/repository"
)

// Error membawa kode HTTP agar handler bisa memetakan respons tanpa
// mengetahui detail domain.
type Error struct {
	Code int
	Msg  string
}

func (e *Error) Error() string { return e.Msg }

func ErrBadRequest(msg string) error   { return &Error{http.StatusBadRequest, msg} }
func ErrUnauthorized(msg string) error { return &Error{http.StatusUnauthorized, msg} }
func ErrForbidden(msg string) error    { return &Error{http.StatusForbidden, msg} }
func ErrNotFound(msg string) error     { return &Error{http.StatusNotFound, msg} }
func ErrConflict(msg string) error     { return &Error{http.StatusConflict, msg} }

// mapRepoErr mengubah repository.ErrNotFound menjadi 404 dengan pesan domain.
func mapRepoErr(err error, notFoundMsg string) error {
	if errors.Is(err, repository.ErrNotFound) {
		return ErrNotFound(notFoundMsg)
	}
	return err
}
