package handler

import (
	"fmt"
	"net/http"

	"github.com/labstack/echo/v4"

	"github.com/pascasarjana-unismuh/persuratan-backend/internal/dto"
	"github.com/pascasarjana-unismuh/persuratan-backend/internal/middleware"
	"github.com/pascasarjana-unismuh/persuratan-backend/internal/service"
	"github.com/pascasarjana-unismuh/persuratan-backend/internal/validator"
	"github.com/pascasarjana-unismuh/persuratan-backend/pkg/response"
)

type ApplicationHandler struct{ svc *service.ApplicationService }

func NewApplicationHandler(s *service.ApplicationService) *ApplicationHandler {
	return &ApplicationHandler{svc: s}
}

// Create — POST /api/applications
func (h *ApplicationHandler) Create(c echo.Context) error {
	var in dto.CreateApplicationRequest
	if err := bindValidate(c, &in); err != nil {
		return err
	}
	dto, err := h.svc.Create(c.Request().Context(), middleware.ActorFrom(c), in)
	if err != nil {
		return fail(c, err)
	}
	return response.Created(c, dto)
}

// List — GET /api/applications
func (h *ApplicationHandler) List(c echo.Context) error {
	items, err := h.svc.ListMine(c.Request().Context(), middleware.ActorFrom(c))
	if err != nil {
		return fail(c, err)
	}
	return response.OK(c, items)
}

// Summary — GET /api/applications/summary
func (h *ApplicationHandler) Summary(c echo.Context) error {
	m, err := h.svc.Summary(c.Request().Context(), middleware.ActorFrom(c))
	if err != nil {
		return fail(c, err)
	}
	return response.OK(c, m)
}

// Get — GET /api/applications/:id
func (h *ApplicationHandler) Get(c echo.Context) error {
	id, err := paramUUID(c, "id")
	if err != nil {
		return err
	}
	dto, err := h.svc.Get(c.Request().Context(), middleware.ActorFrom(c), id)
	if err != nil {
		return fail(c, err)
	}
	return response.OK(c, dto)
}

// Update — PUT /api/applications/:id
func (h *ApplicationHandler) Update(c echo.Context) error {
	id, err := paramUUID(c, "id")
	if err != nil {
		return err
	}
	var req dto.UpdateApplicationRequest
	if err := bindValidate(c, &req); err != nil {
		return err
	}
	dto, err := h.svc.Update(c.Request().Context(), middleware.ActorFrom(c), id, req)
	if err != nil {
		return fail(c, err)
	}
	return response.OK(c, dto)
}

// UploadDocument — POST /api/applications/:id/documents (multipart: document_type, file)
func (h *ApplicationHandler) UploadDocument(c echo.Context) error {
	id, err := paramUUID(c, "id")
	if err != nil {
		return err
	}
	fh, err := c.FormFile("file")
	if err != nil {
		return response.Error(c, http.StatusBadRequest, "Berkas 'file' wajib disertakan.")
	}
	req := dto.UploadDocumentRequest{DocumentType: c.FormValue("document_type")}
	if err := c.Validate(&req); err != nil {
		return response.ValidationError(c, validator.Errors(err))
	}
	doc, err := h.svc.UploadDocument(c.Request().Context(), middleware.ActorFrom(c), id, req, fh)
	if err != nil {
		return fail(c, err)
	}
	return response.Created(c, doc)
}

// Submit — POST /api/applications/:id/submit
func (h *ApplicationHandler) Submit(c echo.Context) error {
	id, err := paramUUID(c, "id")
	if err != nil {
		return err
	}
	dto, err := h.svc.Submit(c.Request().Context(), middleware.ActorFrom(c), id)
	if err != nil {
		return fail(c, err)
	}
	return response.OKMsg(c, "Pengajuan berhasil dikirim.", dto)
}

// History — GET /api/applications/:id/history
func (h *ApplicationHandler) History(c echo.Context) error {
	id, err := paramUUID(c, "id")
	if err != nil {
		return err
	}
	dto, err := h.svc.Get(c.Request().Context(), middleware.ActorFrom(c), id)
	if err != nil {
		return fail(c, err)
	}
	return response.OK(c, dto.History)
}

// Document — GET /api/documents/:id?download=true (stream berkas dengan cek otorisasi)
func (h *ApplicationHandler) Document(c echo.Context) error {
	id, err := paramUUID(c, "id")
	if err != nil {
		return err
	}
	doc, rc, err := h.svc.OpenDocument(c.Request().Context(), middleware.ActorFrom(c), id)
	if err != nil {
		return fail(c, err)
	}
	defer rc.Close()
	disp := "inline"
	if c.QueryParam("download") == "true" {
		disp = "attachment"
	}
	c.Response().Header().Set("Content-Disposition", fmt.Sprintf(`%s; filename="%s"`, disp, doc.FileName))
	c.Response().Header().Set("X-Content-Type-Options", "nosniff")
	return c.Stream(http.StatusOK, doc.MimeType, rc)
}
