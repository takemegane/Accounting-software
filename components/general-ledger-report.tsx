"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useJournalEntryEditor } from "@/components/journal-entry-editor-context";

type GeneralLedgerEntry = {
  lineId: string;
  journalEntryId: string;
  entryDate: string;
  description?: string;
  debit: number;
  credit: number;
  memo?: string;
  balance: number;
};

type GeneralLedgerAccount = {
  accountId: string;
  code: string;
  name: string;
  type: string;
  totals: {
    debit: number;
    credit: number;
    balance: number;
  };
  entries: GeneralLedgerEntry[];
};

const currency = (value: number) => `${value.toLocaleString()} 円`;

export function GeneralLedgerReport() {
  const queryClient = useQueryClient();
  const { setEditingEntry } = useJournalEntryEditor();
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [amountFilter, setAmountFilter] = useState("");

  const query = useQuery<GeneralLedgerAccount[]>({
    queryKey: ["general-ledger"],
    queryFn: async () => {
      const response = await fetch("/api/reports/general-ledger");
      if (!response.ok) {
        throw new Error("総勘定元帳の取得に失敗しました");
      }
      return response.json();
    },
  });

  const { data, isLoading, isError } = query;

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/journal-entries/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({ message: "削除に失敗しました" }));
        throw new Error(data.message ?? "削除に失敗しました");
      }

      return response.json();
    },
    onSuccess: () => {
      setDeletingId(null);
      setError(null);
      queryClient.invalidateQueries({ queryKey: ["general-ledger"] });
      queryClient.invalidateQueries({ queryKey: ["journal-report"] });
      queryClient.invalidateQueries({ queryKey: ["journal-entries"] });
      queryClient.invalidateQueries({ queryKey: ["trial-balance"] });
      queryClient.invalidateQueries({ queryKey: ["reports"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
    onError: (err: Error) => {
      setError(err.message || "仕訳の削除に失敗しました");
      setDeletingId(null);
    },
  });

  const handleEdit = async (entryId: string) => {
    try {
      const response = await fetch(`/api/journal-entries/${entryId}`);
      if (!response.ok) {
        throw new Error("仕訳の取得に失敗しました");
      }
      const entry = await response.json();
      setEditingEntry(entry);
      // 編集フォームが表示されるまで少し待ってからスクロール
      setTimeout(() => {
        const editForm = document.getElementById("edit-form");
        if (editForm) {
          editForm.scrollIntoView({ behavior: "smooth", block: "start" });
        } else {
          window.scrollTo({ top: 0, behavior: "smooth" });
        }
      }, 100);
    } catch (err) {
      setError(err instanceof Error ? err.message : "仕訳の取得に失敗しました");
    }
  };

  const handleDelete = (id: string) => {
    setDeletingId(id);
  };

  const confirmDelete = () => {
    if (deletingId) {
      deleteMutation.mutate(deletingId);
    }
  };

  const cancelDelete = () => {
    setDeletingId(null);
  };

  const filteredData = data?.map((account) => {
    const query = searchQuery.toLowerCase().trim();
    const filterAmount = amountFilter ? parseFloat(amountFilter) : null;

    // 勘定科目名・コードで検索
    const accountMatch =
      account.name.toLowerCase().includes(query) ||
      account.code.toLowerCase().includes(query);

    // エントリーをフィルタリング
    let filteredEntries = account.entries;

    // テキスト検索でフィルタリング
    if (query && !accountMatch) {
      filteredEntries = filteredEntries.filter((entry) => {
        return (
          entry.description?.toLowerCase().includes(query) ||
          entry.memo?.toLowerCase().includes(query)
        );
      });
    }

    // 金額でフィルタリング
    if (filterAmount !== null && !isNaN(filterAmount)) {
      filteredEntries = filteredEntries.filter((entry) => {
        return entry.debit === filterAmount || entry.credit === filterAmount;
      });
    }

    // フィルタリング結果を返す
    if (accountMatch && filterAmount === null) {
      // 勘定科目がマッチし、金額フィルターがない場合は全エントリーを表示
      return account;
    }

    if (filteredEntries.length > 0) {
      return {
        ...account,
        entries: filteredEntries,
      };
    }

    return null;
  }).filter((account): account is GeneralLedgerAccount => account !== null);

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
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "1rem" }}>
        <div>
          <h2 style={{ fontSize: "1.4rem", margin: 0 }}>総勘定元帳</h2>
          <p style={{ margin: "0.35rem 0 0", color: "#64748b", fontSize: "0.9rem" }}>
            仕訳の明細を勘定科目別に確認できます。
          </p>
        </div>
        <button
          onClick={() => query.refetch()}
          disabled={query.isFetching}
          style={{
            padding: "0.55rem 1.1rem",
            borderRadius: "0.65rem",
            border: "1px solid #2563eb",
            backgroundColor: query.isFetching ? "#9ca3af" : "#2563eb",
            color: "white",
            fontWeight: 600,
            cursor: query.isFetching ? "not-allowed" : "pointer",
          }}
        >
          {query.isFetching ? "更新中..." : "🔄 最新データに更新"}
        </button>
      </div>

      <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap", alignItems: "flex-end" }}>
        <div style={{ flex: 1, minWidth: "200px" }}>
          <label style={{ display: "block", fontSize: "0.85rem", color: "#475569", marginBottom: "0.35rem", fontWeight: 600 }}>
            金額で絞り込み
          </label>
          <input
            type="number"
            value={amountFilter}
            onChange={(e) => setAmountFilter(e.target.value)}
            placeholder="例: 10000"
            style={{
              width: "100%",
              padding: "0.65rem 1rem",
              borderRadius: "0.75rem",
              border: "1px solid #cbd5e1",
              fontSize: "0.9rem",
            }}
          />
        </div>
        <div style={{ flex: 1, minWidth: "240px" }}>
          <label style={{ display: "block", fontSize: "0.85rem", color: "#475569", marginBottom: "0.35rem", fontWeight: 600 }}>
            テキスト検索
          </label>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="勘定科目、摘要、メモで検索..."
            style={{
              width: "100%",
              padding: "0.65rem 1rem",
              borderRadius: "0.75rem",
              border: "1px solid #cbd5e1",
              fontSize: "0.9rem",
            }}
          />
        </div>
        {(amountFilter || searchQuery) && (
          <button
            type="button"
            onClick={() => {
              setAmountFilter("");
              setSearchQuery("");
            }}
            style={{
              padding: "0.65rem 1rem",
              borderRadius: "0.75rem",
              border: "1px solid #cbd5e1",
              backgroundColor: "white",
              color: "#64748b",
              cursor: "pointer",
              fontSize: "0.85rem",
              fontWeight: 600,
              whiteSpace: "nowrap",
            }}
          >
            クリア
          </button>
        )}
      </div>

      {error && (
        <div
          style={{
            background: "#fee2e2",
            border: "1px solid #fca5a5",
            borderRadius: "0.75rem",
            padding: "0.75rem 1rem",
            color: "#991b1b",
          }}
        >
          {error}
        </div>
      )}

      {deletingId && (
        <div
          style={{
            background: "#fffbeb",
            border: "1px solid #fbbf24",
            borderRadius: "0.75rem",
            padding: "1rem",
            display: "grid",
            gap: "1rem",
          }}
        >
          <p style={{ margin: 0, color: "#92400e", fontWeight: 600 }}>
            この仕訳を削除してもよろしいですか？
          </p>
          <div style={{ display: "flex", gap: "0.75rem" }}>
            <button
              type="button"
              onClick={confirmDelete}
              disabled={deleteMutation.isPending}
              style={{
                padding: "0.5rem 1rem",
                borderRadius: "0.5rem",
                border: "none",
                backgroundColor: deleteMutation.isPending ? "#9ca3af" : "#dc2626",
                color: "white",
                fontWeight: 600,
                cursor: deleteMutation.isPending ? "not-allowed" : "pointer",
              }}
            >
              {deleteMutation.isPending ? "削除中..." : "削除する"}
            </button>
            <button
              type="button"
              onClick={cancelDelete}
              disabled={deleteMutation.isPending}
              style={{
                padding: "0.5rem 1rem",
                borderRadius: "0.5rem",
                border: "1px solid #cbd5e1",
                backgroundColor: "white",
                color: "#1f2937",
                fontWeight: 600,
                cursor: deleteMutation.isPending ? "not-allowed" : "pointer",
              }}
            >
              キャンセル
            </button>
          </div>
        </div>
      )}

      {isLoading && <p>読み込み中...</p>}
      {isError && <p style={{ color: "#ef4444" }}>総勘定元帳の取得に失敗しました。</p>}
      {!isLoading && !isError && data && data.length === 0 && <p>まだ元帳に出力できる仕訳がありません。</p>}
      {!isLoading && !isError && data && data.length > 0 && filteredData && filteredData.length === 0 && searchQuery && (
        <p style={{ color: "#64748b" }}>「{searchQuery}」に一致する結果が見つかりませんでした。</p>
      )}

      {!isLoading && !isError && filteredData && filteredData.length > 0 && (
        <div style={{ display: "grid", gap: "1.5rem" }}>
          {filteredData.map((account) => (
            <div
              key={account.accountId}
              style={{
                border: "1px solid #e2e8f0",
                borderRadius: "0.85rem",
                padding: "1.5rem",
                display: "grid",
                gap: "1rem",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", flexWrap: "wrap", gap: "0.5rem" }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: "1.1rem" }}>
                    {account.code} {account.name}
                  </h3>
                  <p style={{ margin: 0, color: "#64748b", fontSize: "0.85rem" }}>科目区分: {account.type}</p>
                </div>
                <div style={{ textAlign: "right", fontSize: "0.9rem", color: "#1f2937" }}>
                  <div>合計借方: {currency(account.totals.debit)}</div>
                  <div>合計貸方: {currency(account.totals.credit)}</div>
                  <div>差引残高: {currency(account.totals.balance)}</div>
                </div>
              </div>

              <div style={{ overflowX: "auto" }}>
                <table
                  style={{
                    width: "100%",
                    borderCollapse: "collapse",
                    minWidth: "720px",
                  }}
                >
                  <thead>
                    <tr style={{ textAlign: "left", color: "#475569", fontSize: "0.85rem" }}>
                      <th style={{ padding: "0.5rem" }}>日付</th>
                      <th style={{ padding: "0.5rem" }}>摘要</th>
                      <th style={{ padding: "0.5rem", textAlign: "right" }}>借方</th>
                      <th style={{ padding: "0.5rem", textAlign: "right" }}>貸方</th>
                      <th style={{ padding: "0.5rem", textAlign: "right" }}>残高</th>
                      <th style={{ padding: "0.5rem" }}>メモ</th>
                      <th style={{ padding: "0.5rem", textAlign: "center" }}>操作</th>
                    </tr>
                  </thead>
                  <tbody>
                    {account.entries.map((entry) => (
                      <tr key={entry.lineId} style={{ borderTop: "1px solid #e2e8f0" }}>
                        <td style={{ padding: "0.65rem" }}>
                          {new Date(entry.entryDate).toLocaleDateString("ja-JP")}
                        </td>
                        <td style={{ padding: "0.65rem" }}>{entry.description ?? "(摘要なし)"}</td>
                        <td style={{ padding: "0.65rem", textAlign: "right" }}>
                          {entry.debit > 0 ? entry.debit.toLocaleString() : ""}
                        </td>
                        <td style={{ padding: "0.65rem", textAlign: "right" }}>
                          {entry.credit > 0 ? entry.credit.toLocaleString() : ""}
                        </td>
                        <td style={{ padding: "0.65rem", textAlign: "right", fontWeight: 600 }}>
                          {entry.balance.toLocaleString()}
                        </td>
                        <td style={{ padding: "0.65rem" }}>{entry.memo ?? ""}</td>
                        <td style={{ padding: "0.65rem", textAlign: "center" }}>
                          <div style={{ display: "flex", gap: "0.5rem", justifyContent: "center" }}>
                            <button
                              type="button"
                              onClick={() => handleEdit(entry.journalEntryId)}
                              style={{
                                padding: "0.35rem 0.75rem",
                                borderRadius: "0.4rem",
                                border: "1px solid #2563eb",
                                backgroundColor: "white",
                                color: "#2563eb",
                                fontWeight: 600,
                                cursor: "pointer",
                                fontSize: "0.75rem",
                              }}
                            >
                              編集
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDelete(entry.journalEntryId)}
                              style={{
                                padding: "0.35rem 0.75rem",
                                borderRadius: "0.4rem",
                                border: "1px solid #dc2626",
                                backgroundColor: "white",
                                color: "#dc2626",
                                fontWeight: 600,
                                cursor: "pointer",
                                fontSize: "0.75rem",
                              }}
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
          ))}
        </div>
      )}
    </section>
  );
}
