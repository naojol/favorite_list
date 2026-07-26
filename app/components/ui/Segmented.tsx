"use client";

import { cn } from "@/lib/cn";

export interface SegOption<T extends string> {
  value: T;
  label: string;
  badge?: number;
}

export function Segmented<T extends string>({
  value,
  onChange,
  options,
  ariaLabel,
}: {
  value: T;
  onChange: (v: T) => void;
  options: SegOption<T>[];
  ariaLabel?: string;
}) {
  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className="inline-flex gap-0.5 rounded-full border border-separator bg-surface2 p-0.5"
    >
      {options.map((o) => {
        const active = value === o.value;
        return (
          <button
            key={o.value}
            role="tab"
            aria-selected={active}
            type="button"
            onClick={() => onChange(o.value)}
            className={cn(
              "pressable focus-ring flex h-8 items-center gap-1.5 rounded-full px-3.5 text-[0.8125rem] font-[600] transition-colors",
              active
                ? "bg-surface text-foreground shadow-[0_1px_3px_rgba(0,0,0,0.12)]"
                : "text-secondary"
            )}
          >
            {o.label}
            {o.badge != null && o.badge > 0 && (
              <span
                className={cn(
                  "tabnum min-w-4 rounded-full px-1 text-[0.6875rem] font-[650] leading-4",
                  active
                    ? "bg-accent/15 text-accent"
                    : "bg-foreground/10 text-secondary"
                )}
              >
                {o.badge}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
