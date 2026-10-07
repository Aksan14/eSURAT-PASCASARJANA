"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import type { LetterCode } from "@/types/api";
import { LETTER_FORMS } from "@/lib/letter-forms";
import { useProfile } from "@/hooks/queries";
import { PageHeader } from "@/components/layout/page-header";
import { Skeleton } from "@/components/ui/card";
import { LetterForm } from "@/components/forms/letter-form";

export function LetterFormPage({ code }: { code: LetterCode }) {
  const def = LETTER_FORMS[code];
  const { data: profile, isLoading } = useProfile();

  return (
    <>
      <Link href="/surat" className="mb-6 inline-flex items-center gap-1 text-caption text-primary hover:underline">
        <ArrowLeft className="size-4" /> Pilih jenis surat lain
      </Link>
      <PageHeader eyebrow="Langkah 2 dari 3" title={def.name} description={def.intro} />
      {isLoading || !profile ? (
        <div className="flex flex-col gap-6">
          <Skeleton className="h-40 rounded-lg" />
          <Skeleton className="h-96 rounded-lg" />
        </div>
      ) : (
        <LetterForm def={def} profile={profile} />
      )}
    </>
  );
}
