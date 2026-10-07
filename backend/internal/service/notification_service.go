package service

import (
	"context"

	"github.com/google/uuid"

	"github.com/pascasarjana-unismuh/persuratan-backend/internal/dto"
	"github.com/pascasarjana-unismuh/persuratan-backend/internal/repository"
)

type NotificationService struct {
	repo *repository.NotificationRepository
}

func NewNotificationService(r *repository.NotificationRepository) *NotificationService {
	return &NotificationService{repo: r}
}

func (s *NotificationService) List(ctx context.Context, userID uuid.UUID) ([]dto.NotificationResponse, error) {
	ns, err := s.repo.ListByUser(ctx, userID, 50)
	if err != nil {
		return nil, err
	}
	return dto.NotificationsFromModel(ns), nil
}

func (s *NotificationService) MarkRead(ctx context.Context, userID, id uuid.UUID) error {
	return mapRepoErr(s.repo.MarkRead(ctx, userID, id), "Notifikasi tidak ditemukan.")
}

func (s *NotificationService) MarkAllRead(ctx context.Context, userID uuid.UUID) error {
	return s.repo.MarkAllRead(ctx, userID)
}
