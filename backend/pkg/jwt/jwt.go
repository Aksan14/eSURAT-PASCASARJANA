// Package jwt membungkus pembuatan dan verifikasi access token.
package jwt

import (
	"errors"
	"time"

	gojwt "github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
)

type Claims struct {
	UserID uuid.UUID `json:"uid"`
	Role   string    `json:"role"`
	Name   string    `json:"name"`
	gojwt.RegisteredClaims
}

type Manager struct {
	secret []byte
	expiry time.Duration
}

func NewManager(secret string, expiry time.Duration) *Manager {
	return &Manager{secret: []byte(secret), expiry: expiry}
}

func (m *Manager) Sign(userID uuid.UUID, role, name string) (string, time.Time, error) {
	exp := time.Now().Add(m.expiry)
	claims := Claims{
		UserID: userID,
		Role:   role,
		Name:   name,
		RegisteredClaims: gojwt.RegisteredClaims{
			Subject:   userID.String(),
			IssuedAt:  gojwt.NewNumericDate(time.Now()),
			ExpiresAt: gojwt.NewNumericDate(exp),
			Issuer:    "persuratan-pps-unismuh",
		},
	}
	tok := gojwt.NewWithClaims(gojwt.SigningMethodHS256, claims)
	s, err := tok.SignedString(m.secret)
	return s, exp, err
}

func (m *Manager) Parse(tokenStr string) (*Claims, error) {
	claims := &Claims{}
	tok, err := gojwt.ParseWithClaims(tokenStr, claims, func(t *gojwt.Token) (interface{}, error) {
		if _, ok := t.Method.(*gojwt.SigningMethodHMAC); !ok {
			return nil, errors.New("metode tanda tangan tidak valid")
		}
		return m.secret, nil
	})
	if err != nil {
		return nil, err
	}
	if !tok.Valid {
		return nil, errors.New("token tidak valid")
	}
	return claims, nil
}
