// Package server merakit Echo, middleware global, dependensi, dan routing.
//
//   - server.go  → New(): Echo + middleware global
//   - router.go  → registerRoutes(): wiring dependensi + seluruh endpoint PRD §16
package server

import (
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/labstack/echo/v4"
	em "github.com/labstack/echo/v4/middleware"
	"gorm.io/gorm"

	"github.com/pascasarjana-unismuh/persuratan-backend/internal/config"
	"github.com/pascasarjana-unismuh/persuratan-backend/internal/pdf"
	"github.com/pascasarjana-unismuh/persuratan-backend/internal/storage"
	"github.com/pascasarjana-unismuh/persuratan-backend/internal/validator"
	"github.com/pascasarjana-unismuh/persuratan-backend/pkg/response"
)

func New(cfg *config.Config, db *gorm.DB, store storage.Storage, pdfGen pdf.Generator) *echo.Echo {
	e := echo.New()
	e.HideBanner = true
	e.Validator = validator.New()

	e.Use(em.Recover())
	e.Use(em.RequestID())
	e.Use(em.LoggerWithConfig(em.LoggerConfig{
		Format: `{"time":"${time_rfc3339}","id":"${id}","method":"${method}","uri":"${uri}","status":${status},"latency":"${latency_human}","ip":"${remote_ip}"}` + "\n",
	}))
	// Berkas (PDF surat, dokumen) ditampilkan frontend lewat <iframe> dari origin
	// berbeda, sehingga X-Frame-Options SAMEORIGIN diganti CSP frame-ancestors
	// yang hanya mengizinkan origin CORS.
	isFileRoute := func(c echo.Context) bool {
		p := c.Request().URL.Path
		return strings.HasSuffix(p, "/print") || strings.Contains(p, "/documents/")
	}
	e.Use(em.SecureWithConfig(em.SecureConfig{
		Skipper:            isFileRoute,
		XSSProtection:      "1; mode=block",
		ContentTypeNosniff: "nosniff",
		XFrameOptions:      "SAMEORIGIN",
		ReferrerPolicy:     "strict-origin-when-cross-origin",
		HSTSMaxAge:         31536000,
	}))
	frameAncestors := "frame-ancestors 'self' " + strings.Join(cfg.CORSOrigins, " ")
	e.Use(func(next echo.HandlerFunc) echo.HandlerFunc {
		return func(c echo.Context) error {
			if isFileRoute(c) {
				h := c.Response().Header()
				h.Set(echo.HeaderXContentTypeOptions, "nosniff")
				h.Set(echo.HeaderContentSecurityPolicy, frameAncestors)
				h.Set(echo.HeaderReferrerPolicy, "strict-origin-when-cross-origin")
			}
			return next(c)
		}
	})
	e.Use(em.CORSWithConfig(em.CORSConfig{
		AllowOrigins:     cfg.CORSOrigins,
		AllowMethods:     []string{http.MethodGet, http.MethodPost, http.MethodPut, http.MethodDelete, http.MethodOptions},
		AllowHeaders:     []string{echo.HeaderOrigin, echo.HeaderContentType, echo.HeaderAccept, echo.HeaderAuthorization},
		AllowCredentials: true,
		MaxAge:           3600,
	}))
	e.Use(em.BodyLimit(strconv.FormatInt(cfg.MaxUploadMB+1, 10) + "M"))
	e.Use(em.RateLimiterWithConfig(em.RateLimiterConfig{
		Store: em.NewRateLimiterMemoryStoreWithConfig(em.RateLimiterMemoryStoreConfig{
			Rate: 20, Burst: 60, ExpiresIn: 3 * time.Minute,
		}),
		DenyHandler: func(c echo.Context, _ string, _ error) error {
			return response.Error(c, http.StatusTooManyRequests, "Terlalu banyak permintaan. Coba lagi nanti.")
		},
	}))

	registerRoutes(e, cfg, db, store, pdfGen)
	return e
}
