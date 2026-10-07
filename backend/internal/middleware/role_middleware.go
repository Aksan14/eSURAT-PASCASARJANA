package middleware

import (
	"net/http"

	"github.com/labstack/echo/v4"

	"github.com/pascasarjana-unismuh/persuratan-backend/internal/model"
	"github.com/pascasarjana-unismuh/persuratan-backend/pkg/response"
)

// RequireRole membatasi akses ke role tertentu. Harus dipasang setelah JWT().
func RequireRole(roles ...model.Role) echo.MiddlewareFunc {
	allowed := make(map[model.Role]struct{}, len(roles))
	for _, r := range roles {
		allowed[r] = struct{}{}
	}
	return func(next echo.HandlerFunc) echo.HandlerFunc {
		return func(c echo.Context) error {
			if _, ok := allowed[ActorFrom(c).Role]; !ok {
				return response.Error(c, http.StatusForbidden, "Anda tidak memiliki hak akses.")
			}
			return next(c)
		}
	}
}
