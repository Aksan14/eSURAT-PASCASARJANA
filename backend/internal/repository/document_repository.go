package repository

import (
	"context"

	"github.com/google/uuid"
	"gorm.io/gorm"

	"github.com/pascasarjana-unismuh/persuratan-backend/internal/model"
)

type DocumentRepository struct{ db *gorm.DB }

func NewDocumentRepository(db *gorm.DB) *DocumentRepository { return &DocumentRepository{db} }

func (r *DocumentRepository) Create(ctx context.Context, tx *gorm.DB, d *model.Document) error {
	return tx.WithContext(ctx).Create(d).Error
}

func (r *DocumentRepository) FindByID(ctx context.Context, id uuid.UUID) (*model.Document, error) {
	var d model.Document
	err := r.db.WithContext(ctx).First(&d, "id = ?", id).Error
	return &d, wrap(err)
}

// DeleteByType menghapus dokumen bertipe tertentu pada pengajuan dan
// mengembalikan baris yang terhapus (agar berkasnya bisa dibersihkan dari storage).
func (r *DocumentRepository) DeleteByType(ctx context.Context, tx *gorm.DB, appID uuid.UUID, docType string) ([]model.Document, error) {
	var olds []model.Document
	q := tx.WithContext(ctx).Where("application_id = ? AND document_type = ?", appID, docType)
	if err := q.Find(&olds).Error; err != nil {
		return nil, err
	}
	if len(olds) > 0 {
		if err := q.Delete(&model.Document{}).Error; err != nil {
			return nil, err
		}
	}
	return olds, nil
}
