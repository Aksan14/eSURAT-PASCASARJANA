package handler

import (
	"github.com/labstack/echo/v4"

	"github.com/pascasarjana-unismuh/persuratan-backend/internal/service"
	"github.com/pascasarjana-unismuh/persuratan-backend/pkg/response"
)

type LetterTypeHandler struct{ svc *service.LetterTypeService }

func NewLetterTypeHandler(s *service.LetterTypeService) *LetterTypeHandler {
	return &LetterTypeHandler{svc: s}
}

// List — GET /api/letter-types
func (h *LetterTypeHandler) List(c echo.Context) error {
	lts, err := h.svc.List(c.Request().Context())
	if err != nil {
		return fail(c, err)
	}
	return response.OK(c, lts)
}

// Get — GET /api/letter-types/:id (UUID atau kode SKK/SKL/SIPI)
func (h *LetterTypeHandler) Get(c echo.Context) error {
	lt, err := h.svc.Get(c.Request().Context(), c.Param("id"))
	if err != nil {
		return fail(c, err)
	}
	return response.OK(c, lt)
}
