"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useJournalEntryEditor } from "@/components/journal-entry-editor-context";

type JournalReportLine = {
  id: string;
  accountId: string;
  accountCode: string;
  accountName: string;
  debit: number;
  credit: number;
  memo?: string;
};

type JournalReportEntry = {
  id: string;
  entryDate: string;
  description?: string;
  totals: {
    debit: number;
    credit: number;
  };
  lines: JournalReportLine[];
};

export function JournalReport() {
  const queryClient = useQueryClient();
  const { setEditingEntry } = useJournalEntryEditor();
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const { data, isLoading, isError } = useQuery<JournalReportEntry[]>({
    queryKey: ["journal-report"],
    queryFn: async () => {
      const response = await fetch("/api/reports/journal");
      if (!response.ok) {
        throw new Error("仕訳帳の取得に失敗しました");
      }
      return response.json();
    },
  });

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
      queryClient.invalidateQueries({ queryKey: ["journal-report"] });
      queryClient.invalidateQueries({ queryKey: ["general-ledger"] });
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
        <h2 style={{ fontSize: "1.4rem", margin: 0 }}>仕訳帳</h2>
        <p style={{ margin: "0.35rem 0 0", color: "#64748b", fontSize: "0.9rem" }}>
          登録済みの仕訳を日付順に表示します。
        </p>
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
      {isError && <p style={{ color: "#ef4444" }}>仕訳帳の取得に失敗しました。</p>}
      {!isLoading && !isError && data && data.length === 0 && <p>まだ仕訳が登録されていません。</p>}

      {!isLoading && !isError && data && data.length > 0 && (
        <div style={{ display: "grid", gap: "1.25rem" }}>
          {data.map((entry) => (
            <div
              key={entry.id}
              style={{
                border: "1px solid #e2e8f0",
                borderRadius: "0.85rem",
                padding: "1.5rem",
                display: "grid",
                gap: "1rem",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: "1rem", alignItems: "flex-start" }}>
                <div style={{ flex: 1, minWidth: "200px" }}>
                  <h3 style={{ margin: 0, fontSize: "1.1rem" }}>
                    {new Date(entry.entryDate).toLocaleDateString("ja-JP")}
                  </h3>
                  <p style={{ margin: 0, color: "#475569", fontSize: "0.95rem" }}>
                    {entry.description ?? "(摘要なし)"}
                  </p>
                </div>
                <div style={{ display: "flex", gap: "1rem", alignItems: "center", flexWrap: "wrap" }}>
                  <div style={{ textAlign: "right", fontSize: "0.9rem", color: "#1f2937" }}>
                    <div>借方合計: {entry.totals.debit.toLocaleString()} 円</div>
                    <div>貸方合計: {entry.totals.credit.toLocaleString()} 円</div>
                  </div>
                  <div style={{ display: "flex", gap: "0.5rem" }}>
                    <button
                      type="button"
                      onClick={() => handleEdit(entry.id)}
                      style={{
                        padding: "0.5rem 1rem",
                        borderRadius: "0.5rem",
                        border: "1px solid #2563eb",
                        backgroundColor: "white",
                        color: "#2563eb",
                        fontWeight: 600,
                        cursor: "pointer",
                        fontSize: "0.85rem",
                      }}
                    >
                      編集
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(entry.id)}
                      style={{
                        padding: "0.5rem 1rem",
                        borderRadius: "0.5rem",
                        border: "1px solid #dc2626",
                        backgroundColor: "white",
                        color: "#dc2626",
                        fontWeight: 600,
                        cursor: "pointer",
                        fontSize: "0.85rem",
                      }}
                    >
                      削除
                    </button>
                  </div>
                </div>
              </div>

              <div style={{ overflowX: "auto" }}>
                <table
                  style={{
                    width: "100%",
                    borderCollapse: "collapse",
                    minWidth: "680px",
                  }}
                >
                  <thead>
                    <tr style={{ textAlign: "left", color: "#475569", fontSize: "0.85rem" }}>
                      <th style={{ padding: "0.5rem" }}>勘定科目</th>
                      <th style={{ padding: "0.5rem", textAlign: "right" }}>借方</th>
                      <th style={{ padding: "0.5rem", textAlign: "right" }}>貸方</th>
                      <th style={{ padding: "0.5rem" }}>メモ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {entry.lines.map((line) => (
                      <tr key={line.id} style={{ borderTop: "1px solid #e2e8f0" }}>
                        <td style={{ padding: "0.65rem" }}>
                          {line.accountCode} {line.accountName}
                        </td>
                        <td style={{ padding: "0.65rem", textAlign: "right" }}>
                          {line.debit > 0 ? line.debit.toLocaleString() : ""}
                        </td>
                        <td style={{ padding: "0.65rem", textAlign: "right" }}>
                          {line.credit > 0 ? line.credit.toLocaleString() : ""}
                        </td>
                        <td style={{ padding: "0.65rem" }}>{line.memo ?? ""}</td>
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
