"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/stores/auth";

export default function RootPage() {
  const router = useRouter();
  const { user, hydrated } = useAuthStore();

  useEffect(() => {
    if (!hydrated) return;
    router.replace(!user ? "/login" : user.role === "admin" ? "/admin/dashboard" : "/dashboard");
  }, [hydrated, user, router]);

  return (
    <div className="flex min-h-screen items-center justify-center">
      <span className="animate-pulse text-caption text-ink-muted-48">Memuat…</span>
    </div>
  );
}
