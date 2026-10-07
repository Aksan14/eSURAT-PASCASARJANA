package pdf

import (
	"fmt"
	"math"
	"strings"
	"time"
)

// ---------------------------------------------------------------------------
// Kalender Hijriah (tabular / aritmetik, epoch 16 Juli 622 M Julian).
// Akurat ±1 hari terhadap rukyat; cukup untuk penanggalan surat.
// ---------------------------------------------------------------------------

var bulanHijriah = []string{"", "Muharram", "Safar", "Rabiul Awal", "Rabiul Akhir",
	"Jumadil Awal", "Jumadil Akhir", "Rajab", "Sya'ban", "Ramadhan", "Syawal",
	"Dzulqa'dah", "Dzulhijjah"}

const hijriEpochJD = 1948439.5 // 1 Muharram 1 H

func julianDay(t time.Time) float64 {
	y, m, d := t.Year(), int(t.Month()), t.Day()
	if m <= 2 {
		y--
		m += 12
	}
	a := math.Floor(float64(y) / 100)
	b := 2 - a + math.Floor(a/4)
	return math.Floor(365.25*float64(y+4716)) + math.Floor(30.6001*float64(m+1)) + float64(d) + b - 1524.5
}

// ToHijriah mengonversi tanggal Masehi ke (tahun, bulan, hari) Hijriah.
func ToHijriah(t time.Time) (year, month, day int) {
	jd := math.Floor(julianDay(t)) + 0.5
	days := jd - hijriEpochJD
	year = int(math.Floor((30*days + 10646) / 10631))
	startOfYear := hijriEpochJD + math.Floor((10631*float64(year)-10617)/30)
	dayOfYear := jd - startOfYear + 1
	month = int(math.Min(12, math.Ceil(dayOfYear/29.5)))
	startOfMonth := startOfYear + math.Ceil(29.5*float64(month-1))
	day = int(jd-startOfMonth) + 1
	if day < 1 {
		month--
		if month < 1 {
			month = 12
			year--
			startOfYear = hijriEpochJD + math.Floor((10631*float64(year)-10617)/30)
		}
		startOfMonth = startOfYear + math.Ceil(29.5*float64(month-1))
		day = int(jd-startOfMonth) + 1
	}
	return
}

// FormatHijriah → "15 Syawal 1445".
func FormatHijriah(t time.Time) string {
	y, m, d := ToHijriah(t)
	return fmt.Sprintf("%d %s %d", d, bulanHijriah[m], y)
}

// FormatHijriahISO menerima "2006-01-02".
func FormatHijriahISO(s string) string {
	t, err := time.Parse("2006-01-02", s)
	if err != nil {
		return s
	}
	return FormatHijriah(t)
}

// ---------------------------------------------------------------------------
// Terbilang untuk IPK: "3.91" → "Tiga Koma Sembilan Satu"
// ---------------------------------------------------------------------------

var angkaKata = []string{"Nol", "Satu", "Dua", "Tiga", "Empat", "Lima", "Enam", "Tujuh", "Delapan", "Sembilan"}

// TerbilangDesimal mengeja tiap digit; pemisah "." atau "," dibaca "Koma".
func TerbilangDesimal(s string) string {
	var out []string
	for _, r := range strings.TrimSpace(s) {
		switch {
		case r >= '0' && r <= '9':
			out = append(out, angkaKata[r-'0'])
		case r == '.' || r == ',':
			out = append(out, "Koma")
		}
	}
	return strings.Join(out, " ")
}

// ProgramPendidikan menurunkan jenjang dari nama program studi.
func ProgramPendidikan(programStudi string) string {
	p := strings.ToLower(programStudi)
	switch {
	case strings.HasPrefix(p, "doktor"), strings.Contains(p, "(s3)"), strings.Contains(p, "s-3"):
		return "Strata Tiga (S.3)"
	default:
		return "Strata Dua (S.2)"
	}
}
