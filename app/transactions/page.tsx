"use client";

import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { JournalEntryForm } from "@/components/journal-entry-form";
import { TransactionsTable } from "@/components/transactions-table";
import { CsvImporter } from "@/components/csv-importer";
import { ImportedTransactions } from "@/components/imported-transactions";
import { JournalEntryEditorProvider, useJournalEntryEditor } from "@/components/journal-entry-editor-context";

function TransactionsContent() {
  const { editingEntry } = useJournalEntryEditor();

  return (
    <>
      <CsvImporter />
      {editingEntry && (
        <div
          id="edit-form"
          style={{
            background: "linear-gradient(to bottom, #eff6ff, #ffffff)",
            borderRadius: "1rem",
            padding: "2rem",
            boxShadow: "0 10px 40px rgba(37, 99, 235, 0.15)",
            marginBottom: "2rem",
            border: "2px solid #3b82f6",
          }}
        >
          <div
            style={{
              background: "#3b82f6",
              color: "white",
              padding: "0.5rem 1rem",
              borderRadius: "0.5rem",
              marginBottom: "1rem",
              fontSize: "0.9rem",
              fontWeight: 600,
              display: "inline-block",
            }}
          >
            📝 編集モード
          </div>
          <JournalEntryForm />
        </div>
      )}
      {!editingEntry && <JournalEntryForm />}
      <ImportedTransactions />
      <TransactionsTable />
    </>
  );
}

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
        <TransactionsContent />
      </JournalEntryEditorProvider>
    </AppShell>
  );
}
