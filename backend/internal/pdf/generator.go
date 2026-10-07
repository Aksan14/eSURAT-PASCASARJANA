// Package pdf menghasilkan dokumen surat dari template berplaceholder.
//
//   - letter_data.go     → LetterData: seluruh placeholder yang tersedia di template
//   - calendar.go        → kalender Hijriah, terbilang IPK, jenjang pendidikan
//   - template_loader.go → memuat & merender template + aset (embedded / override dir)
//   - template_parser.go → mengurai hasil render menjadi blok (meta, paragraf, tabel)
//   - fpdf_renderer.go   → menggambar blok ke PDF A4 mengikuti tata letak surat resmi PPS
//   - generator.go       → Generator (interface) + TemplateGenerator (implementasi)
package pdf

import "context"

// Generator mengubah LetterData menjadi berkas PDF dan mengetahui pola penomoran tiap template.
type Generator interface {
	Generate(ctx context.Context, data LetterData) ([]byte, error)
	// NumberFormat: pola @format-nomor dari template kode surat (lihat letter_number.go).
	NumberFormat(code string) string
}

// TemplateGenerator merender template teks berplaceholder lalu menggambarnya via fpdf.
type TemplateGenerator struct {
	loader *TemplateLoader
}

func NewTemplateGenerator(loader *TemplateLoader) *TemplateGenerator {
	return &TemplateGenerator{loader: loader}
}

func (g *TemplateGenerator) NumberFormat(code string) string { return g.loader.NumberFormat(code) }

func (g *TemplateGenerator) Generate(ctx context.Context, data LetterData) ([]byte, error) {
	kop, err := g.loader.Render("_kop", data)
	if err != nil {
		return nil, err
	}
	body, err := g.loader.Render(data.KodeSurat, data)
	if err != nil {
		return nil, err
	}
	ttd, err := g.loader.Render("_ttd", data)
	if err != nil {
		return nil, err
	}
	footer, _ := g.loader.Render("_footer", data) // opsional

	doc := ParsedLetter{
		Kop:    parseLines(kop),
		Body:   parseBody(body),
		TTD:    parseLines(ttd),
		Footer: parseLines(footer),
	}
	return renderFPDF(doc, g.loader.Asset)
}
