"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2 } from "lucide-react";
import { http } from "@/lib/api/client";
import { loadPdfjs } from "@/lib/pdfjs";

type State = { status: "loading" } | { status: "error"; message: string } | { status: "ready" };

/**
 * Pratinjau berkas tanpa bergantung pada viewer bawaan browser:
 * - PDF    → dirender ke <canvas> per halaman dengan pdf.js
 * - Gambar → ditampilkan sebagai <img> (blob URL)
 * Sumber: `path` endpoint berotorisasi (diambil via axios) atau `file` lokal (File/Blob
 * yang baru dipilih pengguna, belum diunggah).
 */
export function DocumentViewer({
  path,
  params,
  file,
  mimeType,
}: {
  path?: string;
  params?: Record<string, string | undefined>;
  file?: Blob;
  mimeType?: string;
}) {
  const host = useRef<HTMLDivElement>(null);
  const [state, setState] = useState<State>({ status: "loading" });
  const key = JSON.stringify(params ?? {});
  const type = mimeType ?? file?.type ?? "application/pdf";
  const isImage = type.startsWith("image/");

  useEffect(() => {
    let cancelled = false;
    let objectUrl: string | null = null;
    const el = host.current;
    if (!el) return;
    el.replaceChildren();
    setState({ status: "loading" });

    const fetchBlob = async (): Promise<Blob> => {
      if (file) return file;
      if (!path) throw new Error("Sumber berkas tidak ada.");
      return (await http.get<Blob>(path, { params: JSON.parse(key), responseType: "blob" })).data;
    };

    (async () => {
      try {
        if (isImage) {
          const data = await fetchBlob();
          if (cancelled) return;
          objectUrl = URL.createObjectURL(data);
          const img = document.createElement("img");
          img.src = objectUrl;
          img.alt = "Pratinjau dokumen";
          img.className = "mx-auto block max-w-full rounded-xs bg-white";
          img.style.boxShadow = "var(--shadow-product)";
          el.appendChild(img);
          setState({ status: "ready" });
          return;
        }

        const [blob, pdfjs] = await Promise.all([fetchBlob(), loadPdfjs()]);
        const data = await blob.arrayBuffer();
        const doc = await pdfjs.getDocument({ data }).promise;
        if (cancelled) return;

        const width = Math.min(el.clientWidth || 720, 900);
        for (let n = 1; n <= doc.numPages; n++) {
          const page = await doc.getPage(n);
          const base = page.getViewport({ scale: 1 });
          const scale = width / base.width;
          const dpr = window.devicePixelRatio || 1;
          const viewport = page.getViewport({ scale: scale * dpr });

          const canvas = document.createElement("canvas");
          canvas.width = viewport.width;
          canvas.height = viewport.height;
          canvas.style.width = `${viewport.width / dpr}px`;
          canvas.style.height = `${viewport.height / dpr}px`;
          canvas.className = "mx-auto block rounded-xs bg-white";
          canvas.style.boxShadow = "var(--shadow-product)";
          canvas.setAttribute("aria-label", `Halaman ${n} dari ${doc.numPages}`);
          if (cancelled) return;
          el.appendChild(canvas);
          await page.render({ canvas, canvasContext: canvas.getContext("2d")!, viewport }).promise;
        }
        if (!cancelled) setState({ status: "ready" });
      } catch (e) {
        if (!cancelled) setState({ status: "error", message: e instanceof Error ? e.message : "Gagal memuat berkas." });
      }
    })();

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [path, key, file, isImage]);

  return (
    <div className="relative h-[60vh] max-h-[calc(92vh-14rem)] min-h-[320px] overflow-auto rounded-md bg-tile-1 p-4">
      {state.status === "loading" && (
        <div className="absolute inset-0 flex items-center justify-center gap-2 text-caption text-ink-muted-80">
          <Loader2 className="size-4 animate-spin" /> Memuat berkas…
        </div>
      )}
      {state.status === "error" && (
        <div className="absolute inset-0 flex items-center justify-center px-6 text-center text-caption text-danger">
          {state.message}
        </div>
      )}
      <div ref={host} className="flex flex-col gap-4" />
    </div>
  );
}
