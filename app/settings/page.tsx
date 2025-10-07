"use client";

import { useState } from "react";
import { AppShell } from "@/components/app-shell";
import { BusinessSettings } from "@/components/business-settings";
import { AccountBalanceForm } from "@/components/account-balance-form";
import { AccountManager } from "@/components/account-manager";
import { ClosingPeriodManager } from "@/components/closing-period-manager";
import { TaxCategoryManager } from "@/components/tax-category-manager";

type Tab = "basic" | "accounts" | "tax" | "closing" | "balance";

const tabs: { id: Tab; label: string }[] = [
  { id: "basic", label: "基本設定" },
  { id: "accounts", label: "勘定科目" },
  { id: "tax", label: "税区分" },
  { id: "closing", label: "月次締め" },
  { id: "balance", label: "期首残高" },
];

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<Tab>("basic");

  return (
    <AppShell title="設定" description="事業情報や会計設定の管理を行います。">
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

      {activeTab === "basic" && (
        <section
          style={{
            background: "white",
            borderRadius: "1rem",
            padding: "2rem",
            boxShadow: "0 10px 40px rgba(15, 23, 42, 0.06)",
          }}
        >
          <BusinessSettings />
        </section>
      )}

      {activeTab === "accounts" && <AccountManager />}

      {activeTab === "tax" && (
        <section
          style={{
            background: "white",
            borderRadius: "1rem",
            padding: "2rem",
            boxShadow: "0 10px 40px rgba(15, 23, 42, 0.06)",
          }}
        >
          <TaxCategoryManager />
        </section>
      )}

      {activeTab === "closing" && <ClosingPeriodManager />}

      {activeTab === "balance" && (
        <section
          style={{
            background: "white",
            borderRadius: "1rem",
            padding: "2rem",
            boxShadow: "0 10px 40px rgba(15, 23, 42, 0.06)",
          }}
        >
          <h2 style={{ fontSize: "1.25rem", marginBottom: "1rem" }}>期首残高</h2>
          <AccountBalanceForm />
        </section>
      )}
    </AppShell>
  );
}
