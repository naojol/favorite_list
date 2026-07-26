"use client";

import { useEffect, useRef, useState } from "react";
import { addItem, editItem, fetchProductMeta } from "@/app/actions";
import { cn } from "@/lib/cn";
import { formatThousandsInput } from "@/lib/priority";
import type { WishlistItem } from "@/lib/types";
import { Button } from "./ui/Button";
import { NecessityRating } from "./ui/NecessityRating";
import { Sheet } from "./ui/Sheet";
import { SparkleIcon } from "./ui/icons";

function pad(n: number) {
  return String(n).padStart(2, "0");
}
function isoDate(d: Date) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
function endOfThisMonth() {
  const n = new Date();
  return isoDate(new Date(n.getFullYear(), n.getMonth() + 1, 0));
}
function addMonths(m: number) {
  const n = new Date();
  return isoDate(new Date(n.getFullYear(), n.getMonth() + m, n.getDate()));
}

export function AddItemSheet({
  open,
  initial,
  onOpenChange,
}: {
  open: boolean;
  initial: WishlistItem | null;
  onOpenChange: (open: boolean) => void;
}) {
  // 開くたびにフォームを作り直して初期値をリセットする
  const [session, setSession] = useState(0);
  const prevOpen = useRef(false);
  useEffect(() => {
    if (open && !prevOpen.current) setSession((s) => s + 1);
    prevOpen.current = open;
  }, [open]);

  return (
    <Sheet
      open={open}
      onOpenChange={onOpenChange}
      title={initial ? "ほしいものを編集" : "ほしいものを追加"}
      description="リンクから商品名と価格を取り込み、必要度と期限を設定します"
    >
      <AddItemForm
        key={session}
        initial={initial}
        onDone={() => onOpenChange(false)}
      />
    </Sheet>
  );
}

function AddItemForm({
  initial,
  onDone,
}: {
  initial: WishlistItem | null;
  onDone: () => void;
}) {
  const isEdit = !!initial;
  const [url, setUrl] = useState(initial?.url ?? "");
  const [title, setTitle] = useState(initial?.title ?? "");
  const [price, setPrice] = useState(
    initial?.price != null ? formatThousandsInput(String(initial.price)) : ""
  );
  const [currency, setCurrency] = useState(initial?.currency ?? "JPY");
  const [imageUrl, setImageUrl] = useState<string | null>(
    initial?.imageUrl ?? null
  );
  const [siteName, setSiteName] = useState<string | null>(
    initial?.siteName ?? null
  );
  const [necessity, setNecessity] = useState(initial?.necessity ?? 3);
  const [wantBy, setWantBy] = useState(initial?.wantBy ?? "");
  const [note, setNote] = useState(initial?.note ?? "");

  const [fetching, setFetching] = useState(false);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ type: "error" | "ok"; text: string } | null>(
    null
  );
  const [imgOk, setImgOk] = useState(true);

  async function handleFetch() {
    const u = url.trim();
    if (!u || fetching) return;
    setFetching(true);
    setMsg(null);
    try {
      const meta = await fetchProductMeta(u);
      if (meta.title) setTitle(meta.title);
      if (meta.price != null) setPrice(String(meta.price));
      if (meta.currency) setCurrency(meta.currency);
      if (meta.imageUrl) {
        setImageUrl(meta.imageUrl);
        setImgOk(true);
      }
      if (meta.siteName) setSiteName(meta.siteName);
      if (meta.error) {
        setMsg({ type: "error", text: `${meta.error}。手動で入力できます。` });
      } else {
        setMsg({ type: "ok", text: "商品情報を読み込みました" });
      }
    } catch {
      setMsg({
        type: "error",
        text: "取得に失敗しました。手動で入力してください。",
      });
    } finally {
      setFetching(false);
    }
  }

  async function handleSave() {
    if (!title.trim()) {
      setMsg({ type: "error", text: "商品名を入力してください" });
      return;
    }
    setSaving(true);
    setMsg(null);
    const priceNum =
      price.trim() === "" ? null : Number(price.replace(/[^\d.]/g, ""));
    const payload = {
      url: url.trim(),
      title: title.trim(),
      price: Number.isFinite(priceNum as number) ? priceNum : null,
      currency,
      imageUrl,
      siteName,
      necessity,
      wantBy: wantBy || null,
      note: note.trim() || null,
    };
    try {
      if (isEdit) await editItem(initial!.id, payload);
      else await addItem(payload);
      onDone();
    } catch (e) {
      setMsg({
        type: "error",
        text: (e as Error).message || "保存に失敗しました",
      });
      setSaving(false);
    }
  }

  return (
    <div className="space-y-5 pb-2">
      {/* URL 取り込み */}
      <div className="space-y-2">
        <label htmlFor="wl-url" className="t-subhead block font-[620]">
          商品リンク
        </label>
        <div className="flex gap-2">
          <input
            id="wl-url"
            type="url"
            inputMode="url"
            placeholder="https://..."
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleFetch();
              }
            }}
            className="field flex-1"
          />
          <Button
            variant="secondary"
            onClick={handleFetch}
            disabled={!url.trim() || fetching}
            className="flex-shrink-0"
          >
            {fetching ? "読込中…" : "読み込む"}
          </Button>
        </div>
        {msg && (
          <p
            className={cn(
              "t-caption",
              msg.type === "error" ? "text-danger" : "text-success"
            )}
          >
            {msg.text}
          </p>
        )}
      </div>

      {/* プレビュー */}
      {imageUrl && imgOk && (
        <div className="flex items-center gap-3 rounded-2xl border border-separator bg-surface2 p-2.5">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={imageUrl}
            alt=""
            referrerPolicy="no-referrer"
            onError={() => setImgOk(false)}
            className="h-14 w-14 flex-shrink-0 rounded-xl object-cover"
          />
          <span className="t-caption truncate">{siteName ?? url}</span>
        </div>
      )}

      {/* 商品名 */}
      <div className="space-y-2">
        <label htmlFor="wl-title" className="t-subhead block font-[620]">
          商品名 <span className="text-danger">*</span>
        </label>
        <input
          id="wl-title"
          type="text"
          placeholder="例：ワイヤレスヘッドホン"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="field"
        />
      </div>

      {/* 価格 */}
      <div className="space-y-2">
        <label htmlFor="wl-price" className="t-subhead block font-[620]">
          価格
        </label>
        <div className="relative">
          <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-secondary">
            ¥
          </span>
          <input
            id="wl-price"
            type="text"
            inputMode="numeric"
            placeholder="未入力"
            value={price}
            onChange={(e) => setPrice(formatThousandsInput(e.target.value))}
            className="field field-yen tabnum"
          />
        </div>
      </div>

      {/* 必要度 */}
      <div className="space-y-2">
        <span className="t-subhead block font-[620]">必要度</span>
        <NecessityRating value={necessity} onChange={setNecessity} />
        <p className="t-caption flex items-start gap-1 text-tertiary">
          <SparkleIcon className="mt-px h-3.5 w-3.5 flex-shrink-0" />
          本当に必要か、いったん立ち止まって整理しましょう。
        </p>
      </div>

      {/* 期限 */}
      <div className="space-y-2">
        <label htmlFor="wl-date" className="t-subhead block font-[620]">
          いつまでにほしい？
        </label>
        <div className="flex items-center gap-2">
          <input
            id="wl-date"
            type="date"
            value={wantBy}
            min="2000-01-01"
            max="2100-12-31"
            onChange={(e) => setWantBy(e.target.value)}
            className="field flex-1"
          />
          {wantBy && (
            <button
              type="button"
              onClick={() => setWantBy("")}
              className="pressable focus-ring t-callout rounded-full px-2 font-[600] text-secondary"
            >
              クリア
            </button>
          )}
        </div>
        <div className="flex flex-wrap gap-1.5">
          {[
            { label: "今月末", value: endOfThisMonth() },
            { label: "3ヶ月後", value: addMonths(3) },
            { label: "半年後", value: addMonths(6) },
          ].map((p) => (
            <button
              key={p.label}
              type="button"
              onClick={() => setWantBy(p.value)}
              className={cn(
                "pressable focus-ring rounded-full border px-3 py-1 text-[0.8125rem] font-[600] transition-colors",
                wantBy === p.value
                  ? "border-accent bg-accent/10 text-accent"
                  : "border-separator text-secondary"
              )}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* メモ */}
      <div className="space-y-2">
        <label htmlFor="wl-note" className="t-subhead block font-[620]">
          メモ（任意）
        </label>
        <textarea
          id="wl-note"
          rows={2}
          placeholder="迷っている理由、代替案など"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          className="field resize-none"
        />
      </div>

      {/* 操作 */}
      <div className="flex items-center gap-2 pt-1">
        <Button
          variant="primary"
          onClick={handleSave}
          disabled={saving}
          className="flex-1"
        >
          {saving ? "保存中…" : isEdit ? "変更を保存" : "リストに追加"}
        </Button>
        <Button variant="ghost" onClick={onDone} disabled={saving}>
          キャンセル
        </Button>
      </div>
    </div>
  );
}
