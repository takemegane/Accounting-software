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

  const renderTabContent = () => {
    switch (activeTab) {
      case "basic":
        return (
          <section
            style={{
              background: "white",
              borderRadius: "1rem",
              padding: "1.5rem",
              boxShadow: "0 10px 40px rgba(15, 23, 42, 0.06)",
            }}
          >
            <BusinessSettings />
          </section>
        );
      case "accounts":
        return <AccountManager />;
      case "tax":
        return (
          <section
            style={{
              background: "white",
              borderRadius: "1rem",
              padding: "1.5rem",
              boxShadow: "0 10px 40px rgba(15, 23, 42, 0.06)",
            }}
          >
            <TaxCategoryManager />
          </section>
        );
      case "closing":
        return <ClosingPeriodManager />;
      case "balance":
        return (
          <section
            style={{
              background: "white",
              borderRadius: "1rem",
              padding: "1.5rem",
              boxShadow: "0 10px 40px rgba(15, 23, 42, 0.06)",
              display: "grid",
              gap: "1.5rem",
            }}
          >
            <div>
              <h2 style={{ fontSize: "1.25rem", margin: 0, marginBottom: "0.5rem" }}>期首残高</h2>
              <p style={{ margin: 0, color: "#64748b", fontSize: "0.95rem" }}>
                期首残高を登録すると、ダッシュボードやレポートがより正確になります。
              </p>
            </div>
            <AccountBalanceForm />
          </section>
        );
      default:
        return null;
    }
  };

  return (
    <AppShell title="設定" description="事業情報や会計設定の管理を行います。">
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
