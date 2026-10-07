package repository

import (
	"context"
	"fmt"

	"github.com/google/uuid"
	"gorm.io/gorm"

	"github.com/pascasarjana-unismuh/persuratan-backend/internal/model"
)

type ApplicationRepository struct{ db *gorm.DB }

func NewApplicationRepository(db *gorm.DB) *ApplicationRepository { return &ApplicationRepository{db} }

// AdminFilter parameter daftar & filter admin (PRD §8.2).
type AdminFilter struct {
	Query      string
	Statuses   []string // kosong = semua status
	LetterCode string
	DateFrom   string // YYYY-MM-DD
	DateTo     string
	Page       int
	PerPage    int
}

func (r *ApplicationRepository) withRelations(q *gorm.DB) *gorm.DB {
	return q.
		Preload("LetterType").
		Preload("Data").
		Preload("Documents", func(db *gorm.DB) *gorm.DB { return db.Order("uploaded_at") }).
		Preload("Histories", func(db *gorm.DB) *gorm.DB { return db.Order("created_at") }).
		Preload("User.Profile")
}

func (r *ApplicationRepository) Create(ctx context.Context, tx *gorm.DB, a *model.Application) error {
	return tx.WithContext(ctx).Create(a).Error
}

// Save menyimpan kolom aplikasi saja; relasi tidak ikut di-upsert.
func (r *ApplicationRepository) Save(ctx context.Context, tx *gorm.DB, a *model.Application) error {
	return tx.WithContext(ctx).Omit("User", "LetterType", "Data", "Documents", "Histories").Save(a).Error
}

func (r *ApplicationRepository) FindByID(ctx context.Context, id uuid.UUID) (*model.Application, error) {
	var a model.Application
	err := r.withRelations(r.db.WithContext(ctx)).First(&a, "id = ?", id).Error
	return &a, wrap(err)
}

// FindByIDTx membaca di dalam transaksi yang sedang berjalan.
func (r *ApplicationRepository) FindByIDTx(ctx context.Context, tx *gorm.DB, id uuid.UUID) (*model.Application, error) {
	var a model.Application
	err := r.withRelations(tx.WithContext(ctx)).First(&a, "id = ?", id).Error
	return &a, wrap(err)
}

func (r *ApplicationRepository) ListByUser(ctx context.Context, userID uuid.UUID) ([]model.Application, error) {
	var as []model.Application
	err := r.withRelations(r.db.WithContext(ctx)).
		Where("user_id = ?", userID).
		Order("created_at DESC").
		Find(&as).Error
	return as, err
}

func (r *ApplicationRepository) ListAdmin(ctx context.Context, f AdminFilter) ([]model.Application, int64, error) {
	q := r.db.WithContext(ctx).Model(&model.Application{}).
		Joins("JOIN users ON users.id = applications.user_id").
		Joins("JOIN letter_types ON letter_types.id = applications.letter_type_id").
		Where("applications.status <> ?", model.StatusDraft)

	if len(f.Statuses) > 0 {
		q = q.Where("applications.status IN ?", f.Statuses)
	}
	if f.LetterCode != "" {
		q = q.Where("letter_types.code = ?", f.LetterCode)
	}
	if f.Query != "" {
		like := "%" + f.Query + "%"
		q = q.Where("applications.application_number ILIKE ? OR applications.letter_number ILIKE ? OR users.nim ILIKE ? OR users.name ILIKE ?", like, like, like, like)
	}
	if f.DateFrom != "" {
		q = q.Where("applications.submitted_at >= ?::date", f.DateFrom)
	}
	if f.DateTo != "" {
		q = q.Where("applications.submitted_at < (?::date + INTERVAL '1 day')", f.DateTo)
	}

	var total int64
	if err := q.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	var as []model.Application
	err := r.withRelations(q).
		Order("applications.updated_at DESC").
		Offset((f.Page - 1) * f.PerPage).
		Limit(f.PerPage).
		Find(&as).Error
	return as, total, err
}

// LetterNumbersInYear mengembalikan nomor surat dengan kode unit tertentu (segmen kedua,
// mis. "A.4-I") pada tahun Masehi tertentu (segmen terakhir), untuk menentukan nomor urut berikutnya.
// tx opsional: bila diisi, dibaca dalam transaksi pemanggil (dipakai bersama advisory lock).
func (r *ApplicationRepository) LetterNumbersInYear(ctx context.Context, tx *gorm.DB, unitCode string, year int) ([]string, error) {
	db := r.db
	if tx != nil {
		db = tx
	}
	var nums []string
	err := db.WithContext(ctx).Model(&model.Application{}).
		Where("letter_number LIKE ?", fmt.Sprintf("%%/%s/%%/%d", unitCode, year)).
		Pluck("letter_number", &nums).Error
	return nums, err
}

// LetterNumberExists memeriksa apakah nomor surat sudah dipakai pengajuan lain.
func (r *ApplicationRepository) LetterNumberExists(ctx context.Context, tx *gorm.DB, number string, exceptID uuid.UUID) (bool, error) {
	var n int64
	err := tx.WithContext(ctx).Model(&model.Application{}).
		Where("letter_number = ? AND id <> ?", number, exceptID).Count(&n).Error
	return n > 0, err
}

// LockLetterNumbering mengunci penomoran satu kode unit selama transaksi berjalan
// (advisory lock) agar dua admin tidak mendapat nomor yang sama.
func (r *ApplicationRepository) LockLetterNumbering(ctx context.Context, tx *gorm.DB, unitCode string) error {
	return tx.WithContext(ctx).Exec("SELECT pg_advisory_xact_lock(hashtext(?))", "letter_no_"+unitCode).Error
}

// FindDuplicate mencari pengajuan lain milik mahasiswa dengan jenis surat sama, belum
// ditolak/draft, dan seluruh field identitas bernilai sama (perbandingan tanpa
// memperhatikan huruf besar/kecil & spasi tepi). nil bila tidak ada.
func (r *ApplicationRepository) FindDuplicate(ctx context.Context, tx *gorm.DB, userID, letterTypeID, exceptID uuid.UUID, ident map[string]string) (*model.Application, error) {
	q := tx.WithContext(ctx).Model(&model.Application{}).
		Where("user_id = ? AND letter_type_id = ? AND id <> ?", userID, letterTypeID, exceptID).
		Where("status NOT IN ?", []model.ApplicationStatus{model.StatusDraft, model.StatusDitolak})
	for k, v := range ident {
		q = q.Where(`EXISTS (SELECT 1 FROM application_data d WHERE d.application_id = applications.id
			AND d.field_name = ? AND LOWER(TRIM(d.field_value)) = LOWER(?))`, k, v)
	}
	var dup model.Application
	err := q.Order("created_at DESC").Limit(1).Find(&dup).Error
	if err != nil || dup.ID == uuid.Nil {
		return nil, err
	}
	return &dup, nil
}

// CountByStatus untuk dashboard. userID nil → seluruh pengajuan (admin).
func (r *ApplicationRepository) CountByStatus(ctx context.Context, userID *uuid.UUID) (map[model.ApplicationStatus]int64, error) {
	type row struct {
		Status model.ApplicationStatus
		Count  int64
	}
	var rows []row
	q := r.db.WithContext(ctx).Model(&model.Application{}).
		Select("status, COUNT(*) AS count").
		Group("status")
	if userID != nil {
		q = q.Where("user_id = ?", *userID)
	} else {
		q = q.Where("status <> ?", model.StatusDraft)
	}
	if err := q.Scan(&rows).Error; err != nil {
		return nil, err
	}
	out := map[model.ApplicationStatus]int64{}
	for _, rw := range rows {
		out[rw.Status] = rw.Count
	}
	return out, nil
}

// NextSequence menghitung nomor urut harian untuk nomor pengajuan:
// urutan tertinggi hari itu + 1 (bukan count, agar tetap unik setelah ada penghapusan).
// Dipanggil dalam transaksi dengan advisory lock agar unik saat concurrent.
func (r *ApplicationRepository) NextSequence(ctx context.Context, tx *gorm.DB, datePrefix string) (int64, error) {
	if err := tx.WithContext(ctx).Exec("SELECT pg_advisory_xact_lock(hashtext(?))", "app_seq_"+datePrefix).Error; err != nil {
		return 0, err
	}
	var maxSeq int64
	err := tx.WithContext(ctx).Model(&model.Application{}).
		Where("application_number LIKE ?", "%-"+datePrefix+"-%").
		Select("COALESCE(MAX(CAST(split_part(application_number, '-', 3) AS INTEGER)), 0)").
		Scan(&maxSeq).Error
	return maxSeq + 1, err
}

// ReplaceData mengganti seluruh baris application_data milik pengajuan.
func (r *ApplicationRepository) ReplaceData(ctx context.Context, tx *gorm.DB, appID uuid.UUID, data map[string]string) error {
	if err := tx.WithContext(ctx).Where("application_id = ?", appID).Delete(&model.ApplicationData{}).Error; err != nil {
		return err
	}
	if len(data) == 0 {
		return nil
	}
	rows := make([]model.ApplicationData, 0, len(data))
	for k, v := range data {
		rows = append(rows, model.ApplicationData{ApplicationID: appID, FieldName: k, FieldValue: v})
	}
	return tx.WithContext(ctx).Create(&rows).Error
}
