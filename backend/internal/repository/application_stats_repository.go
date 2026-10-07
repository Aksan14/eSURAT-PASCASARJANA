package repository

import (
	"context"
	"database/sql"
	"time"

	"github.com/pascasarjana-unismuh/persuratan-backend/internal/model"
)

// ---------------------------------------------------------------------------
// Agregasi untuk dashboard admin (grafik & indikator).
// ---------------------------------------------------------------------------

type MonthlyCount struct {
	Month     string
	Submitted int64
	Completed int64
}

// MonthlyCounts: jumlah pengajuan yang dikirim & diselesaikan per bulan sejak `since`.
func (r *ApplicationRepository) MonthlyCounts(ctx context.Context, since time.Time) ([]MonthlyCount, error) {
	var rows []MonthlyCount
	err := r.db.WithContext(ctx).Raw(`
		SELECT m AS month,
		       COALESCE(s.n, 0) AS submitted,
		       COALESCE(c.n, 0) AS completed
		FROM (SELECT DISTINCT to_char(submitted_at, 'YYYY-MM') AS m FROM applications WHERE submitted_at >= ?
		      UNION SELECT DISTINCT to_char(completed_at, 'YYYY-MM') FROM applications WHERE completed_at >= ?) months
		LEFT JOIN (SELECT to_char(submitted_at, 'YYYY-MM') m, COUNT(*) n FROM applications WHERE submitted_at >= ? GROUP BY 1) s USING (m)
		LEFT JOIN (SELECT to_char(completed_at, 'YYYY-MM') m, COUNT(*) n FROM applications WHERE completed_at >= ? GROUP BY 1) c USING (m)
		ORDER BY m`, since, since, since, since).Scan(&rows).Error
	return rows, err
}

type LetterTypeCount struct {
	Code  string
	Name  string
	Count int64
}

// CountByLetterType: jumlah pengajuan non-draft per jenis surat (semua jenis aktif disertakan).
func (r *ApplicationRepository) CountByLetterType(ctx context.Context) ([]LetterTypeCount, error) {
	var rows []LetterTypeCount
	err := r.db.WithContext(ctx).Raw(`
		SELECT lt.code, lt.name, COUNT(a.id) AS count
		FROM letter_types lt
		LEFT JOIN applications a ON a.letter_type_id = lt.id AND a.status <> ?
		WHERE lt.is_active = true
		GROUP BY lt.code, lt.name
		ORDER BY lt.code`, model.StatusDraft).Scan(&rows).Error
	return rows, err
}

// CountSubmittedSince: pengajuan yang dikirim sejak waktu tertentu.
func (r *ApplicationRepository) CountSubmittedSince(ctx context.Context, since time.Time) (int64, error) {
	var n int64
	err := r.db.WithContext(ctx).Model(&model.Application{}).
		Where("submitted_at >= ?", since).Count(&n).Error
	return n, err
}

// AvgProcessDays: rata-rata hari dari dikirim sampai selesai.
func (r *ApplicationRepository) AvgProcessDays(ctx context.Context) (float64, error) {
	var v sql.NullFloat64
	err := r.db.WithContext(ctx).Raw(`
		SELECT AVG(EXTRACT(EPOCH FROM (completed_at - submitted_at)) / 86400.0)
		FROM applications WHERE completed_at IS NOT NULL AND submitted_at IS NOT NULL`).Scan(&v).Error
	if err != nil || !v.Valid {
		return 0, err
	}
	return v.Float64, nil
}
