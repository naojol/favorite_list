"use client";

import { useEffect } from "react";
import { ErrorScreen } from "./components/ErrorScreen";

// Next 16.2 では reset ではなく unstable_retry を受け取る
export default function Error({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <ErrorScreen title="問題が発生しました" onRetry={() => unstable_retry()}>
      <p>一時的なエラーかもしれません。もう一度お試しください。</p>
      {error.digest && (
        <p className="t-caption tabnum">エラー番号: {error.digest}</p>
      )}
    </ErrorScreen>
  );
}
