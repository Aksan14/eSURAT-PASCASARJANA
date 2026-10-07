package dto

import (
	"time"

	"github.com/google/uuid"

	"github.com/pascasarjana-unismuh/persuratan-backend/internal/model"
)

// ---- Request ----

// UpdateProfileRequest hanya field kontak; data akademik dikelola bagian akademik.
type UpdateProfileRequest struct {
	Alamat       string `json:"alamat" validate:"omitempty,max=500"`
	NomorTelepon string `json:"nomor_telepon" validate:"omitempty,min=10,max=15"`
	Email        string `json:"email" validate:"omitempty,email"`
}

// ---- Response ----

type StudentProfileResponse struct {
	ID           uuid.UUID  `json:"id"`
	UserID       uuid.UUID  `json:"user_id"`
	NIM          string     `json:"nim"`
	Nama         string     `json:"nama"`
	ProgramStudi string     `json:"program_studi"`
	Fakultas     string     `json:"fakultas"`
	TempatLahir  string     `json:"tempat_lahir"`
	TanggalLahir *time.Time `json:"tanggal_lahir"`
	Alamat       string     `json:"alamat"`
	NomorTelepon string     `json:"nomor_telepon"`
	Email        string     `json:"email"`
}

// ---- Mapper ----

func StudentProfileFromModel(p *model.StudentProfile) StudentProfileResponse {
	return StudentProfileResponse{
		ID: p.ID, UserID: p.UserID, NIM: p.NIM, Nama: p.Nama,
		ProgramStudi: p.ProgramStudi, Fakultas: p.Fakultas,
		TempatLahir: p.TempatLahir, TanggalLahir: p.TanggalLahir,
		Alamat: p.Alamat, NomorTelepon: p.NomorTelepon, Email: p.Email,
	}
}
