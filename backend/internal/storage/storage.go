// Package storage mengabstraksi penyimpanan berkas (lokal untuk development,
// MinIO/S3 untuk production).
package storage

import (
	"context"
	"io"
)

type Storage interface {
	// Put menyimpan konten dan mengembalikan path/key yang disimpan di DB.
	Put(ctx context.Context, key string, r io.Reader, size int64, contentType string) (string, error)
	// Get membuka stream baca untuk key.
	Get(ctx context.Context, key string) (io.ReadCloser, error)
	Delete(ctx context.Context, key string) error
}
