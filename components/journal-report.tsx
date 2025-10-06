"use client";

import { useQuery } from "@tanstack/react-query";

type JournalReportLine = {
  id: string;
  accountId: string;
  accountCode: string;
  accountName: string;
  debit: number;
  credit: number;
  memo?: string;
};

type JournalReportEntry = {
  id: string;
  entryDate: string;
  description?: string;
  totals: {
    debit: number;
    credit: number;
  };
  lines: JournalReportLine[];
};

export function JournalReport() {
  const { data, isLoading, isError } = useQuery<JournalReportEntry[]>({
    queryKey: ["journal-report"],
    queryFn: async () => {
      const response = await fetch("/api/reports/journal");
      if (!response.ok) {
        throw new Error("仕訳帳の取得に失敗しました");
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
        gap: "1.5rem",
      }}
    >
      <div>
        <h2 style={{ fontSize: "1.4rem", margin: 0 }}>仕訳帳</h2>
        <p style={{ margin: "0.35rem 0 0", color: "#64748b", fontSize: "0.9rem" }}>
          登録済みの仕訳を日付順に表示します。
        </p>
      </div>

      {isLoading && <p>読み込み中...</p>}
      {isError && <p style={{ color: "#ef4444" }}>仕訳帳の取得に失敗しました。</p>}
      {!isLoading && !isError && data && data.length === 0 && <p>まだ仕訳が登録されていません。</p>}

      {!isLoading && !isError && data && data.length > 0 && (
        <div style={{ display: "grid", gap: "1.25rem" }}>
          {data.map((entry) => (
            <div
              key={entry.id}
              style={{
                border: "1px solid #e2e8f0",
                borderRadius: "0.85rem",
                padding: "1.5rem",
                display: "grid",
                gap: "1rem",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: "0.5rem" }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: "1.1rem" }}>
                    {new Date(entry.entryDate).toLocaleDateString("ja-JP")}
                  </h3>
                  <p style={{ margin: 0, color: "#475569", fontSize: "0.95rem" }}>
                    {entry.description ?? "(摘要なし)"}
                  </p>
                </div>
                <div style={{ textAlign: "right", fontSize: "0.9rem", color: "#1f2937" }}>
                  <div>借方合計: {entry.totals.debit.toLocaleString()} 円</div>
                  <div>貸方合計: {entry.totals.credit.toLocaleString()} 円</div>
                </div>
              </div>

              <div style={{ overflowX: "auto" }}>
                <table
                  style={{
                    width: "100%",
                    borderCollapse: "collapse",
                    minWidth: "680px",
                  }}
                >
                  <thead>
                    <tr style={{ textAlign: "left", color: "#475569", fontSize: "0.85rem" }}>
                      <th style={{ padding: "0.5rem" }}>勘定科目</th>
                      <th style={{ padding: "0.5rem", textAlign: "right" }}>借方</th>
                      <th style={{ padding: "0.5rem", textAlign: "right" }}>貸方</th>
                      <th style={{ padding: "0.5rem" }}>メモ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {entry.lines.map((line) => (
                      <tr key={line.id} style={{ borderTop: "1px solid #e2e8f0" }}>
                        <td style={{ padding: "0.65rem" }}>
                          {line.accountCode} {line.accountName}
                        </td>
                        <td style={{ padding: "0.65rem", textAlign: "right" }}>
                          {line.debit > 0 ? line.debit.toLocaleString() : ""}
                        </td>
                        <td style={{ padding: "0.65rem", textAlign: "right" }}>
                          {line.credit > 0 ? line.credit.toLocaleString() : ""}
                        </td>
                        <td style={{ padding: "0.65rem" }}>{line.memo ?? ""}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
