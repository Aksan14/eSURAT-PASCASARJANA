#!/usr/bin/env bash
# Uji alur end-to-end via curl: login mahasiswa → buat pengajuan → upload → submit →
# admin approve → process (nomor surat, PDF) → ready → complete → cetak PDF.
set -euo pipefail
BASE=${BASE:-http://localhost:8080}
J='Content-Type: application/json'

step() { printf '\n\033[1m== %s ==\033[0m\n' "$1"; }
jqget() { python3 -c "import sys,json; d=json.load(sys.stdin); print(eval('d'+sys.argv[1]))" "$1"; }

step "health"
curl -sf "$BASE/health" | head -c 200; echo

step "login mahasiswa"
STU=$(curl -sf -H "$J" -d '{"nim":"105041100123","password":"mahasiswa123"}' "$BASE/api/auth/login")
STOKEN=$(echo "$STU" | jqget "['data']['token']")
echo "token ok: ${STOKEN:0:20}…"

step "login admin"
ADM=$(curl -sf -H "$J" -d '{"nim":"admin","password":"admin123"}' "$BASE/api/auth/login")
ATOKEN=$(echo "$ADM" | jqget "['data']['token']")
echo "token ok: ${ATOKEN:0:20}…"

step "profil mahasiswa"
curl -sf -H "Authorization: Bearer $STOKEN" "$BASE/api/student/profile" | jqget "['data']['nama']"

step "jenis surat"
curl -sf -H "Authorization: Bearer $STOKEN" "$BASE/api/letter-types" | jqget "[k['code'] for k in ['data']]" 2>/dev/null || \
curl -sf -H "Authorization: Bearer $STOKEN" "$BASE/api/letter-types" | python3 -c "import sys,json; print([x['code'] for x in json.load(sys.stdin)['data']])"

step "buat draft SIPI"
APP=$(curl -sf -H "$J" -H "Authorization: Bearer $STOKEN" -d '{
  "letter_code":"SIPI",
  "data":{"judulTesis":"Pengembangan Bahan Ajar Berbasis Kearifan Lokal pada Pembelajaran Teks Cerita Rakyat",
  "tujuanSurat":"Ketua LP3M Universitas Muhammadiyah Makassar","kotaTujuan":"Makassar"}}' "$BASE/api/applications")
APPID=$(echo "$APP" | jqget "['data']['id']")
echo "$APP" | jqget "['data']['application_number']"; echo "status: $(echo "$APP" | jqget "['data']['status']")"

step "submit tanpa dokumen → harus gagal 400"
curl -s -o /dev/null -w "HTTP %{http_code}\n" -X POST -H "Authorization: Bearer $STOKEN" "$BASE/api/applications/$APPID/submit"

step "upload proposal (PDF)"
TMP=$(mktemp --suffix=.pdf); printf '%%PDF-1.4\n%%dummy proposal\n%%%%EOF\n' > "$TMP"
curl -sf -H "Authorization: Bearer $STOKEN" -F document_type=proposal -F "file=@$TMP" "$BASE/api/applications/$APPID/documents" | jqget "['data']['file_name']"

step "upload non-PDF → harus gagal 400"
TXT=$(mktemp --suffix=.txt); echo "bukan pdf" > "$TXT"
curl -s -o /dev/null -w "HTTP %{http_code}\n" -H "Authorization: Bearer $STOKEN" -F document_type=pendukung -F "file=@$TXT" "$BASE/api/applications/$APPID/documents"

step "submit"
curl -sf -X POST -H "Authorization: Bearer $STOKEN" "$BASE/api/applications/$APPID/submit" | jqget "['data']['status']"

step "mahasiswa coba akses endpoint admin → 403"
curl -s -o /dev/null -w "HTTP %{http_code}\n" -H "Authorization: Bearer $STOKEN" "$BASE/api/admin/applications"

step "admin: daftar (filter status)"
curl -sf -H "Authorization: Bearer $ATOKEN" "$BASE/api/admin/applications?status=MENUNGGU_VERIFIKASI&per_page=5" | jqget "['meta']"

step "admin: process sebelum approve → 409"
curl -s -o /dev/null -w "HTTP %{http_code}\n" -H "$J" -X POST -H "Authorization: Bearer $ATOKEN" -d '{"letter_number":"0001/A.2-II/X/1448/2026"}' "$BASE/api/admin/applications/$APPID/process"

step "admin: approve"
curl -sf -X POST -H "Authorization: Bearer $ATOKEN" "$BASE/api/admin/applications/$APPID/approve" | jqget "['data']['status']"

step "admin: process (nomor surat usulan sistem → PDF dibuat)"
SUGGEST=$(curl -sf -H "Authorization: Bearer $ATOKEN" "$BASE/api/admin/applications/$APPID" | jqget "['data']['letter_number_suggestion']")
echo "usulan nomor: $SUGGEST"
curl -sf -H "$J" -X POST -H "Authorization: Bearer $ATOKEN" -d "{\"letter_number\":\"$SUGGEST\"}" "$BASE/api/admin/applications/$APPID/process" | jqget "['data']['status']"

step "admin: ready (notif siap diambil)"
curl -sf -X POST -H "Authorization: Bearer $ATOKEN" "$BASE/api/admin/applications/$APPID/ready" | jqget "['data']['status']"

step "admin: print → PDF"
curl -sf -H "Authorization: Bearer $ATOKEN" -o /tmp/surat.pdf -w "HTTP %{http_code} %{content_type} %{size_download} bytes\n" "$BASE/api/admin/applications/$APPID/print"
head -c 8 /tmp/surat.pdf; echo

step "admin: complete"
curl -sf -X POST -H "Authorization: Bearer $ATOKEN" "$BASE/api/admin/applications/$APPID/complete" | jqget "['data']['status']"

step "mahasiswa: history & notifikasi"
curl -sf -H "Authorization: Bearer $STOKEN" "$BASE/api/applications/$APPID/history" | python3 -c "import sys,json; [print(' -',h['status'],'|',h['changed_by_name']) for h in json.load(sys.stdin)['data']]"
curl -sf -H "Authorization: Bearer $STOKEN" "$BASE/api/notifications" | python3 -c "import sys,json; [print(' -',n['title']) for n in json.load(sys.stdin)['data'][:5]]"

step "summary"
curl -sf -H "Authorization: Bearer $ATOKEN" "$BASE/api/admin/applications/summary" | jqget "['data']"

echo; echo "✓ seluruh alur berhasil"
