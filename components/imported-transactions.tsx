"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

type ImportedTransaction = {
  id: string;
  transactionDate: string;
  amount: number;
  description?: string;
  counterparty?: string;
  status: string;
  source: string;
  createdAt: string;
  journalEntryId?: string;
  sourceReference?: string;
};

type Account = {
  id: string;
  code: string;
  name: string;
  type: string;
};

const STATUS_LABEL: Record<string, string> = {
  pending: "未処理",
  matched: "照合済み",
  dismissed: "除外",
};

export function ImportedTransactions() {
  const queryClient = useQueryClient();
  const [selectedAccounts, setSelectedAccounts] = useState<Record<string, string>>({});
  const [selectedBankAccounts, setSelectedBankAccounts] = useState<Record<string, string>>({});

  const transactionsQuery = useQuery<ImportedTransaction[]>({
    queryKey: ["transactions"],
    queryFn: async () => {
      const response = await fetch("/api/transactions");
      if (!response.ok) {
        throw new Error("取引の取得に失敗しました");
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

  const assetAccounts = useMemo(
    () => accountsQuery.data?.filter((account) => account.type === "ASSET") ?? [],
    [accountsQuery.data]
  );
  const revenueAccounts = useMemo(
    () => accountsQuery.data?.filter((account) => account.type === "REVENUE") ?? [],
    [accountsQuery.data]
  );
  const expenseAccounts = useMemo(
    () => accountsQuery.data?.filter((account) => account.type === "EXPENSE") ?? [],
    [accountsQuery.data]
  );

  const convertMutation = useMutation({
    mutationFn: async ({
      transactionId,
      counterpartAccountId,
      bankAccountId,
    }: {
      transactionId: string;
      counterpartAccountId: string;
      bankAccountId?: string;
    }) => {
      const response = await fetch(`/api/transactions/${transactionId}/convert`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ counterpartAccountId, bankAccountId }),
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.message ?? "仕訳化に失敗しました");
      }
      return payload;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      queryClient.invalidateQueries({ queryKey: ["journal-entries"] });
      queryClient.invalidateQueries({ queryKey: ["trial-balance"] });
      queryClient.invalidateQueries({ queryKey: ["trial-balance-report"] });
      queryClient.invalidateQueries({ queryKey: ["income-statement-report"] });
    },
  });

  const statusMutation = useMutation({
    mutationFn: async ({ transactionId, status }: { transactionId: string; status: string }) => {
      const response = await fetch(`/api/transactions/${transactionId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.message ?? "更新に失敗しました");
      }
      return payload;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
    },
  });

  const getDefaultCounterpart = (transaction: ImportedTransaction) =>
    transaction.amount >= 0 ? revenueAccounts[0]?.id : expenseAccounts[0]?.id;

  const getDefaultBankAccount = () => assetAccounts[0]?.id;

  const data = transactionsQuery.data ?? [];

  return (
    <section
      style={{
        background: "white",
        borderRadius: "1rem",
        padding: "2rem",
        boxShadow: "0 10px 40px rgba(15, 23, 42, 0.06)",
        display: "grid",
        gap: "1.5rem",
      }}
    >
      <div>
        <h2 style={{ fontSize: "1.25rem", marginBottom: "0.5rem" }}>取り込み済み取引一覧</h2>
        <p style={{ margin: 0, color: "#64748b", fontSize: "0.9rem" }}>
          最新50件のインポート済み取引です。取引から直接仕訳を作成できます。
        </p>
      </div>

      {transactionsQuery.isLoading && <p>読み込み中...</p>}
      {transactionsQuery.isError && <p style={{ color: "#ef4444" }}>取引の取得に失敗しました。</p>}

      {!transactionsQuery.isLoading && data.length === 0 && <p>まだインポートされた取引がありません。</p>}

      {!transactionsQuery.isLoading && data.length > 0 && (
        <div style={{ display: "grid", gap: "1rem" }}>
          {data.map((transaction) => {
            const counterpartId = selectedAccounts[transaction.id] ?? getDefaultCounterpart(transaction) ?? "";
            const bankAccountId =
              selectedBankAccounts[transaction.id] ?? getDefaultBankAccount() ?? assetAccounts[0]?.id ?? "";

            return (
              <div
                key={transaction.id}
                style={{
                  border: "1px solid #e2e8f0",
                  borderRadius: "0.75rem",
                  padding: "1.5rem",
                  display: "grid",
                  gap: "1rem",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    flexWrap: "wrap",
                    gap: "0.75rem",
                  }}
                >
                  <div>
                    <p style={{ margin: 0, fontSize: "1rem", fontWeight: 600 }}>
                      {new Date(transaction.transactionDate).toLocaleDateString("ja-JP")}
                    </p>
                    <p style={{ margin: "0.25rem 0 0", color: "#475569" }}>
                      {transaction.description ?? "(摘要なし)"}
                    </p>
                    <p style={{ margin: "0.1rem 0 0", color: "#64748b", fontSize: "0.9rem" }}>
                      {transaction.counterparty ?? "相手先なし"}
                    </p>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <p style={{ margin: 0, fontSize: "1.2rem", fontWeight: 700 }}>
                      {transaction.amount.toLocaleString()} 円
                    </p>
                    <p style={{ margin: "0.25rem 0 0", color: "#64748b", fontSize: "0.85rem" }}>
                      ステータス: {STATUS_LABEL[transaction.status] ?? transaction.status}
                    </p>
                  </div>
                </div>

                {transaction.status === "pending" ? (
                  <div
                    style={{
                      display: "grid",
                      gap: "1rem",
                      gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                    }}
                  >
                    <div style={{ display: "grid", gap: "0.35rem" }}>
                      <label style={{ fontSize: "0.85rem", color: "#475569" }}>現金・預金勘定</label>
                      <select
                        value={bankAccountId}
                        onChange={(event) =>
                          setSelectedBankAccounts((prev) => ({ ...prev, [transaction.id]: event.target.value }))
                        }
                        style={{
                          padding: "0.5rem",
                          borderRadius: "0.5rem",
                          border: "1px solid #cbd5f5",
                        }}
                      >
                        {assetAccounts.map((account) => (
                          <option key={account.id} value={account.id}>
                            {account.code} {account.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div style={{ display: "grid", gap: "0.35rem" }}>
                      <label style={{ fontSize: "0.85rem", color: "#475569" }}>対応勘定科目</label>
                      <select
                        value={counterpartId}
                        onChange={(event) =>
                          setSelectedAccounts((prev) => ({ ...prev, [transaction.id]: event.target.value }))
                        }
                        style={{
                          padding: "0.5rem",
                          borderRadius: "0.5rem",
                          border: "1px solid #cbd5f5",
                        }}
                      >
                        <option value="" disabled>
                          科目を選択
                        </option>
                        {(transaction.amount >= 0 ? revenueAccounts : expenseAccounts).map((account) => (
                          <option key={account.id} value={account.id}>
                            {account.code} {account.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                      <button
                        type="button"
                        onClick={() =>
                          convertMutation.mutate({
                            transactionId: transaction.id,
                            counterpartAccountId: counterpartId,
                            bankAccountId,
                          })
                        }
                        disabled={convertMutation.isPending || !counterpartId || !bankAccountId}
                        style={{
                          padding: "0.6rem 1.2rem",
                          borderRadius: "0.65rem",
                          background: "#2563eb",
                          color: "white",
                          border: "none",
                          fontWeight: 600,
                          cursor: "pointer",
                        }}
                      >
                        仕訳を作成
                      </button>
                      <button
                        type="button"
                        onClick={() => statusMutation.mutate({ transactionId: transaction.id, status: "dismissed" })}
                        disabled={statusMutation.isPending}
                        style={{
                          padding: "0.55rem 1.1rem",
                          borderRadius: "0.65rem",
                          background: "white",
                          border: "1px solid #ef4444",
                          color: "#ef4444",
                          fontWeight: 600,
                          cursor: "pointer",
                        }}
                      >
                        除外する
                      </button>
                    </div>
                  </div>
                ) : transaction.status === "dismissed" ? (
                  <div style={{ display: "flex", gap: "0.75rem" }}>
                    <button
                      type="button"
                      onClick={() => statusMutation.mutate({ transactionId: transaction.id, status: "pending" })}
                      disabled={statusMutation.isPending}
                      style={{
                        padding: "0.55rem 1.1rem",
                        borderRadius: "0.65rem",
                        background: "white",
                        border: "1px solid #2563eb",
                        color: "#2563eb",
                        fontWeight: 600,
                        cursor: "pointer",
                      }}
                    >
                      未処理に戻す
                    </button>
                  </div>
                ) : (
                  <p style={{ margin: 0, color: "#047857", fontWeight: 600 }}>
                    仕訳化済み（Journal Entry: {transaction.journalEntryId ?? "-"}）
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}

      {convertMutation.isError && (
        <p style={{ color: "#ef4444", margin: 0 }}>
          {convertMutation.error instanceof Error ? convertMutation.error.message : "仕訳化に失敗しました"}
        </p>
      )}
      {statusMutation.isError && (
        <p style={{ color: "#ef4444", margin: 0 }}>
          {statusMutation.error instanceof Error ? statusMutation.error.message : "更新に失敗しました"}
        </p>
      )}
    </section>
  );
}
