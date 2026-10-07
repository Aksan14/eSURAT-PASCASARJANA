import { cn } from "@/lib/utils";

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
  className,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("mb-10 flex flex-col gap-5 md:flex-row md:items-end md:justify-between", className)}>
      <div className="flex max-w-2xl flex-col gap-2">
        {eyebrow && <span className="text-caption text-ink-muted-48">{eyebrow}</span>}
        <h1 className="text-display-md font-semibold tracking-[-0.374px] text-ink md:text-display-lg">{title}</h1>
        {description && <p className="text-body text-ink-muted-80">{description}</p>}
      </div>
      {actions && <div className="flex shrink-0 gap-3">{actions}</div>}
    </div>
  );
}

export function SectionTitle({ children, action }: { children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="mb-4 flex items-center justify-between gap-4">
      <h2 className="text-tagline font-semibold text-ink">{children}</h2>
      {action}
    </div>
  );
}
