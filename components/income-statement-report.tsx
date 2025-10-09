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

  // 勘定科目コードの範囲で分類
  // 401-499: 売上高
  const salesRows = query.data?.rows.filter((row) =>
    row.type === "REVENUE" && parseInt(row.code) >= 401 && parseInt(row.code) < 500
  ) ?? [];

  // 501-505: 売上原価
  const costOfSalesRows = query.data?.rows.filter((row) =>
    row.type === "EXPENSE" && parseInt(row.code) >= 501 && parseInt(row.code) <= 505
  ) ?? [];

  // 506-599: 販売費及び一般管理費
  const sgaRows = query.data?.rows.filter((row) =>
    row.type === "EXPENSE" && parseInt(row.code) >= 506 && parseInt(row.code) < 600
  ) ?? [];

  // 601-699: 営業外収益
  const nonOperatingIncomeRows = query.data?.rows.filter((row) =>
    row.type === "REVENUE" && parseInt(row.code) >= 601 && parseInt(row.code) < 700
  ) ?? [];

  // 701-799: 営業外費用
  const nonOperatingExpenseRows = query.data?.rows.filter((row) =>
    row.type === "EXPENSE" && parseInt(row.code) >= 701 && parseInt(row.code) < 800
  ) ?? [];

  // 801-899: 特別利益
  const extraordinaryIncomeRows = query.data?.rows.filter((row) =>
    row.type === "REVENUE" && parseInt(row.code) >= 801 && parseInt(row.code) < 900
  ) ?? [];

  // 901-999: 特別損失
  const extraordinaryLossRows = query.data?.rows.filter((row) =>
    row.type === "EXPENSE" && parseInt(row.code) >= 901 && parseInt(row.code) < 1000
  ) ?? [];

  // 計算
  const salesTotal = salesRows.reduce((sum, row) => sum + row.current, 0);
  const ytdSalesTotal = salesRows.reduce((sum, row) => sum + row.yearToDate, 0);

  const costOfSalesTotal = costOfSalesRows.reduce((sum, row) => sum + row.current, 0);
  const ytdCostOfSalesTotal = costOfSalesRows.reduce((sum, row) => sum + row.yearToDate, 0);

  const grossProfit = salesTotal - costOfSalesTotal;
  const ytdGrossProfit = ytdSalesTotal - ytdCostOfSalesTotal;

  const sgaTotal = sgaRows.reduce((sum, row) => sum + row.current, 0);
  const ytdSgaTotal = sgaRows.reduce((sum, row) => sum + row.yearToDate, 0);

  const operatingIncome = grossProfit - sgaTotal;
  const ytdOperatingIncome = ytdGrossProfit - ytdSgaTotal;

  const nonOperatingIncomeTotal = nonOperatingIncomeRows.reduce((sum, row) => sum + row.current, 0);
  const ytdNonOperatingIncomeTotal = nonOperatingIncomeRows.reduce((sum, row) => sum + row.yearToDate, 0);

  const nonOperatingExpenseTotal = nonOperatingExpenseRows.reduce((sum, row) => sum + row.current, 0);
  const ytdNonOperatingExpenseTotal = nonOperatingExpenseRows.reduce((sum, row) => sum + row.yearToDate, 0);

  const ordinaryIncome = operatingIncome + nonOperatingIncomeTotal - nonOperatingExpenseTotal;
  const ytdOrdinaryIncome = ytdOperatingIncome + ytdNonOperatingIncomeTotal - ytdNonOperatingExpenseTotal;

  const extraordinaryIncomeTotal = extraordinaryIncomeRows.reduce((sum, row) => sum + row.current, 0);
  const ytdExtraordinaryIncomeTotal = extraordinaryIncomeRows.reduce((sum, row) => sum + row.yearToDate, 0);

  const extraordinaryLossTotal = extraordinaryLossRows.reduce((sum, row) => sum + row.current, 0);
  const ytdExtraordinaryLossTotal = extraordinaryLossRows.reduce((sum, row) => sum + row.yearToDate, 0);

  const incomeBeforeTax = ordinaryIncome + extraordinaryIncomeTotal - extraordinaryLossTotal;
  const ytdIncomeBeforeTax = ytdOrdinaryIncome + ytdExtraordinaryIncomeTotal - ytdExtraordinaryLossTotal;

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
              {/* I. 売上高 */}
              <tr style={{ background: "#f8fafc" }}>
                <td colSpan={3} style={{ padding: "0.5rem", fontWeight: 600, textAlign: "left" }}>
                  I. 売上高
                </td>
              </tr>
              {salesRows.map((row) => (
                <tr key={row.accountId} style={{ borderTop: "1px solid #e2e8f0" }}>
                  <td style={{ padding: "0.75rem", paddingLeft: "2rem", textAlign: "left" }}>
                    <span style={{ color: "#475569", fontSize: "0.85rem", marginRight: "0.35rem" }}>{row.code}</span>
                    {row.name}
                  </td>
                  <td style={{ padding: "0.75rem" }}>{formatCurrency(row.current)}</td>
                  <td style={{ padding: "0.75rem" }}>{formatCurrency(row.yearToDate)}</td>
                </tr>
              ))}

              {/* II. 売上原価 */}
              {costOfSalesRows.length > 0 && (
                <>
                  <tr style={{ background: "#f8fafc" }}>
                    <td colSpan={3} style={{ padding: "0.5rem", fontWeight: 600, textAlign: "left" }}>
                      II. 売上原価
                    </td>
                  </tr>
                  {costOfSalesRows.map((row) => (
                    <tr key={row.accountId} style={{ borderTop: "1px solid #e2e8f0" }}>
                      <td style={{ padding: "0.75rem", paddingLeft: "2rem", textAlign: "left" }}>
                        <span style={{ color: "#475569", fontSize: "0.85rem", marginRight: "0.35rem" }}>{row.code}</span>
                        {row.name}
                      </td>
                      <td style={{ padding: "0.75rem" }}>{formatCurrency(row.current)}</td>
                      <td style={{ padding: "0.75rem" }}>{formatCurrency(row.yearToDate)}</td>
                    </tr>
                  ))}
                  <tr style={{ borderTop: "2px solid #475569", fontWeight: 700, background: "#f8fafc" }}>
                    <td style={{ padding: "0.75rem", paddingLeft: "1rem", textAlign: "left" }}>売上総利益</td>
                    <td style={{ padding: "0.75rem" }}>{formatCurrency(grossProfit)}</td>
                    <td style={{ padding: "0.75rem" }}>{formatCurrency(ytdGrossProfit)}</td>
                  </tr>
                </>
              )}

              {/* III. 販売費及び一般管理費 */}
              {sgaRows.length > 0 && (
                <>
                  <tr style={{ background: "#f8fafc" }}>
                    <td colSpan={3} style={{ padding: "0.5rem", fontWeight: 600, textAlign: "left" }}>
                      III. 販売費及び一般管理費
                    </td>
                  </tr>
                  {sgaRows.map((row) => (
                    <tr key={row.accountId} style={{ borderTop: "1px solid #e2e8f0" }}>
                      <td style={{ padding: "0.75rem", paddingLeft: "2rem", textAlign: "left" }}>
                        <span style={{ color: "#475569", fontSize: "0.85rem", marginRight: "0.35rem" }}>{row.code}</span>
                        {row.name}
                      </td>
                      <td style={{ padding: "0.75rem" }}>{formatCurrency(row.current)}</td>
                      <td style={{ padding: "0.75rem" }}>{formatCurrency(row.yearToDate)}</td>
                    </tr>
                  ))}
                  <tr style={{ borderTop: "2px solid #475569", fontWeight: 700, background: "#f8fafc" }}>
                    <td style={{ padding: "0.75rem", paddingLeft: "1rem", textAlign: "left" }}>営業利益</td>
                    <td style={{ padding: "0.75rem" }}>{formatCurrency(operatingIncome)}</td>
                    <td style={{ padding: "0.75rem" }}>{formatCurrency(ytdOperatingIncome)}</td>
                  </tr>
                </>
              )}

              {/* IV. 営業外収益 */}
              {nonOperatingIncomeRows.length > 0 && (
                <>
                  <tr style={{ background: "#f8fafc" }}>
                    <td colSpan={3} style={{ padding: "0.5rem", fontWeight: 600, textAlign: "left" }}>
                      IV. 営業外収益
                    </td>
                  </tr>
                  {nonOperatingIncomeRows.map((row) => (
                    <tr key={row.accountId} style={{ borderTop: "1px solid #e2e8f0" }}>
                      <td style={{ padding: "0.75rem", paddingLeft: "2rem", textAlign: "left" }}>
                        <span style={{ color: "#475569", fontSize: "0.85rem", marginRight: "0.35rem" }}>{row.code}</span>
                        {row.name}
                      </td>
                      <td style={{ padding: "0.75rem" }}>{formatCurrency(row.current)}</td>
                      <td style={{ padding: "0.75rem" }}>{formatCurrency(row.yearToDate)}</td>
                    </tr>
                  ))}
                </>
              )}

              {/* V. 営業外費用 */}
              {nonOperatingExpenseRows.length > 0 && (
                <>
                  <tr style={{ background: "#f8fafc" }}>
                    <td colSpan={3} style={{ padding: "0.5rem", fontWeight: 600, textAlign: "left" }}>
                      V. 営業外費用
                    </td>
                  </tr>
                  {nonOperatingExpenseRows.map((row) => (
                    <tr key={row.accountId} style={{ borderTop: "1px solid #e2e8f0" }}>
                      <td style={{ padding: "0.75rem", paddingLeft: "2rem", textAlign: "left" }}>
                        <span style={{ color: "#475569", fontSize: "0.85rem", marginRight: "0.35rem" }}>{row.code}</span>
                        {row.name}
                      </td>
                      <td style={{ padding: "0.75rem" }}>{formatCurrency(row.current)}</td>
                      <td style={{ padding: "0.75rem" }}>{formatCurrency(row.yearToDate)}</td>
                    </tr>
                  ))}
                </>
              )}

              {/* 経常利益 */}
              {(nonOperatingIncomeRows.length > 0 || nonOperatingExpenseRows.length > 0) && (
                <tr style={{ borderTop: "2px solid #475569", fontWeight: 700, background: "#f8fafc" }}>
                  <td style={{ padding: "0.75rem", paddingLeft: "1rem", textAlign: "left" }}>経常利益</td>
                  <td style={{ padding: "0.75rem" }}>{formatCurrency(ordinaryIncome)}</td>
                  <td style={{ padding: "0.75rem" }}>{formatCurrency(ytdOrdinaryIncome)}</td>
                </tr>
              )}

              {/* VI. 特別利益 */}
              {extraordinaryIncomeRows.length > 0 && (
                <>
                  <tr style={{ background: "#f8fafc" }}>
                    <td colSpan={3} style={{ padding: "0.5rem", fontWeight: 600, textAlign: "left" }}>
                      VI. 特別利益
                    </td>
                  </tr>
                  {extraordinaryIncomeRows.map((row) => (
                    <tr key={row.accountId} style={{ borderTop: "1px solid #e2e8f0" }}>
                      <td style={{ padding: "0.75rem", paddingLeft: "2rem", textAlign: "left" }}>
                        <span style={{ color: "#475569", fontSize: "0.85rem", marginRight: "0.35rem" }}>{row.code}</span>
                        {row.name}
                      </td>
                      <td style={{ padding: "0.75rem" }}>{formatCurrency(row.current)}</td>
                      <td style={{ padding: "0.75rem" }}>{formatCurrency(row.yearToDate)}</td>
                    </tr>
                  ))}
                </>
              )}

              {/* VII. 特別損失 */}
              {extraordinaryLossRows.length > 0 && (
                <>
                  <tr style={{ background: "#f8fafc" }}>
                    <td colSpan={3} style={{ padding: "0.5rem", fontWeight: 600, textAlign: "left" }}>
                      VII. 特別損失
                    </td>
                  </tr>
                  {extraordinaryLossRows.map((row) => (
                    <tr key={row.accountId} style={{ borderTop: "1px solid #e2e8f0" }}>
                      <td style={{ padding: "0.75rem", paddingLeft: "2rem", textAlign: "left" }}>
                        <span style={{ color: "#475569", fontSize: "0.85rem", marginRight: "0.35rem" }}>{row.code}</span>
                        {row.name}
                      </td>
                      <td style={{ padding: "0.75rem" }}>{formatCurrency(row.current)}</td>
                      <td style={{ padding: "0.75rem" }}>{formatCurrency(row.yearToDate)}</td>
                    </tr>
                  ))}
                </>
              )}

              {/* 税引前当期純利益 */}
              {(extraordinaryIncomeRows.length > 0 || extraordinaryLossRows.length > 0) && (
                <tr style={{ borderTop: "2px solid #475569", fontWeight: 700, background: "#f8fafc" }}>
                  <td style={{ padding: "0.75rem", paddingLeft: "1rem", textAlign: "left" }}>税引前当期純利益</td>
                  <td style={{ padding: "0.75rem" }}>{formatCurrency(incomeBeforeTax)}</td>
                  <td style={{ padding: "0.75rem" }}>{formatCurrency(ytdIncomeBeforeTax)}</td>
                </tr>
              )}
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
