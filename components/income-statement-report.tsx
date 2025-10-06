"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";

import { formatCurrency } from "@/lib/report-utils";

type IncomeStatementRow = {
  accountId: string;
  code: string;
  name: string;
  type: string;
  current: number;
  yearToDate: number;
};

type IncomeStatementResponse = {
  period: string;
  rows: IncomeStatementRow[];
  totals: {
    revenue: number;
    expense: number;
    netIncome: number;
  };
  yearToDate: {
    revenue: number;
    expense: number;
    netIncome: number;
  };
};

function formatPeriodLabel(value: string) {
  const [year, month] = value.split("-");
  return `${year}年${Number(month).toString().padStart(2, "0")}月`;
}

export function IncomeStatementReport() {
  const now = new Date();
  const defaultPeriod = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const [period, setPeriod] = useState(defaultPeriod);

  const query = useQuery<IncomeStatementResponse>({
    queryKey: ["income-statement-report", period],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.set("period", period);
      const response = await fetch(`/api/reports/income-statement?${params.toString()}`);
      if (!response.ok) {
        throw new Error("損益計算書の取得に失敗しました");
      }
      return response.json();
    },
  });

  const revenueRows = query.data?.rows.filter((row) => row.type === "REVENUE") ?? [];
  const expenseRows = query.data?.rows.filter((row) => row.type === "EXPENSE") ?? [];

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
      <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: "1rem" }}>
        <div>
          <h2 style={{ fontSize: "1.4rem", marginBottom: "0.5rem" }}>損益計算書</h2>
          <p style={{ margin: 0, color: "#64748b" }}>売上・費用・純利益を月次および年初来で確認できます。</p>
        </div>
        <div style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
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
          <a
            href={`/api/reports/income-statement/pdf?period=${period}`}
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
      {query.isError && <p style={{ color: "#ef4444" }}>損益計算書の取得に失敗しました。</p>}

      {query.data && (
        <div style={{ overflowX: "auto" }}>
          <table
            style={{
              width: "100%",
              minWidth: "680px",
              borderCollapse: "collapse",
            }}
          >
            <thead>
              <tr style={{ textAlign: "right", color: "#475569", fontSize: "0.85rem" }}>
                <th style={{ padding: "0.5rem", textAlign: "left" }}>勘定科目</th>
                <th style={{ padding: "0.5rem" }}>{formatPeriodLabel(period)}</th>
                <th style={{ padding: "0.5rem" }}>年初来累計</th>
              </tr>
            </thead>
            <tbody>
              <tr style={{ background: "#f8fafc" }}>
                <td colSpan={3} style={{ padding: "0.5rem", fontWeight: 600, textAlign: "left" }}>
                  売上高
                </td>
              </tr>
              {revenueRows.map((row) => (
                <tr key={row.accountId} style={{ borderTop: "1px solid #e2e8f0" }}>
                  <td style={{ padding: "0.75rem", textAlign: "left" }}>
                    <span style={{ color: "#475569", fontSize: "0.85rem", marginRight: "0.35rem" }}>{row.code}</span>
                    {row.name}
                  </td>
                  <td style={{ padding: "0.75rem" }}>{formatCurrency(row.current)}</td>
                  <td style={{ padding: "0.75rem" }}>{formatCurrency(row.yearToDate)}</td>
                </tr>
              ))}
              <tr style={{ borderTop: "1px solid #0f172a", fontWeight: 600 }}>
                <td style={{ padding: "0.75rem", textAlign: "left" }}>売上高合計</td>
                <td style={{ padding: "0.75rem" }}>{formatCurrency(query.data.totals.revenue)}</td>
                <td style={{ padding: "0.75rem" }}>{formatCurrency(query.data.yearToDate.revenue)}</td>
              </tr>

              <tr style={{ background: "#f8fafc" }}>
                <td colSpan={3} style={{ padding: "0.5rem", fontWeight: 600, textAlign: "left" }}>
                  費用
                </td>
              </tr>
              {expenseRows.map((row) => (
                <tr key={row.accountId} style={{ borderTop: "1px solid #e2e8f0" }}>
                  <td style={{ padding: "0.75rem", textAlign: "left" }}>
                    <span style={{ color: "#475569", fontSize: "0.85rem", marginRight: "0.35rem" }}>{row.code}</span>
                    {row.name}
                  </td>
                  <td style={{ padding: "0.75rem" }}>{formatCurrency(row.current)}</td>
                  <td style={{ padding: "0.75rem" }}>{formatCurrency(row.yearToDate)}</td>
                </tr>
              ))}
              <tr style={{ borderTop: "1px solid #0f172a", fontWeight: 600 }}>
                <td style={{ padding: "0.75rem", textAlign: "left" }}>費用合計</td>
                <td style={{ padding: "0.75rem" }}>{formatCurrency(query.data.totals.expense)}</td>
                <td style={{ padding: "0.75rem" }}>{formatCurrency(query.data.yearToDate.expense)}</td>
              </tr>
            </tbody>
            <tfoot>
              <tr style={{ borderTop: "2px solid #111827", fontWeight: 700, background: "#f1f5f9" }}>
                <td style={{ padding: "0.75rem", textAlign: "left" }}>当期純利益</td>
                <td style={{ padding: "0.75rem" }}>{formatCurrency(query.data.totals.netIncome)}</td>
                <td style={{ padding: "0.75rem" }}>{formatCurrency(query.data.yearToDate.netIncome)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </section>
  );
}
