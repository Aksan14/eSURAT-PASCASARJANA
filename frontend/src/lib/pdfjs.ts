/** Pemuat pdf.js bersama (DocumentViewer & cetak) dengan worker yang sudah dikonfigurasi. */
export async function loadPdfjs() {
  const pdfjs = await import("pdfjs-dist");
  pdfjs.GlobalWorkerOptions.workerSrc = new URL("pdfjs-dist/build/pdf.worker.min.mjs", import.meta.url).toString();
  return pdfjs;
}

/** Render seluruh halaman PDF menjadi gambar PNG (data URL). scale 2 ≈ 144 dpi. */
export async function pdfToImages(data: ArrayBuffer, scale = 2): Promise<string[]> {
  const pdfjs = await loadPdfjs();
  const doc = await pdfjs.getDocument({ data }).promise;
  const out: string[] = [];
  for (let n = 1; n <= doc.numPages; n++) {
    const page = await doc.getPage(n);
    const viewport = page.getViewport({ scale });
    const canvas = document.createElement("canvas");
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    await page.render({ canvas, canvasContext: canvas.getContext("2d")!, viewport }).promise;
    out.push(canvas.toDataURL("image/png"));
  }
  return out;
}
