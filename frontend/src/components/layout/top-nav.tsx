"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { ChevronDown, ExternalLink, LogOut, Menu, UserRound, X, type LucideIcon } from "lucide-react";
import { authApi } from "@/lib/api";
import { useAuthStore } from "@/stores/auth";
import { useRealtimeStatus } from "@/hooks/use-realtime-status";
import { cn, initials } from "@/lib/utils";
import { NotificationBell } from "@/components/notification/notification-bell";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  /** angka kecil di kanan label (mis. antrean) */
  badge?: number;
}

/**
 * Navigasi dua baris (DESIGN.md):
 *  - global-nav: strip hitam 36px — identitas institusi, status realtime, tautan situs.
 *  - sub-nav-frosted: 64px, backdrop-blur; brand lockup, menu ber-ikon dengan pill aktif
 *    yang bergeser halus, CTA, lonceng, menu pengguna.
 */
export function TopNav({ items, cta }: { items: NavItem[]; cta?: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const qc = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const clear = useAuthStore((s) => s.clear);
  const [open, setOpen] = useState(false);
  const scrolled = useScrolled();

  const isActive = (href: string) => pathname === href || pathname.startsWith(href + "/");
  const home = user?.role === "admin" ? "/admin/dashboard" : "/dashboard";
  const roleLabel = user?.role === "admin" ? "Administrator" : "Mahasiswa";

  async function logout() {
    try {
      await authApi.logout();
    } finally {
      clear();
      qc.clear();
      router.replace("/login");
    }
  }

  return (
    <header className="sticky top-0 z-30">
      {/* ---- global-nav ---- */}
      <div className="h-9 bg-black text-on-dark">
        <div className="mx-auto flex h-full max-w-[1440px] items-center justify-between px-6 text-fine">
          <span className="truncate text-white/75">
            <span className="hidden sm:inline">Program Pascasarjana · Universitas Muhammadiyah Makassar</span>
            <span className="sm:hidden">Pascasarjana Unismuh</span>
          </span>
          <div className="flex items-center gap-4">
            <RealtimeIndicator />
            <a
              href="https://pasca.unismuh.ac.id/"
              target="_blank"
              rel="noreferrer"
              className="hidden items-center gap-1 text-white/75 transition-colors hover:text-white sm:inline-flex"
            >
              pasca.unismuh.ac.id <ExternalLink className="size-3" />
            </a>
          </div>
        </div>
      </div>

      {/* ---- sub-nav-frosted ---- */}
      <div
        className={cn(
          "frosted border-b transition-[border-color,box-shadow] duration-300",
          scrolled
            ? "border-black/10 shadow-[0_1px_0_rgba(0,0,0,0.04),0_8px_24px_-12px_rgba(0,0,0,0.12)]"
            : "border-black/[0.06]",
        )}
      >
        <div className="mx-auto flex h-16 max-w-[1440px] items-center justify-between gap-6 px-6">
          <div className="flex min-w-0 items-center gap-6">
            <BrandLockup href={home} />
            <span className="hidden h-6 w-px bg-black/10 md:block" aria-hidden />
            <NavPills items={items} isActive={isActive} />
          </div>

          <div className="flex items-center gap-1.5">
            {cta && <div className="mr-1 hidden lg:block">{cta}</div>}
            <NotificationBell />
            <UserMenu
              name={user?.name ?? ""}
              sub={user?.role === "admin" ? roleLabel : (user?.nim ?? "")}
              roleLabel={roleLabel}
              profileHref={user?.role === "mahasiswa" ? "/profile" : undefined}
              onLogout={logout}
            />
            <button
              className="press ml-1 flex size-10 items-center justify-center rounded-full text-ink hover:bg-black/5 md:hidden"
              onClick={() => setOpen(true)}
              aria-label="Menu"
              aria-expanded={open}
            >
              <Menu className="size-5" />
            </button>
          </div>
        </div>
      </div>

      {/* ---- mobile sheet ---- */}
      {open && (
        <div className="fixed inset-0 z-40 flex flex-col bg-canvas md:hidden">
          <div className="flex h-16 items-center justify-between border-b border-divider-soft px-6">
            <BrandLockup href={home} />
            <button
              onClick={() => setOpen(false)}
              aria-label="Tutup menu"
              className="press flex size-10 items-center justify-center rounded-full text-ink hover:bg-black/5"
            >
              <X className="size-5" />
            </button>
          </div>
          <nav className="flex flex-col gap-1 px-4 pt-4" aria-label="Utama mobile">
            {items.map(({ href, label, icon: Icon, badge }) => {
              const active = isActive(href);
              return (
                <Link
                  key={href}
                  href={href}
                  onClick={() => setOpen(false)}
                  className={cn(
                    "flex items-center gap-3 rounded-md px-4 py-3.5 text-body",
                    active ? "bg-black/[0.05] font-semibold text-ink" : "text-ink-muted-80",
                  )}
                >
                  <Icon className={cn("size-5", active ? "text-primary" : "text-ink-muted-48")} />
                  {label}
                  {!!badge && <NavBadge n={badge} />}
                </Link>
              );
            })}
          </nav>
          <div className="mt-auto border-t border-divider-soft px-6 py-5">
            <div className="flex items-center gap-3">
              <Avatar name={user?.name ?? ""} />
              <div className="flex min-w-0 flex-col">
                <span className="truncate text-body font-semibold text-ink">{user?.name}</span>
                <span className="text-caption text-ink-muted-48">
                  {roleLabel}
                  {user?.role === "mahasiswa" && ` · ${user.nim}`}
                </span>
              </div>
              <button
                onClick={logout}
                className="press ml-auto inline-flex h-10 items-center gap-2 rounded-pill border border-hairline px-4 text-caption text-ink"
              >
                <LogOut className="size-4" /> Keluar
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}

/* ---------------- sub-komponen ---------------- */

function BrandLockup({ href }: { href: string }) {
  return (
    <Link href={href} className="flex shrink-0 items-center gap-2.5" aria-label="e-SURAT Pascasarjana — beranda">
      <Image src="/brand/icon-192.png" alt="" width={36} height={36} priority className="size-9" />
      <span className="flex flex-col leading-none">
        <span className="text-[17px] font-bold tracking-[-0.3px] text-brand-navy">e-SURAT</span>
        <span className="mt-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-ink-muted-48">
          Pascasarjana
        </span>
      </span>
    </Link>
  );
}

/** Menu dengan pill aktif yang bergeser mengikuti item (tanpa lib animasi). */
function NavPills({ items, isActive }: { items: NavItem[]; isActive: (href: string) => boolean }) {
  const ref = useRef<HTMLElement>(null);
  const [pill, setPill] = useState<{ x: number; w: number } | null>(null);
  const activeHref = items.find((i) => isActive(i.href))?.href;

  useLayoutEffect(() => {
    const el = ref.current?.querySelector<HTMLElement>(`[data-href="${activeHref}"]`);
    setPill(el ? { x: el.offsetLeft, w: el.offsetWidth } : null);
  }, [activeHref, items]);

  return (
    <nav ref={ref} className="relative hidden items-center md:flex" aria-label="Utama">
      {pill && (
        <span
          aria-hidden
          className="absolute top-1/2 h-9 rounded-pill bg-black/[0.05] transition-[transform,width] duration-300 ease-[cubic-bezier(.2,.8,.2,1)]"
          style={{ width: pill.w, transform: `translate(${pill.x}px, -50%)` }}
        />
      )}
      {items.map(({ href, label, icon: Icon, badge }) => {
        const active = isActive(href);
        return (
          <Link
            key={href}
            href={href}
            data-href={href}
            className={cn(
              "press relative z-10 inline-flex h-9 items-center gap-2 whitespace-nowrap rounded-pill px-3.5 text-caption transition-colors",
              active ? "font-semibold text-ink" : "text-ink-muted-80 hover:text-ink",
            )}
          >
            <Icon
              className={cn("size-4", active ? "text-primary" : "text-ink-muted-48")}
              strokeWidth={active ? 2.25 : 2}
            />
            {label}
            {!!badge && <NavBadge n={badge} />}
          </Link>
        );
      })}
    </nav>
  );
}

function NavBadge({ n }: { n: number }) {
  return (
    <span className="ml-0.5 inline-flex h-5 min-w-5 items-center justify-center rounded-pill bg-primary px-1.5 text-[11px] font-semibold leading-none text-on-primary">
      {n > 99 ? "99+" : n}
    </span>
  );
}

function Avatar({ name }: { name: string }) {
  return (
    <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-brand-navy text-fine font-semibold text-on-dark ring-2 ring-white">
      {initials(name)}
    </span>
  );
}

function UserMenu({
  name,
  sub,
  roleLabel,
  profileHref,
  onLogout,
}: {
  name: string;
  sub: string;
  roleLabel: string;
  profileHref?: string;
  onLogout: () => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative hidden md:block">
      <button
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        className={cn(
          "press flex h-11 items-center gap-2.5 rounded-pill pl-1 pr-3 transition-colors hover:bg-black/5",
          open && "bg-black/5",
        )}
      >
        <Avatar name={name} />
        <span className="flex max-w-[150px] flex-col items-start leading-tight">
          <span className="w-full truncate text-left text-caption font-semibold text-ink">{name}</span>
          <span className="w-full truncate text-left text-[11px] text-ink-muted-48">{sub}</span>
        </span>
        <ChevronDown className={cn("size-4 text-ink-muted-48 transition-transform", open && "rotate-180")} />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 top-[52px] z-40 w-64 overflow-hidden rounded-lg border border-hairline bg-canvas shadow-paper"
        >
          <div className="flex items-center gap-3 border-b border-divider-soft px-4 py-3.5">
            <Avatar name={name} />
            <div className="flex min-w-0 flex-col">
              <span className="truncate text-caption font-semibold text-ink">{name}</span>
              <span className="mt-0.5 inline-flex w-fit items-center rounded-pill bg-info-soft px-2 py-0.5 text-[11px] font-semibold text-primary">
                {roleLabel}
              </span>
            </div>
          </div>
          <div className="p-1.5">
            {profileHref && (
              <Link
                href={profileHref}
                role="menuitem"
                onClick={() => setOpen(false)}
                className="flex items-center gap-3 rounded-md px-3 py-2.5 text-caption text-ink hover:bg-black/[0.04]"
              >
                <UserRound className="size-4 text-ink-muted-48" /> Profil saya
              </Link>
            )}
            <button
              role="menuitem"
              onClick={onLogout}
              className="flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-left text-caption text-danger hover:bg-danger-soft"
            >
              <LogOut className="size-4" /> Keluar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function RealtimeIndicator() {
  const status = useRealtimeStatus();
  const label = status === "open" ? "Realtime aktif" : status === "connecting" ? "Menghubungkan…" : "Offline";
  return (
    <span className="relative flex size-2" role="status" aria-label={label} title={label}>
      {status === "open" && (
        <span className="absolute inline-flex size-full animate-ping rounded-full bg-success opacity-60" />
      )}
      <span
        className={cn(
          "relative inline-flex size-2 rounded-full",
          status === "open" ? "bg-success" : status === "connecting" ? "bg-warning" : "bg-white/30",
        )}
      />
    </span>
  );
}

function useScrolled(threshold = 8) {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > threshold);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [threshold]);
  return scrolled;
}
