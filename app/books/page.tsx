import { AppShell } from "@/components/app-shell";
import { GeneralLedgerReport } from "@/components/general-ledger-report";
import { JournalReport } from "@/components/journal-report";
import { JournalEntryForm } from "@/components/journal-entry-form";
import { JournalEntryEditorProvider } from "@/components/journal-entry-editor-context";

export default function BooksPage() {
  return (
    <AppShell
      title="帳簿"
      description="総勘定元帳と仕訳帳を参照できます。"
    >
      <JournalEntryEditorProvider>
        <JournalEntryForm />
        <GeneralLedgerReport />
        <JournalReport />
      </JournalEntryEditorProvider>
    </AppShell>
  );
}
