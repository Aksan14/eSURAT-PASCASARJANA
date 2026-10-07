package service

import (
	"context"
	"fmt"

	"github.com/pascasarjana-unismuh/persuratan-backend/internal/dto"
	"github.com/pascasarjana-unismuh/persuratan-backend/internal/repository"
)

type LetterTypeService struct {
	repo *repository.LetterTypeRepository
}

func NewLetterTypeService(r *repository.LetterTypeRepository) *LetterTypeService {
	return &LetterTypeService{repo: r}
}

func (s *LetterTypeService) List(ctx context.Context) ([]dto.LetterTypeResponse, error) {
	lts, err := s.repo.ListActive(ctx)
	if err != nil {
		return nil, err
	}
	return dto.LetterTypesFromModel(lts), nil
}

func (s *LetterTypeService) Get(ctx context.Context, idOrCode string) (*dto.LetterTypeResponse, error) {
	lt, err := s.repo.FindByIDOrCode(ctx, idOrCode)
	if err != nil {
		return nil, mapRepoErr(err, fmt.Sprintf("Jenis surat %q tidak ditemukan.", idOrCode))
	}
	res := dto.LetterTypeFromModel(lt)
	return &res, nil
}
