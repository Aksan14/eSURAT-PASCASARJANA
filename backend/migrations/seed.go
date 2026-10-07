package migrations

import (
	"time"

	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"

	"github.com/pascasarjana-unismuh/persuratan-backend/internal/model"
)

// SeedAdmin membuat akun admin jika belum ada. Dipanggil oleh perintah
// `migrate seed` dan saat server start (idempoten).
func SeedAdmin(db *gorm.DB, nim, name, email, password string) error {
	var count int64
	if err := db.Model(&model.User{}).Where("role = ?", model.RoleAdmin).Count(&count).Error; err != nil {
		return err
	}
	if count > 0 {
		return nil
	}
	hash, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	if err != nil {
		return err
	}
	return db.Create(&model.User{
		NIM:          nim,
		Name:         name,
		Email:        email,
		PasswordHash: string(hash),
		Role:         model.RoleAdmin,
	}).Error
}

// SeedDemo membuat data contoh (mahasiswa + profil) untuk development.
// Tidak dijalankan di production.
func SeedDemo(db *gorm.DB) error {
	demo := []struct {
		user    model.User
		profile model.StudentProfile
	}{
		{
			user: model.User{NIM: "105041100123", Name: "Nurul Fadillah", Email: "nurul.fadillah@unismuh.ac.id", Role: model.RoleMahasiswa},
			profile: model.StudentProfile{
				NIM: "105041100123", Nama: "Nurul Fadillah",
				ProgramStudi: "Magister Pendidikan Bahasa Indonesia", Fakultas: "Program Pascasarjana",
				TempatLahir: "Makassar", TanggalLahir: date(1998, 4, 12),
				Alamat: "Jl. Sultan Alauddin No. 259, Makassar", NomorTelepon: "081234567890",
				Email: "nurul.fadillah@unismuh.ac.id",
			},
		},
		{
			user: model.User{NIM: "105041100124", Name: "Muhammad Rizal", Email: "rizal@unismuh.ac.id", Role: model.RoleMahasiswa},
			profile: model.StudentProfile{
				NIM: "105041100124", Nama: "Muhammad Rizal",
				ProgramStudi: "Magister Manajemen", Fakultas: "Program Pascasarjana",
				TempatLahir: "Gowa", TanggalLahir: date(1997, 9, 3),
				Alamat: "Jl. Hertasning Baru No. 12, Gowa", NomorTelepon: "082198765432",
				Email: "rizal@unismuh.ac.id",
			},
		},
	}

	hash, err := bcrypt.GenerateFromPassword([]byte("mahasiswa123"), bcrypt.DefaultCost)
	if err != nil {
		return err
	}

	return db.Transaction(func(tx *gorm.DB) error {
		for _, d := range demo {
			var existing model.User
			err := tx.Where("nim = ?", d.user.NIM).First(&existing).Error
			if err == nil {
				continue
			}
			if err != gorm.ErrRecordNotFound {
				return err
			}
			u := d.user
			u.PasswordHash = string(hash)
			if err := tx.Create(&u).Error; err != nil {
				return err
			}
			p := d.profile
			p.UserID = u.ID
			if err := tx.Create(&p).Error; err != nil {
				return err
			}
		}
		return nil
	})
}

func date(y int, m time.Month, d int) *time.Time {
	t := time.Date(y, m, d, 0, 0, 0, 0, time.UTC)
	return &t
}
