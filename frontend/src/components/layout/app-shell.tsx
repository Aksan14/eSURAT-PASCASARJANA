"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Archive, ArrowRight, FilePlus2, History, Inbox, LayoutDashboard, UserRound } from "lucide-react";
import type { Role } from "@/types/api";
import { useAuthStore } from "@/stores/auth";
import { useRealtime } from "@/hooks/use-realtime";
import { qk } from "@/hooks/queries";
import { adminApi, applicationApi } from "@/lib/api";
import { setUnauthorizedHandler } from "@/lib/api/client";
import { TopNav, type NavItem } from "./top-nav";
import { Button } from "@/components/ui/button";

const STUDENT_NAV: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/surat", label: "Ajukan Surat", icon: FilePlus2 },
  { href: "/riwayat", label: "Riwayat", icon: History },
  { href: "/profile", label: "Profil", icon: UserRound },
];

const ADMIN_NAV: NavItem[] = [
  { href: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/pengajuan", label: "Pengajuan", icon: Inbox },
  { href: "/admin/arsip", label: "Arsip Surat", icon: Archive },
];

export function AppShell({ role, children }: { role: Role; children: React.ReactNode }) {
  const router = useRouter();
  const { user, hydrated, clear } = useAuthStore();
  useRealtime();
  const items = useNavItems(role, !!user && user.role === role);

  useEffect(() => {
    setUnauthorizedHandler(() => {
      clear();
      router.replace("/login?expired=1");
    });
  }, [clear, router]);

  useEffect(() => {
    if (!hydrated) return;
    if (!user) router.replace("/login");
    else if (user.role !== role) router.replace(user.role === "admin" ? "/admin/dashboard" : "/dashboard");
  }, [hydrated, user, role, router]);

  if (!hydrated || !user || user.role !== role) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <span className="animate-pulse text-caption text-ink-muted-48">Memuat…</span>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col">
      <TopNav
        items={items}
        cta={
          role === "mahasiswa" ? (
            <Link href="/surat">
              <Button size="sm">
                Ajukan Surat <ArrowRight className="size-3.5" />
              </Button>
            </Link>
          ) : undefined
        }
      />
      <main className="mx-auto w-full max-w-[1200px] flex-1 px-6 py-10 md:py-14">{children}</main>
      <footer className="border-t border-black/8 bg-parchment">
        <div className="mx-auto flex max-w-[1200px] flex-col gap-2 px-6 py-8 text-fine text-ink-muted-48 md:flex-row md:items-center md:justify-between">
          <span>© {new Date().getFullYear()} Program Pascasarjana Universitas Muhammadiyah Makassar</span>
          <span>Sistem Informasi Persuratan Mahasiswa · v1.1</span>
        </div>
      </footer>
    </div>
  );
}

/** Item nav + badge angka dari ringkasan status (ikut ter-refresh oleh event realtime). */
function useNavItems(role: Role, enabled: boolean): NavItem[] {
  const admin = useQuery({ queryKey: qk.adminSummary, queryFn: adminApi.summary, enabled: enabled && role === "admin" });
  const student = useQuery({
    queryKey: qk.applicationSummary,
    queryFn: applicationApi.summary,
    enabled: enabled && role === "mahasiswa",
  });
  if (role === "admin") {
    const queue = admin.data?.MENUNGGU_VERIFIKASI ?? 0;
    return ADMIN_NAV.map((i) => (i.href === "/admin/pengajuan" ? { ...i, badge: queue } : i));
  }
  const fix = student.data?.PERLU_PERBAIKAN ?? 0;
  return STUDENT_NAV.map((i) => (i.href === "/riwayat" ? { ...i, badge: fix } : i));
}
