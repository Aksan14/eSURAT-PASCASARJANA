package repository

import (
	"context"

	"gorm.io/gorm"

	"github.com/pascasarjana-unismuh/persuratan-backend/internal/model"
)

type AuditLogRepository struct{ db *gorm.DB }

func NewAuditLogRepository(db *gorm.DB) *AuditLogRepository { return &AuditLogRepository{db} }

func (r *AuditLogRepository) Create(ctx context.Context, tx *gorm.DB, l *model.AuditLog) error {
	return tx.WithContext(ctx).Create(l).Error
}
