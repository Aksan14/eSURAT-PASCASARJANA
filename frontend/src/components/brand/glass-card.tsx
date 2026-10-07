"use client";

import { useRef, type CSSProperties, type PointerEvent, type ReactNode } from "react";
import { cn } from "@/lib/utils";

const MAX_TILT = 5; // derajat

/**
 * Kartu kaca dengan: animasi masuk, halo bernapas di belakang, bingkai gradien
 * berputar perlahan, dan tilt 3D halus mengikuti kursor.
 * Semua efek dimatikan otomatis pada `prefers-reduced-motion`.
 */
export function GlassCard({
  children,
  className,
  style,
  tone = "light",
}: {
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
  /** light: kaca putih di atas latar gelap · dark: kaca biru-gelap translusen */
  tone?: "light" | "dark";
}) {
  const ref = useRef<HTMLDivElement>(null);
  const raf = useRef<number | null>(null);

  const onMove = (e: PointerEvent<HTMLDivElement>) => {
    const el = ref.current;
    if (!el || e.pointerType === "touch") return;
    const rect = el.getBoundingClientRect();
    const px = (e.clientX - rect.left) / rect.width; // 0..1
    const py = (e.clientY - rect.top) / rect.height;
    if (raf.current) cancelAnimationFrame(raf.current);
    raf.current = requestAnimationFrame(() => {
      el.style.setProperty("--ry", `${((px - 0.5) * 2 * MAX_TILT).toFixed(2)}deg`);
      el.style.setProperty("--rx", `${(-(py - 0.5) * 2 * MAX_TILT).toFixed(2)}deg`);
    });
  };

  const onLeave = () => {
    const el = ref.current;
    if (!el) return;
    if (raf.current) cancelAnimationFrame(raf.current);
    el.style.setProperty("--rx", "0deg");
    el.style.setProperty("--ry", "0deg");
  };

  return (
    // animate-rise di pembungkus (bukan di kartu): fill-mode animasi akan menahan `transform`
    // sehingga tilt 3D di elemen yang sama tidak pernah terlihat.
    <div className="animate-rise relative" style={style}>
      <div className="halo" aria-hidden />
      <div
        ref={ref}
        onPointerMove={onMove}
        onPointerLeave={onLeave}
        className={cn(
          "tilt-card relative rounded-lg backdrop-blur-2xl",
          tone === "light"
            ? "border border-white/50 bg-white/88 text-ink shadow-[0_30px_90px_rgba(0,0,0,0.38)]"
            : "border border-white/20 bg-[#0d2d6b]/55 text-white shadow-[0_30px_90px_rgba(0,20,60,0.55),inset_0_1px_0_rgba(255,255,255,0.18)]",
          className,
        )}
      >
        <div className="gradient-ring" aria-hidden />
        <div className="relative" style={{ transform: "translateZ(24px)" }}>
          {children}
        </div>
      </div>
    </div>
  );
}
