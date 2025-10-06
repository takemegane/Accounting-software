import Link from "next/link";
import { Suspense } from "react";
import { CurrentPeriodSummary } from "@/components/current-period-summary";
import { AppShell } from "@/components/app-shell";
import { RecentJournalEntries } from "@/components/recent-journal-entries";
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
        <div
          style={{
            display: "grid",
            gap: "1.5rem",
            gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
          }}
        >
          <section
            style={{
              background: "white",
              borderRadius: "1rem",
              padding: "1.5rem",
              boxShadow: "0 10px 40px rgba(15, 23, 42, 0.06)",
            }}
          >
            <h2 style={{ fontSize: "1.2rem", marginBottom: "0.75rem" }}>タスク</h2>
            <ul style={{ margin: 0, paddingLeft: "1.2rem", color: "#334155", display: "grid", gap: "0.35rem" }}>
              <li>未処理の取引をインポートする</li>
              <li>領収書をアップロードして取引に紐づけ</li>
              <li>レポートから試算表を確認</li>
            </ul>
          </section>

          <Suspense fallback={<p>仕訳を読み込み中...</p>}>
            <RecentJournalEntries />
          </Suspense>
        </div>
      </div>
    </AppShell>
  );
}
