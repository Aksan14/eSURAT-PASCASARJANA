package service

import (
	"bytes"
	"context"
	"fmt"
	"io"
	"math"
	"strings"
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"

	"github.com/pascasarjana-unismuh/persuratan-backend/internal/config"
	"github.com/pascasarjana-unismuh/persuratan-backend/internal/dto"
	"github.com/pascasarjana-unismuh/persuratan-backend/internal/model"
	"github.com/pascasarjana-unismuh/persuratan-backend/internal/pdf"
	"github.com/pascasarjana-unismuh/persuratan-backend/internal/repository"
	"github.com/pascasarjana-unismuh/persuratan-backend/internal/storage"
	ws "github.com/pascasarjana-unismuh/persuratan-backend/internal/websocket"
)

// transitions mendefinisikan state machine status (PRD §5–6).
var transitions = map[model.ApplicationStatus][]model.ApplicationStatus{
	model.StatusMenungguVerifikasi: {model.StatusDisetujui, model.StatusPerluPerbaikan, model.StatusDitolak},
	model.StatusDisetujui:          {model.StatusDiproses},
	model.StatusDiproses:           {model.StatusSiapDiambil},
	model.StatusSiapDiambil:        {model.StatusSelesai},
}

func canTransition(from, to model.ApplicationStatus) bool {
	for _, t := range transitions[from] {
		if t == to {
			return true
		}
	}
	return false
}

// AdminService: verifikasi, perubahan status, generate & cetak surat.
type AdminService struct {
	db        *gorm.DB
	apps      *repository.ApplicationRepository
	histories *repository.StatusHistoryRepository
	notifs    *repository.NotificationRepository
	audit     *repository.AuditLogRepository
	store     storage.Storage
	hub       *ws.Hub
	pdf       pdf.Generator
	letterCfg config.LetterConfig
}

type AdminServiceDeps struct {
	DB        *gorm.DB
	Apps      *repository.ApplicationRepository
	Histories *repository.StatusHistoryRepository
	Notifs    *repository.NotificationRepository
	Audit     *repository.AuditLogRepository
	Store     storage.Storage
	Hub       *ws.Hub
	PDF       pdf.Generator
	LetterCfg config.LetterConfig
}

func NewAdminService(d AdminServiceDeps) *AdminService {
	return &AdminService{
		db: d.DB, apps: d.Apps, histories: d.Histories, notifs: d.Notifs, audit: d.Audit,
		store: d.Store, hub: d.Hub, pdf: d.PDF, letterCfg: d.LetterCfg,
	}
}

func (s *AdminService) List(ctx context.Context, q dto.AdminListQuery) (*dto.AdminApplicationListResponse, error) {
	if q.Page < 1 {
		q.Page = 1
	}
	if q.PerPage < 1 {
		q.PerPage = 20
	}
	as, total, err := s.apps.ListAdmin(ctx, repository.AdminFilter{
		Query: q.Q, Statuses: q.Statuses(), LetterCode: q.LetterCode,
		DateFrom: q.DateFrom, DateTo: q.DateTo, Page: q.Page, PerPage: q.PerPage,
	})
	if err != nil {
		return nil, err
	}
	return &dto.AdminApplicationListResponse{
		Items: dto.ApplicationsFromModel(as),
		Meta: dto.Pagination{
			Page: q.Page, PerPage: q.PerPage, Total: total,
			TotalPages: int(math.Ceil(float64(total) / float64(q.PerPage))),
		},
	}, nil
}

func (s *AdminService) Get(ctx context.Context, id uuid.UUID) (*dto.ApplicationResponse, error) {
	app, err := s.apps.FindByID(ctx, id)
	if err != nil {
		return nil, mapRepoErr(err, "Pengajuan tidak ditemukan.")
	}
	res := dto.ApplicationFromModel(app)
	if app.LetterNumber == "" && app.Status != model.StatusDraft && app.Status != model.StatusDitolak {
		res.LetterNumberSuggestion, _ = s.suggestLetterNumber(ctx, app)
	}
	return &res, nil
}

// suggestLetterNumber mengusulkan nomor surat berikutnya: pola @format-nomor dibaca dari
// template jenis surat (mis. "{urut}/A.4-I/{bulan}/{tahun-h}/{tahun-m}"). Nomor urut
// berjalan **per kode unit** (segmen kedua, mis. A.4-I dipakai bersama SKK & SKL) dan mulai
// dari 0001 setiap tahun Masehi (= urutan tertinggi kode itu pada tahun berjalan + 1).
// tx opsional agar dapat dihitung di dalam transaksi yang sudah memegang advisory lock.
func (s *AdminService) suggestLetterNumber(ctx context.Context, app *model.Application) (string, error) {
	return s.suggestLetterNumberTx(ctx, nil, app)
}

func (s *AdminService) suggestLetterNumberTx(ctx context.Context, tx *gorm.DB, app *model.Application) (string, error) {
	now := time.Now()
	format := s.pdf.NumberFormat(app.LetterType.Code)
	nums, err := s.apps.LetterNumbersInYear(ctx, tx, pdf.UnitCodeOf(format), now.Year())
	if err != nil {
		return "", err
	}
	maxSeq := 0
	for _, n := range nums {
		if q := pdf.SequenceOf(n); q > maxSeq {
			maxSeq = q
		}
	}
	return pdf.FormatLetterNumber(format, maxSeq+1, now), nil
}

func (s *AdminService) Summary(ctx context.Context) (dto.StatusSummaryResponse, error) {
	m, err := s.apps.CountByStatus(ctx, nil)
	return dto.StatusSummaryResponse(m), err
}

// Stats: data grafik & indikator dashboard admin.
func (s *AdminService) Stats(ctx context.Context) (*dto.AdminStatsResponse, error) {
	now := time.Now()
	startOfToday := time.Date(now.Year(), now.Month(), now.Day(), 0, 0, 0, 0, now.Location())
	since := time.Date(now.Year(), now.Month(), 1, 0, 0, 0, 0, now.Location()).AddDate(0, -11, 0)

	monthlyRows, err := s.apps.MonthlyCounts(ctx, since)
	if err != nil {
		return nil, err
	}
	byMonth := map[string]repository.MonthlyCount{}
	for _, r := range monthlyRows {
		byMonth[r.Month] = r
	}
	monthly := make([]dto.MonthlyStat, 0, 12)
	for i := 0; i < 12; i++ {
		m := since.AddDate(0, i, 0).Format("2006-01")
		r := byMonth[m]
		monthly = append(monthly, dto.MonthlyStat{Month: m, Submitted: r.Submitted, Completed: r.Completed})
	}

	types, err := s.apps.CountByLetterType(ctx)
	if err != nil {
		return nil, err
	}
	byType := make([]dto.LetterTypeStat, 0, len(types))
	for _, t := range types {
		byType = append(byType, dto.LetterTypeStat{Code: t.Code, Name: t.Name, Count: t.Count})
	}

	today, err := s.apps.CountSubmittedSince(ctx, startOfToday)
	if err != nil {
		return nil, err
	}
	week, err := s.apps.CountSubmittedSince(ctx, startOfToday.AddDate(0, 0, -6))
	if err != nil {
		return nil, err
	}
	avg, err := s.apps.AvgProcessDays(ctx)
	if err != nil {
		return nil, err
	}
	counts, err := s.apps.CountByStatus(ctx, nil)
	if err != nil {
		return nil, err
	}
	var rate float64
	if d := counts[model.StatusSelesai] + counts[model.StatusDitolak]; d > 0 {
		rate = float64(counts[model.StatusSelesai]) / float64(d)
	}

	return &dto.AdminStatsResponse{
		Monthly: monthly, ByLetterType: byType, Today: today, ThisWeek: week,
		AvgProcessDays: avg, CompletionRate: rate,
	}, nil
}

// ---------- transisi status ----------

type transitionOpts struct {
	to      model.ApplicationStatus
	note    string
	title   string
	message func(*model.Application) string
	event   string
	before  func(tx *gorm.DB, a *model.Application) error // validasi tambahan di dalam transaksi
	mutate  func(*model.Application)
	action  string
	ip      string
}

// transition menjalankan satu langkah state machine dalam satu transaksi:
// validasi transisi → ubah status → history → notifikasi → audit → push WS.
func (s *AdminService) transition(ctx context.Context, actor Actor, id uuid.UUID, o transitionOpts) (*dto.ApplicationResponse, error) {
	var app *model.Application
	err := s.db.Transaction(func(tx *gorm.DB) error {
		var err error
		app, err = s.apps.FindByIDTx(ctx, tx, id)
		if err != nil {
			return mapRepoErr(err, "Pengajuan tidak ditemukan.")
		}
		if !canTransition(app.Status, o.to) {
			return ErrConflict(fmt.Sprintf("Transisi %s → %s tidak diizinkan.", app.Status, o.to))
		}
		if o.before != nil {
			if err := o.before(tx, app); err != nil {
				return err
			}
		}
		if o.mutate != nil {
			o.mutate(app)
		}
		app.Status = o.to
		if err := s.apps.Save(ctx, tx, app); err != nil {
			return err
		}
		if err := s.histories.Create(ctx, tx, &model.StatusHistory{
			ApplicationID: app.ID, Status: o.to, Note: o.note,
			ChangedBy: actor.ID, ChangedByName: actor.Name,
		}); err != nil {
			return err
		}
		appID := app.ID
		if err := s.notifs.Create(ctx, tx, &model.Notification{
			UserID: app.UserID, ApplicationID: &appID, Title: o.title, Message: o.message(app),
		}); err != nil {
			return err
		}
		return s.audit.Create(ctx, tx, &model.AuditLog{
			ActorID: actor.ID, Action: o.action, TargetID: &appID,
			Detail: fmt.Sprintf("%s → %s; %s", app.ApplicationNumber, o.to, o.note), IP: o.ip,
		})
	})
	if err != nil {
		return nil, err
	}

	s.hub.SendToUser(app.UserID, ws.Event{Event: o.event, Data: ws.StatusPayload{
		ApplicationID: app.ID, ApplicationNumber: app.ApplicationNumber,
		Status: string(app.Status), Message: o.message(app),
	}})
	return s.Get(ctx, id)
}

func (s *AdminService) Approve(ctx context.Context, actor Actor, id uuid.UUID, ip string) (*dto.ApplicationResponse, error) {
	return s.transition(ctx, actor, id, transitionOpts{
		to: model.StatusDisetujui, title: "Pengajuan disetujui",
		event: "application.approved", action: "application.approve", ip: ip,
		message: func(a *model.Application) string {
			return fmt.Sprintf("Pengajuan %s Anda telah disetujui.", a.LetterType.Name)
		},
		mutate: func(a *model.Application) { a.AdminNote = "" },
	})
}

func (s *AdminService) RequestRevision(ctx context.Context, actor Actor, id uuid.UUID, req dto.NoteRequest, ip string) (*dto.ApplicationResponse, error) {
	note := strings.TrimSpace(req.Note)
	return s.transition(ctx, actor, id, transitionOpts{
		to: model.StatusPerluPerbaikan, note: note, title: "Pengajuan membutuhkan perbaikan",
		event: "application.revision.required", action: "application.revision", ip: ip,
		message: func(a *model.Application) string {
			return fmt.Sprintf("Pengajuan %s membutuhkan perbaikan. Silakan periksa catatan admin.", a.LetterType.Name)
		},
		mutate: func(a *model.Application) { a.AdminNote = note },
	})
}

func (s *AdminService) Reject(ctx context.Context, actor Actor, id uuid.UUID, req dto.NoteRequest, ip string) (*dto.ApplicationResponse, error) {
	reason := strings.TrimSpace(req.Note)
	return s.transition(ctx, actor, id, transitionOpts{
		to: model.StatusDitolak, note: reason, title: "Pengajuan ditolak",
		event: "application.status.updated", action: "application.reject", ip: ip,
		message: func(a *model.Application) string {
			return fmt.Sprintf("Pengajuan %s Anda ditolak. Lihat alasan penolakan.", a.LetterType.Name)
		},
		mutate: func(a *model.Application) { a.AdminNote = reason },
	})
}

// Process: DISETUJUI → DIPROSES. Menetapkan nomor surat dan merender PDF dari template
// agar admin dapat mencetaknya untuk ditandatangani & distempel pimpinan.
// POST /api/admin/applications/:id/process
func (s *AdminService) Process(ctx context.Context, actor Actor, id uuid.UUID, req dto.ProcessRequest, ip string) (*dto.ApplicationResponse, error) {
	letterNumber := strings.TrimSpace(req.LetterNumber)
	app, err := s.apps.FindByID(ctx, id)
	if err != nil {
		return nil, mapRepoErr(err, "Pengajuan tidak ditemukan.")
	}
	if app.Status != model.StatusDisetujui {
		return nil, ErrConflict("Surat hanya dapat diproses pada status Disetujui.")
	}
	if letterNumber == "" {
		return nil, ErrBadRequest("Nomor surat wajib diisi.")
	}
	// Nomor surat harus unik. Dicek dulu di luar transaksi agar PDF tidak dibuat sia-sia,
	// lalu dicek ulang di dalam transaksi dengan advisory lock per kode unit (anti balapan).
	unit := pdf.UnitCodeOf(letterNumber)
	ensureUnique := func(tx *gorm.DB) error {
		if err := s.apps.LockLetterNumbering(ctx, tx, unit); err != nil {
			return err
		}
		taken, err := s.apps.LetterNumberExists(ctx, tx, letterNumber, app.ID)
		if err != nil {
			return err
		}
		if taken {
			next, _ := s.suggestLetterNumberTx(ctx, tx, app)
			return ErrConflict(fmt.Sprintf("Nomor surat %s sudah dipakai surat lain. Nomor berikutnya yang tersedia: %s.", letterNumber, next))
		}
		return nil
	}
	if err := s.db.Transaction(ensureUnique); err != nil {
		return nil, err
	}
	b, err := s.pdf.Generate(ctx, buildLetterData(app, letterNumber, s.letterCfg))
	if err != nil {
		return nil, fmt.Errorf("generate pdf: %w", err)
	}
	key := fmt.Sprintf("letters/%s/%s.pdf", app.ID, app.ApplicationNumber)
	path, err := s.store.Put(ctx, key, bytes.NewReader(b), int64(len(b)), "application/pdf")
	if err != nil {
		return nil, err
	}

	return s.transition(ctx, actor, id, transitionOpts{
		to: model.StatusDiproses, title: "Surat sedang diproses", note: "Nomor surat: " + letterNumber,
		event: "application.status.updated", action: "application.process", ip: ip,
		before: func(tx *gorm.DB, _ *model.Application) error { return ensureUnique(tx) },
		message: func(a *model.Application) string {
			return fmt.Sprintf("Surat %s Anda sedang diproses (pencetakan, tanda tangan, dan stempel).", a.LetterType.Name)
		},
		mutate: func(a *model.Application) {
			now := time.Now()
			a.ProcessedAt = &now
			a.LetterNumber = letterNumber
			a.LetterFilePath = path
		},
	})
}

// MarkReady: DIPROSES → SIAP_DIAMBIL. Dipanggil setelah surat fisik selesai ditandatangani
// dan distempel; mahasiswa menerima notifikasi untuk mengambil surat.
// POST /api/admin/applications/:id/ready
func (s *AdminService) MarkReady(ctx context.Context, actor Actor, id uuid.UUID, ip string) (*dto.ApplicationResponse, error) {
	return s.transition(ctx, actor, id, transitionOpts{
		to: model.StatusSiapDiambil, title: "Surat siap diambil",
		event: "application.status.updated", action: "application.ready", ip: ip,
		message: func(a *model.Application) string {
			return fmt.Sprintf("Surat %s Anda sudah siap diambil di Bagian Administrasi Pascasarjana.", a.LetterType.Name)
		},
	})
}

func (s *AdminService) Complete(ctx context.Context, actor Actor, id uuid.UUID, ip string) (*dto.ApplicationResponse, error) {
	return s.transition(ctx, actor, id, transitionOpts{
		to: model.StatusSelesai, title: "Surat selesai",
		event: "application.completed", action: "application.complete", ip: ip,
		message: func(a *model.Application) string {
			return fmt.Sprintf("Pengajuan %s Anda telah selesai.", a.LetterType.Name)
		},
		mutate: func(a *model.Application) { now := time.Now(); a.CompletedAt = &now },
	})
}

// Print mengembalikan PDF surat: berkas tersimpan bila ada, atau render ulang (pratinjau).
// GET /api/admin/applications/:id/print
func (s *AdminService) Print(ctx context.Context, id uuid.UUID, q dto.PrintQuery) (string, io.ReadCloser, error) {
	app, err := s.apps.FindByID(ctx, id)
	if err != nil {
		return "", nil, mapRepoErr(err, "Pengajuan tidak ditemukan.")
	}
	filename := app.ApplicationNumber + ".pdf"
	if app.LetterFilePath != "" {
		if rc, err := s.store.Get(ctx, app.LetterFilePath); err == nil {
			return filename, rc, nil
		}
	}
	switch app.Status {
	case model.StatusDisetujui, model.StatusDiproses, model.StatusSiapDiambil, model.StatusSelesai:
	default:
		return "", nil, ErrConflict("Surat belum dapat dicetak pada status saat ini.")
	}
	// Nomor pada pratinjau: nomor tersimpan (ditetapkan saat disetujui) → nomor dari query → usulan sistem.
	number := app.LetterNumber
	if q.LetterNumber != "" {
		number = q.LetterNumber
	}
	if number == "" {
		number, _ = s.suggestLetterNumber(ctx, app)
	}
	b, err := s.pdf.Generate(ctx, buildLetterData(app, number, s.letterCfg))
	if err != nil {
		return "", nil, err
	}
	return "preview-" + filename, io.NopCloser(bytes.NewReader(b)), nil
}
