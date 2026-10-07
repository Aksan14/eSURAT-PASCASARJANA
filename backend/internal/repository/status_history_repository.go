package repository

import (
	"context"

	"gorm.io/gorm"

	"github.com/pascasarjana-unismuh/persuratan-backend/internal/model"
)

type StatusHistoryRepository struct{ db *gorm.DB }

func NewStatusHistoryRepository(db *gorm.DB) *StatusHistoryRepository {
	return &StatusHistoryRepository{db}
}

func (r *StatusHistoryRepository) Create(ctx context.Context, tx *gorm.DB, h *model.StatusHistory) error {
	return tx.WithContext(ctx).Create(h).Error
}
