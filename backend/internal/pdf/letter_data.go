package pdf

import (
	"fmt"
	"time"
)

// LetterData adalah kontrak placeholder yang dapat dipakai di template surat.
// Nama field = nama placeholder, mis. {{ .Nama }}, {{ .Data.semester }}.
type LetterData struct {
	// --- identitas surat ---
	KodeSurat      string // SKK | SKL | SIPI → menentukan file template
	JenisSurat     string // "Surat Keterangan Kuliah"
	NomorSurat     string // "0631/A.4-I/IV/1445/2024"
	NomorAjuan     string // "SKK-20261006-0001"
	TanggalSurat   string // "24 April 2024" (Masehi, sudah diformat)
	TanggalHijriah string // "15 Syawal 1445"

	// --- mahasiswa (dari profil) ---
	Nama               string
	NIM                string
	ProgramStudi       string
	ProgramPendidikan  string // "Strata Dua (S.2)" — diturunkan dari program studi
	Fakultas           string
	TempatLahir        string
	TanggalLahir       string // sudah diformat
	TempatTanggalLahir string // "Makassar, 12 April 1998"
	Alamat             string
	NomorTelepon       string
	Email              string

	// --- field dinamis pengajuan: {{ .Data.<field> }} ---
	Data map[string]string

	// --- institusi & penandatangan (dari konfigurasi) ---
	Instansi      Instansi
	Penandatangan Penandatangan
}

type Instansi struct {
	Yayasan     string // "Majelis Pendidikan Tinggi PP Muhammadiyah"
	Universitas string // "Universitas Muhammadiyah Makassar"
	Unit        string // "Program Pascasarjana"
	Alamat      string // "Jl. Sultan Alauddin No. 259"
	Telepon     string // "(0411) 866 972 – 5047085"
	Fax         string // "(0411) 865 588"
	Website     string
	Kota        string // "Makassar"
	KodePos     string // "90221"
}

type Penandatangan struct {
	Jabatan    string // "Direktur," atau "an. Direktur,\nAsisten Direktur 1,"
	Nama       string
	NomorInduk string // "613 949" — dicetak sebagai "NBM : 613 949"
}

// ---- helper format tanggal Indonesia (dipakai builder & template func) ----

var bulanID = []string{"", "Januari", "Februari", "Maret", "April", "Mei", "Juni",
	"Juli", "Agustus", "September", "Oktober", "November", "Desember"}

// FormatTanggal → "06 Oktober 2026".
func FormatTanggal(t time.Time) string {
	return fmt.Sprintf("%02d %s %d", t.Day(), bulanID[int(t.Month())], t.Year())
}

// FormatTanggalPtr aman untuk nil.
func FormatTanggalPtr(t *time.Time) string {
	if t == nil {
		return "-"
	}
	return FormatTanggal(*t)
}

// FormatTanggalISO menerima "2006-01-02"; string lain dikembalikan apa adanya.
func FormatTanggalISO(s string) string {
	if s == "" {
		return "-"
	}
	t, err := time.Parse("2006-01-02", s)
	if err != nil {
		return s
	}
	return FormatTanggal(t)
}
