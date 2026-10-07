"use client";

import { useId, useState } from "react";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Grafik ringan berbasis SVG untuk dashboard (tanpa dependensi charting).
// Warna memakai token DESIGN.md via CSS variable.
// ---------------------------------------------------------------------------

export type Series = { key: string; label: string; color: string; values: number[] };

/** Grafik garis + area: beberapa seri di sumbu x yang sama. */
export function LineChart({
  labels,
  series,
  height = 220,
  className,
}: {
  labels: string[];
  series: Series[];
  height?: number;
  className?: string;
}) {
  const uid = useId().replace(/:/g, "");
  const [hover, setHover] = useState<number | null>(null);

  const W = 720;
  const H = height;
  const padL = 36;
  const padR = 16;
  const padT = 16;
  const padB = 28;
  const innerW = W - padL - padR;
  const innerH = H - padT - padB;

  const max = Math.max(1, ...series.flatMap((s) => s.values));
  const niceMax = niceCeil(max);
  const n = labels.length;
  const x = (i: number) => padL + (n <= 1 ? innerW / 2 : (i / (n - 1)) * innerW);
  const y = (v: number) => padT + innerH - (v / niceMax) * innerH;

  const ticks = [0, 0.25, 0.5, 0.75, 1].map((t) => Math.round(t * niceMax));

  const path = (vals: number[]) =>
    vals.map((v, i) => `${i === 0 ? "M" : "L"} ${x(i).toFixed(1)} ${y(v).toFixed(1)}`).join(" ");
  const area = (vals: number[]) => `${path(vals)} L ${x(n - 1).toFixed(1)} ${y(0)} L ${x(0).toFixed(1)} ${y(0)} Z`;

  return (
    <div className={cn("relative", className)}>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="h-auto w-full"
        role="img"
        aria-label="Grafik pengajuan per bulan"
        onMouseLeave={() => setHover(null)}
        onMouseMove={(e) => {
          const rect = e.currentTarget.getBoundingClientRect();
          const px = ((e.clientX - rect.left) / rect.width) * W;
          const i = Math.round(((px - padL) / innerW) * (n - 1));
          setHover(Math.max(0, Math.min(n - 1, i)));
        }}
      >
        <defs>
          {series.map((s) => (
            <linearGradient key={s.key} id={`${uid}-${s.key}`} x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor={s.color} stopOpacity="0.28" />
              <stop offset="100%" stopColor={s.color} stopOpacity="0" />
            </linearGradient>
          ))}
        </defs>

        {ticks.map((t) => (
          <g key={t}>
            <line x1={padL} x2={W - padR} y1={y(t)} y2={y(t)} stroke="var(--color-divider-soft)" strokeWidth="1" />
            <text x={padL - 8} y={y(t) + 4} textAnchor="end" fontSize="11" fill="var(--color-ink-muted-48)">
              {t}
            </text>
          </g>
        ))}

        {series.map((s) => (
          <g key={s.key}>
            <path d={area(s.values)} fill={`url(#${uid}-${s.key})`} />
            <path d={path(s.values)} fill="none" stroke={s.color} strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
          </g>
        ))}

        {labels.map((l, i) => (
          <text
            key={l}
            x={x(i)}
            y={H - 8}
            textAnchor="middle"
            fontSize="11"
            fill={hover === i ? "var(--color-ink)" : "var(--color-ink-muted-48)"}
            fontWeight={hover === i ? 600 : 400}
          >
            {l}
          </text>
        ))}

        {hover !== null && (
          <g>
            <line x1={x(hover)} x2={x(hover)} y1={padT} y2={padT + innerH} stroke="var(--color-ink-muted-48)" strokeDasharray="3 3" />
            {series.map((s) => (
              <circle key={s.key} cx={x(hover)} cy={y(s.values[hover] ?? 0)} r="4.5" fill={s.color} stroke="#fff" strokeWidth="2" />
            ))}
          </g>
        )}
      </svg>

      {hover !== null && (
        <div
          className="pointer-events-none absolute top-2 rounded-md bg-ink px-3 py-2 text-fine text-on-dark shadow-paper"
          style={{ left: `${((x(hover) / W) * 100).toFixed(2)}%`, transform: hover > n / 2 ? "translateX(calc(-100% - 10px))" : "translateX(10px)" }}
        >
          <div className="mb-1 font-semibold">{labels[hover]}</div>
          {series.map((s) => (
            <div key={s.key} className="flex items-center gap-2">
              <span className="size-2 rounded-full" style={{ background: s.color }} />
              {s.label}: <span className="font-semibold">{s.values[hover] ?? 0}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/** Donat: distribusi proporsi dengan legenda. */
export function DonutChart({
  data,
  size = 180,
  thickness = 22,
  centerLabel,
  className,
}: {
  data: { label: string; value: number; color: string }[];
  size?: number;
  thickness?: number;
  centerLabel?: string;
  className?: string;
}) {
  const total = data.reduce((a, d) => a + d.value, 0);
  const r = (size - thickness) / 2;
  const c = 2 * Math.PI * r;
  let offset = 0;

  return (
    <div className={cn("flex flex-col items-center gap-6 sm:flex-row", className)}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label="Distribusi jenis surat" className="shrink-0">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--color-divider-soft)" strokeWidth={thickness} />
        {total > 0 &&
          data.map((d) => {
            const len = (d.value / total) * c;
            const el = (
              <circle
                key={d.label}
                cx={size / 2}
                cy={size / 2}
                r={r}
                fill="none"
                stroke={d.color}
                strokeWidth={thickness}
                strokeDasharray={`${len} ${c - len}`}
                strokeDashoffset={-offset}
                transform={`rotate(-90 ${size / 2} ${size / 2})`}
                strokeLinecap="butt"
              />
            );
            offset += len;
            return el;
          })}
        <text x="50%" y="50%" textAnchor="middle" dominantBaseline="central" fontSize="30" fontWeight="600" fill="var(--color-ink)">
          {total}
        </text>
        {centerLabel && (
          <text x="50%" y="50%" dy="24" textAnchor="middle" fontSize="11" fill="var(--color-ink-muted-48)">
            {centerLabel}
          </text>
        )}
      </svg>
      <ul className="flex w-full flex-col gap-3">
        {data.map((d) => {
          const pct = total ? Math.round((d.value / total) * 100) : 0;
          return (
            <li key={d.label} className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between gap-3 text-caption">
                <span className="flex items-center gap-2 text-ink">
                  <span className="size-2.5 rounded-full" style={{ background: d.color }} />
                  {d.label}
                </span>
                <span className="text-ink-muted-80">
                  <span className="font-semibold text-ink">{d.value}</span> · {pct}%
                </span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-pill bg-divider-soft">
                <div className="h-full rounded-pill transition-[width]" style={{ width: `${pct}%`, background: d.color }} />
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function niceCeil(v: number) {
  if (v <= 5) return 5;
  const p = 10 ** Math.floor(Math.log10(v));
  const f = v / p;
  const nf = f <= 1 ? 1 : f <= 2 ? 2 : f <= 5 ? 5 : 10;
  return nf * p;
}
