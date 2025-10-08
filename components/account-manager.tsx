"use client";

import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

type Account = {
  id: string;
  code: string;
  name: string;
  type: string;
  taxCategoryCode?: string | null;
  taxCategoryId: string;
  taxRate?: number;
};

type TaxCategory = {
  id: string;
  code: string;
  name: string;
  rate: number;
};

const ACCOUNT_TYPES: { value: string; label: string }[] = [
  { value: "ASSET", label: "資産" },
  { value: "LIABILITY", label: "負債" },
  { value: "EQUITY", label: "純資産" },
  { value: "REVENUE", label: "収益" },
  { value: "EXPENSE", label: "費用" },
];

export function AccountManager() {
  const queryClient = useQueryClient();
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [type, setType] = useState(ACCOUNT_TYPES[0]?.value ?? "ASSET");
  const [taxCategoryId, setTaxCategoryId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tableMessage, setTableMessage] = useState<string | null>(null);
  const [tableError, setTableError] = useState<string | null>(null);
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);
  const [editCode, setEditCode] = useState("");
  const [editName, setEditName] = useState("");
  const [editType, setEditType] = useState<string>(ACCOUNT_TYPES[0]?.value ?? "ASSET");
  const [editTaxCategoryId, setEditTaxCategoryId] = useState<string | null>(null);
  const [editError, setEditError] = useState<string | null>(null);

  const accountsQuery = useQuery<Account[]>({
    queryKey: ["accounts"],
    queryFn: async () => {
      const response = await fetch("/api/accounts");
      if (!response.ok) {
        throw new Error("勘定科目の取得に失敗しました");
      }
      return response.json();
    },
    retry: false,
  });

  const categoriesQuery = useQuery<TaxCategory[]>({
    queryKey: ["tax-categories"],
    queryFn: async () => {
      const response = await fetch("/api/tax-categories");
      if (!response.ok) {
        throw new Error("税区分の取得に失敗しました");
      }
      return response.json();
    },
    retry: false,
  });

  const taxCategoryLabelMap = useMemo(() => {
    const map = new Map<string, string>();
    (categoriesQuery.data ?? []).forEach((category) => {
      map.set(category.id, category.name);
    });
    return map;
  }, [categoriesQuery.data]);

  const sortedAccounts = useMemo(() => {
    const items = accountsQuery.data ?? [];
    return [...items].sort((a, b) => a.code.localeCompare(b.code, "ja"));
  }, [accountsQuery.data]);

  const accountsByType = useMemo(() => {
    const grouped = new Map<string, Account[]>();
    ACCOUNT_TYPES.forEach((type) => {
      grouped.set(type.value, []);
    });
    sortedAccounts.forEach((account) => {
      const existing = grouped.get(account.type) ?? [];
      existing.push(account);
      grouped.set(account.type, existing);
    });
    return grouped;
  }, [sortedAccounts]);

  const createMutation = useMutation({
    mutationFn: async () => {
      const payload: any = {
        name: name.trim(),
        type,
        taxCategoryId: taxCategoryId,
      };

      // コードが入力されている場合のみ含める
      if (code.trim()) {
        payload.code = code.trim();
      }

      const response = await fetch("/api/accounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await response.json().catch(() => ({ message: "勘定科目の登録に失敗しました" }));
      if (!response.ok) {
        throw new Error(data.message ?? "勘定科目の登録に失敗しました");
      }
      return data as Account;
    },
    onSuccess: (created) => {
      setMessage(`「${created.code} ${created.name}」を追加しました`);
      setError(null);
      setCode("");
      setName("");
      setTaxCategoryId((categoriesQuery.data ?? categories)[0]?.id ?? null);
      setTableMessage(null);
      setTableError(null);
      queryClient.invalidateQueries({ queryKey: ["accounts"] });
      queryClient.invalidateQueries({ queryKey: ["account-balances"] });
      queryClient.invalidateQueries({ queryKey: ["trial-balance"] });
      queryClient.invalidateQueries({ queryKey: ["trial-balance-report"] });
      queryClient.invalidateQueries({ queryKey: ["income-statement-report"] });
    },
    onError: (err: unknown) => {
      setError(err instanceof Error ? err.message : "勘定科目の登録に失敗しました");
      setMessage(null);
    },
  });

  const updateMutation = useMutation<
    Account,
    Error,
    { accountId: string; payload: { code: string; name: string; type: string; taxCategoryId: string } }
  >({
    mutationFn: async ({ accountId, payload }) => {
      const response = await fetch(`/api/accounts/${accountId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await response
        .json()
        .catch(() => ({ message: "勘定科目の更新に失敗しました" }));
      if (!response.ok) {
        throw new Error(data.message ?? "勘定科目の更新に失敗しました");
      }
      return data as Account;
    },
    onSuccess: (updated) => {
      setTableMessage(`「${updated.code} ${updated.name}」を更新しました`);
      setTableError(null);
      setEditingAccount(null);
      setEditError(null);
      queryClient.invalidateQueries({ queryKey: ["accounts"] });
      queryClient.invalidateQueries({ queryKey: ["account-balances"] });
      queryClient.invalidateQueries({ queryKey: ["trial-balance"] });
      queryClient.invalidateQueries({ queryKey: ["trial-balance-report"] });
      queryClient.invalidateQueries({ queryKey: ["income-statement-report"] });
    },
    onError: (error) => {
      setEditError(error.message || "勘定科目の更新に失敗しました");
    },
  });

  const deleteMutation = useMutation<
    null,
    Error,
    { accountId: string; label: string }
  >({
    mutationFn: async ({ accountId }) => {
      const response = await fetch(`/api/accounts/${accountId}`, {
        method: "DELETE",
      });
      const data = await response
        .json()
        .catch(() => ({ message: "勘定科目の削除に失敗しました" }));
      if (!response.ok) {
        throw new Error(data.message ?? "勘定科目の削除に失敗しました");
      }
      return null;
    },
    onSuccess: (_data, variables) => {
      setTableMessage(`「${variables.label}」を削除しました`);
      setTableError(null);
      if (editingAccount?.id === variables.accountId) {
        setEditingAccount(null);
        setEditError(null);
      }
      queryClient.invalidateQueries({ queryKey: ["accounts"] });
      queryClient.invalidateQueries({ queryKey: ["account-balances"] });
      queryClient.invalidateQueries({ queryKey: ["trial-balance"] });
      queryClient.invalidateQueries({ queryKey: ["trial-balance-report"] });
      queryClient.invalidateQueries({ queryKey: ["income-statement-report"] });
    },
    onError: (error) => {
      setTableError(error.message || "勘定科目の削除に失敗しました");
    },
  });

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMessage(null);
    setError(null);

    if (!name.trim() || !taxCategoryId) {
      setError("名称・税区分を入力してください");
      return;
    }

    createMutation.mutate();
  };

  const handleEditSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!editingAccount) {
      return;
    }

    setEditError(null);

    if (!editCode.trim() || !editName.trim() || !editTaxCategoryId) {
      setEditError("コード・名称・税区分を入力してください");
      return;
    }

    updateMutation.mutate({
      accountId: editingAccount.id,
      payload: {
        code: editCode.trim(),
        name: editName.trim(),
        type: editType,
        taxCategoryId: editTaxCategoryId,
      },
    });
  };

  const handleDelete = (account: Account) => {
    setTableError(null);
    if (deleteMutation.isPending) {
      return;
    }
    const label = `${account.code} ${account.name}`;
    if (typeof window !== "undefined") {
      const confirmed = window.confirm(`「${label}」を削除しますか？`);
      if (!confirmed) {
        return;
      }
    }
    deleteMutation.mutate({ accountId: account.id, label });
  };

  const categories = useMemo(() => {
    if (categoriesQuery.data) {
      return categoriesQuery.data;
    }
    if (!accountsQuery.data) {
      return [];
    }
    const unique = new Map<string, TaxCategory>();
    accountsQuery.data.forEach((account) => {
      if (!account.taxCategoryId) {
        return;
      }
      if (!unique.has(account.taxCategoryId)) {
        unique.set(account.taxCategoryId, {
          id: account.taxCategoryId,
          code: account.taxCategoryCode ?? account.taxCategoryId.slice(0, 6),
          name: account.taxCategoryCode ?? account.taxCategoryId,
          rate: account.taxRate ?? 0,
        });
      }
    });
    return Array.from(unique.values()).sort((a, b) => a.code.localeCompare(b.code, "ja"));
  }, [categoriesQuery.data, accountsQuery.data]);

  const isLoading = accountsQuery.isPending || categoriesQuery.isPending;
  const categoriesError = categoriesQuery.isError
    ? (categoriesQuery.error as Error | undefined)?.message ?? "税区分の取得に失敗しました"
    : null;

  useEffect(() => {
    if (editingAccount) {
      setEditCode(editingAccount.code);
      setEditName(editingAccount.name);
      setEditType(editingAccount.type);
      setEditTaxCategoryId(editingAccount.taxCategoryId);
      setEditError(null);
      setTableMessage(null);
      setTableError(null);
    } else {
      setEditCode("");
      setEditName("");
      setEditType(ACCOUNT_TYPES[0]?.value ?? "ASSET");
      setEditTaxCategoryId(null);
      setEditError(null);
    }
  }, [editingAccount]);

  useEffect(() => {
    if (editingAccount && !editTaxCategoryId && categories.length > 0) {
      const fallback =
        categories.find((category) => category.id === editingAccount.taxCategoryId) ?? categories[0];
      setEditTaxCategoryId(fallback.id);
    }
  }, [categories, editTaxCategoryId, editingAccount]);

  useEffect(() => {
    if (!taxCategoryId && categories.length > 0) {
      setTaxCategoryId(categories[0].id);
    }
  }, [categories, taxCategoryId]);

  return (
    <div style={{ display: "grid", gap: "1.5rem" }}>
      <section
        style={{
          background: "white",
          borderRadius: "1rem",
          padding: "2rem",
          boxShadow: "0 10px 40px rgba(15, 23, 42, 0.06)",
        }}
      >
        <h2 style={{ fontSize: "1.25rem", marginBottom: "1rem" }}>勘定科目を追加</h2>
        <p style={{ margin: 0, color: "#64748b", lineHeight: 1.6 }}>
          コードは未入力の場合、区分ごとに自動採番されます。登録後は試算表やレポートに即時反映されます。
        </p>

        {categoriesError && (
          <p
            style={{
              marginTop: "1rem",
              color: "#92400e",
              background: "#fffbeb",
              border: "1px solid #fbbf24",
              padding: "0.75rem 1rem",
              borderRadius: "0.75rem",
              fontSize: "0.9rem",
            }}
          >
            税区分一覧の取得に失敗しました。既存の勘定科目に設定済みの区分のみ選択できます。
          </p>
        )}

        <form onSubmit={handleSubmit} style={{ display: "grid", gap: "1rem", marginTop: "1.5rem", maxWidth: "520px" }}>
          <div style={{ display: "grid", gap: "0.35rem" }}>
            <label style={{ fontWeight: 600 }}>コード（任意）</label>
            <input
              type="text"
              value={code}
              onChange={(event) => setCode(event.target.value)}
              placeholder="未入力の場合は自動採番されます"
              style={{ padding: "0.6rem", borderRadius: "0.5rem", border: "1px solid #cbd5f5" }}
            />
          </div>

          <div style={{ display: "grid", gap: "0.35rem" }}>
            <label style={{ fontWeight: 600 }}>勘定科目名</label>
            <input
              type="text"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="科目名を入力"
              style={{ padding: "0.6rem", borderRadius: "0.5rem", border: "1px solid #cbd5f5" }}
              required
            />
          </div>

          <div style={{ display: "grid", gap: "0.35rem" }}>
            <label style={{ fontWeight: 600 }}>区分</label>
            <select
              value={type}
              onChange={(event) => setType(event.target.value)}
              style={{ padding: "0.6rem", borderRadius: "0.5rem", border: "1px solid #cbd5f5" }}
            >
              {ACCOUNT_TYPES.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
          </div>

          <div style={{ display: "grid", gap: "0.35rem" }}>
            <label style={{ fontWeight: 600 }}>税区分</label>
            <select
              value={taxCategoryId ?? ""}
              onChange={(event) => setTaxCategoryId(event.target.value || null)}
              style={{ padding: "0.6rem", borderRadius: "0.5rem", border: "1px solid #cbd5f5" }}
              required
              disabled={categories.length === 0}
            >
              <option value="" disabled>
                税区分を選択
              </option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.code} {category.name}
                </option>
              ))}
            </select>
          </div>

          {error && <p style={{ color: "#ef4444", margin: 0 }}>{error}</p>}
          {message && <p style={{ color: "#16a34a", margin: 0 }}>{message}</p>}

          <button
            type="submit"
            disabled={createMutation.isPending || categories.length === 0}
            style={{
              padding: "0.75rem 1.5rem",
              borderRadius: "0.75rem",
              backgroundColor: createMutation.isPending ? "#9ca3af" : "#2563eb",
              color: "white",
              border: "none",
              fontWeight: 600,
              cursor: createMutation.isPending ? "not-allowed" : "pointer",
            }}
          >
            {createMutation.isPending ? "登録中..." : "勘定科目を追加"}
          </button>
        </form>
      </section>

      {editingAccount && (
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
          onClick={() => setEditingAccount(null)}
        >
          <div
            style={{
              background: "white",
              borderRadius: "1rem",
              padding: "2rem",
              boxShadow: "0 20px 60px rgba(0, 0, 0, 0.3)",
              maxWidth: "540px",
              width: "100%",
              maxHeight: "90vh",
              overflowY: "auto",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
              <h2 style={{ fontSize: "1.25rem", margin: 0 }}>勘定科目を編集</h2>
              <button
                type="button"
                onClick={() => setEditingAccount(null)}
                style={{
                  background: "none",
                  border: "none",
                  fontSize: "1.5rem",
                  cursor: "pointer",
                  color: "#64748b",
                  padding: "0.25rem",
                  lineHeight: 1,
                }}
                disabled={updateMutation.isPending}
              >
                ×
              </button>
            </div>
            <p style={{ margin: "0 0 1.5rem", color: "#64748b", lineHeight: 1.6 }}>
              編集対象: {editingAccount.code} {editingAccount.name}
            </p>

            <form
              onSubmit={handleEditSubmit}
              style={{ display: "grid", gap: "1rem" }}
            >
              <div style={{ display: "grid", gap: "0.35rem" }}>
                <label style={{ fontWeight: 600 }}>コード</label>
                <input
                  type="text"
                  value={editCode}
                  onChange={(event) => setEditCode(event.target.value)}
                  placeholder="例: 512"
                  style={{ padding: "0.6rem", borderRadius: "0.5rem", border: "1px solid #cbd5f5" }}
                  required
                />
              </div>

              <div style={{ display: "grid", gap: "0.35rem" }}>
                <label style={{ fontWeight: 600 }}>勘定科目名</label>
                <input
                  type="text"
                  value={editName}
                  onChange={(event) => setEditName(event.target.value)}
                  placeholder="科目名を入力"
                  style={{ padding: "0.6rem", borderRadius: "0.5rem", border: "1px solid #cbd5f5" }}
                  required
                />
              </div>

              <div style={{ display: "grid", gap: "0.35rem" }}>
                <label style={{ fontWeight: 600 }}>区分</label>
                <select
                  value={editType}
                  onChange={(event) => setEditType(event.target.value)}
                  style={{ padding: "0.6rem", borderRadius: "0.5rem", border: "1px solid #cbd5f5" }}
                >
                  {ACCOUNT_TYPES.map((item) => (
                    <option key={item.value} value={item.value}>
                      {item.label}
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ display: "grid", gap: "0.35rem" }}>
                <label style={{ fontWeight: 600 }}>税区分</label>
                <select
                  value={editTaxCategoryId ?? ""}
                  onChange={(event) => setEditTaxCategoryId(event.target.value || null)}
                  style={{ padding: "0.6rem", borderRadius: "0.5rem", border: "1px solid #cbd5f5" }}
                  required
                  disabled={categories.length === 0}
                >
                  <option value="" disabled>
                    税区分を選択
                  </option>
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.code} {category.name}
                    </option>
                  ))}
                </select>
              </div>

              {editError && <p style={{ color: "#ef4444", margin: 0 }}>{editError}</p>}

              <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap", marginTop: "0.5rem" }}>
                <button
                  type="submit"
                  disabled={updateMutation.isPending || categories.length === 0}
                  style={{
                    padding: "0.75rem 1.5rem",
                    borderRadius: "0.75rem",
                    backgroundColor: updateMutation.isPending ? "#9ca3af" : "#2563eb",
                    color: "white",
                    border: "none",
                    fontWeight: 600,
                    cursor: updateMutation.isPending ? "not-allowed" : "pointer",
                    flex: 1,
                  }}
                >
                  {updateMutation.isPending ? "保存中..." : "変更を保存"}
                </button>
                <button
                  type="button"
                  onClick={() => setEditingAccount(null)}
                  style={{
                    padding: "0.75rem 1.5rem",
                    borderRadius: "0.75rem",
                    border: "1px solid #cbd5f5",
                    backgroundColor: "white",
                    fontWeight: 600,
                    color: "#1f2937",
                    cursor: updateMutation.isPending ? "not-allowed" : "pointer",
                    flex: 1,
                  }}
                  disabled={updateMutation.isPending}
                >
                  キャンセル
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <section
        style={{
          background: "white",
          borderRadius: "1rem",
          padding: "2rem",
          boxShadow: "0 10px 40px rgba(15, 23, 42, 0.06)",
        }}
      >
        <h2 style={{ fontSize: "1.25rem", marginBottom: "1rem" }}>登録済み勘定科目</h2>
        {tableMessage && <p style={{ color: "#16a34a", margin: "0 0 1rem" }}>{tableMessage}</p>}
        {tableError && <p style={{ color: "#ef4444", margin: "0 0 1rem" }}>{tableError}</p>}
        {isLoading && <p>読み込み中...</p>}
        {accountsQuery.isError && <p style={{ color: "#ef4444" }}>勘定科目の取得に失敗しました。</p>}
        {!isLoading && sortedAccounts.length === 0 && <p>まだ勘定科目が登録されていません。</p>}

        {!isLoading && sortedAccounts.length > 0 && (
          <div style={{ display: "grid", gap: "2rem" }}>
            {ACCOUNT_TYPES.map((typeInfo) => {
              const accounts = accountsByType.get(typeInfo.value) ?? [];
              if (accounts.length === 0) return null;

              return (
                <div key={typeInfo.value}>
                  <h3 style={{ fontSize: "1.1rem", marginBottom: "0.75rem", color: "#1f2937", borderBottom: "2px solid #e5e7eb", paddingBottom: "0.5rem" }}>
                    {typeInfo.label}
                  </h3>
                  <div style={{ overflowX: "auto" }}>
                    <table
                      style={{
                        width: "100%",
                        borderCollapse: "collapse",
                        minWidth: "640px",
                      }}
                    >
                      <thead>
                        <tr style={{ textAlign: "left", color: "#475569", fontSize: "0.85rem", background: "#f8fafc" }}>
                          <th style={{ padding: "0.5rem" }}>コード</th>
                          <th style={{ padding: "0.5rem" }}>名称</th>
                          <th style={{ padding: "0.5rem" }}>税区分</th>
                          <th style={{ padding: "0.5rem" }}>操作</th>
                        </tr>
                      </thead>
                      <tbody>
                        {accounts.map((account) => (
                          <tr key={account.id} style={{ borderTop: "1px solid #e2e8f0" }}>
                            <td style={{ padding: "0.75rem", fontWeight: 600 }}>{account.code}</td>
                            <td style={{ padding: "0.75rem" }}>{account.name}</td>
                            <td style={{ padding: "0.75rem" }}>
                              {taxCategoryLabelMap.get(account.taxCategoryId) ?? account.taxCategoryCode ?? "-"}
                            </td>
                            <td style={{ padding: "0.75rem" }}>
                              <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                                <button
                                  type="button"
                                  onClick={() => setEditingAccount(account)}
                                  style={{
                                    padding: "0.4rem 0.9rem",
                                    borderRadius: "0.65rem",
                                    border: "1px solid #2563eb",
                                    backgroundColor: "white",
                                    color: "#2563eb",
                                    fontWeight: 600,
                                    cursor: updateMutation.isPending ? "not-allowed" : "pointer",
                                  }}
                                  disabled={updateMutation.isPending}
                                >
                                  編集
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDelete(account)}
                                  style={{
                                    padding: "0.4rem 0.9rem",
                                    borderRadius: "0.65rem",
                                    border: "1px solid #ef4444",
                                    backgroundColor: "white",
                                    color: "#ef4444",
                                    fontWeight: 600,
                                    cursor: deleteMutation.isPending ? "not-allowed" : "pointer",
                                  }}
                                  disabled={deleteMutation.isPending}
                                >
                                  削除
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
