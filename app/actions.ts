"use server";

import { revalidatePath } from "next/cache";
import { getStore } from "@/lib/db";
import { fetchProduct } from "@/lib/product";
import type {
  ItemStatus,
  NewItemInput,
  ProductMeta,
  UpdateItemInput,
  WishlistItem,
} from "@/lib/types";

/* ---------- 商品メタ取得 ---------- */
export async function fetchProductMeta(url: string): Promise<ProductMeta> {
  return fetchProduct(url);
}

/* ---------- バリデーション ---------- */
function clampNecessity(n: unknown): number {
  const num = Number(n);
  if (!Number.isFinite(num)) return 3;
  return Math.min(5, Math.max(1, Math.round(num)));
}

function cleanPrice(p: unknown): number | null {
  if (p == null || p === "") return null;
  const num = Number(p);
  return Number.isFinite(num) && num >= 0 ? num : null;
}

function cleanDate(d: unknown): string | null {
  if (typeof d !== "string") return null;
  return /^\d{4}-\d{2}-\d{2}$/.test(d) ? d : null;
}

function cleanText(s: unknown): string | null {
  if (typeof s !== "string") return null;
  const t = s.trim();
  return t.length ? t : null;
}

/* ---------- CRUD ---------- */
export async function addItem(input: NewItemInput): Promise<WishlistItem> {
  const title = cleanText(input.title);
  if (!title) throw new Error("商品名を入力してください");

  const item = await getStore().createItem({
    url: cleanText(input.url) ?? "",
    title,
    price: cleanPrice(input.price),
    currency: cleanText(input.currency) ?? "JPY",
    imageUrl: cleanText(input.imageUrl),
    siteName: cleanText(input.siteName),
    necessity: clampNecessity(input.necessity),
    wantBy: cleanDate(input.wantBy),
    note: cleanText(input.note),
  });
  revalidatePath("/");
  return item;
}

export async function editItem(
  id: string,
  patch: UpdateItemInput
): Promise<WishlistItem | null> {
  const clean: UpdateItemInput = {};
  if (patch.url !== undefined) clean.url = cleanText(patch.url) ?? "";
  if (patch.title !== undefined) {
    const t = cleanText(patch.title);
    if (!t) throw new Error("商品名を入力してください");
    clean.title = t;
  }
  if (patch.price !== undefined) clean.price = cleanPrice(patch.price);
  if (patch.currency !== undefined)
    clean.currency = cleanText(patch.currency) ?? "JPY";
  if (patch.imageUrl !== undefined) clean.imageUrl = cleanText(patch.imageUrl);
  if (patch.siteName !== undefined) clean.siteName = cleanText(patch.siteName);
  if (patch.necessity !== undefined)
    clean.necessity = clampNecessity(patch.necessity);
  if (patch.wantBy !== undefined) clean.wantBy = cleanDate(patch.wantBy);
  if (patch.note !== undefined) clean.note = cleanText(patch.note);
  if (patch.status !== undefined) clean.status = patch.status;

  const updated = await getStore().updateItem(id, clean);
  revalidatePath("/");
  return updated;
}

export async function removeItem(id: string): Promise<void> {
  await getStore().deleteItem(id);
  revalidatePath("/");
}

export async function changeStatus(
  id: string,
  status: ItemStatus
): Promise<WishlistItem | null> {
  const updated = await getStore().updateItem(id, {
    status,
    purchasedAt: status === "purchased" ? new Date().toISOString() : null,
  });
  revalidatePath("/");
  return updated;
}

/* ---------- 設定 ---------- */
export async function saveMonthlyBudget(value: number | null): Promise<void> {
  const clean =
    value != null && Number.isFinite(value) && value > 0
      ? Math.round(value)
      : null;
  await getStore().setSetting("monthlyBudget", clean);
  revalidatePath("/");
}
