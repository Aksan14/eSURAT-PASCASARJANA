package pdf

import (
	"testing"
	"time"
)

func TestNumberFormatFromTemplates(t *testing.T) {
	l := newLoader(t)
	want := map[string]string{
		"SKK":  "{urut}/A.4-I/{bulan}/{tahun-h}/{tahun-m}",
		"SKL":  "{urut}/A.4-I/{bulan}/{tahun-h}/{tahun-m}",
		"SIPI": "{urut}/A.2-II/{bulan}/{tahun-h}/{tahun-m}",
	}
	for code, w := range want {
		if got := l.NumberFormat(code); got != w {
			t.Errorf("%s: format %q, want %q", code, got, w)
		}
	}
	if got := l.NumberFormat("TIDAK_ADA"); got != DefaultNumberFormat {
		t.Errorf("fallback: %q", got)
	}
}

func TestFormatLetterNumber(t *testing.T) {
	// 24 April 2024 = Syawal 1445 (tanggal pada template resmi SKK: 0631/A.4-I/IV/1445/2024)
	d := time.Date(2024, 4, 24, 0, 0, 0, 0, time.UTC)
	got := FormatLetterNumber("{urut}/A.4-I/{bulan}/{tahun-h}/{tahun-m}", 631, d)
	if got != "0631/A.4-I/IV/1445/2024" {
		t.Errorf("got %q", got)
	}
}

func TestSequenceOf(t *testing.T) {
	cases := map[string]int{"0631/A.4-I/IV/1445/2024": 631, " 1253/A.2-II/X/1448/2026": 1253, "abc/x": 0, "": 0}
	for in, want := range cases {
		if got := SequenceOf(in); got != want {
			t.Errorf("%q: %d, want %d", in, got, want)
		}
	}
}
