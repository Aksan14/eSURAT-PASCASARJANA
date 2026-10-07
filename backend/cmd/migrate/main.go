// Perintah migrasi database berbasis GORM + gormigrate.
//
//	go run ./cmd/migrate up          # jalankan semua migrasi yang belum diterapkan
//	go run ./cmd/migrate to <id>     # migrasi sampai ID tertentu
//	go run ./cmd/migrate rollback    # batalkan migrasi terakhir
//	go run ./cmd/migrate status      # tampilkan status tiap migrasi
//	go run ./cmd/migrate seed        # seed admin (+ data demo di non-production)
//	go run ./cmd/migrate fresh       # DROP semua tabel lalu migrasi ulang (non-production)
package main

import (
	"fmt"
	"log"
	"os"

	"gorm.io/gorm"

	"github.com/pascasarjana-unismuh/persuratan-backend/internal/config"
	"github.com/pascasarjana-unismuh/persuratan-backend/internal/database"
	"github.com/pascasarjana-unismuh/persuratan-backend/internal/model"
	"github.com/pascasarjana-unismuh/persuratan-backend/migrations"
)

func main() {
	log.SetFlags(0)
	if len(os.Args) < 2 {
		usage()
		os.Exit(2)
	}

	cfg, err := config.Load()
	if err != nil {
		log.Fatalf("config: %v", err)
	}
	db, err := database.Connect(cfg)
	if err != nil {
		log.Fatalf("database: %v", err)
	}
	m := migrations.New(db)

	switch os.Args[1] {
	case "up":
		must(m.Migrate(), "migrate up")
		log.Println("✓ migrasi selesai")
		printStatus(db)

	case "to":
		if len(os.Args) < 3 {
			log.Fatal("gunakan: migrate to <migration_id>")
		}
		must(m.MigrateTo(os.Args[2]), "migrate to")
		log.Printf("✓ migrasi sampai %s", os.Args[2])
		printStatus(db)

	case "rollback":
		must(m.RollbackLast(), "rollback")
		log.Println("✓ migrasi terakhir dibatalkan")
		printStatus(db)

	case "status":
		printStatus(db)

	case "seed":
		must(migrations.SeedAdmin(db, cfg.AdminNIM, cfg.AdminName, cfg.AdminEmail, cfg.AdminPassword), "seed admin")
		log.Printf("✓ admin tersedia (NIM: %s)", cfg.AdminNIM)
		if cfg.AppEnv != "production" {
			must(migrations.SeedDemo(db), "seed demo")
			log.Println("✓ data demo mahasiswa tersedia")
		}

	case "fresh":
		if cfg.AppEnv == "production" {
			log.Fatal("fresh tidak diizinkan pada production")
		}
		all := model.AllModels()
		for i := len(all) - 1; i >= 0; i-- {
			must(db.Migrator().DropTable(all[i]), "drop table")
		}
		must(db.Migrator().DropTable(migrations.Options.TableName), "drop schema_migrations")
		log.Println("✓ seluruh tabel dihapus")
		must(migrations.New(db).Migrate(), "migrate up")
		must(migrations.SeedAdmin(db, cfg.AdminNIM, cfg.AdminName, cfg.AdminEmail, cfg.AdminPassword), "seed admin")
		must(migrations.SeedDemo(db), "seed demo")
		log.Println("✓ migrasi ulang + seed selesai")
		printStatus(db)

	default:
		usage()
		os.Exit(2)
	}
}

func printStatus(db *gorm.DB) {
	applied, err := migrations.Applied(db)
	must(err, "status")
	set := map[string]bool{}
	for _, id := range applied {
		set[id] = true
	}
	fmt.Println()
	fmt.Printf("%-45s %s\n", "MIGRATION", "STATUS")
	for _, mg := range migrations.List() {
		st := "pending"
		if set[mg.ID] {
			st = "applied"
		}
		fmt.Printf("%-45s %s\n", mg.ID, st)
	}
	fmt.Println()
}

func must(err error, what string) {
	if err != nil {
		log.Fatalf("✗ %s: %v", what, err)
	}
}

func usage() {
	fmt.Println(`Penggunaan: migrate <perintah>

  up          Jalankan semua migrasi yang belum diterapkan
  to <id>     Migrasi (maju/mundur) sampai ID tertentu
  rollback    Batalkan migrasi terakhir
  status      Tampilkan status migrasi
  seed        Buat akun admin (+ data demo di non-production)
  fresh       Hapus semua tabel, migrasi ulang, seed (non-production)`)
}
