"use client";

import { cn } from "@/lib/cn";

export const NECESSITY_LABELS = [
  "なくてもいい",
  "あれば便利",
  "ふつう",
  "ほしい",
  "絶対ほしい",
] as const;

/** 入力用：押した瞬間に反応する 5 段階ドット（apple-design §1: pointer-down） */
export function NecessityRating({
  value,
  onChange,
  showLabel = true,
}: {
  value: number;
  onChange: (n: number) => void;
  showLabel?: boolean;
}) {
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
      <div role="group" aria-label="必要度" className="flex items-center gap-1.5">
        {[1, 2, 3, 4, 5].map((n) => {
          const filled = value >= n;
          return (
            <button
              key={n}
              type="button"
              aria-label={`必要度 ${n}（${NECESSITY_LABELS[n - 1]}）`}
              aria-pressed={filled}
              onPointerDown={() => onChange(n)}
              onClick={() => onChange(n)}
              className="pressable focus-ring rounded-full p-0.5"
            >
              <span
                className={cn(
                  "block h-6 w-6 rounded-full border-2 transition-colors duration-150",
                  filled
                    ? "border-accent bg-accent"
                    : "border-separator bg-transparent"
                )}
              />
            </button>
          );
        })}
      </div>
      {showLabel && (
        <span className="t-callout font-[620] text-accent">
          {NECESSITY_LABELS[Math.min(5, Math.max(1, value)) - 1]}
        </span>
      )}
    </div>
  );
}

/** 表示用：読み取り専用の小さいドット */
export function NecessityDots({
  value,
  className,
}: {
  value: number;
  className?: string;
}) {
  return (
    <div
      className={cn("flex items-center gap-1", className)}
      title={`必要度 ${value}/5: ${NECESSITY_LABELS[Math.min(5, Math.max(1, value)) - 1]}`}
    >
      {[1, 2, 3, 4, 5].map((n) => (
        <span
          key={n}
          className={cn(
            "h-[7px] w-[7px] rounded-full",
            value >= n ? "bg-accent" : "bg-foreground/15"
          )}
        />
      ))}
    </div>
  );
}
