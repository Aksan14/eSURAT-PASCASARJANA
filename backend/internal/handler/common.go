// Package handler memetakan HTTP request ke service (PRD §16).
//
// Satu file per domain:
//   - common.go               helper bersama (fail, bindValidate, paramUUID)
//   - auth_handler.go         /api/auth/*
//   - student_handler.go      /api/student/*
//   - letter_type_handler.go  /api/letter-types/*
//   - application_handler.go  /api/applications/*, /api/documents/:id
//   - admin_handler.go        /api/admin/applications/*
//   - notification_handler.go /api/notifications/*
//   - websocket_handler.go    /ws
package handler

import (
	"errors"
	"net/http"

	"github.com/google/uuid"
	"github.com/labstack/echo/v4"

	"github.com/pascasarjana-unismuh/persuratan-backend/internal/service"
	"github.com/pascasarjana-unismuh/persuratan-backend/internal/validator"
	"github.com/pascasarjana-unismuh/persuratan-backend/pkg/response"
)

// fail memetakan error service ke respons HTTP; error tak dikenal → 500.
func fail(c echo.Context, err error) error {
	var se *service.Error
	if errors.As(err, &se) {
		return response.Error(c, se.Code, se.Msg)
	}
	c.Logger().Error(err)
	return response.Error(c, http.StatusInternalServerError, "Terjadi kesalahan pada server.")
}

// bindValidate mengikat body ke struct dan menjalankan validasi tag.
func bindValidate(c echo.Context, v interface{}) error {
	if err := c.Bind(v); err != nil {
		return response.Error(c, http.StatusBadRequest, "Payload tidak valid.")
	}
	if err := c.Validate(v); err != nil {
		return response.ValidationError(c, validator.Errors(err))
	}
	return nil
}

// paramUUID membaca path param sebagai UUID; menulis 400 bila tidak valid.
func paramUUID(c echo.Context, name string) (uuid.UUID, error) {
	id, err := uuid.Parse(c.Param(name))
	if err != nil {
		return uuid.Nil, response.Error(c, http.StatusBadRequest, "ID tidak valid.")
	}
	return id, nil
}
