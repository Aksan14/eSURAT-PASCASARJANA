// Package response menyeragamkan bentuk JSON respons API.
package response

import (
	"net/http"

	"github.com/labstack/echo/v4"

	"github.com/pascasarjana-unismuh/persuratan-backend/internal/dto"
)

type Envelope struct {
	Success bool        `json:"success"`
	Message string      `json:"message,omitempty"`
	Data    interface{} `json:"data,omitempty"`
	Meta    interface{} `json:"meta,omitempty"`
	Errors  interface{} `json:"errors,omitempty"`
}

func OK(c echo.Context, data interface{}) error {
	return c.JSON(http.StatusOK, Envelope{Success: true, Data: data})
}

func OKMsg(c echo.Context, msg string, data interface{}) error {
	return c.JSON(http.StatusOK, Envelope{Success: true, Message: msg, Data: data})
}

func Created(c echo.Context, data interface{}) error {
	return c.JSON(http.StatusCreated, Envelope{Success: true, Data: data})
}

func Paginated(c echo.Context, data interface{}, p dto.Pagination) error {
	return c.JSON(http.StatusOK, Envelope{Success: true, Data: data, Meta: p})
}

func Error(c echo.Context, status int, msg string) error {
	return c.JSON(status, Envelope{Success: false, Message: msg})
}

func ValidationError(c echo.Context, errs interface{}) error {
	return c.JSON(http.StatusUnprocessableEntity, Envelope{
		Success: false,
		Message: "Validasi gagal.",
		Errors:  errs,
	})
}
