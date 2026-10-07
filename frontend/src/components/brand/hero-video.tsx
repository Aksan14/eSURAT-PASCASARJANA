"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";

const REDUCED = "(prefers-reduced-motion: reduce)";
function subscribeReduced(cb: () => void) {
  const mq = window.matchMedia(REDUCED);
  mq.addEventListener("change", cb);
  return () => mq.removeEventListener("change", cb);
}
const getReduced = () => window.matchMedia(REDUCED).matches;
const getReducedServer = () => false;

/**
 * Video latar kampus Unismuh (sumber: hero pasca.unismuh.ac.id, YouTube 5xsEebCUEKo),
 * di-host lokal agar autoplay stabil dan tanpa UI YouTube.
 * Menghormati `prefers-reduced-motion`: hanya poster yang ditampilkan.
 */
export function HeroVideo({ className }: { className?: string }) {
  const ref = useRef<HTMLVideoElement>(null);
  const [ready, setReady] = useState(false);
  const reduced = useSyncExternalStore(subscribeReduced, getReduced, getReducedServer);

  useEffect(() => {
    const v = ref.current;
    if (!v || reduced) return;
    v.play().catch(() => {
      /* autoplay diblokir → poster tetap tampil */
    });
  }, [reduced]);

  return (
    <div className={cn("absolute inset-0 overflow-hidden bg-[#0b1a4a]", className)} aria-hidden>
      <Image
        src="/brand/hero-poster.jpg"
        alt=""
        fill
        priority
        sizes="100vw"
        className={cn(
          "scale-105 object-cover transition-opacity duration-700",
          ready && !reduced ? "opacity-0" : "opacity-100",
        )}
      />
      {!reduced && (
        <video
          ref={ref}
          className={cn(
            "absolute inset-0 h-full w-full scale-105 object-cover transition-opacity duration-700",
            ready ? "opacity-100" : "opacity-0",
          )}
          muted
          loop
          playsInline
          autoPlay
          preload="metadata"
          poster="/brand/hero-poster.jpg"
          onCanPlay={() => setReady(true)}
        >
          <source src="/brand/hero-pps.mp4" type="video/mp4" />
        </video>
      )}
      {/* Overlay: biru institusi → gelap, menjaga kontras teks putih */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#0b1a4a]/80 via-[#0b1a4a]/55 to-black/70" />
      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/20" />
    </div>
  );
}
