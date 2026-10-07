"use client";

/**
 * Lapisan dekoratif "hidup" di atas video latar login:
 *  - pita cahaya biru-sian yang mengalir (stroke-dash flow + drift lembut),
 *  - partikel yang melayang dan berkedip,
 *  - garis wireframe gedung yang menggambar dirinya sendiri (bawah kiri).
 * Semua murni CSS/SVG, pointer-events: none, dan berhenti pada prefers-reduced-motion.
 */

// Posisi partikel deterministik (hindari mismatch hidrasi).
const PARTICLES = Array.from({ length: 28 }, (_, i) => {
  const t = (i * 137.508) % 360; // sudut emas → sebaran merata
  return {
    left: `${(t / 360) * 100}%`,
    top: `${((i * 61) % 100)}%`,
    size: 2 + (i % 3),
    dur: 9 + (i % 7),
    delay: -(i * 1.3),
    drift: 18 + (i % 5) * 6,
  };
});

export function AuroraBackdrop() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      {/* Pita cahaya */}
      <svg
        className="absolute inset-0 h-full w-full"
        viewBox="0 0 1440 900"
        preserveAspectRatio="xMidYMid slice"
        fill="none"
      >
        <defs>
          <linearGradient id="rb-a" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#2997ff" stopOpacity="0" />
            <stop offset="0.35" stopColor="#5ab0ff" stopOpacity="0.9" />
            <stop offset="0.6" stopColor="#9fe1ff" stopOpacity="1" />
            <stop offset="1" stopColor="#2997ff" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="rb-b" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#0066cc" stopOpacity="0" />
            <stop offset="0.5" stopColor="#7cc4ff" stopOpacity="0.8" />
            <stop offset="1" stopColor="#0066cc" stopOpacity="0" />
          </linearGradient>
          <filter id="rb-glow" x="-20%" y="-50%" width="140%" height="200%">
            <feGaussianBlur stdDeviation="6" result="b" />
            <feMerge>
              <feMergeNode in="b" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <filter id="rb-glow-soft" x="-20%" y="-50%" width="140%" height="200%">
            <feGaussianBlur stdDeviation="18" />
          </filter>
        </defs>

        {/* Pita kanan-bawah (dekat kartu) */}
        <g className="ribbon-drift" style={{ transformOrigin: "1100px 700px" }}>
          <path
            className="ribbon-flow"
            d="M 760 980 C 900 760, 1080 790, 1180 640 S 1380 420, 1500 300"
            stroke="url(#rb-a)"
            strokeWidth="3"
            strokeLinecap="round"
            filter="url(#rb-glow)"
          />
          <path
            d="M 760 980 C 900 760, 1080 790, 1180 640 S 1380 420, 1500 300"
            stroke="url(#rb-a)"
            strokeWidth="26"
            strokeLinecap="round"
            opacity="0.38"
            filter="url(#rb-glow-soft)"
          />
          <path
            className="ribbon-flow ribbon-flow--slow"
            d="M 700 1000 C 880 820, 1040 880, 1160 720 S 1360 500, 1540 400"
            stroke="url(#rb-b)"
            strokeWidth="1.5"
            strokeLinecap="round"
            filter="url(#rb-glow)"
            opacity="0.8"
          />
        </g>

        {/* Pita kiri-bawah */}
        <g className="ribbon-drift ribbon-drift--rev" style={{ transformOrigin: "200px 760px" }}>
          <path
            className="ribbon-flow ribbon-flow--slow"
            d="M -80 620 C 120 560, 260 700, 420 660 S 700 560, 900 640"
            stroke="url(#rb-b)"
            strokeWidth="2"
            strokeLinecap="round"
            filter="url(#rb-glow)"
          />
          <path
            d="M -80 620 C 120 560, 260 700, 420 660 S 700 560, 900 640"
            stroke="url(#rb-b)"
            strokeWidth="22"
            strokeLinecap="round"
            opacity="0.3"
            filter="url(#rb-glow-soft)"
          />
          <path
            className="ribbon-flow"
            d="M -60 700 C 140 650, 300 780, 480 740 S 760 640, 980 720"
            stroke="url(#rb-a)"
            strokeWidth="1.2"
            strokeLinecap="round"
            filter="url(#rb-glow)"
            opacity="0.7"
          />
        </g>

        {/* Wireframe gedung (kiri bawah) yang menggambar dirinya */}
        <g
          className="wire-draw"
          stroke="#8fc8ff"
          strokeWidth="1"
          strokeOpacity="0.45"
          strokeLinejoin="round"
          strokeLinecap="round"
          transform="translate(0 560)"
        >
          <path d="M 20 320 L 20 150 L 90 110 L 160 150 L 160 320" />
          <path d="M 160 320 L 160 200 L 260 170 L 360 200 L 360 320" />
          <path d="M 60 320 L 60 240 L 120 240 L 120 320" />
          <path d="M 200 320 L 200 250 L 240 250 L 240 320 M 280 320 L 280 250 L 320 250 L 320 320" />
          <path d="M 90 110 L 90 60 L 110 50 L 130 60 L 130 135" />
          <path d="M 110 50 L 110 20" />
          <path d="M 0 320 L 420 320" />
          <path d="M 180 215 L 340 215 M 180 235 L 340 235" strokeOpacity="0.3" />
          <path d="M 30 170 L 150 170 M 30 195 L 150 195 M 30 220 L 150 220" strokeOpacity="0.3" />
        </g>
      </svg>

      {/* Partikel melayang */}
      {PARTICLES.map((p, i) => (
        <span
          key={i}
          className="particle"
          style={
            {
              left: p.left,
              top: p.top,
              width: p.size,
              height: p.size,
              "--dur": `${p.dur}s`,
              "--delay": `${p.delay}s`,
              "--drift": `${p.drift}px`,
            } as React.CSSProperties
          }
        />
      ))}

      {/* Vignette halus di sudut kiri bawah agar pita & wireframe menyatu */}
      <div className="absolute -bottom-32 -left-32 size-[560px] rounded-full bg-[#2997ff]/15 blur-3xl" />
    </div>
  );
}
