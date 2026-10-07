// Package repository mengakses database melalui GORM.
// Satu file per entitas: user_repository.go, application_repository.go, dst.
// Tidak ada SQL mentah kecuali untuk query yang tidak praktis via API GORM.
package repository

import (
	"errors"

	"gorm.io/gorm"
)

var ErrNotFound = errors.New("data tidak ditemukan")

// wrap memetakan gorm.ErrRecordNotFound ke ErrNotFound agar service
// tidak bergantung pada tipe error GORM.
func wrap(err error) error {
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return ErrNotFound
	}
	return err
}
