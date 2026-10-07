// Package migrations mendefinisikan migrasi database berversi menggunakan
// gormigrate di atas GORM. Setiap migrasi memiliki ID unik (timestamp) dan
// fungsi Migrate/Rollback. Riwayat migrasi yang sudah dijalankan disimpan GORM
// pada tabel `schema_migrations`.
//
// Konvensi:
//   - ID: YYYYMMDDHHMM_deskripsi_singkat
//   - Perubahan skema → gunakan tx.Migrator() / AutoMigrate pada model terkait
//   - Data awal (seed) → migrasi tersendiri agar bisa di-rollback
package migrations

import (
	"time"

	"github.com/go-gormigrate/gormigrate/v2"
	"gorm.io/gorm"

	"github.com/pascasarjana-unismuh/persuratan-backend/internal/model"
)

// Options konfigurasi gormigrate yang dipakai seluruh perintah migrasi.
var Options = &gormigrate.Options{
	TableName:                 "schema_migrations",
	IDColumnName:              "id",
	IDColumnSize:              255,
	UseTransaction:            true,
	ValidateUnknownMigrations: true,
}

// List mengembalikan seluruh migrasi dalam urutan eksekusi.
func List() []*gormigrate.Migration {
	return []*gormigrate.Migration{
		initSchema(),
		seedLetterTypes(),
		addApplicationIndexes(),
		addUniqueLetterNumber(),
	}
}

// New membangun instance gormigrate siap pakai.
// Sengaja tidak memakai InitSchema agar database baru pun menjalankan
// setiap migrasi secara berurutan — skema dev dan production selalu identik.
func New(db *gorm.DB) *gormigrate.Gormigrate {
	return gormigrate.New(db, Options, List())
}

func enableExtensions(tx *gorm.DB) error {
	// gen_random_uuid() tersedia bawaan sejak PostgreSQL 13 (pgcrypto tidak wajib),
	// namun diaktifkan untuk kompatibilitas versi lama.
	return tx.Exec(`CREATE EXTENSION IF NOT EXISTS "pgcrypto"`).Error
}

// ---------------------------------------------------------------------------
// 202610060001 — skema awal
// ---------------------------------------------------------------------------
func initSchema() *gormigrate.Migration {
	return &gormigrate.Migration{
		ID: "202610060001_init_schema",
		Migrate: func(tx *gorm.DB) error {
			if err := enableExtensions(tx); err != nil {
				return err
			}
			return tx.AutoMigrate(model.AllModels()...)
		},
		Rollback: func(tx *gorm.DB) error {
			// urutan terbalik agar FK tidak menghalangi
			all := model.AllModels()
			for i := len(all) - 1; i >= 0; i-- {
				if err := tx.Migrator().DropTable(all[i]); err != nil {
					return err
				}
			}
			return nil
		},
	}
}

// ---------------------------------------------------------------------------
// 202610060002 — data awal jenis surat (PRD §15)
// ---------------------------------------------------------------------------
func seedLetterTypes() *gormigrate.Migration {
	return &gormigrate.Migration{
		ID:      "202610060002_seed_letter_types",
		Migrate: seedLetterTypeRows,
		Rollback: func(tx *gorm.DB) error {
			return tx.Where("code IN ?", []string{"SKK", "SKL", "SIPI"}).
				Delete(&model.LetterType{}).Error
		},
	}
}

func seedLetterTypeRows(tx *gorm.DB) error {
	rows := []model.LetterType{
		{
			Code:        "SKK",
			Name:        "Surat Keterangan Kuliah",
			Description: "Menerangkan bahwa mahasiswa terdaftar dan aktif mengikuti perkuliahan pada semester berjalan.",
			IsActive:    true,
		},
		{
			Code:        "SKL",
			Name:        "Surat Keterangan Lulus",
			Description: "Menerangkan bahwa mahasiswa telah menyelesaikan studi dan dinyatakan lulus.",
			IsActive:    true,
		},
		{
			Code:             "SIPI",
			Name:             "Surat Pengantar Izin Penelitian",
			Description:      "Surat pengantar kepada instansi tujuan untuk pelaksanaan penelitian tesis/disertasi.",
			IsActive:         true,
			RequiresDocument: true,
		},
	}
	for _, r := range rows {
		if err := tx.Where(model.LetterType{Code: r.Code}).
			Attrs(r).
			FirstOrCreate(&model.LetterType{}).Error; err != nil {
			return err
		}
	}
	return nil
}

// ---------------------------------------------------------------------------
// 202610060003 — indeks komposit untuk daftar & filter admin (PRD §8.2)
// ---------------------------------------------------------------------------
func addApplicationIndexes() *gormigrate.Migration {
	return &gormigrate.Migration{
		ID: "202610060003_add_application_indexes",
		Migrate: func(tx *gorm.DB) error {
			stmts := []string{
				`CREATE INDEX IF NOT EXISTS idx_applications_status_updated ON applications (status, updated_at DESC)`,
				`CREATE INDEX IF NOT EXISTS idx_applications_user_created ON applications (user_id, created_at DESC)`,
				`CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON notifications (user_id, is_read, created_at DESC)`,
			}
			for _, s := range stmts {
				if err := tx.Exec(s).Error; err != nil {
					return err
				}
			}
			return nil
		},
		Rollback: func(tx *gorm.DB) error {
			stmts := []string{
				`DROP INDEX IF EXISTS idx_applications_status_updated`,
				`DROP INDEX IF EXISTS idx_applications_user_created`,
				`DROP INDEX IF EXISTS idx_notifications_user_unread`,
			}
			for _, s := range stmts {
				if err := tx.Exec(s).Error; err != nil {
					return err
				}
			}
			return nil
		},
	}
}

// ---------------------------------------------------------------------------
// 202610060004 — nomor surat unik (satu nomor hanya untuk satu surat)
// ---------------------------------------------------------------------------
func addUniqueLetterNumber() *gormigrate.Migration {
	return &gormigrate.Migration{
		ID: "202610060004_unique_letter_number",
		Migrate: func(tx *gorm.DB) error {
			return tx.Exec(`CREATE UNIQUE INDEX IF NOT EXISTS uq_applications_letter_number
				ON applications (letter_number) WHERE letter_number <> ''`).Error
		},
		Rollback: func(tx *gorm.DB) error {
			return tx.Exec(`DROP INDEX IF EXISTS uq_applications_letter_number`).Error
		},
	}
}

// Applied mengembalikan daftar ID migrasi yang sudah tercatat di database.
func Applied(db *gorm.DB) ([]string, error) {
	if !db.Migrator().HasTable(Options.TableName) {
		return nil, nil
	}
	var ids []string
	err := db.Table(Options.TableName).Order("id").Pluck("id", &ids).Error
	return ids, err
}

// Now dipakai seed untuk timestamp yang konsisten.
func Now() time.Time { return time.Now() }
