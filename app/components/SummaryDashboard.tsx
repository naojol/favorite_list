"use client";

import { cn } from "@/lib/cn";
import { type Aggregates, formatNum, formatYen } from "@/lib/priority";
import { CountUp } from "./ui/CountUp";

const NEC_OPACITY = [0.28, 0.45, 0.62, 0.8, 1] as const;

function Stat({
  label,
  tone = "default",
  onClick,
  children,
}: {
  label: string;
  tone?: "default" | "success" | "danger" | "accent";
  onClick?: () => void;
  children: React.ReactNode;
}) {
  const toneText =
    tone === "success"
      ? "text-success"
      : tone === "danger"
        ? "text-danger"
        : tone === "accent"
          ? "text-accent"
          : "text-foreground";
  const Comp = onClick ? "button" : "div";
  return (
    <Comp
      {...(onClick ? { type: "button", onClick } : {})}
      className={cn(
        "flex flex-col justify-between rounded-2xl border border-separator bg-surface2 p-3 text-left",
        onClick && "pressable focus-ring"
      )}
    >
      <span className="t-caption">{label}</span>
      <span className={cn("mt-1 t-headline tabnum", toneText)}>{children}</span>
    </Comp>
  );
}

export function SummaryDashboard({
  agg,
  onOpenSettings,
}: {
  agg: Aggregates;
  onOpenSettings: () => void;
}) {
  const totalActive = agg.byNecessity.reduce((a, b) => a + b, 0);

  return (
    <section className="card relative overflow-hidden p-5">
      {/* 装飾グラデーション（アクセントを薄く） */}
      <div
        aria-hidden
        className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-accent/10 blur-2xl"
      />

      <div className="relative">
        <p className="t-subhead">ほしいもの合計</p>
        <p className="t-display mt-1 leading-none">
          <span className="mr-1 align-top text-[0.42em] font-[650] text-secondary">
            ¥
          </span>
          <CountUp value={agg.totalYen} format={formatNum} />
        </p>
        <p className="mt-2 t-callout text-secondary">
          検討中{" "}
          <span className="font-[680] text-foreground tabnum">
            {agg.activeCount}
          </span>
          件
          {agg.unknownPriceCount > 0 && (
            <span className="text-tertiary">
              {" "}
              ・ {agg.unknownPriceCount}件は価格未取得
            </span>
          )}
        </p>

        {/* 必要度の内訳バー */}
        {totalActive > 0 && (
          <div className="mt-4">
            <div className="flex h-2 w-full overflow-hidden rounded-full bg-foreground/8">
              {agg.byNecessity.map((count, i) =>
                count > 0 ? (
                  <div
                    key={i}
                    title={`必要度${i + 1}: ${count}件`}
                    style={{
                      width: `${(count / totalActive) * 100}%`,
                      backgroundColor: `color-mix(in srgb, var(--accent) ${
                        NEC_OPACITY[i] * 100
                      }%, transparent)`,
                    }}
                  />
                ) : null
              )}
            </div>
            <p className="mt-1.5 t-caption text-tertiary">
              必要度が高いほど濃く表示（右が「絶対ほしい」）
            </p>
          </div>
        )}

        {/* 統計ピル */}
        <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {agg.monthlyBudget && agg.monthsToAfford ? (
            <Stat label="全部買うには" onClick={onOpenSettings}>
              約{agg.monthsToAfford}ヶ月
            </Stat>
          ) : (
            <Stat label="月予算" tone="accent" onClick={onOpenSettings}>
              設定する
            </Stat>
          )}

          <Stat
            label="期限が近い"
            tone={agg.overdueCount > 0 ? "danger" : "default"}
          >
            {agg.soonCount}件
            {agg.overdueCount > 0 && (
              <span className="t-caption font-[600] text-danger">
                {" "}
                (超過{agg.overdueCount})
              </span>
            )}
          </Stat>

          <Stat label="我慢できた金額" tone="success">
            {agg.savedYen > 0 ? formatYen(agg.savedYen) : "—"}
          </Stat>

          <Stat label="購入済み">
            {agg.purchasedCount > 0 ? `${agg.purchasedCount}件` : "—"}
          </Stat>
        </div>
      </div>
    </section>
  );
}
