package service

import (
	"github.com/google/uuid"

	"github.com/pascasarjana-unismuh/persuratan-backend/internal/model"
)

// Actor adalah identitas pemanggil yang diekstrak middleware dari JWT.
type Actor struct {
	ID   uuid.UUID
	Name string
	Role model.Role
}

func (a Actor) IsAdmin() bool { return a.Role == model.RoleAdmin }
