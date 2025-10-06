"use client";

import { createContext, ReactNode, useContext, useMemo, useState } from "react";

export type JournalEntryDraftLine = {
  id?: string;
  accountId: string;
  debit: number;
  credit: number;
  memo?: string;
  taxCategoryId?: string | null;
};

export type JournalEntryDraft = {
  id: string;
  entryDate: string;
  description?: string;
  lines: JournalEntryDraftLine[];
};

type ContextValue = {
  editingEntry: JournalEntryDraft | null;
  setEditingEntry: (entry: JournalEntryDraft | null) => void;
};

const JournalEntryEditorContext = createContext<ContextValue | undefined>(undefined);

export function JournalEntryEditorProvider({ children }: { children: ReactNode }) {
  const [editingEntry, setEditingEntry] = useState<JournalEntryDraft | null>(null);

  const value = useMemo(
    () => ({ editingEntry, setEditingEntry }),
    [editingEntry]
  );

  return <JournalEntryEditorContext.Provider value={value}>{children}</JournalEntryEditorContext.Provider>;
}

export function useJournalEntryEditor() {
  const context = useContext(JournalEntryEditorContext);
  if (!context) {
    throw new Error("useJournalEntryEditor must be used within a JournalEntryEditorProvider");
  }

  const cancelEditing = () => context.setEditingEntry(null);

  return {
    editingEntry: context.editingEntry,
    setEditingEntry: context.setEditingEntry,
    cancelEditing,
  };
}
