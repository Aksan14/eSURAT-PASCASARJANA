package server

import (
	"net/http"
	"time"

	"github.com/labstack/echo/v4"
	"gorm.io/gorm"

	"github.com/pascasarjana-unismuh/persuratan-backend/internal/config"
	"github.com/pascasarjana-unismuh/persuratan-backend/internal/handler"
	"github.com/pascasarjana-unismuh/persuratan-backend/internal/middleware"
	"github.com/pascasarjana-unismuh/persuratan-backend/internal/model"
	"github.com/pascasarjana-unismuh/persuratan-backend/internal/pdf"
	"github.com/pascasarjana-unismuh/persuratan-backend/internal/repository"
	"github.com/pascasarjana-unismuh/persuratan-backend/internal/service"
	"github.com/pascasarjana-unismuh/persuratan-backend/internal/storage"
	ws "github.com/pascasarjana-unismuh/persuratan-backend/internal/websocket"
	"github.com/pascasarjana-unismuh/persuratan-backend/pkg/jwt"
	"github.com/pascasarjana-unismuh/persuratan-backend/pkg/response"
)

func registerRoutes(e *echo.Echo, cfg *config.Config, db *gorm.DB, store storage.Storage, pdfGen pdf.Generator) {
	// ---- infrastruktur ----
	jm := jwt.NewManager(cfg.JWTSecret, cfg.JWTExpiry)
	hub := ws.NewHub(cfg.CORSOrigins)

	// ---- repository ----
	userRepo := repository.NewUserRepository(db)
	profileRepo := repository.NewStudentProfileRepository(db)
	letterRepo := repository.NewLetterTypeRepository(db)
	appRepo := repository.NewApplicationRepository(db)
	docRepo := repository.NewDocumentRepository(db)
	historyRepo := repository.NewStatusHistoryRepository(db)
	notifRepo := repository.NewNotificationRepository(db)
	auditRepo := repository.NewAuditLogRepository(db)

	// ---- service ----
	authSvc := service.NewAuthService(userRepo, jm)
	studentSvc := service.NewStudentService(profileRepo)
	letterSvc := service.NewLetterTypeService(letterRepo)
	appSvc := service.NewApplicationService(service.ApplicationServiceDeps{
		DB: db, Apps: appRepo, Docs: docRepo, Histories: historyRepo, Letters: letterRepo,
		Store: store, Hub: hub, MaxUploadMB: cfg.MaxUploadMB,
	})
	adminSvc := service.NewAdminService(service.AdminServiceDeps{
		DB: db, Apps: appRepo, Histories: historyRepo, Notifs: notifRepo, Audit: auditRepo,
		Store: store, Hub: hub, PDF: pdfGen, LetterCfg: cfg.Letter,
	})
	notifSvc := service.NewNotificationService(notifRepo)

	// ---- handler ----
	authH := handler.NewAuthHandler(authSvc)
	studentH := handler.NewStudentHandler(studentSvc)
	letterH := handler.NewLetterTypeHandler(letterSvc)
	appH := handler.NewApplicationHandler(appSvc)
	adminH := handler.NewAdminHandler(adminSvc)
	notifH := handler.NewNotificationHandler(notifSvc)
	wsH := handler.NewWebSocketHandler(hub)

	// ---- middleware ----
	auth := middleware.JWT(jm)
	onlyStudent := middleware.RequireRole(model.RoleMahasiswa)
	onlyAdmin := middleware.RequireRole(model.RoleAdmin)

	// ---- routes ----
	e.GET("/health", func(c echo.Context) error {
		sqlDB, err := db.DB()
		if err != nil || sqlDB.Ping() != nil {
			return response.Error(c, http.StatusServiceUnavailable, "database tidak tersedia")
		}
		return response.OK(c, map[string]any{"status": "ok", "ws_clients": hub.Count(), "time": time.Now()})
	})

	api := e.Group("/api")

	authG := api.Group("/auth")
	authG.POST("/login", authH.Login)
	authG.POST("/logout", authH.Logout, auth)
	authG.GET("/me", authH.Me, auth)

	studentG := api.Group("/student", auth, onlyStudent)
	studentG.GET("/profile", studentH.Profile)
	studentG.PUT("/profile", studentH.UpdateProfile)

	letterG := api.Group("/letter-types", auth)
	letterG.GET("", letterH.List)
	letterG.GET("/:id", letterH.Get)

	appG := api.Group("/applications", auth, onlyStudent)
	appG.POST("", appH.Create)
	appG.GET("", appH.List)
	appG.GET("/summary", appH.Summary)
	appG.GET("/:id", appH.Get)
	appG.PUT("/:id", appH.Update)
	appG.POST("/:id/submit", appH.Submit)
	appG.POST("/:id/documents", appH.UploadDocument)
	appG.GET("/:id/history", appH.History)

	api.GET("/documents/:id", appH.Document, auth)

	adminG := api.Group("/admin/applications", auth, onlyAdmin)
	adminG.GET("", adminH.List)
	adminG.GET("/summary", adminH.Summary)
	adminG.GET("/stats", adminH.Stats)
	adminG.GET("/:id", adminH.Get)
	adminG.POST("/:id/approve", adminH.Approve)
	adminG.POST("/:id/revision", adminH.Revision)
	adminG.POST("/:id/reject", adminH.Reject)
	adminG.POST("/:id/process", adminH.Process)
	adminG.POST("/:id/ready", adminH.Ready)
	adminG.POST("/:id/complete", adminH.Complete)
	adminG.GET("/:id/print", adminH.Print)

	notifG := api.Group("/notifications", auth)
	notifG.GET("", notifH.List)
	notifG.PUT("/read-all", notifH.MarkAllRead)
	notifG.PUT("/:id/read", notifH.MarkRead)

	e.GET("/ws", wsH.Serve, auth)
}
