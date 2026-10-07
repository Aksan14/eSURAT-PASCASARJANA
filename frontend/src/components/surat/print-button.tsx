"use client";

import { useState } from "react";
import { Printer } from "lucide-react";
import { toast } from "sonner";
import { printDocument } from "@/lib/print";
import { Button, type ButtonProps } from "@/components/ui/button";

/** Tombol cetak langsung: memanggil dialog cetak browser tanpa membuka tab baru. */
export function PrintButton({
  path,
  params,
  children = "Cetak",
  ...props
}: { path: string; params?: Record<string, string | undefined> } & Omit<ButtonProps, "onClick" | "loading">) {
  const [busy, setBusy] = useState(false);
  return (
    <Button
      {...props}
      loading={busy}
      onClick={async () => {
        setBusy(true);
        try {
          await printDocument(path, params);
        } catch {
          toast.error("Gagal menyiapkan cetakan. Coba unduh berkasnya.");
        } finally {
          setBusy(false);
        }
      }}
    >
      {!busy && <Printer className="size-4" />} {children}
    </Button>
  );
}
