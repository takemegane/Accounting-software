"use client";

import { useState } from "react";
import { AppShell } from "@/components/app-shell";
import { GeneralLedgerReport } from "@/components/general-ledger-report";
import { JournalReport } from "@/components/journal-report";
import { JournalEntryForm } from "@/components/journal-entry-form";
import { JournalEntryEditorProvider, useJournalEntryEditor } from "@/components/journal-entry-editor-context";

type Tab = "general-ledger" | "journal";

const tabs: { id: Tab; label: string }[] = [
  { id: "general-ledger", label: "総勘定元帳" },
  { id: "journal", label: "仕訳帳" },
];

function BooksContent() {
  const { editingEntry } = useJournalEntryEditor();
  const [activeTab, setActiveTab] = useState<Tab>("general-ledger");

  return (
    <>
      {editingEntry && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0, 0, 0, 0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
            padding: "1rem",
          }}
          onClick={() => {}}
        >
          <div
            id="edit-form"
            style={{
              background: "white",
              borderRadius: "1rem",
              padding: "2rem",
              boxShadow: "0 20px 60px rgba(0, 0, 0, 0.3)",
              maxWidth: "900px",
              width: "100%",
              maxHeight: "90vh",
              overflowY: "auto",
            }}
            onClick={(e) => e.stopPropagation()}
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
        </div>
      )}

      <div
        style={{
          background: "white",
          borderRadius: "1rem",
          padding: "1rem 2rem",
          boxShadow: "0 10px 40px rgba(15, 23, 42, 0.06)",
          marginBottom: "1.5rem",
        }}
      >
        <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", borderBottom: "1px solid #e5e7eb" }}>
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              style={{
                padding: "0.75rem 1.5rem",
                background: "none",
                border: "none",
                borderBottom: activeTab === tab.id ? "2px solid #2563eb" : "2px solid transparent",
                color: activeTab === tab.id ? "#2563eb" : "#64748b",
                fontWeight: activeTab === tab.id ? 600 : 500,
                cursor: "pointer",
                fontSize: "0.95rem",
                transition: "all 0.2s ease",
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {activeTab === "general-ledger" && <GeneralLedgerReport />}
      {activeTab === "journal" && <JournalReport />}
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
