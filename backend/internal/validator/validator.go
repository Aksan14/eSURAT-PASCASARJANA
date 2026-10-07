// Package validator membungkus go-playground/validator untuk Echo.
package validator

import (
	"fmt"
	"strings"

	v10 "github.com/go-playground/validator/v10"
)

type Validator struct{ v *v10.Validate }

var validStatuses = map[string]bool{
	"MENUNGGU_VERIFIKASI": true, "PERLU_PERBAIKAN": true, "DISETUJUI": true,
	"DIPROSES": true, "SIAP_DIAMBIL": true, "SELESAI": true, "DITOLAK": true,
}

func New() *Validator {
	v := v10.New(v10.WithRequiredStructEnabled())
	// statuslist: satu atau beberapa status pengajuan dipisah koma.
	_ = v.RegisterValidation("statuslist", func(fl v10.FieldLevel) bool {
		for _, s := range strings.Split(fl.Field().String(), ",") {
			if !validStatuses[strings.TrimSpace(s)] {
				return false
			}
		}
		return true
	})
	return &Validator{v: v}
}

// Validate mengimplementasikan echo.Validator.
func (x *Validator) Validate(i interface{}) error {
	return x.v.Struct(i)
}

// Errors mengubah error validator menjadi map field → pesan (bahasa Indonesia ringkas).
func Errors(err error) map[string]string {
	out := map[string]string{}
	ve, ok := err.(v10.ValidationErrors)
	if !ok {
		out["_"] = err.Error()
		return out
	}
	for _, fe := range ve {
		field := strings.ToLower(fe.Field())
		switch fe.Tag() {
		case "required":
			out[field] = "wajib diisi"
		case "email":
			out[field] = "format email tidak valid"
		case "min":
			out[field] = fmt.Sprintf("minimal %s karakter", fe.Param())
		case "max":
			out[field] = fmt.Sprintf("maksimal %s karakter", fe.Param())
		case "oneof":
			out[field] = "nilai harus salah satu dari: " + fe.Param()
		case "statuslist":
			out[field] = "status tidak dikenal"
		default:
			out[field] = "tidak valid (" + fe.Tag() + ")"
		}
	}
	return out
}
