package pdf

import (
	"fmt"
	"io/fs"
	"strconv"
	"strings"
	"time"
)

// Penomoran surat dideklarasikan di tiap template lewat baris
//
//	@format-nomor: {urut}/A.4-I/{bulan}/{tahun-h}/{tahun-m}
//
// sehingga struktur nomor mengikuti template (bukan kode program) dan ikut
// berubah bila template diganti lewat LETTER_TEMPLATE_DIR.
//
// Token: {urut} nomor urut 4 digit · {bulan} bulan Masehi Romawi ·
// {tahun-h} tahun Hijriah · {tahun-m} tahun Masehi.

const DefaultNumberFormat = "{urut}/A.4-I/{bulan}/{tahun-h}/{tahun-m}"

var romanMonths = [...]string{"", "I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X", "XI", "XII"}

// NumberFormat membaca @format-nomor dari template mentah `letters/<code>.tmpl`.
// Mengembalikan DefaultNumberFormat bila template tidak mendeklarasikannya.
func (l *TemplateLoader) NumberFormat(code string) string {
	raw, err := fs.ReadFile(l.fsys, "letters/"+code+".tmpl")
	if err != nil {
		return DefaultNumberFormat
	}
	for _, line := range strings.Split(string(raw), "\n") {
		line = strings.TrimSpace(line)
		if v, ok := strings.CutPrefix(line, "@format-nomor:"); ok {
			if v = strings.TrimSpace(v); v != "" {
				return v
			}
		}
	}
	return DefaultNumberFormat
}

// FormatLetterNumber mengisi token format dengan urutan dan tanggal.
func FormatLetterNumber(format string, seq int, t time.Time) string {
	hy, _, _ := ToHijriah(t)
	r := strings.NewReplacer(
		"{urut}", fmt.Sprintf("%04d", seq),
		"{bulan}", romanMonths[t.Month()],
		"{tahun-h}", strconv.Itoa(hy),
		"{tahun-m}", strconv.Itoa(t.Year()),
	)
	return r.Replace(format)
}

// SequenceOf mengambil nomor urut (segmen pertama) dari nomor surat; 0 bila tidak valid.
func SequenceOf(letterNumber string) int {
	seg, _, _ := strings.Cut(strings.TrimSpace(letterNumber), "/")
	n, err := strconv.Atoi(strings.TrimSpace(seg))
	if err != nil || n < 0 {
		return 0
	}
	return n
}

// UnitCodeOf mengambil kode unit (segmen kedua) dari format atau nomor surat,
// mis. "{urut}/A.4-I/{bulan}/..." → "A.4-I". Deret nomor urut berjalan per kode unit,
// sehingga jenis surat yang berbagi kode (SKK & SKL) tidak pernah bertabrakan.
func UnitCodeOf(formatOrNumber string) string {
	parts := strings.Split(formatOrNumber, "/")
	if len(parts) < 2 {
		return ""
	}
	return strings.TrimSpace(parts[1])
}
