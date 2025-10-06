"use client";

import { useQuery } from "@tanstack/react-query";

type JournalEntry = {
  id: string;
  entryDate: string;
  description?: string;
  lines: {
    id: string;
    accountName: string;
    debit: number;
    credit: number;
    memo?: string;
  }[];
};

export function RecentJournalEntries() {
  const { data, isLoading } = useQuery<JournalEntry[]>({
    queryKey: ["journal-entries"],
    queryFn: async () => {
      const response = await fetch("/api/journal-entries");
      if (!response.ok) {
        throw new Error("仕訳の取得に失敗しました");
      }
      return response.json();
    },
  });

  return (
    <section
      style={{
        background: "white",
        borderRadius: "1rem",
        padding: "2rem",
        boxShadow: "0 10px 40px rgba(15, 23, 42, 0.06)",
        display: "grid",
        gap: "1rem",
      }}
    >
      <h2 style={{ fontSize: "1.5rem" }}>最近の仕訳</h2>
      {isLoading && <p>読み込み中...</p>}
      {!isLoading && (!data || data.length === 0) && <p>まだ仕訳が登録されていません。</p>}
      {!isLoading && data &&
        data.map((entry) => (
          <div key={entry.id} style={{ borderTop: "1px solid #e2e8f0", paddingTop: "1rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.5rem" }}>
              <span style={{ fontWeight: 600 }}>{new Date(entry.entryDate).toLocaleDateString("ja-JP")}</span>
              <span>{entry.description ?? "(摘要なし)"}</span>
            </div>
            <div style={{ display: "grid", gap: "0.5rem" }}>
              {entry.lines.map((line) => (
                <div
                  key={line.id}
                  style={{ display: "flex", justifyContent: "space-between", fontSize: "0.95rem" }}
                >
                  <span>{line.accountName}</span>
                  <span>
                    {line.debit > 0 && `${line.debit.toLocaleString()} 円 (借)`}
                    {line.credit > 0 && `${line.credit.toLocaleString()} 円 (貸)`}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ))}
    </section>
  );
}
