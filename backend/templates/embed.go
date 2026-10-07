// Package templates meng-embed template surat dan aset kop agar binary mandiri.
//
//   - letters/*.tmpl  → template teks (kop, isi per jenis surat, ttd, footer)
//   - assets/*.png    → logo & ornamen kop surat
//   - sources/*.doc   → berkas Word asli dari institusi (acuan, TIDAK di-embed)
//
// Direktori letters/ dapat di-override saat runtime lewat LETTER_TEMPLATE_DIR
// (berisi *.tmpl dan sub-folder assets/) sehingga bisa diubah tanpa rebuild.
package templates

import "embed"

//go:embed letters/*.tmpl assets/*.png
var FS embed.FS
