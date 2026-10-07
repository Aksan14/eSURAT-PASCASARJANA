package service

import (
	"context"
	"errors"

	"github.com/google/uuid"
	"golang.org/x/crypto/bcrypt"

	"github.com/pascasarjana-unismuh/persuratan-backend/internal/dto"
	"github.com/pascasarjana-unismuh/persuratan-backend/internal/repository"
	"github.com/pascasarjana-unismuh/persuratan-backend/pkg/jwt"
)

type AuthService struct {
	users *repository.UserRepository
	jwt   *jwt.Manager
}

func NewAuthService(users *repository.UserRepository, jm *jwt.Manager) *AuthService {
	return &AuthService{users: users, jwt: jm}
}

// Login memverifikasi NIM + password dan menerbitkan JWT.
func (s *AuthService) Login(ctx context.Context, req dto.LoginRequest) (*dto.LoginResponse, error) {
	u, err := s.users.FindByNIM(ctx, req.NIM)
	if err != nil {
		if errors.Is(err, repository.ErrNotFound) {
			return nil, ErrUnauthorized("NIM atau password salah.")
		}
		return nil, err
	}
	if bcrypt.CompareHashAndPassword([]byte(u.PasswordHash), []byte(req.Password)) != nil {
		return nil, ErrUnauthorized("NIM atau password salah.")
	}
	tok, exp, err := s.jwt.Sign(u.ID, string(u.Role), u.Name)
	if err != nil {
		return nil, err
	}
	return &dto.LoginResponse{Token: tok, ExpiresAt: exp, User: dto.UserFromModel(u)}, nil
}

// Me mengembalikan user beserta profilnya.
func (s *AuthService) Me(ctx context.Context, id uuid.UUID) (*dto.MeResponse, error) {
	u, err := s.users.FindByID(ctx, id)
	if err != nil {
		return nil, mapRepoErr(err, "Pengguna tidak ditemukan.")
	}
	res := dto.MeFromModel(u)
	return &res, nil
}
