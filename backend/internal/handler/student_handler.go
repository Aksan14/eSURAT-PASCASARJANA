package handler

import (
	"github.com/labstack/echo/v4"

	"github.com/pascasarjana-unismuh/persuratan-backend/internal/dto"
	"github.com/pascasarjana-unismuh/persuratan-backend/internal/middleware"
	"github.com/pascasarjana-unismuh/persuratan-backend/internal/service"
	"github.com/pascasarjana-unismuh/persuratan-backend/pkg/response"
)

type StudentHandler struct{ svc *service.StudentService }

func NewStudentHandler(s *service.StudentService) *StudentHandler { return &StudentHandler{svc: s} }

// Profile — GET /api/student/profile
func (h *StudentHandler) Profile(c echo.Context) error {
	p, err := h.svc.Profile(c.Request().Context(), middleware.ActorFrom(c).ID)
	if err != nil {
		return fail(c, err)
	}
	return response.OK(c, p)
}

// UpdateProfile — PUT /api/student/profile
func (h *StudentHandler) UpdateProfile(c echo.Context) error {
	var in dto.UpdateProfileRequest
	if err := bindValidate(c, &in); err != nil {
		return err
	}
	p, err := h.svc.UpdateProfile(c.Request().Context(), middleware.ActorFrom(c).ID, in)
	if err != nil {
		return fail(c, err)
	}
	return response.OK(c, p)
}
