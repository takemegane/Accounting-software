"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";

import { formatCurrency } from "@/lib/report-utils";

type TrialBalanceRow = {
  accountId: string;
  code: string;
  name: string;
  type: string;
  openingBalance: number;
  debit: number;
  credit: number;
  closingBalance: number;
};

type TrialBalanceResponse = {
  period: string;
  rows: TrialBalanceRow[];
  totals: {
    debit: number;
    credit: number;
  };
};

function formatPeriodLabel(value: string) {
  const [year, month] = value.split("-");
  return `${year}年${Number(month).toString().padStart(2, "0")}月`;
}

export function TrialBalanceReport() {
  const now = new Date();
  const defaultPeriod = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const [period, setPeriod] = useState(defaultPeriod);

  const query = useQuery<TrialBalanceResponse>({
    queryKey: ["trial-balance-report", period],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.set("period", period);
      const response = await fetch(`/api/reports/trial-balance?${params.toString()}`);
      if (!response.ok) {
        throw new Error("試算表の取得に失敗しました");
      }
      return response.json();
    },
  });

  const totals = useMemo(() => query.data?.totals ?? { debit: 0, credit: 0 }, [query.data]);

  return (
    <section
      style={{
        background: "white",
        borderRadius: "1rem",
        padding: "1.5rem",
        boxShadow: "0 10px 40px rgba(15, 23, 42, 0.06)",
        display: "grid",
        gap: "1.5rem",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: "1rem" }}>
        <div>
          <h2 style={{ fontSize: "1.25rem", margin: 0, marginBottom: "0.5rem" }}>試算表</h2>
          <p style={{ margin: 0, color: "#64748b", fontSize: "0.95rem" }}>月次の借方・貸方残高を確認できます。</p>
        </div>
        <div style={{ display: "flex", gap: "0.75rem", alignItems: "center", flexWrap: "wrap" }}>
          <label style={{ fontSize: "0.85rem", color: "#475569" }}>
            対象月
            <input
              type="month"
              value={period}
              onChange={(event) => setPeriod(event.target.value)}
              style={{
                marginLeft: "0.5rem",
                padding: "0.5rem",
                borderRadius: "0.5rem",
                border: "1px solid #cbd5f5",
              }}
            />
          </label>
          <button
            onClick={() => query.refetch()}
            disabled={query.isFetching}
            style={{
              padding: "0.55rem 1.1rem",
              borderRadius: "0.65rem",
              border: "1px solid #2563eb",
              backgroundColor: query.isFetching ? "#9ca3af" : "#2563eb",
              color: "white",
              fontWeight: 600,
              cursor: query.isFetching ? "not-allowed" : "pointer",
            }}
          >
            {query.isFetching ? "更新中..." : "🔄 最新データに更新"}
          </button>
          <a
            href={`/api/reports/trial-balance/pdf?period=${period}`}
            style={{
              padding: "0.55rem 1.1rem",
              borderRadius: "0.65rem",
              border: "1px solid #2563eb",
              color: "#2563eb",
              fontWeight: 600,
            }}
          >
            PDFダウンロード
          </a>
        </div>
      </div>

      {query.isLoading && <p>集計中...</p>}
      {query.isError && <p style={{ color: "#ef4444" }}>試算表の取得に失敗しました。</p>}

      {query.data && (
        <>
          <p style={{ margin: 0, fontWeight: 600 }}>{formatPeriodLabel(period)} 月次試算表</p>
          <div style={{ overflowX: "auto" }}>
            <table
              style={{
                width: "100%",
                minWidth: "780px",
                borderCollapse: "collapse",
              }}
            >
              <thead>
                <tr style={{ textAlign: "right", color: "#475569", fontSize: "0.85rem" }}>
                  <th style={{ padding: "0.5rem", textAlign: "left" }}>勘定科目</th>
                  <th style={{ padding: "0.5rem" }}>期首残高</th>
                  <th style={{ padding: "0.5rem" }}>借方</th>
                  <th style={{ padding: "0.5rem" }}>貸方</th>
                  <th style={{ padding: "0.5rem" }}>期末残高</th>
                </tr>
              </thead>
              <tbody>
                {query.data.rows.map((row) => (
                  <tr key={row.accountId} style={{ borderTop: "1px solid #e2e8f0" }}>
                    <td style={{ padding: "0.75rem", textAlign: "left" }}>
                      <span style={{ color: "#475569", fontSize: "0.85rem", marginRight: "0.35rem" }}>{row.code}</span>
                      {row.name}
                    </td>
                    <td style={{ padding: "0.75rem" }}>{formatCurrency(row.openingBalance)}</td>
                    <td style={{ padding: "0.75rem" }}>{formatCurrency(row.debit)}</td>
                    <td style={{ padding: "0.75rem" }}>{formatCurrency(row.credit)}</td>
                    <td style={{ padding: "0.75rem" }}>{formatCurrency(row.closingBalance)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr style={{ borderTop: "2px solid #0f172a", fontWeight: 600 }}>
                  <td style={{ padding: "0.75rem", textAlign: "left" }}>合計</td>
                  <td style={{ padding: "0.75rem" }}>-</td>
                  <td style={{ padding: "0.75rem" }}>{formatCurrency(totals.debit)}</td>
                  <td style={{ padding: "0.75rem" }}>{formatCurrency(totals.credit)}</td>
                  <td style={{ padding: "0.75rem" }}>-</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </>
      )}
    </section>
  );
}
