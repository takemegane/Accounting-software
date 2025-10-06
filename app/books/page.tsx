import { AppShell } from "@/components/app-shell";
import { GeneralLedgerReport } from "@/components/general-ledger-report";
import { JournalReport } from "@/components/journal-report";

export default function BooksPage() {
  return (
    <AppShell
      title="帳簿"
      description="総勘定元帳と仕訳帳を参照できます。"
    >
      <GeneralLedgerReport />
      <JournalReport />
    </AppShell>
  );
}
