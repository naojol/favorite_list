"use client";

import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "sm" | "md";

const base =
  "pressable focus-ring inline-flex items-center justify-center gap-1.5 rounded-full select-none disabled:opacity-45 disabled:pointer-events-none";

const sizes: Record<Size, string> = {
  sm: "h-9 px-3.5 text-[0.875rem] font-[620]",
  md: "h-11 px-5 text-[1rem] font-[620]",
};

const variants: Record<Variant, string> = {
  primary: "bg-accent text-accentfg",
  secondary: "bg-surface2 text-foreground border border-separator",
  ghost: "text-accent",
  danger: "text-danger",
};

export function Button({
  variant = "secondary",
  size = "md",
  className,
  type = "button",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: Size;
}) {
  return (
    <button
      type={type}
      className={cn(base, sizes[size], variants[variant], className)}
      {...props}
    />
  );
}
