package pdf

import (
	"bytes"
	"fmt"
	"io/fs"
	"os"
	"strings"
	"text/template"
)

// TemplateLoader memuat template `letters/<nama>.tmpl` dan aset `assets/<nama>`
// dari sebuah fs.FS. Secara default memakai FS yang di-embed; bila
// LETTER_TEMPLATE_DIR diisi, direktori tersebut dipakai (struktur sama:
// letters/ + assets/) sehingga template bisa diubah tanpa rebuild.
type TemplateLoader struct {
	fsys  fs.FS
	funcs template.FuncMap
}

// NewTemplateLoader: root adalah FS berisi letters/ dan assets/; overrideDir opsional.
func NewTemplateLoader(root fs.FS, overrideDir string) (*TemplateLoader, error) {
	fsys := root
	if overrideDir != "" {
		info, err := os.Stat(overrideDir)
		if err != nil || !info.IsDir() {
			return nil, fmt.Errorf("LETTER_TEMPLATE_DIR %q tidak valid", overrideDir)
		}
		fsys = os.DirFS(overrideDir)
	}
	return &TemplateLoader{fsys: fsys, funcs: templateFuncs()}, nil
}

// Render membaca `letters/<name>.tmpl`, mem-parse, dan mengeksekusinya dengan data.
// Parse dilakukan tiap panggilan agar perubahan template di override dir
// langsung terlihat; biaya parse template kecil ini dapat diabaikan.
func (l *TemplateLoader) Render(name string, data LetterData) (string, error) {
	raw, err := fs.ReadFile(l.fsys, "letters/"+name+".tmpl")
	if err != nil {
		return "", fmt.Errorf("template %s tidak ditemukan: %w", name, err)
	}
	t, err := template.New(name).Funcs(l.funcs).Option("missingkey=zero").Parse(string(raw))
	if err != nil {
		return "", fmt.Errorf("parse template %s: %w", name, err)
	}
	var buf bytes.Buffer
	if err := t.Execute(&buf, data); err != nil {
		return "", fmt.Errorf("render template %s: %w", name, err)
	}
	return buf.String(), nil
}

// Exists memeriksa ketersediaan template untuk kode surat.
func (l *TemplateLoader) Exists(name string) bool {
	_, err := fs.Stat(l.fsys, "letters/"+name+".tmpl")
	return err == nil
}

// Asset membaca berkas di assets/ (mis. logo kop). ok=false bila tidak ada.
func (l *TemplateLoader) Asset(name string) ([]byte, bool) {
	b, err := fs.ReadFile(l.fsys, "assets/"+name)
	return b, err == nil
}

// templateFuncs: fungsi bantu yang tersedia di template.
func templateFuncs() template.FuncMap {
	return template.FuncMap{
		"upper":      strings.ToUpper,
		"lower":      strings.ToLower,
		"title":      strings.Title, //nolint:staticcheck // cukup untuk label surat
		"trim":       strings.TrimSpace,
		"trimSuffix": func(suffix, s string) string { return strings.TrimSuffix(s, suffix) },
		"tanggal":    FormatTanggalISO,
		"hijriah":    FormatHijriahISO,
		"terbilang":  TerbilangDesimal,
		"default": func(def, v string) string {
			if strings.TrimSpace(v) == "" {
				return def
			}
			return v
		},
	}
}
