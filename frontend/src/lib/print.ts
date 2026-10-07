import { http } from "@/lib/api/client";
import { pdfToImages } from "@/lib/pdfjs";

/**
 * Mencetak berkas (PDF/gambar) dari endpoint berotorisasi langsung ke dialog cetak,
 * tanpa tab baru dan tanpa bergantung pada viewer PDF bawaan browser (yang pada
 * sebagian browser justru mengunduh berkas). PDF dirender ke gambar per halaman
 * dengan pdf.js, lalu dimuat ke <iframe srcdoc> tersembunyi dan `print()` dipanggil.
 */
export async function printDocument(path: string, params?: Record<string, string | undefined>) {
  const { data, headers } = await http.get<Blob>(path, { params, responseType: "blob" });
  const type = (headers["content-type"] as string | undefined) ?? data.type ?? "application/pdf";

  const pages = type.startsWith("image/")
    ? [URL.createObjectURL(data)]
    : await pdfToImages(await data.arrayBuffer());

  const html = `<!doctype html><html><head><meta charset="utf-8"><title>Cetak</title><style>
    @page { size: A4; margin: 0 }
    html, body { margin: 0; padding: 0; background: #fff }
    .page { width: 100vw; height: 100vh; display: flex; align-items: center; justify-content: center; break-after: page }
    .page:last-child { break-after: auto }
    img { max-width: 100%; max-height: 100%; object-fit: contain }
  </style></head><body>${pages.map((src) => `<div class="page"><img src="${src}" alt=""></div>`).join("")}</body></html>`;

  const frame = document.createElement("iframe");
  frame.setAttribute("aria-hidden", "true");
  frame.style.cssText = "position:fixed;right:0;bottom:0;width:0;height:0;border:0;visibility:hidden";

  let done = false;
  const finish = () => {
    if (done) return;
    done = true;
    frame.remove();
    for (const p of pages) if (p.startsWith("blob:")) URL.revokeObjectURL(p);
  };

  await new Promise<void>((resolve, reject) => {
    frame.onload = async () => {
      try {
        const win = frame.contentWindow!;
        const imgs = Array.from(win.document.images);
        await Promise.all(
          imgs.map((img) => (img.complete ? Promise.resolve() : new Promise<void>((r) => { img.onload = img.onerror = () => r(); }))),
        );
        win.addEventListener("afterprint", finish, { once: true });
        setTimeout(finish, 120_000); // bila afterprint tidak dipicu
        win.focus();
        win.print();
        resolve();
      } catch (e) {
        finish();
        reject(e);
      }
    };
    frame.srcdoc = html;
    document.body.appendChild(frame);
  });
}
