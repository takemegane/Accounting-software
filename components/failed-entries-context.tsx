"use client";

import { createContext, useContext, useState, ReactNode } from "react";

type FailedEntryLine = {
  accountId: string;
  debit: string;
  credit: string;
  memo: string;
  taxCategoryId: string;
};

export type FailedEntry = {
  id: string; // 一意のID
  timestamp: number; // 登録時刻
  date: string;
  description: string;
  lines: FailedEntryLine[];
  error: string;
};

type FailedEntriesContextType = {
  failedEntries: FailedEntry[];
  addFailedEntry: (entry: Omit<FailedEntry, "id" | "timestamp">) => void;
  removeFailedEntry: (id: string) => void;
  clearAllFailedEntries: () => void;
};

const FailedEntriesContext = createContext<FailedEntriesContextType | undefined>(undefined);

export function FailedEntriesProvider({ children }: { children: ReactNode }) {
  const [failedEntries, setFailedEntries] = useState<FailedEntry[]>([]);

  const addFailedEntry = (entry: Omit<FailedEntry, "id" | "timestamp">) => {
    const newEntry: FailedEntry = {
      ...entry,
      id: `failed-${Date.now()}-${Math.random()}`,
      timestamp: Date.now(),
    };
    setFailedEntries((prev) => [newEntry, ...prev]);
  };

  const removeFailedEntry = (id: string) => {
    setFailedEntries((prev) => prev.filter((entry) => entry.id !== id));
  };

  const clearAllFailedEntries = () => {
    setFailedEntries([]);
  };

  return (
    <FailedEntriesContext.Provider
      value={{
        failedEntries,
        addFailedEntry,
        removeFailedEntry,
        clearAllFailedEntries,
      }}
    >
      {children}
    </FailedEntriesContext.Provider>
  );
}

export function useFailedEntries() {
  const context = useContext(FailedEntriesContext);
  if (!context) {
    throw new Error("useFailedEntries must be used within FailedEntriesProvider");
  }
  return context;
}
