"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { SafeUserButton } from "@/components/safe-clerk";

const NAV_ITEMS = [
  { href: "/dashboard", label: "ダッシュボード" },
  { href: "/transactions", label: "取引" },
  { href: "/reports", label: "レポート" },
  { href: "/books", label: "帳簿" },
  { href: "/settings", label: "設定" },
] as const satisfies ReadonlyArray<{ href: `/${string}`; label: string }>;

type AppShellProps = {
  title: string;
  description?: string;
  actions?: ReactNode;
  children: ReactNode;
};

export function AppShell({ title, description, actions, children }: AppShellProps) {
  const pathname = usePathname();
  const { data: businessResponse } = useQuery<{ activeBusiness: { name: string; taxPreference: string } } | undefined>({
    queryKey: ["business"],
    queryFn: async () => {
      const response = await fetch("/api/business");
      if (!response.ok) {
        throw new Error("事業情報の取得に失敗しました");
      }
      return response.json();
    },
  });

  const activeBusiness = businessResponse?.activeBusiness;
  const taxPrefLabel = activeBusiness?.taxPreference === "TAX_EXCLUSIVE" ? "税抜経理" : "税込経理";

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "grid",
        gridTemplateColumns: "240px 1fr",
        background: "#f1f5f9",
      }}
    >
      <aside
        style={{
          background: "linear-gradient(180deg, #1e3a8a 0%, #2563eb 100%)",
          color: "white",
          display: "flex",
          flexDirection: "column",
          padding: "1.5rem 1.25rem",
        }}
      >
        <div style={{ marginBottom: "2rem" }}>
          <Link href="/dashboard" style={{ color: "white", fontSize: "1.25rem", fontWeight: 700 }}>
            会計システム
          </Link>
          <p style={{ fontSize: "0.85rem", color: "#e0e7ff", marginTop: "0.5rem" }}>
            {activeBusiness?.name ?? "Demo Business"}
          </p>
        </div>
        <nav style={{ display: "grid", gap: "0.5rem" }}>
          {NAV_ITEMS.map((item) => {
            const isActive = pathname?.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                style={{
                  padding: "0.65rem 0.75rem",
                  borderRadius: "0.65rem",
                  background: isActive ? "rgba(255, 255, 255, 0.22)" : "rgba(255, 255, 255, 0.08)",
                  color: "#f8fafc",
                  fontWeight: isActive ? 600 : 500,
                  transition: "background 0.2s ease",
                }}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div style={{ marginTop: "auto", fontSize: "0.75rem", color: "#e0e7ff" }}>
          <p>会計年度開始月: 1月</p>
          <p>{taxPrefLabel}</p>
        </div>
      </aside>

      <div style={{ display: "flex", flexDirection: "column", minHeight: "100vh" }}>
        <header
          style={{
            background: "white",
            padding: "1rem 1.5rem",
            borderBottom: "1px solid #e2e8f0",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div>
            <h1 style={{ fontSize: "1.5rem", margin: 0 }}>{title}</h1>
            {description && <p style={{ margin: "0.25rem 0 0", color: "#64748b" }}>{description}</p>}
          </div>
          <div style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
            {actions}
            <SafeUserButton afterSignOutUrl="/" />
          </div>
        </header>

        <main style={{ flex: 1, padding: "2rem", display: "grid", gap: "2rem" }}>{children}</main>
      </div>
    </div>
  );
}
