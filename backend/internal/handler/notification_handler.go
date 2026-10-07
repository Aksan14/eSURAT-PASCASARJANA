package handler

import (
	"github.com/labstack/echo/v4"

	"github.com/pascasarjana-unismuh/persuratan-backend/internal/middleware"
	"github.com/pascasarjana-unismuh/persuratan-backend/internal/service"
	"github.com/pascasarjana-unismuh/persuratan-backend/pkg/response"
)

type NotificationHandler struct{ svc *service.NotificationService }

func NewNotificationHandler(s *service.NotificationService) *NotificationHandler {
	return &NotificationHandler{svc: s}
}

// List — GET /api/notifications
func (h *NotificationHandler) List(c echo.Context) error {
	ns, err := h.svc.List(c.Request().Context(), middleware.ActorFrom(c).ID)
	if err != nil {
		return fail(c, err)
	}
	return response.OK(c, ns)
}

// MarkRead — PUT /api/notifications/:id/read
func (h *NotificationHandler) MarkRead(c echo.Context) error {
	id, err := paramUUID(c, "id")
	if err != nil {
		return err
	}
	if err := h.svc.MarkRead(c.Request().Context(), middleware.ActorFrom(c).ID, id); err != nil {
		return fail(c, err)
	}
	return response.OKMsg(c, "Notifikasi ditandai dibaca.", nil)
}

// MarkAllRead — PUT /api/notifications/read-all
func (h *NotificationHandler) MarkAllRead(c echo.Context) error {
	if err := h.svc.MarkAllRead(c.Request().Context(), middleware.ActorFrom(c).ID); err != nil {
		return fail(c, err)
	}
	return response.OKMsg(c, "Semua notifikasi ditandai dibaca.", nil)
}
