package service

import (
	"context"
	"fmt"
	"io"
	"mime/multipart"
	"path/filepath"
	"strings"
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"

	"github.com/pascasarjana-unismuh/persuratan-backend/internal/dto"
	"github.com/pascasarjana-unismuh/persuratan-backend/internal/model"
	"github.com/pascasarjana-unismuh/persuratan-backend/internal/repository"
	"github.com/pascasarjana-unismuh/persuratan-backend/internal/storage"
	ws "github.com/pascasarjana-unismuh/persuratan-backend/internal/websocket"
)

// Field wajib per jenis surat — mengikuti template resmi (templates/letters/*.tmpl).
// Data diri (nama, TTL, NIM, prodi) diambil dari profil, tidak diminta di form.
var requiredFields = map[string][]string{
	"SKK":  {"semester", "tahunAjaran"},
	"SKL":  {"tanggalYudisium", "ipk", "predikatKelulusan", "judulTesis"},
	"SIPI": {"judulTesis", "tujuanSurat", "kotaTujuan"},
}

var requiredDocs = map[string][]string{
	"SIPI": {"proposal"},
}

// fixedFields: nilai tetap sesuai template resmi; input mahasiswa untuk field ini diabaikan.
var fixedFields = map[string]map[string]string{
	"SIPI": {
		"tujuanSurat": "Ketua LP3M Universitas Muhammadiyah Makassar",
		"kotaTujuan":  "Makassar",
	},
}

// applyFixed menimpa field tetap dengan nilai resminya.
func applyFixed(code string, data map[string]string) map[string]string {
	if data == nil {
		data = map[string]string{}
	}
	for k, v := range fixedFields[code] {
		data[k] = v
	}
	return data
}

var allowedMime = map[string]bool{
	"application/pdf": true,
}

// ApplicationService: alur sisi mahasiswa (draft → upload → submit).
type ApplicationService struct {
	db        *gorm.DB
	apps      *repository.ApplicationRepository
	docs      *repository.DocumentRepository
	histories *repository.StatusHistoryRepository
	letters   *repository.LetterTypeRepository
	store     storage.Storage
	hub       *ws.Hub
	maxSize   int64
}

type ApplicationServiceDeps struct {
	DB          *gorm.DB
	Apps        *repository.ApplicationRepository
	Docs        *repository.DocumentRepository
	Histories   *repository.StatusHistoryRepository
	Letters     *repository.LetterTypeRepository
	Store       storage.Storage
	Hub         *ws.Hub
	MaxUploadMB int64
}

func NewApplicationService(d ApplicationServiceDeps) *ApplicationService {
	return &ApplicationService{
		db: d.DB, apps: d.Apps, docs: d.Docs, histories: d.Histories, letters: d.Letters,
		store: d.Store, hub: d.Hub, maxSize: d.MaxUploadMB * 1024 * 1024,
	}
}

// Create membuat pengajuan berstatus DRAFT. POST /api/applications
func (s *ApplicationService) Create(ctx context.Context, actor Actor, req dto.CreateApplicationRequest) (*dto.ApplicationResponse, error) {
	lt, err := s.letters.FindByIDOrCode(ctx, req.LetterCode)
	if err != nil {
		return nil, mapRepoErr(err, "Jenis surat tidak ditemukan.")
	}
	if !lt.IsActive {
		return nil, ErrBadRequest("Jenis surat tidak aktif.")
	}

	var app *model.Application
	err = s.db.Transaction(func(tx *gorm.DB) error {
		prefix := time.Now().Format("20060102")
		seq, err := s.apps.NextSequence(ctx, tx, prefix)
		if err != nil {
			return err
		}
		app = &model.Application{
			ApplicationNumber: fmt.Sprintf("%s-%s-%04d", lt.Code, prefix, seq),
			UserID:            actor.ID,
			LetterTypeID:      lt.ID,
			Status:            model.StatusDraft,
		}
		if err := s.apps.Create(ctx, tx, app); err != nil {
			return err
		}
		if err := s.apps.ReplaceData(ctx, tx, app.ID, applyFixed(lt.Code, req.Data)); err != nil {
			return err
		}
		return s.histories.Create(ctx, tx, &model.StatusHistory{
			ApplicationID: app.ID, Status: model.StatusDraft,
			ChangedBy: actor.ID, ChangedByName: actor.Name,
		})
	})
	if err != nil {
		return nil, err
	}
	return s.getResponse(ctx, app.ID)
}

// Update memperbarui data draft / pengajuan yang perlu perbaikan. PUT /api/applications/:id
func (s *ApplicationService) Update(ctx context.Context, actor Actor, id uuid.UUID, req dto.UpdateApplicationRequest) (*dto.ApplicationResponse, error) {
	err := s.db.Transaction(func(tx *gorm.DB) error {
		app, err := s.ownedEditable(ctx, tx, actor, id)
		if err != nil {
			return err
		}
		merged := dto.ApplicationDataMap(app)
		for k, v := range req.Data {
			merged[k] = v
		}
		return s.apps.ReplaceData(ctx, tx, app.ID, applyFixed(app.LetterType.Code, merged))
	})
	if err != nil {
		return nil, err
	}
	return s.getResponse(ctx, id)
}

// UploadDocument menyimpan berkas pendukung. POST /api/applications/:id/documents
func (s *ApplicationService) UploadDocument(ctx context.Context, actor Actor, id uuid.UUID, req dto.UploadDocumentRequest, fh *multipart.FileHeader) (*dto.DocumentResponse, error) {
	if fh.Size > s.maxSize {
		return nil, ErrBadRequest(fmt.Sprintf("Ukuran berkas melebihi batas %d MB.", s.maxSize/1024/1024))
	}
	f, err := fh.Open()
	if err != nil {
		return nil, err
	}
	defer f.Close()

	// Validasi tipe dari konten, bukan hanya header/ekstensi.
	head := make([]byte, 512)
	n, _ := io.ReadFull(f, head)
	mime := detectMime(head[:n])
	if !allowedMime[mime] {
		return nil, ErrBadRequest("Format berkas harus PDF.")
	}
	if _, err := f.Seek(0, io.SeekStart); err != nil {
		return nil, err
	}

	var doc *model.Document
	err = s.db.Transaction(func(tx *gorm.DB) error {
		app, err := s.ownedEditable(ctx, tx, actor, id)
		if err != nil {
			return err
		}

		// Satu berkas per document_type: ganti yang lama.
		olds, err := s.docs.DeleteByType(ctx, tx, app.ID, req.DocumentType)
		if err != nil {
			return err
		}
		for _, o := range olds {
			_ = s.store.Delete(ctx, o.FilePath)
		}

		key := fmt.Sprintf("applications/%s/%s-%s", app.ID, req.DocumentType, sanitizeFilename(fh.Filename))
		path, err := s.store.Put(ctx, key, f, fh.Size, mime)
		if err != nil {
			return err
		}
		doc = &model.Document{
			ApplicationID: app.ID, DocumentType: req.DocumentType, FileName: fh.Filename,
			FilePath: path, MimeType: mime, FileSize: fh.Size,
		}
		return s.docs.Create(ctx, tx, doc)
	})
	if err != nil {
		return nil, err
	}
	res := dto.DocumentFromModel(doc)
	return &res, nil
}

// duplicateKeyFields: field "identitas" per jenis surat. Mahasiswa tidak dapat mengirim
// pengajuan baru bila sudah ada pengajuan aktif/selesai dengan jenis dan identitas yang sama
// (mis. SKK untuk semester & tahun ajaran yang sama). Pengajuan DITOLAK tidak dihitung.
var duplicateKeyFields = map[string][]string{
	"SKK":  {"semester", "tahunAjaran"},
	"SKL":  {"tanggalYudisium"},
	"SIPI": {"judulTesis"},
}

// Submit mengirim pengajuan (DRAFT/PERLU_PERBAIKAN → MENUNGGU_VERIFIKASI).
func (s *ApplicationService) Submit(ctx context.Context, actor Actor, id uuid.UUID) (*dto.ApplicationResponse, error) {
	var app *model.Application
	var resubmit bool
	err := s.db.Transaction(func(tx *gorm.DB) error {
		var err error
		app, err = s.ownedEditable(ctx, tx, actor, id)
		if err != nil {
			return err
		}
		if err := s.validateComplete(app); err != nil {
			return err
		}
		if err := s.rejectDuplicate(ctx, tx, app); err != nil {
			return err
		}

		resubmit = app.Status == model.StatusPerluPerbaikan
		now := time.Now()
		app.Status = model.StatusMenungguVerifikasi
		app.SubmittedAt = &now
		app.AdminNote = ""
		if err := s.apps.Save(ctx, tx, app); err != nil {
			return err
		}
		note := ""
		if resubmit {
			note = "Pengajuan dikirim ulang setelah perbaikan."
		}
		return s.histories.Create(ctx, tx, &model.StatusHistory{
			ApplicationID: app.ID, Status: app.Status, Note: note,
			ChangedBy: actor.ID, ChangedByName: actor.Name,
		})
	})
	if err != nil {
		return nil, err
	}

	s.notifyAdmins(app, actor, resubmit)
	return s.getResponse(ctx, id)
}

// ListMine daftar pengajuan milik mahasiswa.
func (s *ApplicationService) ListMine(ctx context.Context, actor Actor) ([]dto.ApplicationResponse, error) {
	as, err := s.apps.ListByUser(ctx, actor.ID)
	if err != nil {
		return nil, err
	}
	return dto.ApplicationsFromModel(as), nil
}

// Get detail; mahasiswa hanya boleh melihat miliknya.
func (s *ApplicationService) Get(ctx context.Context, actor Actor, id uuid.UUID) (*dto.ApplicationResponse, error) {
	app, err := s.apps.FindByID(ctx, id)
	if err != nil {
		return nil, mapRepoErr(err, "Pengajuan tidak ditemukan.")
	}
	if !actor.IsAdmin() && app.UserID != actor.ID {
		return nil, ErrForbidden("Anda tidak memiliki akses ke pengajuan ini.")
	}
	res := dto.ApplicationFromModel(app)
	return &res, nil
}

// Summary hitung status untuk dashboard mahasiswa.
func (s *ApplicationService) Summary(ctx context.Context, actor Actor) (dto.StatusSummaryResponse, error) {
	m, err := s.apps.CountByStatus(ctx, &actor.ID)
	return dto.StatusSummaryResponse(m), err
}

// OpenDocument mengembalikan stream berkas setelah cek otorisasi (PRD §19 butir 14).
func (s *ApplicationService) OpenDocument(ctx context.Context, actor Actor, docID uuid.UUID) (*model.Document, io.ReadCloser, error) {
	doc, err := s.docs.FindByID(ctx, docID)
	if err != nil {
		return nil, nil, mapRepoErr(err, "Dokumen tidak ditemukan.")
	}
	app, err := s.apps.FindByID(ctx, doc.ApplicationID)
	if err != nil {
		return nil, nil, mapRepoErr(err, "Pengajuan tidak ditemukan.")
	}
	if !actor.IsAdmin() && app.UserID != actor.ID {
		return nil, nil, ErrForbidden("Anda tidak memiliki akses ke dokumen ini.")
	}
	rc, err := s.store.Get(ctx, doc.FilePath)
	if err != nil {
		return nil, nil, ErrNotFound("Berkas tidak ditemukan di penyimpanan.")
	}
	return doc, rc, nil
}

// ---------- internal ----------

// ownedEditable memuat pengajuan milik actor yang masih boleh diubah.
func (s *ApplicationService) ownedEditable(ctx context.Context, tx *gorm.DB, actor Actor, id uuid.UUID) (*model.Application, error) {
	app, err := s.apps.FindByIDTx(ctx, tx, id)
	if err != nil {
		return nil, mapRepoErr(err, "Pengajuan tidak ditemukan.")
	}
	if app.UserID != actor.ID {
		return nil, ErrForbidden("Anda tidak memiliki akses ke pengajuan ini.")
	}
	if app.Status != model.StatusDraft && app.Status != model.StatusPerluPerbaikan {
		return nil, ErrConflict("Pengajuan tidak dapat diubah pada status saat ini.")
	}
	return app, nil
}

// rejectDuplicate menolak pengiriman bila mahasiswa sudah punya pengajuan sejenis dengan
// identitas (duplicateKeyFields) yang sama dan belum ditolak.
func (s *ApplicationService) rejectDuplicate(ctx context.Context, tx *gorm.DB, app *model.Application) error {
	keys := duplicateKeyFields[app.LetterType.Code]
	if len(keys) == 0 {
		return nil
	}
	data := dto.ApplicationDataMap(app)
	ident := make(map[string]string, len(keys))
	for _, k := range keys {
		ident[k] = strings.TrimSpace(data[k])
	}
	dup, err := s.apps.FindDuplicate(ctx, tx, app.UserID, app.LetterTypeID, app.ID, ident)
	if err != nil {
		return err
	}
	if dup == nil {
		return nil
	}
	parts := make([]string, 0, len(keys))
	for _, k := range keys {
		parts = append(parts, ident[k])
	}
	return ErrConflict(fmt.Sprintf(
		"Anda sudah memiliki pengajuan %s dengan data yang sama (%s): %s, status %s. Pengajuan ganda tidak diperbolehkan.",
		app.LetterType.Name, strings.Join(parts, " "), dup.ApplicationNumber, statusLabel(dup.Status),
	))
}

func statusLabel(s model.ApplicationStatus) string {
	switch s {
	case model.StatusMenungguVerifikasi:
		return "Menunggu Verifikasi"
	case model.StatusPerluPerbaikan:
		return "Perlu Perbaikan"
	case model.StatusDisetujui:
		return "Disetujui"
	case model.StatusDiproses:
		return "Sedang Diproses"
	case model.StatusSiapDiambil:
		return "Siap Diambil"
	case model.StatusSelesai:
		return "Selesai"
	default:
		return string(s)
	}
}

func (s *ApplicationService) validateComplete(app *model.Application) error {
	data := dto.ApplicationDataMap(app)
	var missing []string
	for _, f := range requiredFields[app.LetterType.Code] {
		if strings.TrimSpace(data[f]) == "" {
			missing = append(missing, f)
		}
	}
	if len(missing) > 0 {
		return ErrBadRequest("Data belum lengkap: " + strings.Join(missing, ", "))
	}
	have := map[string]bool{}
	for _, d := range app.Documents {
		have[d.DocumentType] = true
	}
	for _, d := range requiredDocs[app.LetterType.Code] {
		if !have[d] {
			return ErrBadRequest("Dokumen wajib belum diunggah: " + d)
		}
	}
	return nil
}

func (s *ApplicationService) notifyAdmins(app *model.Application, actor Actor, resubmit bool) {
	evName := "application.created"
	msg := fmt.Sprintf("Pengajuan baru %s dari %s.", app.LetterType.Name, actor.Name)
	if resubmit {
		evName = "application.status.updated"
		msg = fmt.Sprintf("%s mengirim ulang pengajuan %s.", actor.Name, app.LetterType.Name)
	}
	s.hub.SendToRole(string(model.RoleAdmin), ws.Event{Event: evName, Data: ws.StatusPayload{
		ApplicationID: app.ID, ApplicationNumber: app.ApplicationNumber,
		Status: string(app.Status), Message: msg,
	}})
}

func (s *ApplicationService) getResponse(ctx context.Context, id uuid.UUID) (*dto.ApplicationResponse, error) {
	app, err := s.apps.FindByID(ctx, id)
	if err != nil {
		return nil, mapRepoErr(err, "Pengajuan tidak ditemukan.")
	}
	res := dto.ApplicationFromModel(app)
	return &res, nil
}

func detectMime(head []byte) string {
	if len(head) >= 5 && string(head[:5]) == "%PDF-" {
		return "application/pdf"
	}
	return "application/octet-stream"
}

func sanitizeFilename(name string) string {
	base := filepath.Base(name)
	var b strings.Builder
	for _, r := range base {
		switch {
		case r >= 'a' && r <= 'z', r >= 'A' && r <= 'Z', r >= '0' && r <= '9', r == '.', r == '-', r == '_':
			b.WriteRune(r)
		default:
			b.WriteRune('_')
		}
	}
	out := b.String()
	if out == "" || out == "." {
		out = "file.pdf"
	}
	return out
}
