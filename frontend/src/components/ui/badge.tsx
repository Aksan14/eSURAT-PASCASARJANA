import type { ApplicationStatus } from "@/types/api";
import { STATUS_META, TONE_BADGE, TONE_DOT } from "@/lib/status";
import { cn } from "@/lib/utils";

export function StatusBadge({ status, className }: { status: ApplicationStatus; className?: string }) {
  const m = STATUS_META[status];
  return (
    <span
      className={cn(
        "inline-flex h-7 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-pill px-3 text-fine font-semibold",
        TONE_BADGE[m.tone],
        className,
      )}
    >
      <span className={cn("size-1.5 rounded-full", TONE_DOT[m.tone])} aria-hidden />
      {m.label}
    </span>
  );
}
