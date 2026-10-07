import { clsx, type ClassValue } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";
import { format, parseISO, isValid } from "date-fns";
import { id as localeId } from "date-fns/locale";

// Daftarkan skala font DESIGN.md agar tailwind-merge tidak menganggap
// `text-fine` dsb. sebagai warna dan menghapusnya saat bertemu `text-success`.
const twMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      "font-size": [{ text: ["hero", "display-lg", "display-md", "lead", "tagline", "body", "caption", "fine"] }],
    },
  },
});

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(iso?: string | null, withTime = false) {
  if (!iso) return "—";
  const d = parseISO(iso);
  if (!isValid(d)) return iso;
  return format(d, withTime ? "d MMMM yyyy, HH:mm" : "d MMMM yyyy", { locale: localeId });
}

export function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s[0]?.toUpperCase())
    .join("");
}
