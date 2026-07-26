// 表示・優先度・集計のためのピュアなヘルパー（サーバー/クライアント共通）。
import type { AppSettings, ItemStatus, WishlistItem } from "./types";

/* ---------- 定数 ---------- */
export const COOL_DAYS = 3; // 追加から何日以内を「冷却期間」とみなすか
const URGENT_DAYS = 7;
const SOON_DAYS = 30;

/* ---------- 金額 ---------- */
const yenFmt = new Intl.NumberFormat("ja-JP", {
  style: "currency",
  currency: "JPY",
  maximumFractionDigits: 0,
});
const numFmt = new Intl.NumberFormat("ja-JP", { maximumFractionDigits: 0 });

/** ¥12,345 形式。null は「—」 */
export function formatYen(n: number | null | undefined): string {
  if (n == null) return "—";
  return yenFmt.format(n);
}

/** 記号なしの 12,345 形式（¥ を別に描画したいとき用） */
export function formatNum(n: number | null | undefined): string {
  if (n == null) return "—";
  return numFmt.format(n);
}

/* ---------- 日付 ---------- */

/** ローカル午前0時（時刻を切り捨てた Date） */
function startOfToday(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

/** 'YYYY-MM-DD' を午前0時の Date に */
function parseDate(dateStr: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(dateStr);
  if (!m) return null;
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
}

const DAY_MS = 86_400_000;

/** 期限までの残り日数。正=未来, 0=今日, 負=超過。未設定/不正は null */
export function daysUntil(dateStr: string | null): number | null {
  if (!dateStr) return null;
  const d = parseDate(dateStr);
  if (!d) return null;
  return Math.round((d.getTime() - startOfToday().getTime()) / DAY_MS);
}

/** 追加(ISO)からの経過日数 */
export function daysSince(iso: string): number {
  const d = new Date(iso);
  const day = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  return Math.round((startOfToday().getTime() - day.getTime()) / DAY_MS);
}

export function formatDate(dateStr: string): string {
  const d = parseDate(dateStr);
  if (!d) return dateStr;
  return `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()}`;
}

export type UrgencyLevel = "none" | "far" | "soon" | "urgent" | "overdue";

export interface DeadlineInfo {
  level: UrgencyLevel;
  /** 「あと3日」「今日」「3日超過」など */
  label: string;
  days: number | null;
}

export function deadlineInfo(item: WishlistItem): DeadlineInfo {
  const days = daysUntil(item.wantBy);
  if (days === null) return { level: "none", label: "", days: null };
  let level: UrgencyLevel;
  let label: string;
  if (days < 0) {
    level = "overdue";
    label = `${Math.abs(days)}日超過`;
  } else if (days === 0) {
    level = "urgent";
    label = "今日まで";
  } else if (days <= URGENT_DAYS) {
    level = "urgent";
    label = `あと${days}日`;
  } else if (days <= SOON_DAYS) {
    level = "soon";
    label = `あと${days}日`;
  } else {
    level = "far";
    label = `あと${days}日`;
  }
  return { level, label, days };
}

/* ---------- 冷却期間 ---------- */
export interface CoolingInfo {
  days: number; // 追加からの日数
  cooling: boolean; // まだ寝かせ期間中か
}

export function coolingInfo(item: WishlistItem): CoolingInfo {
  const days = daysSince(item.createdAt);
  return { days, cooling: days < COOL_DAYS };
}

/* ---------- 優先度スコア ---------- */
/**
 * 「おすすめ順」用の透明なスコア。
 * 必要度(大きいほど高)と期限の近さ(近いほど高)を合算。
 */
export function priorityScore(item: WishlistItem): number {
  let score = item.necessity * 16; // 16..80
  const days = daysUntil(item.wantBy);
  if (days !== null) {
    if (days < 0) score += 40;
    else if (days <= URGENT_DAYS) score += 30;
    else if (days <= SOON_DAYS) score += 18;
    else if (days <= 90) score += 8;
    else score += 3;
  }
  return score;
}

/* ---------- 集計 ---------- */
export interface Aggregates {
  activeCount: number;
  totalYen: number;
  /** 価格未取得の active 件数 */
  unknownPriceCount: number;
  /** 必要度別の active 件数（index 0 が必要度1） */
  byNecessity: [number, number, number, number, number];
  monthlyBudget: number | null;
  /** 現在の月予算で全部買うのにかかる月数 */
  monthsToAfford: number | null;
  nextDeadline: { item: WishlistItem; info: DeadlineInfo } | null;
  overdueCount: number;
  soonCount: number; // 30日以内（超過含む）
  /** 見送った合計（＝我慢できた金額） */
  savedYen: number;
  droppedCount: number;
  purchasedYen: number;
  purchasedCount: number;
}

export function computeAggregates(
  items: WishlistItem[],
  settings: AppSettings
): Aggregates {
  const active = items.filter((i) => i.status === "active");
  const dropped = items.filter((i) => i.status === "dropped");
  const purchased = items.filter((i) => i.status === "purchased");

  const totalYen = sumPrice(active);
  const unknownPriceCount = active.filter((i) => i.price == null).length;
  const byNecessity: [number, number, number, number, number] = [0, 0, 0, 0, 0];
  for (const i of active) {
    const idx = Math.min(5, Math.max(1, i.necessity)) - 1;
    byNecessity[idx] += 1;
  }

  const monthlyBudget = settings.monthlyBudget;
  const monthsToAfford =
    monthlyBudget && monthlyBudget > 0 && totalYen > 0
      ? Math.ceil(totalYen / monthlyBudget)
      : null;

  let nextDeadline: Aggregates["nextDeadline"] = null;
  let overdueCount = 0;
  let soonCount = 0;
  for (const i of active) {
    const info = deadlineInfo(i);
    if (info.days === null) continue;
    if (info.days < 0) overdueCount += 1;
    if (info.days <= SOON_DAYS) soonCount += 1;
    if (!nextDeadline || info.days < (nextDeadline.info.days ?? Infinity)) {
      nextDeadline = { item: i, info };
    }
  }

  return {
    activeCount: active.length,
    totalYen,
    unknownPriceCount,
    byNecessity,
    monthlyBudget,
    monthsToAfford,
    nextDeadline,
    overdueCount,
    soonCount,
    savedYen: sumPrice(dropped),
    droppedCount: dropped.length,
    purchasedYen: sumPrice(purchased),
    purchasedCount: purchased.length,
  };
}

function sumPrice(items: WishlistItem[]): number {
  return items.reduce((acc, i) => acc + (i.price ?? 0), 0);
}

/* ---------- 並び替え ---------- */
export type SortKey =
  | "recommended"
  | "necessity"
  | "deadline"
  | "price-desc"
  | "price-asc"
  | "created";

export const SORT_LABELS: Record<SortKey, string> = {
  recommended: "おすすめ順",
  necessity: "必要度順",
  deadline: "期限が近い順",
  "price-desc": "高い順",
  "price-asc": "安い順",
  created: "追加が新しい順",
};

export function sortItems(items: WishlistItem[], key: SortKey): WishlistItem[] {
  const arr = [...items];
  switch (key) {
    case "recommended":
      return arr.sort((a, b) => priorityScore(b) - priorityScore(a));
    case "necessity":
      return arr.sort(
        (a, b) =>
          b.necessity - a.necessity || priorityScore(b) - priorityScore(a)
      );
    case "deadline":
      return arr.sort((a, b) => {
        const da = daysUntil(a.wantBy);
        const db = daysUntil(b.wantBy);
        if (da === null && db === null) return 0;
        if (da === null) return 1; // 期限なしは後ろ
        if (db === null) return -1;
        return da - db;
      });
    case "price-desc":
      return arr.sort((a, b) => (b.price ?? -1) - (a.price ?? -1));
    case "price-asc":
      return arr.sort(
        (a, b) => (a.price ?? Infinity) - (b.price ?? Infinity)
      );
    case "created":
      return arr.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }
}

export const STATUS_LABELS: Record<ItemStatus, string> = {
  active: "検討中",
  purchased: "購入済み",
  dropped: "見送り",
};
