package pdf

import "strings"

// Line adalah satu baris hasil render untuk kop / ttd / footer.
// Level: 0 normal, 1 "#" (besar/tebal), 2 "##" (sedang/tebal). Underline: "_ ".
type Line struct {
	Text      string
	Level     int
	Underline bool
	Blank     bool
}

type BlockKind int

const (
	BlockParagraph BlockKind = iota
	BlockTable
)

// Block adalah paragraf atau tabel dua kolom pada isi surat.
type Block struct {
	Kind BlockKind
	Text string      // untuk paragraf
	Rows [][2]string // untuk tabel: {label, nilai}
}

// Body hasil parse template isi surat.
type Body struct {
	Meta   map[string][]string // @judul, @nomor, @perihal, @tujuan (bisa berulang)
	Blocks []Block
}

func (b Body) MetaFirst(key string) string {
	if v := b.Meta[key]; len(v) > 0 {
		return v[0]
	}
	return ""
}

// ParsedLetter gabungan bagian-bagian yang siap digambar.
type ParsedLetter struct {
	Kop    []Line
	Body   Body
	TTD    []Line
	Footer []Line
}

// parseLines untuk kop/ttd/footer: markup "#", "##", "_", baris kosong.
func parseLines(s string) []Line {
	var out []Line
	for _, raw := range strings.Split(s, "\n") {
		line := strings.TrimRight(raw, " \t\r")
		switch {
		case strings.TrimSpace(line) == "":
			out = append(out, Line{Blank: true})
		case strings.HasPrefix(line, "## "):
			out = append(out, Line{Text: strings.TrimSpace(line[3:]), Level: 2})
		case strings.HasPrefix(line, "# "):
			out = append(out, Line{Text: strings.TrimSpace(line[2:]), Level: 1})
		case strings.HasPrefix(line, "_ "):
			out = append(out, Line{Text: strings.TrimSpace(line[2:]), Underline: true})
		default:
			out = append(out, Line{Text: strings.TrimSpace(line)})
		}
	}
	// buang baris kosong di awal/akhir
	for len(out) > 0 && out[0].Blank {
		out = out[1:]
	}
	for len(out) > 0 && out[len(out)-1].Blank {
		out = out[:len(out)-1]
	}
	return out
}

// parseBody untuk isi surat: @meta, | tabel |, paragraf dipisah baris kosong.
func parseBody(s string) Body {
	body := Body{Meta: map[string][]string{}}
	var para []string
	var table [][2]string

	flushPara := func() {
		if len(para) > 0 {
			body.Blocks = append(body.Blocks, Block{Kind: BlockParagraph, Text: strings.Join(para, " ")})
			para = nil
		}
	}
	flushTable := func() {
		if len(table) > 0 {
			body.Blocks = append(body.Blocks, Block{Kind: BlockTable, Rows: table})
			table = nil
		}
	}

	for _, raw := range strings.Split(s, "\n") {
		line := strings.TrimSpace(raw)
		switch {
		case line == "":
			flushPara()
			flushTable()
		case strings.HasPrefix(line, "@"):
			flushPara()
			flushTable()
			if k, v, ok := strings.Cut(line[1:], ":"); ok {
				key := strings.ToLower(strings.TrimSpace(k))
				body.Meta[key] = append(body.Meta[key], strings.TrimSpace(v))
			}
		case strings.HasPrefix(line, "|"):
			flushPara()
			cells := strings.Split(strings.Trim(line, "|"), "|")
			row := [2]string{}
			if len(cells) > 0 {
				row[0] = strings.TrimSpace(cells[0])
			}
			if len(cells) > 1 {
				row[1] = strings.TrimSpace(strings.Join(cells[1:], "|"))
			}
			table = append(table, row)
		default:
			flushTable()
			para = append(para, line)
		}
	}
	flushPara()
	flushTable()
	return body
}
