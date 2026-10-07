"use client";

import Link from "next/link";
import { ArrowRight, FileText, GraduationCap, ScrollText } from "lucide-react";
import { useLetterTypes } from "@/hooks/queries";
import type { LetterCode } from "@/types/api";
import { LETTER_ROUTES } from "@/lib/status";
import { PageHeader } from "@/components/layout/page-header";
import { Card, Skeleton } from "@/components/ui/card";

const ICONS: Record<LetterCode, typeof FileText> = { SKK: GraduationCap, SKL: ScrollText, SIPI: FileText };

const REQUIREMENTS: Record<LetterCode, string[]> = {
  SKK: ["Data profil mahasiswa (otomatis)", "Semester Ganjil/Genap", "Tahun ajaran"],
  SKL: ["Data profil mahasiswa (otomatis)", "Tanggal yudisium & IPK", "Predikat kelulusan", "Judul tesis"],
  SIPI: ["Data profil mahasiswa (otomatis)", "Judul tesis", "Tujuan surat (LP3M)", "Proposal penelitian (PDF)"],
};

const ORDER: LetterCode[] = ["SKK", "SKL", "SIPI"];

export default function PilihSuratPage() {
  const { data, isLoading } = useLetterTypes();
  const sorted = data ? [...data].sort((a, b) => ORDER.indexOf(a.code) - ORDER.indexOf(b.code)) : undefined;

  return (
    <>
      <PageHeader
        eyebrow="Langkah 1 dari 3"
        title="Pilih Jenis Surat"
        description="Data identitas akan diisi otomatis dari profil Anda. Pilih jenis surat yang ingin diajukan."
      />
      <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
        {isLoading &&
          Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-80 rounded-lg" />)}
        {sorted?.map((lt) => {
          const Icon = ICONS[lt.code];
          return (
            <Link key={lt.id} href={LETTER_ROUTES[lt.code]} className="group">
              <Card className="press flex h-full flex-col gap-6 p-7 transition-colors hover:border-primary/40">
                <span className="flex size-12 items-center justify-center rounded-lg bg-info-soft">
                  <Icon className="size-6 text-primary" />
                </span>
                <div className="flex flex-col gap-2">
                  <h2 className="text-tagline font-semibold text-ink">{lt.name}</h2>
                  <p className="text-caption text-ink-muted-80">{lt.description}</p>
                </div>
                <ul className="flex flex-col gap-1.5 border-t border-divider-soft pt-4">
                  {REQUIREMENTS[lt.code].map((r) => (
                    <li key={r} className="flex items-center gap-2 text-caption text-ink-muted-80">
                      <span className="size-1 rounded-full bg-ink-muted-48" aria-hidden />
                      {r}
                    </li>
                  ))}
                </ul>
                <span className="mt-auto inline-flex items-center gap-1 text-body text-primary">
                  Ajukan Surat <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
                </span>
              </Card>
            </Link>
          );
        })}
      </div>
    </>
  );
}
