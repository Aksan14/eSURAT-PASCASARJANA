"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { UserResponse } from "@/types/api";
import { tokenStore } from "@/lib/api/client";

interface AuthState {
  user: UserResponse | null;
  hydrated: boolean;
  setSession: (user: UserResponse, token: string) => void;
  clear: () => void;
  setHydrated: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      hydrated: false,
      setSession: (user, token) => {
        tokenStore.set(token);
        set({ user });
      },
      clear: () => {
        tokenStore.clear();
        set({ user: null });
      },
      setHydrated: () => set({ hydrated: true }),
    }),
    {
      name: "pps.persuratan.auth",
      partialize: (s) => ({ user: s.user }),
      onRehydrateStorage: () => (state) => state?.setHydrated(),
    },
  ),
);
