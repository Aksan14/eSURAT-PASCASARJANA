package pdf

import (
	"bytes"
	"strings"

	"github.com/go-pdf/fpdf"
)

// Tata letak halaman (mm) — disetel agar menyerupai template Word resmi PPS Unismuh.
const (
	pageW       = 210.0
	pageH       = 297.0
	marginL     = 25.0
	marginR     = 20.0
	marginT     = 12.0
	marginB     = 22.0
	contentW    = pageW - marginL - marginR
	lineH       = 6.2
	fontSans    = "Helvetica" // ≈ Arial pada template
	fontSerif   = "Times"
	tableIndent = 10.0
	tableLabelW = 48.0
	colonW      = 4.0
	ttdColX     = 120.0
	ttdColW     = pageW - marginR - ttdColX
	footerY     = pageH - 16.0
)

type assetFn func(name string) ([]byte, bool)

// renderFPDF menggambar ParsedLetter ke PDF A4.
func renderFPDF(doc ParsedLetter, asset assetFn) ([]byte, error) {
	pdf := fpdf.New("P", "mm", "A4", "")
	pdf.SetMargins(marginL, marginT, marginR)
	pdf.SetAutoPageBreak(true, marginB)
	pdf.AddPage()
	tr := pdf.UnicodeTranslatorFromDescriptor("")

	drawKop(pdf, tr, doc.Kop, asset)
	drawBody(pdf, tr, doc.Body)
	drawTTD(pdf, tr, doc.TTD)
	drawFooter(pdf, tr, doc.Footer)

	var buf bytes.Buffer
	if err := pdf.Output(&buf); err != nil {
		return nil, err
	}
	return buf.Bytes(), nil
}

// ---------------------------------------------------------------------------
// Kop: logo kiri — teks tengah — badge kanan — garis ganda — basmalah
// ---------------------------------------------------------------------------

func putImage(pdf *fpdf.Fpdf, asset assetFn, name string, x, y, w, h float64) bool {
	b, ok := asset(name)
	if !ok {
		return false
	}
	pdf.RegisterImageOptionsReader(name, fpdf.ImageOptions{ImageType: "PNG"}, bytes.NewReader(b))
	pdf.ImageOptions(name, x, y, w, h, false, fpdf.ImageOptions{ImageType: "PNG"}, 0, "")
	return true
}

func drawKop(pdf *fpdf.Fpdf, tr func(string) string, lines []Line, asset assetFn) {
	top := marginT
	logoSize := 22.0
	hasLeft := putImage(pdf, asset, "kop-logo-unismuh.png", marginL, top, logoSize, logoSize)
	hasRight := putImage(pdf, asset, "kop-badge-unggul.png", pageW-marginR-18, top-1, 18, 22)

	// Teks kop di tengah halaman, pada ruang di antara logo kiri dan badge kanan.
	textX := marginL
	if hasLeft {
		textX = marginL + logoSize + 2
	}
	textR := pageW - marginR
	if hasRight {
		textR -= 20
	}
	textW := textR - textX
	pdf.SetY(top + 1)
	for _, l := range lines {
		if l.Blank {
			continue
		}
		pdf.SetX(textX)
		switch l.Level {
		case 1:
			pdf.SetFont(fontSans, "B", 13)
			pdf.CellFormat(textW, 6, tr(l.Text), "", 1, "C", false, 0, "")
		case 2:
			pdf.SetFont(fontSerif, "B", 15)
			pdf.CellFormat(textW, 7, tr(spaced(l.Text)), "", 1, "C", false, 0, "")
		default:
			pdf.SetFont(fontSans, "B", 8.5)
			pdf.CellFormat(textW, 4.5, tr(l.Text), "", 1, "C", false, 0, "")
		}
	}
	y := top + logoSize + 2.5
	pdf.SetLineWidth(0.9)
	pdf.Line(marginL, y, pageW-marginR, y)
	pdf.SetLineWidth(0.25)
	pdf.Line(marginL, y+1.3, pageW-marginR, y+1.3)

	// Basmalah di tengah
	by := y + 4
	if putImage(pdf, asset, "kop-basmalah.png", pageW/2-17, by, 34, 4.8) {
		by += 6
	}
	pdf.SetY(by + 6)
}

// spaced memberi jarak huruf ringan: "PROGRAM PASCASARJANA" → "PROGRAM  PASCASARJANA"
func spaced(s string) string { return strings.ReplaceAll(s, " ", "  ") }

// ---------------------------------------------------------------------------
// Isi surat
// ---------------------------------------------------------------------------

func drawBody(pdf *fpdf.Fpdf, tr func(string) string, body Body) {
	isDinas := body.MetaFirst("hal") != "" || body.MetaFirst("lamp") != "" || len(body.Meta["tujuan"]) > 0

	if isDinas {
		drawDinasHeader(pdf, tr, body)
	} else {
		if judul := body.MetaFirst("judul"); judul != "" {
			pdf.SetFont(fontSans, "BU", 12)
			pdf.CellFormat(0, 6.5, tr(judul), "", 1, "C", false, 0, "")
		}
		if nomor := body.MetaFirst("nomor"); nomor != "" {
			pdf.SetFont(fontSans, "", 10.5)
			pdf.CellFormat(0, 5.5, tr(nomor), "", 1, "C", false, 0, "")
		}
		pdf.Ln(6)
	}

	if s := body.MetaFirst("salam-buka"); s != "" {
		pdf.SetFont(fontSans, "I", 10.5)
		pdf.MultiCell(0, lineH, tr(s), "", "L", false)
		pdf.Ln(2)
	}

	for _, b := range body.Blocks {
		switch b.Kind {
		case BlockParagraph:
			pdf.SetFont(fontSans, "", 10.5)
			pdf.MultiCell(0, lineH, tr(b.Text), "", "J", false)
			pdf.Ln(2.5)
		case BlockTable:
			pdf.SetFont(fontSans, "", 10.5)
			valW := contentW - tableIndent - tableLabelW - colonW
			for _, row := range b.Rows {
				pdf.SetX(marginL + tableIndent)
				pdf.CellFormat(tableLabelW, lineH, tr(row[0]), "", 0, "L", false, 0, "")
				pdf.CellFormat(colonW, lineH, ":", "", 0, "L", false, 0, "")
				pdf.MultiCell(valW, lineH, tr(row[1]), "", "L", false)
			}
			pdf.Ln(2.5)
		}
	}

	if s := body.MetaFirst("salam-tutup"); s != "" {
		pdf.SetFont(fontSans, "I", 10.5)
		pdf.MultiCell(0, lineH, tr(s), "", "L", false)
	}
}

// drawDinasHeader: blok Nomor/Lamp./Hal di kiri, tanggal H/M di kanan, lalu "Kepada Yth".
func drawDinasHeader(pdf *fpdf.Fpdf, tr func(string) string, body Body) {
	startY := pdf.GetY()
	labelW := 14.0
	pdf.SetFont(fontSans, "", 10.5)

	row := func(label, val string, bold bool) {
		pdf.SetX(marginL)
		pdf.SetFont(fontSans, "", 10.5)
		pdf.CellFormat(labelW, lineH, tr(label), "", 0, "L", false, 0, "")
		pdf.CellFormat(colonW, lineH, ":", "", 0, "L", false, 0, "")
		if bold {
			pdf.SetFont(fontSans, "B", 10.5)
		}
		pdf.CellFormat(90, lineH, tr(val), "", 1, "L", false, 0, "")
	}
	row("Nomor", body.MetaFirst("nomor"), false)
	row("Lamp.", nonEmpty(body.MetaFirst("lamp"), "-"), false)
	row("H a l", body.MetaFirst("hal"), true)
	afterY := pdf.GetY()

	// Tanggal kanan (meta "tanggal-h"/"tanggal-m"), rata kanan menempel margin.
	if h, m := body.MetaFirst("tanggal-h"), body.MetaFirst("tanggal-m"); h != "" || m != "" {
		pdf.SetXY(ttdColX, startY)
		pdf.SetFont(fontSans, "U", 10.5)
		pdf.CellFormat(ttdColW, lineH, tr(h+" H"), "", 1, "R", false, 0, "")
		pdf.SetX(ttdColX)
		pdf.SetFont(fontSans, "", 10.5)
		pdf.CellFormat(ttdColW, lineH, tr(m+" M"), "", 1, "R", false, 0, "")
	}
	pdf.SetY(afterY + 4)

	if tujuan := body.Meta["tujuan"]; len(tujuan) > 0 {
		pdf.SetX(marginL + tableIndent)
		pdf.SetFont(fontSans, "", 10.5)
		pdf.CellFormat(0, lineH, tr("Kepada Yth,"), "", 1, "L", false, 0, "")
		pdf.SetFont(fontSans, "B", 10.5)
		for _, t := range tujuan {
			pdf.SetX(marginL + tableIndent)
			pdf.MultiCell(contentW-tableIndent, lineH, tr(t), "", "L", false)
		}
		pdf.SetFont(fontSans, "", 10.5)
		pdf.SetX(marginL + tableIndent)
		pdf.CellFormat(0, lineH, tr("di -"), "", 1, "L", false, 0, "")
		pdf.SetX(marginL + tableIndent + 8)
		pdf.CellFormat(0, lineH, tr(nonEmpty(body.MetaFirst("di"), "Tempat")), "", 1, "L", false, 0, "")
		pdf.Ln(3)
	}
}

func nonEmpty(v, def string) string {
	if strings.TrimSpace(v) == "" {
		return def
	}
	return v
}

// ---------------------------------------------------------------------------
// Tanda tangan & footer
// ---------------------------------------------------------------------------

func drawTTD(pdf *fpdf.Fpdf, tr func(string) string, lines []Line) {
	pdf.Ln(4)
	// Jaga agar blok ttd tidak terpotong ke halaman berikutnya bila mendekati footer.
	need := float64(len(lines))*lineH + 6
	if pdf.GetY()+need > footerY-6 {
		pdf.AddPage()
	}
	for _, l := range lines {
		pdf.SetX(ttdColX)
		if l.Blank {
			pdf.Ln(lineH)
			continue
		}
		switch {
		case l.Level >= 1:
			pdf.SetFont(fontSans, "BU", 10.5)
		case l.Underline:
			pdf.SetFont(fontSans, "U", 10.5)
		default:
			pdf.SetFont(fontSans, "", 10.5)
		}
		pdf.MultiCell(ttdColW, lineH, tr(l.Text), "", "L", false)
	}
}

func drawFooter(pdf *fpdf.Fpdf, tr func(string) string, lines []Line) {
	if len(lines) == 0 {
		return
	}
	// Footer berada di bawah batas auto page-break; matikan sementara agar tidak memicu halaman baru.
	pdf.SetAutoPageBreak(false, 0)
	defer pdf.SetAutoPageBreak(true, marginB)

	pdf.SetLineWidth(0.4)
	pdf.Line(marginL, footerY-1.5, pageW-marginR, footerY-1.5)
	pdf.SetY(footerY)
	pdf.SetFont(fontSans, "", 8)
	for _, l := range lines {
		if l.Blank {
			continue
		}
		pdf.CellFormat(0, 4, tr(l.Text), "", 1, "C", false, 0, "")
	}
}
