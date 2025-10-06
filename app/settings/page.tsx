import { AppShell } from "@/components/app-shell";
import { BusinessSettings } from "@/components/business-settings";
import { AccountBalanceForm } from "@/components/account-balance-form";
import { AccountManager } from "@/components/account-manager";
import { ClosingPeriodManager } from "@/components/closing-period-manager";

export default function SettingsPage() {
  return (
    <AppShell title="設定" description="事業情報や会計設定の管理を行います。">
      <section
        style={{
          background: "white",
          borderRadius: "1rem",
          padding: "2rem",
          boxShadow: "0 10px 40px rgba(15, 23, 42, 0.06)",
        }}
      >
        <BusinessSettings />
      </section>

      <AccountManager />

      <ClosingPeriodManager />

      <section
        style={{
          background: "white",
          borderRadius: "1rem",
          padding: "2rem",
          boxShadow: "0 10px 40px rgba(15, 23, 42, 0.06)",
        }}
      >
        <h2 style={{ fontSize: "1.25rem", marginBottom: "1rem" }}>期首残高</h2>
        <AccountBalanceForm />
      </section>

      <section
        style={{
          background: "white",
          borderRadius: "1rem",
          padding: "2rem",
          boxShadow: "0 10px 40px rgba(15, 23, 42, 0.06)",
        }}
      >
        <h2 style={{ fontSize: "1.25rem", marginBottom: "0.5rem" }}>今後追加予定の設定</h2>
        <ul style={{ margin: 0, paddingLeft: "1.2rem", color: "#334155" }}>
          <li>勘定科目・税区分のカスタマイズ</li>
          <li>金融口座連携の管理</li>
          <li>ユーザー招待とアクセス権限</li>
        </ul>
      </section>
    </AppShell>
  );
}
