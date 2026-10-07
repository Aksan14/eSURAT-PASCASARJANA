package handler

import (
	"fmt"
	"net/http"

	"github.com/labstack/echo/v4"

	"github.com/pascasarjana-unismuh/persuratan-backend/internal/dto"
	"github.com/pascasarjana-unismuh/persuratan-backend/internal/middleware"
	"github.com/pascasarjana-unismuh/persuratan-backend/internal/service"
	"github.com/pascasarjana-unismuh/persuratan-backend/pkg/response"
)

type AdminHandler struct{ svc *service.AdminService }

func NewAdminHandler(s *service.AdminService) *AdminHandler { return &AdminHandler{svc: s} }

// List — GET /api/admin/applications
func (h *AdminHandler) List(c echo.Context) error {
	var q dto.AdminListQuery
	if err := bindValidate(c, &q); err != nil {
		return err
	}
	res, err := h.svc.List(c.Request().Context(), q)
	if err != nil {
		return fail(c, err)
	}
	return response.Paginated(c, res.Items, res.Meta)
}

// Summary — GET /api/admin/applications/summary
func (h *AdminHandler) Summary(c echo.Context) error {
	m, err := h.svc.Summary(c.Request().Context())
	if err != nil {
		return fail(c, err)
	}
	return response.OK(c, m)
}

// Stats — GET /api/admin/applications/stats (grafik dashboard)
func (h *AdminHandler) Stats(c echo.Context) error {
	res, err := h.svc.Stats(c.Request().Context())
	if err != nil {
		return fail(c, err)
	}
	return response.OK(c, res)
}

// Get — GET /api/admin/applications/:id
func (h *AdminHandler) Get(c echo.Context) error {
	id, err := paramUUID(c, "id")
	if err != nil {
		return err
	}
	res, err := h.svc.Get(c.Request().Context(), id)
	if err != nil {
		return fail(c, err)
	}
	return response.OK(c, res)
}

// Approve — POST /api/admin/applications/:id/approve
func (h *AdminHandler) Approve(c echo.Context) error {
	id, err := paramUUID(c, "id")
	if err != nil {
		return err
	}
	res, err := h.svc.Approve(c.Request().Context(), middleware.ActorFrom(c), id, c.RealIP())
	if err != nil {
		return fail(c, err)
	}
	return response.OKMsg(c, "Pengajuan disetujui.", res)
}

// Revision — POST /api/admin/applications/:id/revision
func (h *AdminHandler) Revision(c echo.Context) error {
	id, err := paramUUID(c, "id")
	if err != nil {
		return err
	}
	var req dto.NoteRequest
	if err := bindValidate(c, &req); err != nil {
		return err
	}
	res, err := h.svc.RequestRevision(c.Request().Context(), middleware.ActorFrom(c), id, req, c.RealIP())
	if err != nil {
		return fail(c, err)
	}
	return response.OKMsg(c, "Permintaan perbaikan dikirim.", res)
}

// Reject — POST /api/admin/applications/:id/reject
func (h *AdminHandler) Reject(c echo.Context) error {
	id, err := paramUUID(c, "id")
	if err != nil {
		return err
	}
	var req dto.NoteRequest
	if err := bindValidate(c, &req); err != nil {
		return err
	}
	res, err := h.svc.Reject(c.Request().Context(), middleware.ActorFrom(c), id, req, c.RealIP())
	if err != nil {
		return fail(c, err)
	}
	return response.OKMsg(c, "Pengajuan ditolak.", res)
}

// Process — POST /api/admin/applications/:id/process  {letter_number}
func (h *AdminHandler) Process(c echo.Context) error {
	id, err := paramUUID(c, "id")
	if err != nil {
		return err
	}
	var req dto.ProcessRequest
	if err := bindValidate(c, &req); err != nil {
		return err
	}
	res, err := h.svc.Process(c.Request().Context(), middleware.ActorFrom(c), id, req, c.RealIP())
	if err != nil {
		return fail(c, err)
	}
	return response.OKMsg(c, "Surat sedang diproses.", res)
}

// Ready — POST /api/admin/applications/:id/ready
func (h *AdminHandler) Ready(c echo.Context) error {
	id, err := paramUUID(c, "id")
	if err != nil {
		return err
	}
	res, err := h.svc.MarkReady(c.Request().Context(), middleware.ActorFrom(c), id, c.RealIP())
	if err != nil {
		return fail(c, err)
	}
	return response.OKMsg(c, "Mahasiswa telah diberi tahu bahwa surat siap diambil.", res)
}

// Complete — POST /api/admin/applications/:id/complete
func (h *AdminHandler) Complete(c echo.Context) error {
	id, err := paramUUID(c, "id")
	if err != nil {
		return err
	}
	res, err := h.svc.Complete(c.Request().Context(), middleware.ActorFrom(c), id, c.RealIP())
	if err != nil {
		return fail(c, err)
	}
	return response.OKMsg(c, "Pengajuan selesai.", res)
}

// Print — GET /api/admin/applications/:id/print?letter_number=&download=true
func (h *AdminHandler) Print(c echo.Context) error {
	id, err := paramUUID(c, "id")
	if err != nil {
		return err
	}
	var q dto.PrintQuery
	if err := c.Bind(&q); err != nil {
		return response.Error(c, http.StatusBadRequest, "Query tidak valid.")
	}
	name, rc, err := h.svc.Print(c.Request().Context(), id, q)
	if err != nil {
		return fail(c, err)
	}
	defer rc.Close()
	disp := "inline"
	if q.Download {
		disp = "attachment"
	}
	c.Response().Header().Set("Content-Disposition", fmt.Sprintf(`%s; filename="%s"`, disp, name))
	return c.Stream(http.StatusOK, "application/pdf", rc)
}
