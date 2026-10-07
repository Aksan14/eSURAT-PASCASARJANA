"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";
import { Toaster } from "sonner";

export function Providers({ children }: { children: React.ReactNode }) {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: { staleTime: 15_000, refetchOnWindowFocus: false, retry: 1 },
        },
      }),
  );

  return (
    <QueryClientProvider client={client}>
      {children}
      <Toaster
        position="top-right"
        offset={{ top: 112, right: 24 }}
        gap={10}
        visibleToasts={4}
        toastOptions={{
          style: {
            background: "rgba(255,255,255,0.95)",
            backdropFilter: "saturate(180%) blur(20px)",
            border: "1px solid rgba(0,0,0,0.08)",
            borderRadius: 18,
            color: "#1d1d1f",
            fontSize: 15,
            letterSpacing: "-0.224px",
            padding: "14px 18px",
            boxShadow: "0 12px 40px -8px rgba(0,0,0,0.25)",
          },
        }}
      />
    </QueryClientProvider>
  );
}
