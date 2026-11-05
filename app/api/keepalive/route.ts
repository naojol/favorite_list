import { timingSafeEqual } from "node:crypto";
import { getStore } from "@/lib/db";

// 常に実行時に評価（キャッシュされると DB に触れず意味がなくなる）
export const dynamic = "force-dynamic";

function authorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false; // 未設定なら誰も通さない
  const expected = Buffer.from(`Bearer ${secret}`);
  const actual = Buffer.from(request.headers.get("authorization") ?? "");
  return (
    actual.length === expected.length && timingSafeEqual(actual, expected)
  );
}

/**
 * Vercel Cron から毎日呼ばれ、DB に軽いクエリを投げる。
 * Supabase 無料プランの「低アクティビティによる自動停止」を避けるための
 * キープアライブ（防げることが多いが確実ではない）。
 * CRON_SECRET を設定すると、Vercel が Authorization: Bearer を自動付与する。
 */
export async function GET(request: Request) {
  if (!authorized(request)) {
    return Response.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }
  try {
    await getStore().ping();
    return Response.json({ ok: true, at: new Date().toISOString() });
  } catch (e) {
    console.error("[keepalive] DB ping failed:", e);
    return Response.json({ ok: false, error: "db_unreachable" }, { status: 503 });
  }
}
