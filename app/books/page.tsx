"use client";

import { AppShell } from "@/components/app-shell";
import { GeneralLedgerReport } from "@/components/general-ledger-report";
import { JournalReport } from "@/components/journal-report";
import { JournalEntryForm } from "@/components/journal-entry-form";
import { JournalEntryEditorProvider, useJournalEntryEditor } from "@/components/journal-entry-editor-context";

function BooksContent() {
  const { editingEntry } = useJournalEntryEditor();

  return (
    <>
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
      <GeneralLedgerReport />
      <JournalReport />
    </>
  );
}

export default function BooksPage() {
  return (
    <AppShell
      title="帳簿"
      description="総勘定元帳と仕訳帳を参照できます。"
    >
      <JournalEntryEditorProvider>
        <BooksContent />
      </JournalEntryEditorProvider>
    </AppShell>
  );
}
