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

  const renderTabContent = () => {
    switch (activeTab) {
      case "trial-balance":
        return <TrialBalanceReport />;
      case "balance-sheet":
        return <BalanceSheetReport />;
      case "income-statement":
        return <IncomeStatementReport />;
      default:
        return null;
    }
  };

  return (
    <AppShell
      title="レポート"
      description="試算表・貸借対照表・損益計算書を確認できます。"
    >
      <section
        style={{
          background: "white",
          borderRadius: "1rem",
          boxShadow: "0 10px 40px rgba(15, 23, 42, 0.06)",
          display: "grid",
          gridTemplateRows: "auto 1fr",
        }}
      >
        <div
          style={{
            padding: "0.5rem 1.5rem 0",
            borderBottom: "1px solid #e5e7eb",
            display: "flex",
            gap: "0.35rem",
            flexWrap: "wrap",
          }}
        >
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              style={{
                padding: "0.5rem 1.1rem",
                background: "none",
                border: "none",
                borderBottom: activeTab === tab.id ? "2px solid #2563eb" : "2px solid transparent",
                color: activeTab === tab.id ? "#2563eb" : "#64748b",
                fontWeight: activeTab === tab.id ? 600 : 500,
                cursor: "pointer",
                fontSize: "0.9rem",
                transition: "all 0.2s ease",
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div
          style={{
            padding: "1.5rem",
            display: "grid",
            gap: "1.5rem",
            alignContent: "start",
          }}
        >
          {renderTabContent()}
        </div>
      </section>
    </AppShell>
  );
}
