package repository

import (
	"context"

	"github.com/google/uuid"
	"gorm.io/gorm"

	"github.com/pascasarjana-unismuh/persuratan-backend/internal/model"
)

type NotificationRepository struct{ db *gorm.DB }

func NewNotificationRepository(db *gorm.DB) *NotificationRepository {
	return &NotificationRepository{db}
}

func (r *NotificationRepository) Create(ctx context.Context, tx *gorm.DB, n *model.Notification) error {
	return tx.WithContext(ctx).Create(n).Error
}

func (r *NotificationRepository) ListByUser(ctx context.Context, userID uuid.UUID, limit int) ([]model.Notification, error) {
	var ns []model.Notification
	err := r.db.WithContext(ctx).Where("user_id = ?", userID).
		Order("created_at DESC").Limit(limit).Find(&ns).Error
	return ns, err
}

func (r *NotificationRepository) MarkRead(ctx context.Context, userID, id uuid.UUID) error {
	res := r.db.WithContext(ctx).Model(&model.Notification{}).
		Where("id = ? AND user_id = ?", id, userID).Update("is_read", true)
	if res.Error != nil {
		return res.Error
	}
	if res.RowsAffected == 0 {
		return ErrNotFound
	}
	return nil
}

func (r *NotificationRepository) MarkAllRead(ctx context.Context, userID uuid.UUID) error {
	return r.db.WithContext(ctx).Model(&model.Notification{}).
		Where("user_id = ? AND is_read = false", userID).Update("is_read", true).Error
}
