package service

import (
	"context"

	"github.com/google/uuid"

	"github.com/pascasarjana-unismuh/persuratan-backend/internal/dto"
	"github.com/pascasarjana-unismuh/persuratan-backend/internal/repository"
)

type StudentService struct {
	profiles *repository.StudentProfileRepository
}

func NewStudentService(p *repository.StudentProfileRepository) *StudentService {
	return &StudentService{profiles: p}
}

func (s *StudentService) Profile(ctx context.Context, userID uuid.UUID) (*dto.StudentProfileResponse, error) {
	p, err := s.profiles.FindByUserID(ctx, userID)
	if err != nil {
		return nil, mapRepoErr(err, "Profil tidak ditemukan.")
	}
	res := dto.StudentProfileFromModel(p)
	return &res, nil
}

// UpdateProfile hanya mengizinkan field kontak; data akademik dikelola akademik.
func (s *StudentService) UpdateProfile(ctx context.Context, userID uuid.UUID, req dto.UpdateProfileRequest) (*dto.StudentProfileResponse, error) {
	p, err := s.profiles.FindByUserID(ctx, userID)
	if err != nil {
		return nil, mapRepoErr(err, "Profil tidak ditemukan.")
	}
	if req.Alamat != "" {
		p.Alamat = req.Alamat
	}
	if req.NomorTelepon != "" {
		p.NomorTelepon = req.NomorTelepon
	}
	if req.Email != "" {
		p.Email = req.Email
	}
	if err := s.profiles.Update(ctx, p); err != nil {
		return nil, err
	}
	res := dto.StudentProfileFromModel(p)
	return &res, nil
}
