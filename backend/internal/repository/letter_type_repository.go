package repository

import (
	"context"

	"github.com/google/uuid"
	"gorm.io/gorm"

	"github.com/pascasarjana-unismuh/persuratan-backend/internal/model"
)

type LetterTypeRepository struct{ db *gorm.DB }

func NewLetterTypeRepository(db *gorm.DB) *LetterTypeRepository { return &LetterTypeRepository{db} }

func (r *LetterTypeRepository) ListActive(ctx context.Context) ([]model.LetterType, error) {
	var lts []model.LetterType
	err := r.db.WithContext(ctx).Where("is_active = true").Order("code").Find(&lts).Error
	return lts, err
}

// FindByIDOrCode menerima UUID atau kode (SKK/SKL/SIPI).
func (r *LetterTypeRepository) FindByIDOrCode(ctx context.Context, idOrCode string) (*model.LetterType, error) {
	var lt model.LetterType
	q := r.db.WithContext(ctx)
	if id, err := uuid.Parse(idOrCode); err == nil {
		q = q.Where("id = ?", id)
	} else {
		q = q.Where("code = ?", idOrCode)
	}
	err := q.First(&lt).Error
	return &lt, wrap(err)
}
