"use client";

import { useMemo, useState, useTransition } from "react";
import { MotionConfig } from "motion/react";
import { changeStatus, removeItem } from "@/app/actions";
import {
  computeAggregates,
  SORT_LABELS,
  type SortKey,
  sortItems,
} from "@/lib/priority";
import type { AppSettings, ItemStatus, WishlistItem } from "@/lib/types";
import { AddItemSheet } from "./AddItemSheet";
import { ItemList } from "./ItemList";
import { SettingsSheet } from "./SettingsSheet";
import { SummaryDashboard } from "./SummaryDashboard";
import { Button } from "./ui/Button";
import { Segmented } from "./ui/Segmented";
import { GearIcon, PlusIcon, SparkleIcon } from "./ui/icons";

export function AppShell({
  items,
  settings,
  usingLocalStore,
}: {
  items: WishlistItem[];
  settings: AppSettings;
  usingLocalStore: boolean;
}) {
  const [statusFilter, setStatusFilter] = useState<ItemStatus>("active");
  const [sort, setSort] = useState<SortKey>("recommended");
  const [addOpen, setAddOpen] = useState(false);
  const [editing, setEditing] = useState<WishlistItem | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [, startTransition] = useTransition();

  const agg = useMemo(
    () => computeAggregates(items, settings),
    [items, settings]
  );

  const counts = useMemo(
    () => ({
      active: items.filter((i) => i.status === "active").length,
      purchased: items.filter((i) => i.status === "purchased").length,
      dropped: items.filter((i) => i.status === "dropped").length,
    }),
    [items]
  );

  const visible = useMemo(() => {
    const filtered = items.filter((i) => i.status === statusFilter);
    return sortItems(filtered, sort);
  }, [items, statusFilter, sort]);

  function handleStatus(item: WishlistItem, status: ItemStatus) {
    startTransition(async () => {
      await changeStatus(item.id, status);
    });
  }

  function handleDelete(item: WishlistItem) {
    if (
      !window.confirm(`「${item.title}」を削除しますか？この操作は取り消せません。`)
    )
      return;
    startTransition(async () => {
      await removeItem(item.id);
    });
  }

  const sheetOpen = addOpen || editing !== null;

  return (
    <MotionConfig reducedMotion="user">
      <div className="min-h-full">
        <header className="sticky top-0 z-30 border-b border-separator material-chrome">
          <div className="mx-auto flex max-w-2xl items-center justify-between gap-3 px-4 py-2.5">
            <h1 className="t-headline">ほしいものマネージャー</h1>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                aria-label="設定"
                onClick={() => setSettingsOpen(true)}
                className="pressable focus-ring flex h-10 w-10 items-center justify-center rounded-full text-secondary"
              >
                <GearIcon className="h-[22px] w-[22px]" />
              </button>
              <Button
                variant="primary"
                size="sm"
                onClick={() => setAddOpen(true)}
              >
                <PlusIcon className="h-[18px] w-[18px]" />
                追加
              </Button>
            </div>
          </div>
        </header>

        <main className="mx-auto max-w-2xl space-y-5 px-4 pb-28 pt-4">
          {usingLocalStore && (
            <p className="rounded-xl border border-separator bg-surface2 px-3 py-2 t-caption text-secondary">
              ローカル保存モードで動作中（この端末のブラウザではなくサーバー内の
              JSON に保存）。本番では <code>DATABASE_URL</code>{" "}
              を設定するとクラウドに同期されます。
            </p>
          )}

          <SummaryDashboard agg={agg} onOpenSettings={() => setSettingsOpen(true)} />

          <div className="flex flex-wrap items-center justify-between gap-2">
            <Segmented
              ariaLabel="表示するステータス"
              value={statusFilter}
              onChange={setStatusFilter}
              options={[
                { value: "active", label: "検討中", badge: counts.active },
                {
                  value: "purchased",
                  label: "購入済み",
                  badge: counts.purchased,
                },
                { value: "dropped", label: "見送り", badge: counts.dropped },
              ]}
            />
            <label className="sr-only" htmlFor="wl-sort">
              並び替え
            </label>
            <select
              id="wl-sort"
              value={sort}
              onChange={(e) => setSort(e.target.value as SortKey)}
              className="focus-ring h-8 rounded-full border border-separator bg-surface2 px-3 text-[0.8125rem] font-[600] text-secondary"
            >
              {(Object.keys(SORT_LABELS) as SortKey[]).map((k) => (
                <option key={k} value={k}>
                  {SORT_LABELS[k]}
                </option>
              ))}
            </select>
          </div>

          {visible.length > 0 ? (
            <ItemList
              items={visible}
              onEdit={setEditing}
              onStatus={handleStatus}
              onDelete={handleDelete}
            />
          ) : (
            <EmptyState
              status={statusFilter}
              onAdd={() => setAddOpen(true)}
            />
          )}
        </main>

        <AddItemSheet
          open={sheetOpen}
          initial={editing}
          onOpenChange={(o) => {
            if (!o) {
              setAddOpen(false);
              setEditing(null);
            }
          }}
        />
        <SettingsSheet
          open={settingsOpen}
          monthlyBudget={settings.monthlyBudget}
          onOpenChange={setSettingsOpen}
        />
      </div>
    </MotionConfig>
  );
}

function EmptyState({
  status,
  onAdd,
}: {
  status: ItemStatus;
  onAdd: () => void;
}) {
  if (status === "active") {
    return (
      <div className="card flex flex-col items-center gap-3 px-6 py-12 text-center">
        <span className="flex h-14 w-14 items-center justify-center rounded-full bg-accent/12 text-accent">
          <SparkleIcon className="h-7 w-7" />
        </span>
        <h2 className="t-headline">ほしいものをためよう</h2>
        <p className="max-w-xs t-callout text-secondary">
          気になった商品のリンクを貼るだけ。商品名と価格を読み込んで、必要度や期限と一緒に整理できます。まずは一度ここにためて、落ち着いて考えましょう。
        </p>
        <Button variant="primary" onClick={onAdd} className="mt-1">
          <PlusIcon className="h-[18px] w-[18px]" />
          最初のひとつを追加
        </Button>
      </div>
    );
  }
  return (
    <div className="card px-6 py-10 text-center">
      <p className="t-callout text-secondary">
        {status === "purchased"
          ? "購入済みのアイテムはまだありません。"
          : "見送ったアイテムはまだありません。"}
      </p>
    </div>
  );
}
