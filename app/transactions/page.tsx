import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { JournalEntryForm } from "@/components/journal-entry-form";
import { TransactionsTable } from "@/components/transactions-table";
import { CsvImporter } from "@/components/csv-importer";
import { ImportedTransactions } from "@/components/imported-transactions";
import { JournalEntryEditorProvider } from "@/components/journal-entry-editor-context";

export const dynamic = "force-dynamic";

export default function TransactionsPage() {
  return (
    <AppShell
      title="取引"
      description="仕訳の登録や取引明細の管理を行います。"
      actions={
        <Link
          href="#csv-import"
          style={{
            padding: "0.6rem 1.2rem",
            borderRadius: "0.65rem",
            border: "1px solid #2563eb",
            color: "#2563eb",
            fontWeight: 600,
          }}
        >
          CSVインポートへ
        </Link>
      }
    >
      <JournalEntryEditorProvider>
        <CsvImporter />
        <JournalEntryForm />
        <ImportedTransactions />
        <TransactionsTable />
      </JournalEntryEditorProvider>
    </AppShell>
  );
}
