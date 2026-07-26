import { getStore, isUsingLocalStore } from "@/lib/db";
import { AppShell } from "./components/AppShell";

// 個人用・小規模。常に最新データを表示し、ビルド時の DB アクセスを避ける。
export const dynamic = "force-dynamic";

export default async function Home() {
  const store = getStore();
  const [items, settings] = await Promise.all([
    store.listItems(),
    store.getSettings(),
  ]);

  return (
    <AppShell
      items={items}
      settings={settings}
      usingLocalStore={isUsingLocalStore()}
    />
  );
}
