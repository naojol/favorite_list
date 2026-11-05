import { getStore, isUsingLocalStore } from "@/lib/db";
import type { AppSettings, WishlistItem } from "@/lib/types";
import { AppShell } from "./components/AppShell";
import { DbErrorScreen } from "./components/ErrorScreen";

// 個人用・小規模。常に最新データを表示し、ビルド時の DB アクセスを避ける。
export const dynamic = "force-dynamic";

export default async function Home() {
  const store = getStore();
  let items: WishlistItem[];
  let settings: AppSettings;
  try {
    [items, settings] = await Promise.all([
      store.listItems(),
      store.getSettings(),
    ]);
  } catch (e) {
    // Vercel の Logs で原因を追えるよう記録し、汎用エラーではなく案内画面を出す
    console.error("[page] DB への接続/読み込みに失敗:", e);
    return <DbErrorScreen />;
  }

  return (
    <AppShell
      items={items}
      settings={settings}
      usingLocalStore={isUsingLocalStore()}
    />
  );
}
