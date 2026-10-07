package pdf

import (
	"bytes"
	"context"
	"os"
	"strings"
	"testing"
	"time"

	"github.com/pascasarjana-unismuh/persuratan-backend/templates"
)

func sampleData(code string) LetterData {
	return LetterData{
		KodeSurat: code, JenisSurat: map[string]string{
			"SKK": "Surat Keterangan Kuliah", "SKL": "Surat Keterangan Lulus", "SIPI": "Surat Pengantar Izin Penelitian",
		}[code],
		NomorSurat: "0631/A.4-I/IV/1445/2024", NomorAjuan: code + "-20261006-0001",
		TanggalSurat: "24 April 2024", TanggalHijriah: "15 Syawal 1445",
		Nama: "Rahmania Hafsari HS.", NIM: "105041103220",
		ProgramStudi: "Magister Pendidikan Bahasa dan Sastra Indonesia", ProgramPendidikan: "Strata Dua (S.2)",
		Fakultas: "Program Pascasarjana", TempatLahir: "Salumanurung", TanggalLahir: "15 Agustus 1998",
		TempatTanggalLahir: "Salumanurung, 15 Agustus 1998",
		Data: map[string]string{
			"semester": "Genap", "tahunAjaran": "2023-2024",
			"tanggalYudisium": "2024-05-25", "ipk": "3.91", "predikatKelulusan": "Sangat Memuaskan",
			"judulTesis":  "Analisis Makna Simbol Tradisi Adat Maudu' Lompoa di Cikoang (Kajian Semiotika)",
			"tujuanSurat": "Ketua LP3M Universitas Muhammadiyah Makassar", "kotaTujuan": "Makassar",
		},
		Instansi: Instansi{
			Yayasan: "Majelis Pendidikan Tinggi Pimpinan Pusat Muhammadiyah", Universitas: "Universitas Muhammadiyah Makassar",
			Unit: "Program Pascasarjana", Alamat: "Jl. Sultan Alauddin No. 259", Telepon: "(0411) 866 972 – 5047085",
			Fax: "(0411) 865 588", Kota: "Makassar", KodePos: "90221",
		},
		Penandatangan: Penandatangan{Jabatan: "Direktur,", Nama: "Prof. Dr. H. Irwan Akib, M.Pd.", NomorInduk: "613 949"},
	}
}

func newLoader(t *testing.T) *TemplateLoader {
	t.Helper()
	l, err := NewTemplateLoader(templates.FS, "")
	if err != nil {
		t.Fatal(err)
	}
	return l
}

func TestHijriah(t *testing.T) {
	// Acuan dari template resmi: 24 April 2024 M = 15 Syawal 1445 H; 11 Juli 2024 = 05 Muharram 1446.
	cases := []struct{ g, want string }{
		{"2024-04-24", "Syawal 1445"},
		{"2024-07-11", "Muharram 1446"},
		{"2024-07-23", "Muharram 1446"},
	}
	for _, c := range cases {
		d, _ := time.Parse("2006-01-02", c.g)
		if got := FormatHijriah(d); !strings.Contains(got, c.want) {
			t.Errorf("%s → %s, ingin memuat %s", c.g, got, c.want)
		}
	}
}

func TestTerbilang(t *testing.T) {
	if got := TerbilangDesimal("3.91"); got != "Tiga Koma Sembilan Satu" {
		t.Errorf("terbilang 3.91 = %q", got)
	}
}

func TestRenderPlaceholders(t *testing.T) {
	l := newLoader(t)
	out, err := l.Render("SKK", sampleData("SKK"))
	if err != nil {
		t.Fatal(err)
	}
	for _, want := range []string{"SURAT KETERANGAN KULIAH", "0631/A.4-I/IV/1445/2024", "Rahmania Hafsari HS.",
		"Salumanurung, 15 Agustus 1998", "105041103220", "Strata Dua (S.2)", "semester Genap Tahun Ajaran 2023-2024"} {
		if !strings.Contains(out, want) {
			t.Errorf("SKK tidak memuat %q", want)
		}
	}

	out, err = l.Render("SKL", sampleData("SKL"))
	if err != nil {
		t.Fatal(err)
	}
	for _, want := range []string{"25 Mei 2024", "3.91 ( Tiga Koma Sembilan Satu )", "Sangat Memuaskan", "Judul Tesis"} {
		if !strings.Contains(out, want) {
			t.Errorf("SKL tidak memuat %q", want)
		}
	}

	out, err = l.Render("SIPI", sampleData("SIPI"))
	if err != nil {
		t.Fatal(err)
	}
	for _, want := range []string{"@hal: Pengantar Izin Penelitian", "Ketua LP3M", "@di: Makassar", "Assalamu Alaikum", "surat izin penelitian"} {
		if !strings.Contains(out, want) {
			t.Errorf("SIPI tidak memuat %q", want)
		}
	}

	ttd, _ := l.Render("_ttd", sampleData("SIPI"))
	if strings.Contains(ttd, "1445 H") {
		t.Error("SIPI: tanggal seharusnya tidak di blok ttd (sudah di kepala surat)")
	}
	ttd, _ = l.Render("_ttd", sampleData("SKK"))
	if !strings.Contains(ttd, "15 Syawal 1445 H") || !strings.Contains(ttd, "NBM : 613 949") {
		t.Errorf("SKK ttd salah:\n%s", ttd)
	}
}

func TestAssets(t *testing.T) {
	l := newLoader(t)
	for _, a := range []string{"kop-logo-unismuh.png", "kop-badge-unggul.png", "kop-basmalah.png"} {
		if _, ok := l.Asset(a); !ok {
			t.Errorf("aset %s tidak ter-embed", a)
		}
	}
}

func TestGenerateAllTemplates(t *testing.T) {
	gen := NewTemplateGenerator(newLoader(t))
	for _, code := range []string{"SKK", "SKL", "SIPI"} {
		b, err := gen.Generate(context.Background(), sampleData(code))
		if err != nil {
			t.Fatalf("%s: %v", code, err)
		}
		if !bytes.HasPrefix(b, []byte("%PDF-")) || len(b) < 1000 {
			t.Errorf("%s: output bukan PDF valid (%d bytes)", code, len(b))
		}
		if dir := os.Getenv("PDF_OUT"); dir != "" {
			_ = os.WriteFile(dir+"/"+code+".pdf", b, 0o644)
		}
	}
}

func TestMissingTemplate(t *testing.T) {
	l := newLoader(t)
	if _, err := l.Render("TIDAK_ADA", sampleData("X")); err == nil {
		t.Error("render template yang tidak ada harus error")
	}
}
