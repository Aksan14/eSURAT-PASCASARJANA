package repository

import (
	"context"

	"github.com/google/uuid"
	"gorm.io/gorm"

	"github.com/pascasarjana-unismuh/persuratan-backend/internal/model"
)

type StudentProfileRepository struct{ db *gorm.DB }

func NewStudentProfileRepository(db *gorm.DB) *StudentProfileRepository {
	return &StudentProfileRepository{db}
}

func (r *StudentProfileRepository) FindByUserID(ctx context.Context, userID uuid.UUID) (*model.StudentProfile, error) {
	var p model.StudentProfile
	err := r.db.WithContext(ctx).Where("user_id = ?", userID).First(&p).Error
	return &p, wrap(err)
}

func (r *StudentProfileRepository) Update(ctx context.Context, p *model.StudentProfile) error {
	return r.db.WithContext(ctx).Save(p).Error
}
