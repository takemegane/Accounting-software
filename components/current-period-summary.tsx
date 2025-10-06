"use client";

import { useQuery } from "@tanstack/react-query";

type TrialBalanceResponse = {
  period: string;
  totals: {
    debit: number;
    credit: number;
  };
  netIncome: number;
};

async function fetchTrialBalance(): Promise<TrialBalanceResponse> {
  const response = await fetch("/api/trial-balance");
  if (!response.ok) {
    throw new Error("試算表の読み込みに失敗しました");
  }
  return response.json();
}

export function CurrentPeriodSummary() {
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["trial-balance"],
    queryFn: fetchTrialBalance,
  });

  if (isLoading) {
    return <p>読み込み中...</p>;
  }

  if (isError) {
    return <p>集計の取得に失敗しました: {error instanceof Error ? error.message : "Unknown error"}</p>;
  }

  if (!data) {
    return <p>表示する試算表がまだありません。</p>;
  }

  return (
    <section
      style={{
        background: "white",
        borderRadius: "1rem",
        padding: "2rem",
        boxShadow: "0 10px 40px rgba(15, 23, 42, 0.06)",
      }}
    >
      <h2 style={{ fontSize: "1.5rem", marginBottom: "1rem" }}>当期試算表サマリー</h2>
      <dl style={{ display: "grid", gap: "0.75rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <dt>対象期間</dt>
          <dd>{data.period}</dd>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <dt>借方合計</dt>
          <dd>{data.totals.debit.toLocaleString()} 円</dd>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <dt>貸方合計</dt>
          <dd>{data.totals.credit.toLocaleString()} 円</dd>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", fontWeight: 600 }}>
          <dt>当期純利益</dt>
          <dd>{data.netIncome.toLocaleString()} 円</dd>
        </div>
      </dl>
    </section>
  );
}
