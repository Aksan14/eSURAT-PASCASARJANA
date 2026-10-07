package service

import (
	"time"

	"github.com/pascasarjana-unismuh/persuratan-backend/internal/config"
	"github.com/pascasarjana-unismuh/persuratan-backend/internal/dto"
	"github.com/pascasarjana-unismuh/persuratan-backend/internal/model"
	"github.com/pascasarjana-unismuh/persuratan-backend/internal/pdf"
)

// buildLetterData memetakan pengajuan + konfigurasi institusi menjadi
// placeholder template surat (pdf.LetterData). Satu-satunya tempat
// pengetahuan "field mana jadi placeholder apa".
func buildLetterData(app *model.Application, letterNumber string, cfg config.LetterConfig) pdf.LetterData {
	d := pdf.LetterData{
		KodeSurat:      app.LetterType.Code,
		JenisSurat:     app.LetterType.Name,
		NomorSurat:     letterNumber,
		NomorAjuan:     app.ApplicationNumber,
		TanggalSurat:   pdf.FormatTanggal(time.Now()),
		TanggalHijriah: pdf.FormatHijriah(time.Now()),
		Nama:           app.User.Name,
		NIM:            app.User.NIM,
		Data:           dto.ApplicationDataMap(app),
		Instansi: pdf.Instansi{
			Yayasan:     cfg.Yayasan,
			Universitas: cfg.Universitas,
			Unit:        cfg.Unit,
			Alamat:      cfg.Alamat,
			Telepon:     cfg.Telepon,
			Fax:         cfg.Fax,
			Website:     cfg.Website,
			Kota:        cfg.Kota,
			KodePos:     cfg.KodePos,
		},
		Penandatangan: pdf.Penandatangan{
			Jabatan:    cfg.SignerTitle,
			Nama:       cfg.SignerName,
			NomorInduk: cfg.SignerIDNumber,
		},
	}
	if d.NomorSurat == "" {
		d.NomorSurat = "…/A.4-I/…/…"
	}
	if p := app.User.Profile; p != nil {
		d.Nama = p.Nama
		d.NIM = p.NIM
		d.ProgramStudi = p.ProgramStudi
		d.ProgramPendidikan = pdf.ProgramPendidikan(p.ProgramStudi)
		d.Fakultas = p.Fakultas
		d.TempatLahir = p.TempatLahir
		d.TanggalLahir = pdf.FormatTanggalPtr(p.TanggalLahir)
		d.Alamat = p.Alamat
		d.NomorTelepon = p.NomorTelepon
		d.Email = p.Email
		if p.TempatLahir != "" {
			d.TempatTanggalLahir = p.TempatLahir + ", " + d.TanggalLahir
		} else {
			d.TempatTanggalLahir = d.TanggalLahir
		}
	}
	// Field kontak yang diisi mahasiswa pada form menimpa nilai profil.
	if v := d.Data["alamat"]; v != "" {
		d.Alamat = v
	}
	if v := d.Data["nomorTelepon"]; v != "" {
		d.NomorTelepon = v
	}
	if v := d.Data["email"]; v != "" {
		d.Email = v
	}
	return d
}
