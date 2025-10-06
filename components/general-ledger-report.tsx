"use client";

import { useQuery } from "@tanstack/react-query";

type GeneralLedgerEntry = {
  lineId: string;
  journalEntryId: string;
  entryDate: string;
  description?: string;
  debit: number;
  credit: number;
  memo?: string;
  balance: number;
};

type GeneralLedgerAccount = {
  accountId: string;
  code: string;
  name: string;
  type: string;
  totals: {
    debit: number;
    credit: number;
    balance: number;
  };
  entries: GeneralLedgerEntry[];
};

const currency = (value: number) => `${value.toLocaleString()} 円`;

export function GeneralLedgerReport() {
  const { data, isLoading, isError } = useQuery<GeneralLedgerAccount[]>({
    queryKey: ["general-ledger"],
    queryFn: async () => {
      const response = await fetch("/api/reports/general-ledger");
      if (!response.ok) {
        throw new Error("総勘定元帳の取得に失敗しました");
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
        <h2 style={{ fontSize: "1.4rem", margin: 0 }}>総勘定元帳</h2>
        <p style={{ margin: "0.35rem 0 0", color: "#64748b", fontSize: "0.9rem" }}>
          仕訳の明細を勘定科目別に確認できます。
        </p>
      </div>

      {isLoading && <p>読み込み中...</p>}
      {isError && <p style={{ color: "#ef4444" }}>総勘定元帳の取得に失敗しました。</p>}
      {!isLoading && !isError && data && data.length === 0 && <p>まだ元帳に出力できる仕訳がありません。</p>}

      {!isLoading && !isError && data && data.length > 0 && (
        <div style={{ display: "grid", gap: "1.5rem" }}>
          {data.map((account) => (
            <div
              key={account.accountId}
              style={{
                border: "1px solid #e2e8f0",
                borderRadius: "0.85rem",
                padding: "1.5rem",
                display: "grid",
                gap: "1rem",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", flexWrap: "wrap", gap: "0.5rem" }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: "1.1rem" }}>
                    {account.code} {account.name}
                  </h3>
                  <p style={{ margin: 0, color: "#64748b", fontSize: "0.85rem" }}>科目区分: {account.type}</p>
                </div>
                <div style={{ textAlign: "right", fontSize: "0.9rem", color: "#1f2937" }}>
                  <div>合計借方: {currency(account.totals.debit)}</div>
                  <div>合計貸方: {currency(account.totals.credit)}</div>
                  <div>差引残高: {currency(account.totals.balance)}</div>
                </div>
              </div>

              <div style={{ overflowX: "auto" }}>
                <table
                  style={{
                    width: "100%",
                    borderCollapse: "collapse",
                    minWidth: "720px",
                  }}
                >
                  <thead>
                    <tr style={{ textAlign: "left", color: "#475569", fontSize: "0.85rem" }}>
                      <th style={{ padding: "0.5rem" }}>日付</th>
                      <th style={{ padding: "0.5rem" }}>摘要</th>
                      <th style={{ padding: "0.5rem", textAlign: "right" }}>借方</th>
                      <th style={{ padding: "0.5rem", textAlign: "right" }}>貸方</th>
                      <th style={{ padding: "0.5rem", textAlign: "right" }}>残高</th>
                      <th style={{ padding: "0.5rem" }}>メモ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {account.entries.map((entry) => (
                      <tr key={entry.lineId} style={{ borderTop: "1px solid #e2e8f0" }}>
                        <td style={{ padding: "0.65rem" }}>
                          {new Date(entry.entryDate).toLocaleDateString("ja-JP")}
                        </td>
                        <td style={{ padding: "0.65rem" }}>{entry.description ?? "(摘要なし)"}</td>
                        <td style={{ padding: "0.65rem", textAlign: "right" }}>
                          {entry.debit > 0 ? entry.debit.toLocaleString() : ""}
                        </td>
                        <td style={{ padding: "0.65rem", textAlign: "right" }}>
                          {entry.credit > 0 ? entry.credit.toLocaleString() : ""}
                        </td>
                        <td style={{ padding: "0.65rem", textAlign: "right", fontWeight: 600 }}>
                          {entry.balance.toLocaleString()}
                        </td>
                        <td style={{ padding: "0.65rem" }}>{entry.memo ?? ""}</td>
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
