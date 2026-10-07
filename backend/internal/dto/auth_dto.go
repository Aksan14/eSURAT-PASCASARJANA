package dto

import (
	"time"

	"github.com/google/uuid"

	"github.com/pascasarjana-unismuh/persuratan-backend/internal/model"
)

// ---- Request ----

type LoginRequest struct {
	NIM      string `json:"nim" validate:"required"`
	Password string `json:"password" validate:"required"`
}

// ---- Response ----

type UserResponse struct {
	ID    uuid.UUID  `json:"id"`
	NIM   string     `json:"nim"`
	Name  string     `json:"name"`
	Email string     `json:"email"`
	Role  model.Role `json:"role"`
}

type LoginResponse struct {
	Token     string       `json:"token"`
	ExpiresAt time.Time    `json:"expires_at"`
	User      UserResponse `json:"user"`
}

type MeResponse struct {
	UserResponse
	Profile *StudentProfileResponse `json:"profile,omitempty"`
}

// ---- Mapper ----

func UserFromModel(u *model.User) UserResponse {
	return UserResponse{ID: u.ID, NIM: u.NIM, Name: u.Name, Email: u.Email, Role: u.Role}
}

func MeFromModel(u *model.User) MeResponse {
	res := MeResponse{UserResponse: UserFromModel(u)}
	if u.Profile != nil {
		p := StudentProfileFromModel(u.Profile)
		res.Profile = &p
	}
	return res
}
