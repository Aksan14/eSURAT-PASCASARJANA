package handler

import (
	"github.com/labstack/echo/v4"

	"github.com/pascasarjana-unismuh/persuratan-backend/internal/middleware"
	ws "github.com/pascasarjana-unismuh/persuratan-backend/internal/websocket"
)

type WebSocketHandler struct{ hub *ws.Hub }

func NewWebSocketHandler(h *ws.Hub) *WebSocketHandler { return &WebSocketHandler{hub: h} }

// Serve — GET /ws?token=<jwt>
func (h *WebSocketHandler) Serve(c echo.Context) error {
	a := middleware.ActorFrom(c)
	return h.hub.Serve(c.Response(), c.Request(), a.ID, string(a.Role))
}
