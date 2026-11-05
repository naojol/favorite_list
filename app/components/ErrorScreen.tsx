"use client";

import type { ReactNode } from "react";
import { Button } from "./ui/Button";
import { AlertIcon } from "./ui/icons";

/** エラー時の共通画面（既存の card / Button / トークンを再利用） */
export function ErrorScreen({
  title,
  children,
  onRetry,
}: {
  title: string;
  children: ReactNode;
  onRetry: () => void;
}) {
  return (
    <div className="flex min-h-full items-center justify-center px-4 py-16">
      <div
        role="alert"
        className="card flex w-full max-w-md flex-col items-center gap-3 px-6 py-10 text-center"
      >
        <span className="flex h-14 w-14 items-center justify-center rounded-full bg-warn/15 text-warn">
          <AlertIcon className="h-7 w-7" />
        </span>
        <h1 className="t-title">{title}</h1>
        <div className="space-y-2 t-callout text-secondary">{children}</div>
        <Button variant="primary" onClick={onRetry} className="mt-2">
          再読み込み
        </Button>
      </div>
    </div>
  );
}

/** Server Component（page.tsx）から使う「DB に接続できない」案内 */
export function DbErrorScreen() {
  return (
    <ErrorScreen
      title="データベースに接続できません"
      onRetry={() => window.location.reload()}
    >
      <p>
        しばらく使っていないと、無料の Supabase プロジェクトは自動で停止します。
      </p>
      <p>
        Supabase のダッシュボードで <strong>Restore project</strong>{" "}
        を押して数分待ち、再読み込みしてください。
      </p>
      <p className="t-caption">
        それでも直らない場合は、Vercel の Logs でエラー内容を確認してください。
      </p>
    </ErrorScreen>
  );
}
