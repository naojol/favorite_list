"use client";

import { useActionState } from "react";
import { Button } from "../components/ui/Button";
import { login, type LoginState } from "./actions";

export default function LoginPage() {
  const [state, formAction, pending] = useActionState<LoginState, FormData>(
    login,
    {}
  );

  return (
    <div className="flex min-h-full items-center justify-center px-4 py-16">
      <form action={formAction} className="card w-full max-w-sm space-y-4 p-6">
        <div className="space-y-1">
          <h1 className="t-title">ほしいものマネージャー</h1>
          <p className="t-callout text-secondary">
            パスワードを入力してください
          </p>
        </div>
        <input
          name="password"
          type="password"
          autoFocus
          placeholder="パスワード"
          aria-label="パスワード"
          className="field"
        />
        {state.error && <p className="t-caption text-danger">{state.error}</p>}
        <Button
          variant="primary"
          type="submit"
          disabled={pending}
          className="w-full"
        >
          {pending ? "確認中…" : "ログイン"}
        </Button>
      </form>
    </div>
  );
}
