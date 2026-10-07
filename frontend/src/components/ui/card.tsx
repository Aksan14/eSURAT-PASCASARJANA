import * as React from "react";
import { cn } from "@/lib/utils";

/** store-utility-card: putih, hairline 1px, radius 18px, padding 24px. Tanpa shadow. */
export function Card({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("rounded-lg border border-hairline bg-canvas", className)} {...props} />
  );
}

export function CardHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("flex items-start justify-between gap-4 border-b border-divider-soft px-6 py-5", className)}
      {...props}
    />
  );
}

export function CardTitle({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return <h3 className={cn("text-tagline font-semibold text-ink", className)} {...props} />;
}

export function CardBody({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("p-6", className)} {...props} />;
}

/** Statistik: angka besar + label caption. */
export function StatCard({
  value,
  label,
  dot,
  className,
}: {
  value: React.ReactNode;
  label: string;
  dot?: string;
  className?: string;
}) {
  return (
    <Card className={cn("flex flex-col gap-1 p-6", className)}>
      <div className="flex items-center gap-2">
        {dot && <span className={cn("size-2 rounded-full", dot)} aria-hidden />}
        <span className="text-caption text-ink-muted-48">{label}</span>
      </div>
      <span className="text-display-md font-semibold tracking-[-0.374px] text-ink">{value}</span>
    </Card>
  );
}

export function EmptyState({
  title,
  description,
  action,
  className,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col items-center gap-3 py-16 text-center", className)}>
      <p className="text-tagline font-semibold text-ink">{title}</p>
      {description && <p className="max-w-md text-caption text-ink-muted-48">{description}</p>}
      {action && <div className="mt-3">{action}</div>}
    </div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-sm bg-divider-soft", className)} />;
}

/** Daftar definisi dua kolom. */
export function DataList({
  items,
  columns = 2,
  className,
}: {
  items: { label: string; value?: React.ReactNode }[];
  columns?: 1 | 2 | 3;
  className?: string;
}) {
  return (
    <dl
      className={cn(
        "grid gap-x-8 gap-y-5",
        columns === 1 && "grid-cols-1",
        columns === 2 && "grid-cols-1 sm:grid-cols-2",
        columns === 3 && "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3",
        className,
      )}
    >
      {items.map((it) => (
        <div key={it.label} className="flex flex-col gap-1">
          <dt className="text-caption text-ink-muted-48">{it.label}</dt>
          <dd className="text-body text-ink">{it.value || <span className="text-ink-muted-48">—</span>}</dd>
        </div>
      ))}
    </dl>
  );
}
