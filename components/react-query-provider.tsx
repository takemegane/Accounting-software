"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactNode, useState } from "react";

export function ReactQueryProvider({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // データが古くなるまでの時間（5分間は新しいデータとして扱う）
            staleTime: 5 * 60 * 1000,
            // キャッシュを保持する時間（30分）
            gcTime: 30 * 60 * 1000,
            // ウィンドウフォーカス時に再フェッチしない（手動更新ボタンで更新）
            refetchOnWindowFocus: false,
            // マウント時に再フェッチしない（手動更新ボタンで更新）
            refetchOnMount: false,
            // リトライ設定（失敗時のリトライ回数を減らして高速化）
            retry: 1,
            // リトライ遅延
            retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
          },
        },
      })
  );

  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}
