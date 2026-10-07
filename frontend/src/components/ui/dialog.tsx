"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

export function Dialog({
  open,
  onClose,
  title,
  description,
  children,
  className,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
}) {
  React.useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open) return null;

  // Portal ke <body>: dialog bisa dipakai di dalam <form>/<label>/FileInput tanpa
  // event klik ikut bubbling ke pembungkusnya (mis. memicu submit atau file chooser).
  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center"
      onClick={onClose}
      role="presentation"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="dialog-title"
        onClick={(e) => e.stopPropagation()}
        className={cn("max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-lg bg-canvas p-7 shadow-paper", className)}
      >
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <h3 id="dialog-title" className="text-tagline font-semibold text-ink">
              {title}
            </h3>
            {description && <p className="mt-1 text-caption text-ink-muted-48">{description}</p>}
          </div>
          <button
            onClick={onClose}
            aria-label="Tutup"
            className="press flex size-9 shrink-0 items-center justify-center rounded-full bg-parchment text-ink hover:bg-divider-soft"
          >
            <X className="size-4" />
          </button>
        </div>
        {children}
      </div>
    </div>,
    document.body,
  );
}
