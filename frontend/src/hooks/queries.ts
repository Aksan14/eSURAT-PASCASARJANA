"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { adminApi, applicationApi, letterTypeApi, notificationApi, studentApi } from "@/lib/api";
import type { AdminListQuery } from "@/types/api";
import { useAuthStore } from "@/stores/auth";

export const qk = {
  profile: ["profile"] as const,
  letterTypes: ["letter-types"] as const,
  applications: ["applications"] as const,
  applicationSummary: ["applications", "summary"] as const,
  application: (id: string) => ["applications", id] as const,
  adminList: (q: AdminListQuery) => ["admin", "applications", q] as const,
  adminSummary: ["admin", "applications", "summary"] as const,
  adminStats: ["admin", "applications", "stats"] as const,
  adminApplication: (id: string) => ["admin", "applications", id] as const,
  notifications: ["notifications"] as const,
};

export function useProfile() {
  const role = useAuthStore((s) => s.user?.role);
  return useQuery({ queryKey: qk.profile, queryFn: studentApi.profile, enabled: role === "mahasiswa" });
}

export function useLetterTypes() {
  return useQuery({ queryKey: qk.letterTypes, queryFn: letterTypeApi.list, staleTime: 5 * 60_000 });
}

export function useApplications() {
  return useQuery({ queryKey: qk.applications, queryFn: applicationApi.list });
}

export function useApplicationSummary() {
  return useQuery({ queryKey: qk.applicationSummary, queryFn: applicationApi.summary });
}

export function useApplication(id: string) {
  return useQuery({ queryKey: qk.application(id), queryFn: () => applicationApi.get(id), enabled: !!id });
}

export function useAdminApplications(q: AdminListQuery) {
  return useQuery({ queryKey: qk.adminList(q), queryFn: () => adminApi.list(q), placeholderData: (p) => p });
}

export function useAdminSummary() {
  return useQuery({ queryKey: qk.adminSummary, queryFn: adminApi.summary });
}

export function useAdminStats() {
  return useQuery({ queryKey: qk.adminStats, queryFn: adminApi.stats });
}

export function useAdminApplication(id: string) {
  return useQuery({ queryKey: qk.adminApplication(id), queryFn: () => adminApi.get(id), enabled: !!id });
}

export function useNotifications() {
  const user = useAuthStore((s) => s.user);
  return useQuery({ queryKey: qk.notifications, queryFn: notificationApi.list, enabled: !!user });
}

export function useInvalidateAll() {
  const qc = useQueryClient();
  return () => {
    qc.invalidateQueries({ queryKey: ["applications"] });
    qc.invalidateQueries({ queryKey: ["admin"] });
    qc.invalidateQueries({ queryKey: ["notifications"] });
  };
}

/** Mutasi generik yang otomatis me-refresh cache terkait. */
export function useAppMutation<TArgs, TRes>(fn: (args: TArgs) => Promise<TRes>) {
  const invalidate = useInvalidateAll();
  return useMutation({ mutationFn: fn, onSuccess: () => invalidate() });
}
