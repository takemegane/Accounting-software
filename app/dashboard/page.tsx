import Link from "next/link";
import { Suspense } from "react";
import { CurrentPeriodSummary } from "@/components/current-period-summary";
import { AppShell } from "@/components/app-shell";
import { DashboardKPI } from "@/components/dashboard-kpi";

export default function DashboardPage() {
  return (
    <AppShell
      title="ダッシュボード"
      description="売上・経費・キャッシュ状況をリアルタイムに把握します。"
      actions={
        <Link
          href="/transactions"
          style={{
            padding: "0.6rem 1.2rem",
            borderRadius: "0.65rem",
            backgroundColor: "#2563eb",
            color: "white",
            fontWeight: 600,
          }}
        >
          新しい取引を登録
        </Link>
      }
    >
      <div style={{ display: "grid", gap: "1.5rem" }}>
        <Suspense fallback={<p>KPIを読み込み中...</p>}>
          <DashboardKPI />
        </Suspense>
        <Suspense fallback={<p>現在の試算表を読み込み中...</p>}>
          <CurrentPeriodSummary />
        </Suspense>
      </div>
    </AppShell>
  );
}
