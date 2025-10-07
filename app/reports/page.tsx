"use client";

import { useState } from "react";
import { AppShell } from "@/components/app-shell";
import { TrialBalanceReport } from "@/components/trial-balance-report";
import { BalanceSheetReport } from "@/components/balance-sheet-report";
import { IncomeStatementReport } from "@/components/income-statement-report";

type Tab = "trial-balance" | "balance-sheet" | "income-statement";

const tabs: { id: Tab; label: string }[] = [
  { id: "trial-balance", label: "試算表" },
  { id: "balance-sheet", label: "貸借対照表" },
  { id: "income-statement", label: "損益計算書" },
];

export default function ReportsPage() {
  const [activeTab, setActiveTab] = useState<Tab>("trial-balance");

  return (
    <AppShell
      title="レポート"
      description="試算表・貸借対照表・損益計算書を確認できます。"
    >
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

      {activeTab === "trial-balance" && <TrialBalanceReport />}
      {activeTab === "balance-sheet" && <BalanceSheetReport />}
      {activeTab === "income-statement" && <IncomeStatementReport />}
    </AppShell>
  );
}
