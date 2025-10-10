"use client";

import { useQuery } from "@tanstack/react-query";

import { formatCurrency } from "@/lib/report-utils";

type BalanceSheetRow = {
  accountId: string;
  code: string;
  name: string;
  closingBalance: number;
};

type BalanceSheetSection = {
  rows: BalanceSheetRow[];
  total: number;
};

type BalanceSheetResponse = {
  period: string;
  assets: BalanceSheetSection;
  liabilities: BalanceSheetSection;
  equity: BalanceSheetSection;
  totals: {
    assets: number;
    liabilitiesAndEquity: number;
  };
};

function SectionTable({ title, section }: { title: string; section: BalanceSheetSection }) {
  return (
    <div
      style={{
        border: "1px solid #e2e8f0",
        borderRadius: "0.85rem",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          background: "#f1f5f9",
          padding: "0.85rem 1rem",
          fontWeight: 600,
          color: "#1f2937",
        }}
      >
        {title}
      </div>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <tbody>
          {section.rows.map((row) => (
            <tr key={row.accountId} style={{ borderTop: "1px solid #e2e8f0" }}>
              <td style={{ padding: "0.75rem", width: "65%" }}>
                <span style={{ fontWeight: 600, color: "#1f2937" }}>{row.code}</span>
                <span style={{ marginLeft: "0.5rem", color: "#475569" }}>{row.name}</span>
              </td>
              <td style={{ padding: "0.75rem", textAlign: "right", color: "#0f172a", fontWeight: 600 }}>
                {formatCurrency(row.closingBalance)} 円
              </td>
            </tr>
          ))}
          <tr style={{ borderTop: "1px solid #0f172a" }}>
            <td style={{ padding: "0.85rem", fontWeight: 700 }}>小計</td>
            <td style={{ padding: "0.85rem", textAlign: "right", fontWeight: 700 }}>
              {formatCurrency(section.total)} 円
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

export function BalanceSheetReport() {
  const query = useQuery<BalanceSheetResponse>({
    queryKey: ["balance-sheet"],
    queryFn: async () => {
      const response = await fetch("/api/reports/balance-sheet");
      if (!response.ok) {
        throw new Error("貸借対照表の取得に失敗しました");
      }
      return response.json();
    },
  });

  const { data, isLoading, isError } = query;

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
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "1rem" }}>
        <div>
          <h2 style={{ fontSize: "1.25rem", margin: 0, marginBottom: "0.5rem" }}>貸借対照表 (Balance Sheet)</h2>
          {data && <p style={{ margin: 0, color: "#64748b", fontSize: "0.95rem" }}>{data.period} 時点</p>}
        </div>
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
      </div>

      {isLoading && <p>読み込み中...</p>}
      {isError && <p style={{ color: "#ef4444" }}>貸借対照表の取得に失敗しました。</p>}
      {!isLoading && !isError && data && (
        <div style={{ display: "grid", gap: "1.5rem" }}>
          <div
            style={{
              display: "grid",
              gap: "1.5rem",
              gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
            }}
          >
            <SectionTable title="資産" section={data.assets} />
            <div style={{ display: "grid", gap: "1.5rem" }}>
              <SectionTable title="負債" section={data.liabilities} />
              <SectionTable title="純資産" section={data.equity} />
            </div>
          </div>

          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              flexWrap: "wrap",
              gap: "0.75rem",
              fontWeight: 700,
              fontSize: "1rem",
              color: "#1f2937",
            }}
          >
            <span>資産合計</span>
            <span>{formatCurrency(data.totals.assets)} 円</span>
          </div>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              flexWrap: "wrap",
              gap: "0.75rem",
              fontWeight: 700,
              fontSize: "1rem",
              color: "#1f2937",
            }}
          >
            <span>負債・純資産合計</span>
            <span>{formatCurrency(data.totals.liabilitiesAndEquity)} 円</span>
          </div>
        </div>
      )}
    </section>
  );
}
