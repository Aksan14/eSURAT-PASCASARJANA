"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ArrowRight, Eye, EyeOff, ExternalLink, LockKeyhole, MapPin, UserRound } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import Image from "next/image";
import { authApi } from "@/lib/api";
import { ApiError } from "@/lib/api/client";
import { useAuthStore } from "@/stores/auth";
import { HeroVideo } from "@/components/brand/hero-video";
import { GlassCard } from "@/components/brand/glass-card";
import { AuroraBackdrop } from "@/components/brand/aurora-backdrop";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/field";

const schema = z.object({
  nim: z.string().trim().min(1, "NIM wajib diisi."),
  password: z.string().min(1, "Password wajib diisi."),
});
type FormValues = z.infer<typeof schema>;

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginInner />
    </Suspense>
  );
}

function LoginInner() {
  const router = useRouter();
  const params = useSearchParams();
  const qc = useQueryClient();
  const { user, hydrated, setSession } = useAuthStore();
  const [error, setError] = useState<string | null>(
    params.get("expired") ? "Sesi Anda telah berakhir. Silakan masuk kembali." : null,
  );
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (hydrated && user) router.replace(user.role === "admin" ? "/admin/dashboard" : "/dashboard");
  }, [hydrated, user, router]);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  async function onSubmit(values: FormValues) {
    setError(null);
    try {
      const res = await authApi.login(values);
      qc.clear();
      setSession(res.user, res.token);
      router.replace(res.user.role === "admin" ? "/admin/dashboard" : "/dashboard");
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Gagal masuk.");
    }
  }

  return (
    <div className="relative min-h-screen text-on-dark">
      <HeroVideo />
      <AuroraBackdrop />

      {/* Bar atas: identitas institusi + tautan situs resmi */}
      <header className="relative z-10 mx-auto flex max-w-[1440px] items-center justify-between px-6 py-5 sm:px-10">
        <span className="relative text-caption text-white/85">
          <span className="hidden sm:inline">Program Pascasarjana · Universitas Muhammadiyah Makassar</span>
          <span className="sm:hidden">Pascasarjana Unismuh</span>
          <span className="absolute -bottom-2 left-0 h-0.5 w-12 rounded-pill bg-primary-on-dark" aria-hidden />
        </span>
        <a
          href="https://pasca.unismuh.ac.id/"
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1 text-caption text-white/80 transition-colors hover:text-white"
        >
          pasca.unismuh.ac.id <ExternalLink className="size-3.5" />
        </a>
      </header>

      <div className="relative z-10 mx-auto grid min-h-[calc(100vh-72px)] max-w-[1440px] items-center gap-10 px-6 pb-12 sm:px-10 lg:grid-cols-[1.15fr_1fr] lg:gap-16 lg:px-14">
        {/* Hero copy di atas video */}
        <section className="order-2 flex flex-col gap-8 lg:order-1">
          {/* Logo Pascasarjana di atas plakat putih agar tetap terbaca di atas video */}
          <div
            className="animate-rise hidden self-start rounded-lg bg-white px-5 py-4 shadow-[0_8px_30px_rgba(0,0,0,0.35)] lg:block"
            style={{ "--delay": "80ms" } as React.CSSProperties}
          >
            <Image
              src="/brand/logo-pps.webp"
              alt="Pascasarjana Universitas Muhammadiyah Makassar"
              width={300}
              height={98}
              priority
            />
          </div>
          <div className="flex max-w-xl flex-col gap-5">
            <h1
              className="animate-rise text-display-lg font-semibold tracking-[-0.3px] text-white xl:text-hero"
              style={{ "--delay": "180ms" } as React.CSSProperties}
            >
              Surat kampus,
              <br />
              <span className="text-primary-on-dark">tanpa antre.</span>
            </h1>
            <span
              className="animate-rise -mt-1 h-1 w-14 rounded-pill bg-primary-on-dark"
              style={{ "--delay": "260ms" } as React.CSSProperties}
              aria-hidden
            />
            <p
              className="animate-rise text-tagline font-normal leading-snug text-white/85"
              style={{ "--delay": "300ms" } as React.CSSProperties}
            >
              Ajukan layanan administrasi akademik secara online dan pantau status pengajuan dengan mudah.
            </p>
          </div>
        </section>

        {/* Kartu login — kaca biru-gelap translusen dengan tilt, kilau, dan bingkai gradien */}
        <section className="order-1 flex justify-center lg:order-2 lg:justify-end">
          <GlassCard tone="dark" className="w-full max-w-[440px] p-7 sm:p-9" style={{ "--delay": "120ms" } as React.CSSProperties}>
            <Reveal delay={320} className="mb-4 flex justify-center">
              <Image
                src="/brand/esurat.webp"
                alt="e-SURAT Pascasarjana Unismuh Makassar"
                width={140}
                height={104}
                priority
                className="drop-shadow-[0_6px_18px_rgba(0,0,0,0.35)]"
              />
            </Reveal>
            <Reveal delay={400}>
              <h2 className="text-center text-display-md font-semibold tracking-[-0.374px] text-white">Masuk</h2>
              <p className="mt-1.5 text-center text-caption text-white/75">
                Gunakan NIM dan password yang terdaftar di Program Pascasarjana.
              </p>
            </Reveal>

            <form onSubmit={handleSubmit(onSubmit)} className="mt-6 flex flex-col gap-4" noValidate>
              <Reveal delay={480}>
                <GlassField label="NIM" htmlFor="nim" error={errors.nim?.message} icon={<UserRound className="size-4" />}>
                  <input
                    id="nim"
                    autoComplete="username"
                    placeholder="Contoh: 105041100123"
                    aria-invalid={!!errors.nim}
                    autoFocus
                    className={glassInput}
                    {...register("nim")}
                  />
                </GlassField>
              </Reveal>
              <Reveal delay={560}>
                <GlassField
                  label="Password"
                  htmlFor="password"
                  error={errors.password?.message}
                  icon={<LockKeyhole className="size-4" />}
                  trailing={
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      aria-label={showPassword ? "Sembunyikan password" : "Tampilkan password"}
                      aria-pressed={showPassword}
                      className="press flex size-8 items-center justify-center rounded-full text-white/70 hover:bg-white/10 hover:text-white"
                    >
                      {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                    </button>
                  }
                >
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    placeholder="••••••••"
                    aria-invalid={!!errors.password}
                    className={`${glassInput} pr-12`}
                    {...register("password")}
                  />
                </GlassField>
              </Reveal>

              {error && (
                <p role="alert" className="animate-rise rounded-md border border-danger/40 bg-danger/20 px-4 py-3 text-caption text-white">
                  {error}
                </p>
              )}

              <Reveal delay={640}>
                <Button
                  type="submit"
                  size="lg"
                  loading={isSubmitting}
                  className="group mt-1 w-full bg-gradient-to-r from-[#1a7cf0] via-[#0066cc] to-[#0a4fae] shadow-[0_12px_32px_rgba(26,124,240,0.45),inset_0_1px_0_rgba(255,255,255,0.35)] transition-[box-shadow,transform] hover:-translate-y-px hover:shadow-[0_16px_40px_rgba(26,124,240,0.6),inset_0_1px_0_rgba(255,255,255,0.35)]"
                >
                  Masuk <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
                </Button>
              </Reveal>
            </form>

            <Reveal delay={740}>
              <div className="mx-auto mt-6 h-px w-24 bg-white/15" aria-hidden />
              <p className="mt-4 text-center text-fine text-white/55">
                Lupa password atau data tidak sesuai? Hubungi Bagian Akademik Program Pascasarjana Universitas
                Muhammadiyah Makassar.
              </p>
            </Reveal>
          </GlassCard>
        </section>
      </div>

      <footer className="animate-rise relative z-10 mx-auto flex max-w-[1440px] flex-col gap-1 px-6 pb-6 text-fine text-white/60 sm:flex-row sm:items-center sm:justify-between sm:px-10 lg:px-14" style={{ "--delay": "600ms" } as React.CSSProperties}>
        <span>© {new Date().getFullYear()} Program Pascasarjana Universitas Muhammadiyah Makassar</span>
        <span className="inline-flex items-center gap-1.5">
          <MapPin className="size-3.5 text-primary-on-dark" /> Jl. Sultan Alauddin No. 259 Makassar · Telp. 0411-860837
        </span>
      </footer>
    </div>
  );
}

/** Input kaca: translusen putih di atas kartu gelap. */
const glassInput =
  "focus-ring h-12 w-full rounded-md border border-white/20 bg-white/92 pl-11 pr-4 text-body text-ink placeholder:text-ink-muted-48 shadow-[inset_0_1px_2px_rgba(0,0,0,0.08)] transition-[border-color,box-shadow,background-color] focus:border-primary-on-dark focus:bg-white focus:shadow-[0_0_0_4px_rgba(41,151,255,0.25)] aria-[invalid=true]:border-danger";

function GlassField({
  label,
  htmlFor,
  error,
  icon,
  trailing,
  children,
}: {
  label: string;
  htmlFor: string;
  error?: string;
  icon: React.ReactNode;
  trailing?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={htmlFor} required className="text-white">
        {label}
      </Label>
      <div className="relative">
        <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-ink-muted-48">{icon}</span>
        {children}
        {trailing && <span className="absolute right-2 top-1/2 -translate-y-1/2 text-ink-muted-80 [&_button]:text-ink-muted-80 [&_button:hover]:bg-parchment [&_button:hover]:text-ink">{trailing}</span>}
      </div>
      {error && (
        <p className="text-fine text-[#ffb4ad]" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

/** Pembungkus animasi masuk bertahap (stagger) untuk isi kartu. */
function Reveal({ delay, className, children }: { delay: number; className?: string; children: React.ReactNode }) {
  return (
    <div className={`animate-rise ${className ?? ""}`} style={{ "--delay": `${delay}ms` } as React.CSSProperties}>
      {children}
    </div>
  );
}
