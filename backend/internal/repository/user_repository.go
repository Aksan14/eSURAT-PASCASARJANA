package repository

import (
	"context"

	"github.com/google/uuid"
	"gorm.io/gorm"

	"github.com/pascasarjana-unismuh/persuratan-backend/internal/model"
)

type UserRepository struct{ db *gorm.DB }

func NewUserRepository(db *gorm.DB) *UserRepository { return &UserRepository{db} }

func (r *UserRepository) FindByNIM(ctx context.Context, nim string) (*model.User, error) {
	var u model.User
	err := r.db.WithContext(ctx).Where("nim = ?", nim).First(&u).Error
	return &u, wrap(err)
}

func (r *UserRepository) FindByID(ctx context.Context, id uuid.UUID) (*model.User, error) {
	var u model.User
	err := r.db.WithContext(ctx).Preload("Profile").First(&u, "id = ?", id).Error
	return &u, wrap(err)
}

func (r *UserRepository) FindAdmins(ctx context.Context) ([]model.User, error) {
	var us []model.User
	err := r.db.WithContext(ctx).Where("role = ?", model.RoleAdmin).Find(&us).Error
	return us, err
}
