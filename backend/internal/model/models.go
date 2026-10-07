// Package model berisi entitas GORM yang menjadi sumber kebenaran skema database.
// Skema tabel di PostgreSQL dibentuk dari struct-struct ini melalui migrasi GORM
// (lihat package migrations).
package model

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type Role string

const (
	RoleMahasiswa Role = "mahasiswa"
	RoleAdmin     Role = "admin"
)

type ApplicationStatus string

const (
	StatusDraft              ApplicationStatus = "DRAFT"
	StatusMenungguVerifikasi ApplicationStatus = "MENUNGGU_VERIFIKASI"
	StatusPerluPerbaikan     ApplicationStatus = "PERLU_PERBAIKAN"
	StatusDisetujui          ApplicationStatus = "DISETUJUI"
	StatusDiproses           ApplicationStatus = "DIPROSES"
	StatusSiapDiambil        ApplicationStatus = "SIAP_DIAMBIL"
	StatusSelesai            ApplicationStatus = "SELESAI"
	StatusDitolak            ApplicationStatus = "DITOLAK"
)

// Base menyediakan primary key UUID dan timestamp standar.
type Base struct {
	ID        uuid.UUID `gorm:"type:uuid;primaryKey;default:gen_random_uuid()" json:"id"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

func (b *Base) BeforeCreate(tx *gorm.DB) error {
	if b.ID == uuid.Nil {
		b.ID = uuid.New()
	}
	return nil
}

// User — tabel users
type User struct {
	Base
	NIM          string `gorm:"size:32;uniqueIndex;not null" json:"nim"`
	Name         string `gorm:"size:150;not null" json:"name"`
	Email        string `gorm:"size:150;uniqueIndex;not null" json:"email"`
	PasswordHash string `gorm:"column:password;size:255;not null" json:"-"`
	Role         Role   `gorm:"type:varchar(20);not null;index" json:"role"`

	Profile *StudentProfile `gorm:"foreignKey:UserID" json:"profile,omitempty"`
}

// StudentProfile — tabel student_profiles
type StudentProfile struct {
	Base
	UserID       uuid.UUID  `gorm:"type:uuid;uniqueIndex;not null" json:"user_id"`
	NIM          string     `gorm:"size:32;uniqueIndex;not null" json:"nim"`
	Nama         string     `gorm:"size:150;not null" json:"nama"`
	ProgramStudi string     `gorm:"size:150;not null" json:"program_studi"`
	Fakultas     string     `gorm:"size:150;not null" json:"fakultas"`
	TempatLahir  string     `gorm:"size:100" json:"tempat_lahir"`
	TanggalLahir *time.Time `gorm:"type:date" json:"tanggal_lahir"`
	Alamat       string     `gorm:"type:text" json:"alamat"`
	NomorTelepon string     `gorm:"size:30" json:"nomor_telepon"`
	Email        string     `gorm:"size:150" json:"email"`
}

// LetterType — tabel letter_types
type LetterType struct {
	Base
	Code             string `gorm:"size:10;uniqueIndex;not null" json:"code"`
	Name             string `gorm:"size:150;not null" json:"name"`
	Description      string `gorm:"type:text" json:"description"`
	IsActive         bool   `gorm:"not null;default:true" json:"is_active"`
	RequiresDocument bool   `gorm:"not null;default:false" json:"requires_document"`
}

// Application — tabel applications
type Application struct {
	Base
	ApplicationNumber string            `gorm:"size:40;uniqueIndex;not null" json:"application_number"`
	UserID            uuid.UUID         `gorm:"type:uuid;not null;index" json:"user_id"`
	LetterTypeID      uuid.UUID         `gorm:"type:uuid;not null;index" json:"letter_type_id"`
	Status            ApplicationStatus `gorm:"type:varchar(30);not null;index;default:'DRAFT'" json:"status"`
	AdminNote         string            `gorm:"type:text" json:"admin_note,omitempty"`
	LetterNumber      string            `gorm:"size:100" json:"letter_number,omitempty"`
	LetterFilePath    string            `gorm:"size:500" json:"-"`
	SubmittedAt       *time.Time        `json:"submitted_at"`
	ProcessedAt       *time.Time        `json:"processed_at"`
	CompletedAt       *time.Time        `json:"completed_at"`

	User       User              `gorm:"foreignKey:UserID" json:"-"`
	LetterType LetterType        `gorm:"foreignKey:LetterTypeID" json:"letter_type"`
	Data       []ApplicationData `gorm:"foreignKey:ApplicationID;constraint:OnDelete:CASCADE" json:"-"`
	Documents  []Document        `gorm:"foreignKey:ApplicationID;constraint:OnDelete:CASCADE" json:"documents"`
	Histories  []StatusHistory   `gorm:"foreignKey:ApplicationID;constraint:OnDelete:CASCADE" json:"history"`
}

// ApplicationData — tabel application_data (EAV untuk field dinamis per jenis surat)
type ApplicationData struct {
	ID            uint      `gorm:"primaryKey" json:"-"`
	ApplicationID uuid.UUID `gorm:"type:uuid;not null;uniqueIndex:idx_app_field" json:"-"`
	FieldName     string    `gorm:"size:100;not null;uniqueIndex:idx_app_field" json:"field_name"`
	FieldValue    string    `gorm:"type:text" json:"field_value"`
}

func (ApplicationData) TableName() string { return "application_data" }

// Document — tabel documents
type Document struct {
	ID            uuid.UUID `gorm:"type:uuid;primaryKey;default:gen_random_uuid()" json:"id"`
	ApplicationID uuid.UUID `gorm:"type:uuid;not null;index" json:"application_id"`
	DocumentType  string    `gorm:"size:50;not null" json:"document_type"`
	FileName      string    `gorm:"size:255;not null" json:"file_name"`
	FilePath      string    `gorm:"size:500;not null" json:"-"`
	MimeType      string    `gorm:"size:100" json:"mime_type"`
	FileSize      int64     `json:"file_size"`
	UploadedAt    time.Time `gorm:"autoCreateTime" json:"uploaded_at"`
}

func (d *Document) BeforeCreate(tx *gorm.DB) error {
	if d.ID == uuid.Nil {
		d.ID = uuid.New()
	}
	return nil
}

// StatusHistory — tabel status_histories
type StatusHistory struct {
	ID            uuid.UUID         `gorm:"type:uuid;primaryKey;default:gen_random_uuid()" json:"id"`
	ApplicationID uuid.UUID         `gorm:"type:uuid;not null;index" json:"application_id"`
	Status        ApplicationStatus `gorm:"type:varchar(30);not null" json:"status"`
	Note          string            `gorm:"type:text" json:"note,omitempty"`
	ChangedBy     uuid.UUID         `gorm:"type:uuid;not null" json:"changed_by"`
	ChangedByName string            `gorm:"size:150" json:"changed_by_name"`
	CreatedAt     time.Time         `gorm:"autoCreateTime" json:"created_at"`
}

func (h *StatusHistory) BeforeCreate(tx *gorm.DB) error {
	if h.ID == uuid.Nil {
		h.ID = uuid.New()
	}
	return nil
}

// Notification — tabel notifications
type Notification struct {
	ID            uuid.UUID  `gorm:"type:uuid;primaryKey;default:gen_random_uuid()" json:"id"`
	UserID        uuid.UUID  `gorm:"type:uuid;not null;index" json:"user_id"`
	ApplicationID *uuid.UUID `gorm:"type:uuid;index" json:"application_id"`
	Title         string     `gorm:"size:200;not null" json:"title"`
	Message       string     `gorm:"type:text;not null" json:"message"`
	IsRead        bool       `gorm:"not null;default:false;index" json:"is_read"`
	CreatedAt     time.Time  `gorm:"autoCreateTime" json:"created_at"`
}

func (n *Notification) BeforeCreate(tx *gorm.DB) error {
	if n.ID == uuid.Nil {
		n.ID = uuid.New()
	}
	return nil
}

// AuditLog — tabel audit_logs (PRD §19 butir 13: audit aktivitas admin)
type AuditLog struct {
	ID        uint       `gorm:"primaryKey" json:"id"`
	ActorID   uuid.UUID  `gorm:"type:uuid;not null;index" json:"actor_id"`
	Action    string     `gorm:"size:100;not null" json:"action"`
	TargetID  *uuid.UUID `gorm:"type:uuid;index" json:"target_id"`
	Detail    string     `gorm:"type:text" json:"detail"`
	IP        string     `gorm:"size:64" json:"ip"`
	CreatedAt time.Time  `gorm:"autoCreateTime" json:"created_at"`
}

// AllModels dipakai migrasi untuk AutoMigrate dalam urutan dependensi FK.
func AllModels() []any {
	return []any{
		&User{},
		&StudentProfile{},
		&LetterType{},
		&Application{},
		&ApplicationData{},
		&Document{},
		&StatusHistory{},
		&Notification{},
		&AuditLog{},
	}
}
