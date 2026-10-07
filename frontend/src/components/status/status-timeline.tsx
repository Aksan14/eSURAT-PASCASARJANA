import { Check } from "lucide-react";
import type { ApplicationResponse, ApplicationStatus } from "@/types/api";
import { TIMELINE_LABELS, TIMELINE_STEPS } from "@/lib/status";
import { cn, formatDate } from "@/lib/utils";

type StepState = "done" | "current" | "pending" | "blocked";

interface Step {
  status: ApplicationStatus;
  label: string;
  state: StepState;
  at?: string;
}

function buildSteps(app: ApplicationResponse): Step[] {
  const branched = app.status === "DITOLAK" || app.status === "PERLU_PERBAIKAN";
  const idx = TIMELINE_STEPS.indexOf(app.status);

  const reached = new Map<ApplicationStatus, string>();
  for (const h of app.history) reached.set(h.status, h.created_at);

  const steps: Step[] = TIMELINE_STEPS.map((s, i) => {
    let state: StepState = "pending";
    if (branched) state = reached.has(s) ? "done" : "pending";
    else if (i < idx) state = "done";
    else if (i === idx) state = app.status === "SELESAI" ? "done" : "current";
    return { status: s, label: TIMELINE_LABELS[s], state, at: reached.get(s) };
  });

  if (branched) {
    const at = steps.findIndex((s) => s.status === "MENUNGGU_VERIFIKASI") + 1;
    steps.splice(at, 0, {
      status: app.status,
      label: TIMELINE_LABELS[app.status],
      state: "blocked",
      at: reached.get(app.status),
    });
  }
  return steps;
}

export function StatusTimeline({ application, compact }: { application: ApplicationResponse; compact?: boolean }) {
  const steps = buildSteps(application);
  return (
    <ol className={cn("flex flex-col", compact ? "gap-4" : "gap-6")}>
      {steps.map((step, i) => {
        const last = i === steps.length - 1;
        const isReject = step.status === "DITOLAK";
        return (
          <li key={`${step.status}-${i}`} className="relative flex gap-4">
            {!last && (
              <span
                aria-hidden
                className={cn(
                  "absolute left-[11px] top-6 w-px",
                  compact ? "h-[calc(100%-4px)]" : "h-[calc(100%+4px)]",
                  step.state === "done" ? "bg-primary" : "bg-hairline",
                )}
              />
            )}
            <span
              aria-hidden
              className={cn(
                "relative z-10 flex size-6 shrink-0 items-center justify-center rounded-full border-2",
                step.state === "done" && "border-primary bg-primary text-on-primary",
                step.state === "current" && "border-primary bg-canvas",
                step.state === "pending" && "border-hairline bg-canvas",
                step.state === "blocked" &&
                  (isReject ? "border-danger bg-danger text-on-primary" : "border-warning bg-warning text-on-primary"),
              )}
            >
              {step.state === "done" && <Check className="size-3" strokeWidth={3} />}
              {step.state === "current" && <span className="size-2 animate-pulse rounded-full bg-primary" />}
              {step.state === "blocked" && <span className="text-[11px] font-bold">!</span>}
            </span>
            <div className="flex min-w-0 flex-1 flex-col gap-0.5 pb-1">
              <p
                className={cn(
                  "text-caption font-semibold",
                  step.state === "pending" ? "text-ink-muted-48" : "text-ink",
                )}
              >
                {step.label}
              </p>
              <p className="text-fine text-ink-muted-48">{step.at ? formatDate(step.at, true) : "—"}</p>
              {step.state === "blocked" && application.admin_note && (
                <p className="mt-2 rounded-md bg-parchment px-3 py-2 text-caption text-ink-muted-80">
                  {application.admin_note}
                </p>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
