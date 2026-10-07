import * as React from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

type Variant = "primary" | "secondary" | "dark" | "pearl" | "ghost" | "danger";
type Size = "md" | "sm" | "lg";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
}

const base =
  "press focus-ring inline-flex items-center justify-center gap-2 whitespace-nowrap font-normal disabled:pointer-events-none disabled:opacity-40";

const variants: Record<Variant, string> = {
  // button-primary: Action Blue pill
  primary: "rounded-pill bg-primary text-on-primary hover:bg-primary-focus",
  // button-secondary-pill: ghost pill, blue text + blue border
  secondary: "rounded-pill border border-primary bg-transparent text-primary hover:bg-info-soft",
  // button-dark-utility: near-black, 8px radius
  dark: "rounded-sm bg-ink text-on-dark hover:bg-ink-muted-80",
  // button-pearl-capsule: 11px radius, soft ring
  pearl: "rounded-md bg-pearl text-ink-muted-80 ring-[3px] ring-divider-soft hover:bg-canvas",
  ghost: "rounded-pill bg-transparent text-primary hover:bg-divider-soft",
  danger: "rounded-pill border border-danger bg-transparent text-danger hover:bg-danger-soft",
};

const sizes: Record<Size, string> = {
  lg: "h-12 px-7 text-[18px] font-light",
  md: "h-11 px-[22px] text-body",
  sm: "h-9 px-4 text-caption",
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", loading, children, ...props }, ref) => (
    <button
      ref={ref}
      className={cn(base, variants[variant], sizes[size], className)}
      disabled={loading || props.disabled}
      {...props}
    >
      {loading && <Loader2 className="size-4 animate-spin" aria-hidden />}
      {children}
    </button>
  ),
);
Button.displayName = "Button";
