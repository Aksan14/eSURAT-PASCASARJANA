import Link from "next/link";
import { ChevronRight } from "lucide-react";
import type { ApplicationResponse } from "@/types/api";
import { formatDate } from "@/lib/utils";
import { StatusBadge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/card";

export function ApplicationRow({
  app,
  href,
  showStudent,
}: {
  app: ApplicationResponse;
  href: string;
  showStudent?: boolean;
}) {
  return (
    <Link
      href={href}
      className="group flex items-center gap-4 px-6 py-4 transition-colors hover:bg-parchment"
    >
      <div className="flex min-w-0 flex-1 flex-col">
        <span className="truncate text-body font-semibold text-ink">{app.letter_name}</span>
        <span className="truncate text-caption text-ink-muted-48">
          {app.application_number}
          {app.letter_number && ` · No. Surat ${app.letter_number}`}
          {showStudent && ` · ${app.student.nama} (${app.student.nim})`}
          {" · "}
          {formatDate(app.submitted_at ?? app.created_at)}
        </span>
      </div>
      <StatusBadge status={app.status} className="hidden sm:inline-flex" />
      <ChevronRight className="size-4 shrink-0 text-ink-muted-48 transition-transform group-hover:translate-x-0.5" />
    </Link>
  );
}

export function ApplicationRowSkeleton({ count = 3 }: { count?: number }) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 px-6 py-4">
          <Skeleton className="h-7 w-14 rounded-pill" />
          <div className="flex flex-1 flex-col gap-2">
            <Skeleton className="h-4 w-56" />
            <Skeleton className="h-3 w-72" />
          </div>
          <Skeleton className="h-7 w-32 rounded-pill" />
        </div>
      ))}
    </>
  );
}
