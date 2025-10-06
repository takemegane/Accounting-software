import { AppShell } from "@/components/app-shell";
import { TrialBalanceReport } from "@/components/trial-balance-report";
import { BalanceSheetReport } from "@/components/balance-sheet-report";
import { IncomeStatementReport } from "@/components/income-statement-report";

export default function ReportsPage() {
  return (
    <AppShell
      title="レポート"
      description="試算表・貸借対照表・損益計算書を確認できます。"
    >
      <TrialBalanceReport />
      <BalanceSheetReport />
      <IncomeStatementReport />
    </AppShell>
  );
}
