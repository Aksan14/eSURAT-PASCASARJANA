// Server utama: koneksi DB, migrasi otomatis (opsional), HTTP + WebSocket.
package main

import (
	"context"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/pascasarjana-unismuh/persuratan-backend/internal/config"
	"github.com/pascasarjana-unismuh/persuratan-backend/internal/database"
	"github.com/pascasarjana-unismuh/persuratan-backend/internal/pdf"
	"github.com/pascasarjana-unismuh/persuratan-backend/internal/server"
	"github.com/pascasarjana-unismuh/persuratan-backend/internal/storage"
	"github.com/pascasarjana-unismuh/persuratan-backend/migrations"
	"github.com/pascasarjana-unismuh/persuratan-backend/templates"
)

func main() {
	cfg, err := config.Load()
	if err != nil {
		log.Fatalf("config: %v", err)
	}

	db, err := database.Connect(cfg)
	if err != nil {
		log.Fatalf("database: %v", err)
	}

	if cfg.AutoMigrate {
		log.Println("[migrate] menjalankan migrasi GORM…")
		if err := migrations.New(db).Migrate(); err != nil {
			log.Fatalf("migrate: %v", err)
		}
		if err := migrations.SeedAdmin(db, cfg.AdminNIM, cfg.AdminName, cfg.AdminEmail, cfg.AdminPassword); err != nil {
			log.Fatalf("seed admin: %v", err)
		}
		if cfg.AppEnv != "production" {
			if err := migrations.SeedDemo(db); err != nil {
				log.Printf("seed demo: %v", err)
			}
		}
		log.Println("[migrate] selesai")
	}

	ctx := context.Background()
	var store storage.Storage
	switch cfg.StorageDriver {
	case "minio":
		store, err = storage.NewMinio(ctx, cfg.MinioEndpoint, cfg.MinioAccess, cfg.MinioSecret, cfg.MinioBucket, cfg.MinioUseSSL)
	default:
		store, err = storage.NewLocal(cfg.LocalDir)
	}
	if err != nil {
		log.Fatalf("storage: %v", err)
	}

	// Template surat: embedded (templates/letters + assets) atau override via LETTER_TEMPLATE_DIR.
	loader, err := pdf.NewTemplateLoader(templates.FS, cfg.LetterTemplateDir)
	if err != nil {
		log.Fatalf("templates: %v", err)
	}
	for _, name := range []string{"_kop", "_ttd", "SKK", "SKL", "SIPI"} {
		if !loader.Exists(name) {
			log.Fatalf("templates: %s.tmpl tidak ditemukan", name)
		}
	}
	pdfGen := pdf.NewTemplateGenerator(loader)

	e := server.New(cfg, db, store, pdfGen)

	go func() {
		log.Printf("server berjalan di :%s (%s, storage=%s)", cfg.Port, cfg.AppEnv, cfg.StorageDriver)
		if err := e.Start(":" + cfg.Port); err != nil && err != http.ErrServerClosed {
			log.Fatalf("server: %v", err)
		}
	}()

	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit
	log.Println("mematikan server…")
	shutdownCtx, cancel := context.WithTimeout(ctx, 10*time.Second)
	defer cancel()
	if err := e.Shutdown(shutdownCtx); err != nil {
		log.Printf("shutdown: %v", err)
	}
	if sqlDB, err := db.DB(); err == nil {
		_ = sqlDB.Close()
	}
}
