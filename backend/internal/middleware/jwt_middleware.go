// Package middleware: autentikasi JWT dan otorisasi role.
//
//   - jwt_middleware.go  → JWT(): verifikasi token, simpan Actor ke context
//   - role_middleware.go → RequireRole(): batasi akses per role
package middleware

import (
	"net/http"
	"strings"

	"github.com/google/uuid"
	"github.com/labstack/echo/v4"

	"github.com/pascasarjana-unismuh/persuratan-backend/internal/model"
	"github.com/pascasarjana-unismuh/persuratan-backend/internal/service"
	"github.com/pascasarjana-unismuh/persuratan-backend/pkg/jwt"
	"github.com/pascasarjana-unismuh/persuratan-backend/pkg/response"
)

const ctxActorKey = "actor"

// JWT memverifikasi `Authorization: Bearer <token>` (atau `?token=` untuk WebSocket).
func JWT(jm *jwt.Manager) echo.MiddlewareFunc {
	return func(next echo.HandlerFunc) echo.HandlerFunc {
		return func(c echo.Context) error {
			raw := ""
			if h := c.Request().Header.Get("Authorization"); strings.HasPrefix(h, "Bearer ") {
				raw = strings.TrimPrefix(h, "Bearer ")
			} else if q := c.QueryParam("token"); q != "" {
				raw = q
			}
			if raw == "" {
				return response.Error(c, http.StatusUnauthorized, "Token tidak ditemukan.")
			}
			claims, err := jm.Parse(raw)
			if err != nil {
				return response.Error(c, http.StatusUnauthorized, "Token tidak valid atau kedaluwarsa.")
			}
			c.Set(ctxActorKey, service.Actor{ID: claims.UserID, Name: claims.Name, Role: model.Role(claims.Role)})
			return next(c)
		}
	}
}

// ActorFrom mengambil Actor yang disimpan JWT middleware.
func ActorFrom(c echo.Context) service.Actor {
	if a, ok := c.Get(ctxActorKey).(service.Actor); ok {
		return a
	}
	return service.Actor{ID: uuid.Nil}
}
