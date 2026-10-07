package dto

import (
	"time"

	"github.com/google/uuid"

	"github.com/pascasarjana-unismuh/persuratan-backend/internal/model"
)

// ---- Response ----

type NotificationResponse struct {
	ID            uuid.UUID  `json:"id"`
	ApplicationID *uuid.UUID `json:"application_id"`
	Title         string     `json:"title"`
	Message       string     `json:"message"`
	IsRead        bool       `json:"is_read"`
	CreatedAt     time.Time  `json:"created_at"`
}

// ---- Mapper ----

func NotificationFromModel(n *model.Notification) NotificationResponse {
	return NotificationResponse{
		ID: n.ID, ApplicationID: n.ApplicationID, Title: n.Title,
		Message: n.Message, IsRead: n.IsRead, CreatedAt: n.CreatedAt,
	}
}

func NotificationsFromModel(ns []model.Notification) []NotificationResponse {
	out := make([]NotificationResponse, 0, len(ns))
	for i := range ns {
		out = append(out, NotificationFromModel(&ns[i]))
	}
	return out
}
