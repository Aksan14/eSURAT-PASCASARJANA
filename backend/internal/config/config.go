package config

import (
	"fmt"
	"os"
	"strconv"
	"strings"
	"time"

	"github.com/joho/godotenv"
)

type Config struct {
	AppEnv  string
	Port    string
	BaseURL string

	// Database
	DBHost     string
	DBPort     string
	DBUser     string
	DBPassword string
	DBName     string
	DBSSLMode  string
	// Jalankan migrasi GORM otomatis saat server start
	AutoMigrate bool

	// Auth
	JWTSecret string
	JWTExpiry time.Duration

	// CORS
	CORSOrigins []string

	// Upload
	MaxUploadMB int64

	// Storage: "local" | "minio"
	StorageDriver string
	LocalDir      string
	MinioEndpoint string
	MinioAccess   string
	MinioSecret   string
	MinioBucket   string
	MinioUseSSL   bool

	// Seed admin
	AdminNIM      string
	AdminName     string
	AdminEmail    string
	AdminPassword string

	// Template surat
	LetterTemplateDir string // kosong → pakai template embedded
	Letter            LetterConfig
}

// LetterConfig: nilai placeholder institusi & penandatangan pada template surat.
type LetterConfig struct {
	Yayasan        string
	Universitas    string
	Unit           string
	Alamat         string
	Telepon        string
	Fax            string
	Website        string
	Kota           string
	KodePos        string
	SignerTitle    string
	SignerName     string
	SignerIDNumber string
}

func Load() (*Config, error) {
	_ = godotenv.Load()

	c := &Config{
		AppEnv:  env("APP_ENV", "development"),
		Port:    env("PORT", "8080"),
		BaseURL: env("BASE_URL", "http://localhost:8080"),

		DBHost:      env("DB_HOST", "localhost"),
		DBPort:      env("DB_PORT", "5432"),
		DBUser:      env("DB_USER", "persuratan"),
		DBPassword:  env("DB_PASSWORD", "persuratan"),
		DBName:      env("DB_NAME", "persuratan"),
		DBSSLMode:   env("DB_SSLMODE", "disable"),
		AutoMigrate: envBool("AUTO_MIGRATE", true),

		JWTSecret: env("JWT_SECRET", ""),
		JWTExpiry: envDuration("JWT_EXPIRY", 24*time.Hour),

		CORSOrigins: strings.Split(env("CORS_ORIGINS", "http://localhost:3000"), ","),

		MaxUploadMB: envInt("MAX_UPLOAD_MB", 5),

		StorageDriver: env("STORAGE_DRIVER", "local"),
		LocalDir:      env("STORAGE_LOCAL_DIR", "./uploads"),
		MinioEndpoint: env("MINIO_ENDPOINT", "localhost:9000"),
		MinioAccess:   env("MINIO_ACCESS_KEY", "minioadmin"),
		MinioSecret:   env("MINIO_SECRET_KEY", "minioadmin"),
		MinioBucket:   env("MINIO_BUCKET", "persuratan"),
		MinioUseSSL:   envBool("MINIO_USE_SSL", false),

		AdminNIM:      env("SEED_ADMIN_NIM", "admin"),
		AdminName:     env("SEED_ADMIN_NAME", "Admin Pascasarjana"),
		AdminEmail:    env("SEED_ADMIN_EMAIL", "admin.pps@unismuh.ac.id"),
		AdminPassword: env("SEED_ADMIN_PASSWORD", "admin123"),

		LetterTemplateDir: env("LETTER_TEMPLATE_DIR", ""),
		Letter: LetterConfig{
			Yayasan:        env("LETTER_YAYASAN", "Majelis Pendidikan Tinggi Pimpinan Pusat Muhammadiyah"),
			Universitas:    env("LETTER_UNIVERSITAS", "Universitas Muhammadiyah Makassar"),
			Unit:           env("LETTER_UNIT", "Program Pascasarjana"),
			Alamat:         env("LETTER_ALAMAT", "Jl. Sultan Alauddin No. 259"),
			Telepon:        env("LETTER_TELEPON", "(0411) 866 972 – 5047085"),
			Fax:            env("LETTER_FAX", "(0411) 865 588"),
			Website:        env("LETTER_WEBSITE", "pasca.unismuh.ac.id"),
			Kota:           env("LETTER_KOTA", "Makassar"),
			KodePos:        env("LETTER_KODE_POS", "90221"),
			SignerTitle:    env("LETTER_SIGNER_TITLE", "Direktur,"),
			SignerName:     env("LETTER_SIGNER_NAME", "Prof. Dr. H. Irwan Akib, M.Pd."),
			SignerIDNumber: env("LETTER_SIGNER_ID", "613 949"),
		},
	}

	if c.JWTSecret == "" {
		if c.AppEnv == "production" {
			return nil, fmt.Errorf("JWT_SECRET wajib diisi pada production")
		}
		c.JWTSecret = "dev-secret-change-me"
	}
	return c, nil
}

func (c *Config) DSN() string {
	return fmt.Sprintf("host=%s port=%s user=%s password=%s dbname=%s sslmode=%s TimeZone=Asia/Makassar",
		c.DBHost, c.DBPort, c.DBUser, c.DBPassword, c.DBName, c.DBSSLMode)
}

func env(key, def string) string {
	if v, ok := os.LookupEnv(key); ok && v != "" {
		return v
	}
	return def
}

func envBool(key string, def bool) bool {
	v, ok := os.LookupEnv(key)
	if !ok {
		return def
	}
	b, err := strconv.ParseBool(v)
	if err != nil {
		return def
	}
	return b
}

func envInt(key string, def int64) int64 {
	v, ok := os.LookupEnv(key)
	if !ok {
		return def
	}
	n, err := strconv.ParseInt(v, 10, 64)
	if err != nil {
		return def
	}
	return n
}

func envDuration(key string, def time.Duration) time.Duration {
	v, ok := os.LookupEnv(key)
	if !ok {
		return def
	}
	d, err := time.ParseDuration(v)
	if err != nil {
		return def
	}
	return d
}
