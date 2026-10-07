"use client";

import { useRef, useState } from "react";
import { Eye, FileText, Upload, X } from "lucide-react";
import { cn, formatBytes } from "@/lib/utils";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { DocumentViewer } from "@/components/surat/document-viewer";

export function FileInput({
  id,
  value,
  onChange,
  accept,
  invalid,
  existingName,
}: {
  id: string;
  value?: File;
  onChange: (f?: File) => void;
  accept?: string;
  invalid?: boolean;
  existingName?: string;
}) {
  const ref = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState(false);
  return (
    <div
      className={cn(
        "flex min-h-12 items-center gap-3 rounded-md border border-dashed bg-canvas px-4 py-3",
        invalid ? "border-danger" : "border-hairline",
      )}
    >
      <input
        ref={ref}
        id={id}
        type="file"
        accept={accept}
        className="sr-only"
        onChange={(e) => onChange(e.target.files?.[0])}
      />
      {value ? (
        <>
          <FileText className="size-5 shrink-0 text-primary" />
          <div className="flex min-w-0 flex-1 flex-col">
            <span className="truncate text-caption font-semibold text-ink">{value.name}</span>
            <span className="text-fine text-ink-muted-48">{formatBytes(value.size)}</span>
          </div>
          <button
            type="button"
            onClick={() => setPreview(true)}
            aria-label={`Lihat ${value.name}`}
            className="press flex size-8 items-center justify-center rounded-full text-primary hover:bg-divider-soft"
          >
            <Eye className="size-4" />
          </button>
          <button
            type="button"
            onClick={() => {
              onChange(undefined);
              if (ref.current) ref.current.value = "";
            }}
            aria-label="Hapus berkas"
            className="press flex size-8 items-center justify-center rounded-full text-ink-muted-80 hover:bg-divider-soft"
          >
            <X className="size-4" />
          </button>
        </>
      ) : (
        <>
          <Upload className="size-5 shrink-0 text-ink-muted-48" />
          <div className="flex min-w-0 flex-1 flex-col">
            {existingName ? (
              <>
                <span className="truncate text-caption text-ink">Tersimpan: {existingName}</span>
                <span className="text-fine text-ink-muted-48">Pilih berkas baru untuk mengganti</span>
              </>
            ) : (
              <span className="text-caption text-ink-muted-48">Belum ada berkas dipilih</span>
            )}
          </div>
          <button
            type="button"
            onClick={() => ref.current?.click()}
            className="shrink-0 text-caption text-primary hover:underline"
          >
            Pilih Berkas
          </button>
        </>
      )}

      <Dialog
        open={preview && !!value}
        onClose={() => setPreview(false)}
        title="Pratinjau Berkas"
        description={value ? `${value.name} · ${formatBytes(value.size)}` : undefined}
        className="max-w-4xl"
      >
        {value && (
          <>
            <DocumentViewer file={value} />
            <div className="mt-5 flex justify-end">
              <Button type="button" variant="ghost" onClick={() => setPreview(false)}>Tutup</Button>
            </div>
          </>
        )}
      </Dialog>
    </div>
  );
}
