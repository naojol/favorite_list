"use client";

import { useState } from "react";
import { cn } from "@/lib/cn";
import {
  coolingInfo,
  deadlineInfo,
  formatNum,
  STATUS_LABELS,
} from "@/lib/priority";
import type { ItemStatus, WishlistItem } from "@/lib/types";
import { NecessityDots } from "./ui/NecessityRating";
import {
  BagIcon,
  CalendarIcon,
  ExternalIcon,
  PauseCircleIcon,
  PencilIcon,
  SparkleIcon,
  TrashIcon,
  UndoIcon,
} from "./ui/icons";

const chip =
  "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[0.75rem] font-[620] leading-tight";

const deadlineStyle: Record<string, string> = {
  overdue: "text-danger bg-danger/12",
  urgent: "text-warn bg-warn/15",
  soon: "text-accent bg-accent/12",
  far: "text-secondary bg-foreground/8",
};

function DeadlineChip({ item }: { item: WishlistItem }) {
  const info = deadlineInfo(item);
  if (info.level === "none") return null;
  return (
    <span className={cn(chip, deadlineStyle[info.level])}>
      <CalendarIcon className="h-3.5 w-3.5" />
      {info.label}
    </span>
  );
}

function IconAction({
  label,
  onClick,
  danger,
  children,
}: {
  label: string;
  onClick: () => void;
  danger?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      className={cn(
        "pressable focus-ring flex h-9 w-9 items-center justify-center rounded-full",
        danger ? "text-danger" : "text-secondary hover:text-foreground"
      )}
    >
      {children}
    </button>
  );
}

export function ItemCard({
  item,
  onEdit,
  onStatus,
  onDelete,
}: {
  item: WishlistItem;
  onEdit: (item: WishlistItem) => void;
  onStatus: (item: WishlistItem, status: ItemStatus) => void;
  onDelete: (item: WishlistItem) => void;
}) {
  const [imgOk, setImgOk] = useState(true);
  const cool = coolingInfo(item);
  const isActive = item.status === "active";
  const showImg = item.imageUrl && imgOk;

  return (
    <article
      className={cn(
        "card p-3.5 transition-opacity",
        !isActive && "opacity-70"
      )}
    >
      <div className="flex gap-3.5">
        {showImg ? (
          // 任意の外部サイト由来のため素の img を使用（next/image は使わない）
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={item.imageUrl as string}
            alt=""
            loading="lazy"
            referrerPolicy="no-referrer"
            onError={() => setImgOk(false)}
            className="h-[68px] w-[68px] flex-shrink-0 rounded-[14px] border border-separator object-cover"
          />
        ) : (
          <div className="flex h-[68px] w-[68px] flex-shrink-0 items-center justify-center rounded-[14px] border border-separator bg-surface2 text-tertiary">
            <BagIcon className="h-6 w-6" />
          </div>
        )}

        <div className="min-w-0 flex-1">
          <button
            type="button"
            onClick={() => onEdit(item)}
            className="focus-ring block w-full rounded-md text-left"
          >
            <h3 className="t-headline line-clamp-2">{item.title}</h3>
          </button>

          <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 t-caption">
            {item.siteName && <span className="truncate">{item.siteName}</span>}
            {item.url && (
              <a
                href={item.url}
                target="_blank"
                rel="noreferrer noopener"
                className="focus-ring inline-flex items-center gap-0.5 rounded text-accent"
              >
                リンク
                <ExternalIcon className="h-3 w-3" />
              </a>
            )}
          </div>

          <div className="mt-1.5">
            {item.price != null ? (
              <p className="t-title tabnum leading-none">
                <span className="mr-0.5 text-[0.75em] text-secondary">¥</span>
                {formatNum(item.price)}
              </p>
            ) : (
              <button
                type="button"
                onClick={() => onEdit(item)}
                className="focus-ring rounded-full text-[0.9375rem] font-[620] text-accent"
              >
                ＋ 価格を入力
              </button>
            )}
          </div>
        </div>
      </div>

      {item.note && (
        <p className="mt-2.5 rounded-xl bg-surface2 px-3 py-2 t-callout text-secondary">
          {item.note}
        </p>
      )}

      <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-separator pt-3">
        <NecessityDots value={item.necessity} />
        <DeadlineChip item={item} />
        {isActive && cool.cooling && (
          <span
            className={cn(chip, "text-secondary bg-foreground/8")}
            title="衝動買い防止：数日おいてから決めましょう"
          >
            <SparkleIcon className="h-3.5 w-3.5" />
            寝かせ中・{cool.days}日
          </span>
        )}
        {!isActive && (
          <span
            className={cn(
              chip,
              item.status === "purchased"
                ? "text-success bg-success/12"
                : "text-secondary bg-foreground/8"
            )}
          >
            {STATUS_LABELS[item.status]}
          </span>
        )}

        <div className="ml-auto flex items-center">
          <IconAction label="編集" onClick={() => onEdit(item)}>
            <PencilIcon className="h-[18px] w-[18px]" />
          </IconAction>
          {isActive ? (
            <>
              <IconAction
                label="購入した"
                onClick={() => onStatus(item, "purchased")}
              >
                <BagIcon className="h-[18px] w-[18px]" />
              </IconAction>
              <IconAction
                label="見送る"
                onClick={() => onStatus(item, "dropped")}
              >
                <PauseCircleIcon className="h-[18px] w-[18px]" />
              </IconAction>
            </>
          ) : (
            <IconAction
              label="検討中に戻す"
              onClick={() => onStatus(item, "active")}
            >
              <UndoIcon className="h-[18px] w-[18px]" />
            </IconAction>
          )}
          <IconAction label="削除" danger onClick={() => onDelete(item)}>
            <TrashIcon className="h-[18px] w-[18px]" />
          </IconAction>
        </div>
      </div>
    </article>
  );
}
