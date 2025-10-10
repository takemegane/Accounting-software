"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

const TAX_PREF_OPTIONS = [
  { value: "TAX_INCLUSIVE", label: "税込経理" },
  { value: "TAX_EXCLUSIVE", label: "税抜経理" },
];

type BusinessSummary = {
  id: string;
  name: string;
  role: string;
  isActive: boolean;
};

type BusinessResponse = {
  activeBusiness: Business;
  businesses: BusinessSummary[];
};

type Business = {
  id: string;
  name: string;
  taxPreference: string;
  vatPayableAccountId?: string | null;
  vatReceivableAccountId?: string | null;
  fiscalYearStartMonth: number;
};

type Account = {
  id: string;
  code: string;
  name: string;
  type: string;
};

export function BusinessSettings() {
  const queryClient = useQueryClient();
  const [newBusinessName, setNewBusinessName] = useState("");

  const businessQuery = useQuery<BusinessResponse>({
    queryKey: ["business"],
    queryFn: async () => {
      const response = await fetch("/api/business");
      if (!response.ok) {
        throw new Error("事業情報の取得に失敗しました");
      }
      return response.json();
    },
  });

  const accountsQuery = useQuery<Account[]>({
    queryKey: ["accounts"],
    queryFn: async () => {
      const response = await fetch("/api/accounts");
      if (!response.ok) {
        throw new Error("勘定科目の取得に失敗しました");
      }
      return response.json();
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (payload: Partial<{
      taxPreference: string;
      vatPayableAccountId: string | null;
      vatReceivableAccountId: string | null;
      activeBusinessId: string;
    }>) => {
      const response = await fetch("/api/business", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message ?? "更新に失敗しました");
      }
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["business"] });
      queryClient.invalidateQueries({ queryKey: ["accounts"] });
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      queryClient.invalidateQueries({ queryKey: ["journal-entries"] });
      queryClient.invalidateQueries({ queryKey: ["trial-balance"] });
      queryClient.invalidateQueries({ queryKey: ["trial-balance-report"] });
      queryClient.invalidateQueries({ queryKey: ["income-statement-report"] });
    },
  });

  const createMutation = useMutation({
    mutationFn: async (payload: { name: string }) => {
      const response = await fetch("/api/business", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message ?? "事業の作成に失敗しました");
      }
      return data;
    },
    onSuccess: () => {
      setNewBusinessName("");
      queryClient.invalidateQueries({ queryKey: ["business"] });
      queryClient.invalidateQueries({ queryKey: ["accounts"] });
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      queryClient.invalidateQueries({ queryKey: ["journal-entries"] });
      queryClient.invalidateQueries({ queryKey: ["trial-balance"] });
      queryClient.invalidateQueries({ queryKey: ["trial-balance-report"] });
      queryClient.invalidateQueries({ queryKey: ["income-statement-report"] });
    },
  });

  if (businessQuery.isLoading) {
    return <p>事業情報を読み込み中...</p>;
  }

  if (businessQuery.isError || !businessQuery.data) {
    return <p style={{ color: "#ef4444" }}>事業情報の取得に失敗しました。</p>;
  }

  const activeBusiness = businessQuery.data.activeBusiness;

  return (
    <form
      style={{ display: "grid", gap: "1.5rem" }}
      onSubmit={(event) => {
        event.preventDefault();
      }}
    >
      <div style={{ display: "grid", gap: "0.75rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <h2 style={{ fontSize: "1.25rem", margin: 0, marginBottom: "0.5rem" }}>事業の切り替え</h2>
            <p style={{ margin: 0, color: "#64748b" }}>複数事業を管理している場合はここから切り替えできます。</p>
          </div>
          <select
            value={activeBusiness.id}
            onChange={(event) =>
              updateMutation.mutate({ activeBusinessId: event.target.value })
            }
            style={{
              padding: "0.5rem",
              borderRadius: "0.5rem",
              border: "1px solid #cbd5f5",
              minWidth: "200px",
            }}
          >
            {businessQuery.data.businesses.map((business) => (
              <option key={business.id} value={business.id}>
                {business.name} ({business.role})
              </option>
            ))}
          </select>
        </div>

        <div style={{ display: "grid", gap: "0.5rem", maxWidth: "360px" }}>
          <label style={{ fontWeight: 600 }}>新しい事業を追加</label>
          <div style={{ display: "flex", gap: "0.5rem" }}>
            <input
              type="text"
              value={newBusinessName}
              onChange={(event) => setNewBusinessName(event.target.value)}
              placeholder="事業名"
              style={{
                flex: 1,
                padding: "0.5rem",
                borderRadius: "0.5rem",
                border: "1px solid #cbd5f5",
              }}
            />
            <button
              type="button"
              onClick={() => newBusinessName.trim() && createMutation.mutate({ name: newBusinessName.trim() })}
              disabled={createMutation.isPending || newBusinessName.trim().length === 0}
              style={{
                padding: "0.55rem 1.1rem",
                borderRadius: "0.65rem",
                background: "#2563eb",
                color: "white",
                border: "none",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              追加
            </button>
          </div>
          {createMutation.isError && (
            <p style={{ color: "#ef4444", margin: 0 }}>
              {createMutation.error instanceof Error ? createMutation.error.message : "事業の作成に失敗しました"}
            </p>
          )}
        </div>
      </div>

      <div>
        <h2 style={{ fontSize: "1.25rem", margin: 0, marginBottom: "0.5rem" }}>{activeBusiness.name}</h2>
        <p style={{ margin: 0, color: "#64748b" }}>経理方式や消費税設定を変更できます。</p>
      </div>

      <div style={{ display: "grid", gap: "0.75rem" }}>
        <label style={{ fontWeight: 600 }}>経理方式</label>
        <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap" }}>
          {TAX_PREF_OPTIONS.map((option) => {
            const checked = activeBusiness.taxPreference === option.value;
            return (
              <label
                key={option.value}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem",
                  padding: "0.6rem 0.9rem",
                  borderRadius: "0.75rem",
                  border: checked ? "2px solid #2563eb" : "1px solid #cbd5f5",
                  background: checked ? "rgba(37, 99, 235, 0.08)" : "white",
                  cursor: "pointer",
                }}
              >
                <input
                  type="radio"
                  name="taxPreference"
                  value={option.value}
                  checked={checked}
                  onChange={() => updateMutation.mutate({ taxPreference: option.value })}
                  style={{ accentColor: "#2563eb" }}
                  disabled={updateMutation.isPending}
                />
                <span>{option.label}</span>
              </label>
            );
          })}
        </div>
        <p style={{ fontSize: "0.85rem", color: "#64748b" }}>
          税抜経理を選択すると仕訳入力時に税抜金額をベースに計上し、消費税額を仮受・仮払勘定で管理します。
        </p>
      </div>

      <div style={{ display: "grid", gap: "0.75rem" }}>
        <label style={{ fontWeight: 600 }}>仮受・仮払消費税の勘定科目</label>
        <div style={{ display: "grid", gap: "0.75rem", maxWidth: "360px" }}>
          <div style={{ display: "grid", gap: "0.35rem" }}>
            <span style={{ fontSize: "0.85rem", color: "#475569" }}>仮受消費税</span>
            <select
              value={activeBusiness.vatPayableAccountId ?? ""}
              onChange={(event) => updateMutation.mutate({ vatPayableAccountId: event.target.value || null })}
              disabled={updateMutation.isPending || accountsQuery.isLoading}
              style={{
                padding: "0.5rem",
                borderRadius: "0.5rem",
                border: "1px solid #cbd5f5",
              }}
            >
              <option value="">未設定</option>
              {accountsQuery.data?.map((account) => (
                <option key={account.id} value={account.id}>
                  {account.code} {account.name}
                </option>
              ))}
            </select>
          </div>

          <div style={{ display: "grid", gap: "0.35rem" }}>
            <span style={{ fontSize: "0.85rem", color: "#475569" }}>仮払消費税</span>
            <select
              value={activeBusiness.vatReceivableAccountId ?? ""}
              onChange={(event) => updateMutation.mutate({ vatReceivableAccountId: event.target.value || null })}
              disabled={updateMutation.isPending || accountsQuery.isLoading}
              style={{
                padding: "0.5rem",
                borderRadius: "0.5rem",
                border: "1px solid #cbd5f5",
              }}
            >
              <option value="">未設定</option>
              {accountsQuery.data?.map((account) => (
                <option key={account.id} value={account.id}>
                  {account.code} {account.name}
                </option>
              ))}
            </select>
          </div>
        </div>
        <p style={{ fontSize: "0.85rem", color: "#64748b" }}>
          仕入・売上の税額を自動仕訳する際、この勘定科目が使用されます。
        </p>
      </div>

      {updateMutation.isError && (
        <p style={{ color: "#ef4444" }}>
          {updateMutation.error instanceof Error ? updateMutation.error.message : "更新に失敗しました"}
        </p>
      )}
      {updateMutation.isSuccess && !updateMutation.isError && <p style={{ color: "#16a34a" }}>更新しました。</p>}
    </form>
  );
}
