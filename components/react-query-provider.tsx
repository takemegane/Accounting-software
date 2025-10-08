"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactNode, useState } from "react";

export function ReactQueryProvider({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // データが古くなるまでの時間（0 = 常に古い = 常に再フェッチ）
            staleTime: 0,
            // キャッシュを保持する時間（5分）
            gcTime: 5 * 60 * 1000,
            // ウィンドウフォーカス時に再フェッチ
            refetchOnWindowFocus: true,
            // マウント時に再フェッチ（staleの場合のみ）
            refetchOnMount: true,
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
