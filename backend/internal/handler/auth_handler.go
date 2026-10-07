package handler

import (
	"github.com/labstack/echo/v4"

	"github.com/pascasarjana-unismuh/persuratan-backend/internal/dto"
	"github.com/pascasarjana-unismuh/persuratan-backend/internal/middleware"
	"github.com/pascasarjana-unismuh/persuratan-backend/internal/service"
	"github.com/pascasarjana-unismuh/persuratan-backend/pkg/response"
)

type AuthHandler struct{ svc *service.AuthService }

func NewAuthHandler(s *service.AuthService) *AuthHandler { return &AuthHandler{svc: s} }

// Login — POST /api/auth/login
func (h *AuthHandler) Login(c echo.Context) error {
	var req dto.LoginRequest
	if err := bindValidate(c, &req); err != nil {
		return err
	}
	res, err := h.svc.Login(c.Request().Context(), req)
	if err != nil {
		return fail(c, err)
	}
	return response.OK(c, res)
}

// Logout — POST /api/auth/logout (JWT stateless; klien membuang token).
func (h *AuthHandler) Logout(c echo.Context) error {
	return response.OKMsg(c, "Berhasil keluar.", nil)
}

// Me — GET /api/auth/me
func (h *AuthHandler) Me(c echo.Context) error {
	u, err := h.svc.Me(c.Request().Context(), middleware.ActorFrom(c).ID)
	if err != nil {
		return fail(c, err)
	}
	return response.OK(c, u)
}
