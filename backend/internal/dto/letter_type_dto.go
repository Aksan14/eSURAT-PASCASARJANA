package dto

import (
	"github.com/google/uuid"

	"github.com/pascasarjana-unismuh/persuratan-backend/internal/model"
)

// ---- Response ----

type LetterTypeResponse struct {
	ID               uuid.UUID `json:"id"`
	Code             string    `json:"code"`
	Name             string    `json:"name"`
	Description      string    `json:"description"`
	IsActive         bool      `json:"is_active"`
	RequiresDocument bool      `json:"requires_document"`
}

// ---- Mapper ----

func LetterTypeFromModel(lt *model.LetterType) LetterTypeResponse {
	return LetterTypeResponse{
		ID: lt.ID, Code: lt.Code, Name: lt.Name, Description: lt.Description,
		IsActive: lt.IsActive, RequiresDocument: lt.RequiresDocument,
	}
}

func LetterTypesFromModel(lts []model.LetterType) []LetterTypeResponse {
	out := make([]LetterTypeResponse, 0, len(lts))
	for i := range lts {
		out = append(out, LetterTypeFromModel(&lts[i]))
	}
	return out
}
