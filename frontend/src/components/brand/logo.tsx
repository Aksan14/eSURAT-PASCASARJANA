import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/utils";

/**
 * Logo e-SURAT Pascasarjana (public/brand/esurat.webp, 640×472).
 * `variant="emblem"` hanya ikon (tanpa teks) untuk ruang sempit.
 */
export function Logo({
  href = "/",
  height = 40,
  variant = "full",
  className,
  priority,
}: {
  href?: string;
  height?: number;
  variant?: "full" | "emblem";
  className?: string;
  priority?: boolean;
}) {
  const ratio = variant === "full" ? 640 / 472 : 1;
  const src = variant === "full" ? "/brand/esurat.webp" : "/brand/icon-192.png";
  const width = Math.round(height * ratio);
  return (
    <Link
      href={href}
      className={cn("inline-flex shrink-0 items-center", className)}
      aria-label="e-SURAT Pascasarjana Universitas Muhammadiyah Makassar"
    >
      <Image src={src} alt="e-SURAT Pascasarjana Unismuh Makassar" width={width} height={height} priority={priority} />
    </Link>
  );
}
