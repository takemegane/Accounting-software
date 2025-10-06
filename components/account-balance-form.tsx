"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

type AccountBalance = {
  accountId: string;
  accountCode: string;
  accountName: string;
  amount: number;
};

type Account = {
  id: string;
  code: string;
  name: string;
  type: string;
  taxRate?: number;
  taxCategoryCode?: string | null;
};

export function AccountBalanceForm() {
  const queryClient = useQueryClient();
  const { data: balances, isLoading } = useQuery<AccountBalance[]>({
    queryKey: ["account-balances"],
    queryFn: async () => {
      const response = await fetch("/api/account-balances");
      if (!response.ok) {
        throw new Error("残高の取得に失敗しました");
      }
      return response.json();
    },
  });

  const { data: accounts } = useQuery<Account[]>({
    queryKey: ["accounts"],
    queryFn: async () => {
      const response = await fetch("/api/accounts");
      if (!response.ok) {
        throw new Error("勘定科目の取得に失敗しました");
      }
      return response.json();
    },
  });

  const [localState, setLocalState] = useState<Record<string, string>>({});

  const mutation = useMutation({
    mutationFn: async () => {
      const payload = {
        balances: Object.entries(localState).map(([accountId, amount]) => ({
          accountId,
          amount: Number(amount) || 0,
        })),
      };

      const response = await fetch("/api/account-balances", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({ message: "更新に失敗しました" }));
        throw new Error(data.message ?? "更新に失敗しました");
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["account-balances"] });
    },
  });

  if (isLoading) {
    return <p>残高を読み込み中...</p>;
  }

  const handleChange = (accountId: string, value: string) => {
    setLocalState((prev) => ({ ...prev, [accountId]: value }));
  };

  const baseRows = balances ?? [];
  const rowsWithType = baseRows.map((row) => {
    const account = accounts?.find((acc) => acc.id === row.accountId);
    return {
      ...row,
      type: account?.type ?? "OTHER",
    };
  });

  const groupedRows = rowsWithType.reduce<Record<string, typeof rowsWithType>>((acc, row) => {
    const key = row.type;
    acc[key] = acc[key] ?? [];
    acc[key].push(row);
    return acc;
  }, {});

  return (
    <form
      style={{ display: "grid", gap: "1rem" }}
      onSubmit={(event) => {
        event.preventDefault();
        mutation.mutate();
      }}
    >
      <p style={{ margin: 0, color: "#64748b", fontSize: "0.9rem" }}>
        期首残高を登録すると、ダッシュボードのキャッシュ表示とレポートがより正確になります。
      </p>

      <div style={{ display: "grid", gap: "1.5rem" }}>
        {Object.entries(groupedRows)
          .sort((a, b) => a[0].localeCompare(b[0]))
          .map(([type, rows]) => (
            <div key={type} style={{ overflowX: "auto" }}>
              <h3 style={{ fontSize: "1.1rem", marginBottom: "0.75rem" }}>{typeLabel(type)}</h3>
              <table
                style={{
                  width: "100%",
                  borderCollapse: "collapse",
                  minWidth: "480px",
                }}
              >
                <thead>
                  <tr style={{ textAlign: "left", color: "#475569", fontSize: "0.85rem" }}>
                    <th style={{ padding: "0.5rem" }}>科目コード</th>
                    <th style={{ padding: "0.5rem" }}>勘定科目</th>
                    <th style={{ padding: "0.5rem" }}>残高</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={row.accountId} style={{ borderTop: "1px solid #e2e8f0" }}>
                      <td style={{ padding: "0.75rem" }}>{row.accountCode}</td>
                      <td style={{ padding: "0.75rem" }}>{row.accountName}</td>
                      <td style={{ padding: "0.75rem" }}>
                        <input
                          type="number"
                          value={localState[row.accountId] ?? row.amount?.toString() ?? "0"}
                          onChange={(event) => handleChange(row.accountId, event.target.value)}
                          style={{
                            width: "180px",
                            padding: "0.5rem",
                            borderRadius: "0.5rem",
                            border: "1px solid #cbd5f5",
                          }}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
      </div>

      <div style={{ display: "flex", gap: "1rem" }}>
        <button
          type="submit"
          style={{
            padding: "0.65rem 1.25rem",
            borderRadius: "0.75rem",
            backgroundColor: "#2563eb",
            color: "white",
            border: "none",
            fontWeight: 600,
            cursor: "pointer",
          }}
          disabled={mutation.isPending}
        >
          {mutation.isPending ? "保存中..." : "残高を保存"}
        </button>
        {mutation.isError && (
          <p style={{ color: "#ef4444", margin: 0 }}>
            {mutation.error instanceof Error ? mutation.error.message : "更新に失敗しました"}
          </p>
        )}
        {mutation.isSuccess && <p style={{ color: "#16a34a", margin: 0 }}>保存しました。</p>}
      </div>
    </form>
  );
}

function typeLabel(type: string) {
  switch (type) {
    case "ASSET":
      return "資産";
    case "LIABILITY":
      return "負債";
    case "EQUITY":
      return "純資産";
    case "EXPENSE":
      return "費用";
    case "REVENUE":
      return "収益";
    default:
      return "その他";
  }
}
