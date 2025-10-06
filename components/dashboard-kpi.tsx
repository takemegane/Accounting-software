"use client";

import { useQuery } from "@tanstack/react-query";

type DashboardSummary = {
  period: string;
  revenue: number;
  expense: number;
  cash: number;
  netIncome: number;
  recentEntriesCount: number;
  periods: {
    month: string;
    revenue: number;
    expense: number;
  }[];
};

const currency = (value: number) => `${value.toLocaleString()} 円`;

export function DashboardKPI() {
  const { data, isLoading, isError } = useQuery<DashboardSummary>({
    queryKey: ["dashboard-summary"],
    queryFn: async () => {
      const response = await fetch("/api/dashboard/summary");
      if (!response.ok) {
        throw new Error("サマリーの取得に失敗しました");
      }
      return response.json();
    },
  });

  if (isLoading) {
    return <p>ダッシュボードサマリーを読み込み中...</p>;
  }

  if (isError || !data) {
    return <p>サマリーの取得に失敗しました。</p>;
  }

  return (
    <section
      style={{
        display: "grid",
        gap: "1rem",
        gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
      }}
    >
      <KpiCard title="当月売上" value={currency(data.revenue)} subtitle={data.period} tone="blue" />
      <KpiCard title="当月経費" value={currency(data.expense)} subtitle={data.period} tone="slate" />
      <KpiCard title="キャッシュ残高(概算)" value={currency(data.cash)} subtitle="資産勘定ベース" tone="indigo" />
      <KpiCard title="登録仕訳数" value={`${data.recentEntriesCount} 件`} subtitle="今月" tone="emerald" />
      <KpiCard title="当月純利益" value={currency(data.netIncome)} subtitle={data.period} tone="violet" />
    </section>
  );
}

type KpiCardProps = {
  title: string;
  value: string;
  subtitle?: string;
  tone: "blue" | "slate" | "indigo" | "emerald" | "violet";
};

const COLORS: Record<KpiCardProps["tone"], { bg: string; text: string }> = {
  blue: { bg: "rgba(37, 99, 235, 0.12)", text: "#1d4ed8" },
  slate: { bg: "rgba(71, 85, 105, 0.12)", text: "#334155" },
  indigo: { bg: "rgba(79, 70, 229, 0.12)", text: "#4338ca" },
  emerald: { bg: "rgba(16, 185, 129, 0.12)", text: "#047857" },
  violet: { bg: "rgba(124, 58, 237, 0.12)", text: "#6d28d9" },
};

function KpiCard({ title, value, subtitle, tone }: KpiCardProps) {
  const palette = COLORS[tone];

  return (
    <div
      style={{
        background: "white",
        borderRadius: "1rem",
        padding: "1.5rem",
        boxShadow: "0 10px 40px rgba(15, 23, 42, 0.05)",
        display: "grid",
        gap: "0.5rem",
      }}
    >
      <span style={{ fontSize: "0.9rem", color: "#64748b", fontWeight: 600 }}>{title}</span>
      <span style={{ fontSize: "1.8rem", fontWeight: 700, color: palette.text }}>{value}</span>
      {subtitle && <span style={{ fontSize: "0.85rem", color: "#64748b" }}>{subtitle}</span>}
      <div
        style={{
          width: "100%",
          height: "4px",
          borderRadius: "999px",
          background: palette.bg,
        }}
      />
    </div>
  );
}
