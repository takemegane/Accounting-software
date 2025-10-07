"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useJournalEntryEditor } from "@/components/journal-entry-editor-context";

type JournalEntry = {
  id: string;
  entryDate: string;
  description?: string;
  lockedAt?: string | null;
  lockedBy?: { id: string; clerkUserId?: string | null };
  lines: {
    id: string;
    accountName: string;
    debit: number;
    credit: number;
    memo?: string;
  }[];
};

type JournalEntryDetail = {
  id: string;
  entryDate: string;
  description?: string;
  lockedAt?: string | null;
  lines: {
    id: string;
    accountId: string;
    accountName: string;
    accountCode: string;
    debit: number;
    credit: number;
    memo?: string;
    taxCategoryId?: string;
  }[];
};

export function TransactionsTable() {
  const [search, setSearch] = useState("");
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const queryClient = useQueryClient();
  const { editingEntry, setEditingEntry, cancelEditing } = useJournalEntryEditor();
  const { data, isLoading, isError } = useQuery<JournalEntry[]>({
    queryKey: ["journal-entries"],
    queryFn: async () => {
      const response = await fetch("/api/journal-entries");
      if (!response.ok) {
        throw new Error("仕訳の取得に失敗しました");
      }
      return response.json();
    },
  });

  const filtered = useMemo(() => {
    if (!data) return [];
    if (!search.trim()) return data;
    const keyword = search.trim().toLowerCase();
    return data.filter((entry) => {
      if (entry.description?.toLowerCase().includes(keyword)) {
        return true;
      }
      return entry.lines.some((line) => line.accountName.toLowerCase().includes(keyword));
    });
  }, [data, search]);

  const editMutation = useMutation<JournalEntryDetail, Error, string>({
    mutationFn: async (entryId) => {
      const response = await fetch(`/api/journal-entries/${entryId}`);
      if (!response.ok) {
        const payload = await response.json().catch(() => ({ message: "仕訳の取得に失敗しました" }));
        throw new Error(payload.message ?? "仕訳の取得に失敗しました");
      }
      return response.json();
    },
    onSuccess: (detail) => {
      if (detail.lockedAt) {
        setActionError("締め済みの仕訳は編集できません");
        setActionMessage(null);
        return;
      }
      setEditingEntry({
        id: detail.id,
        entryDate: detail.entryDate,
        description: detail.description,
        lines: detail.lines.map((line) => ({
          id: line.id,
          accountId: line.accountId,
          debit: line.debit,
          credit: line.credit,
          memo: line.memo,
          taxCategoryId: line.taxCategoryId ?? null,
        })),
      });
      setActionMessage("仕訳を編集フォームに読み込みました");
      setActionError(null);
      setTimeout(() => {
        const editForm = document.getElementById("edit-form");
        if (editForm) {
          editForm.scrollIntoView({ behavior: "smooth", block: "start" });
        } else {
          window.scrollTo({ top: 0, behavior: "smooth" });
        }
      }, 100);
    },
    onError: (error) => {
      setActionError(error.message || "仕訳の取得に失敗しました");
      setActionMessage(null);
    },
  });

  const deleteMutation = useMutation<
    null,
    Error,
    { entryId: string; label: string }
  >({
    mutationFn: async ({ entryId }) => {
      const response = await fetch(`/api/journal-entries/${entryId}`, {
        method: "DELETE",
      });
      const payload = await response.json().catch(() => ({ message: "仕訳の削除に失敗しました" }));
      if (!response.ok) {
        throw new Error(payload.message ?? "仕訳の削除に失敗しました");
      }
      return null;
    },
    onSuccess: (_data, variables) => {
      setActionMessage(`「${variables.label}」を削除しました`);
      setActionError(null);
      if (editingEntry?.id === variables.entryId) {
        cancelEditing();
      }
      queryClient.invalidateQueries({ queryKey: ["journal-entries"] });
      queryClient.invalidateQueries({ queryKey: ["trial-balance"] });
      queryClient.invalidateQueries({ queryKey: ["general-ledger"] });
      queryClient.invalidateQueries({ queryKey: ["journal-report"] });
    },
    onError: (error) => {
      setActionError(error.message || "仕訳の削除に失敗しました");
      setActionMessage(null);
    },
  });

  const handleEdit = (entryId: string, isLocked: boolean) => {
    if (isLocked) {
      setActionError("締め済みの仕訳は編集できません");
      setActionMessage(null);
      return;
    }
    setActionError(null);
    setActionMessage(null);
    editMutation.mutate(entryId);
  };

  const handleDelete = (entry: JournalEntry) => {
    if (entry.lockedAt) {
      setActionError("締め済みの仕訳は削除できません");
      setActionMessage(null);
      return;
    }
    if (deleteMutation.isPending) {
      return;
    }
    setActionError(null);
    setActionMessage(null);
    const labelBase = `${new Date(entry.entryDate).toLocaleDateString("ja-JP")}`;
    const descriptor = entry.description?.trim() ? ` ${entry.description.trim()}` : "";
    const label = `${labelBase}${descriptor}`;
    if (typeof window !== "undefined") {
      const confirmed = window.confirm(`「${label}」を削除しますか？`);
      if (!confirmed) {
        return;
      }
    }
    deleteMutation.mutate({ entryId: entry.id, label });
  };

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
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h2 style={{ fontSize: "1.25rem", margin: 0 }}>仕訳一覧</h2>
          <p style={{ margin: "0.35rem 0 0", color: "#64748b", fontSize: "0.9rem" }}>
            最新20件の仕訳を表示しています。
          </p>
        </div>
        <input
          type="search"
          placeholder="摘要や勘定科目で検索"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          style={{
            padding: "0.5rem 0.75rem",
            borderRadius: "0.75rem",
            border: "1px solid #cbd5f5",
            minWidth: "240px",
          }}
        />
      </div>

      {actionMessage && <p style={{ color: "#16a34a", margin: 0 }}>{actionMessage}</p>}
      {actionError && <p style={{ color: "#ef4444", margin: 0 }}>{actionError}</p>}

      {editMutation.isPending && (
        <p style={{ color: "#2563eb", margin: "0.5rem 0 0" }}>仕訳を読み込み中です...</p>
      )}

      {isLoading && <p>読み込み中...</p>}
      {isError && <p style={{ color: "#ef4444" }}>仕訳の取得に失敗しました。</p>}
      {!isLoading && filtered.length === 0 && <p>該当する仕訳がありません。</p>}

      {!isLoading && filtered.length > 0 && (
        <div style={{ overflowX: "auto" }}>
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              minWidth: "760px",
            }}
          >
            <thead>
              <tr style={{ textAlign: "left", color: "#475569", fontSize: "0.85rem" }}>
                <th style={{ padding: "0.5rem" }}>日付</th>
                <th style={{ padding: "0.5rem" }}>摘要</th>
                <th style={{ padding: "0.5rem" }}>借方</th>
                <th style={{ padding: "0.5rem" }}>貸方</th>
                <th style={{ padding: "0.5rem" }}>メモ</th>
                <th style={{ padding: "0.5rem" }}>操作</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((entry) => {
                const linesCount = entry.lines.length;
                const isLocked = Boolean(entry.lockedAt);
                return entry.lines.map((line, index) => (
                  <tr key={`${entry.id}-${line.id}`}
                    style={{
                      borderTop: "1px solid #e2e8f0",
                      background: index % 2 === 0 ? "#f8fafc" : "white",
                    }}
                  >
                    {index === 0 && (
                      <td rowSpan={linesCount} style={{ padding: "0.75rem", verticalAlign: "top", fontWeight: 600 }}>
                        {new Date(entry.entryDate).toLocaleDateString("ja-JP")}
                      </td>
                    )}
                    {index === 0 && (
                      <td rowSpan={linesCount} style={{ padding: "0.75rem", verticalAlign: "top" }}>
                        {entry.description ?? "(摘要なし)"}
                        {isLocked ? (
                          <span
                            style={{
                              display: "inline-block",
                              marginLeft: "0.5rem",
                              padding: "0.1rem 0.5rem",
                              borderRadius: "999px",
                              background: "#dbeafe",
                              color: "#1d4ed8",
                              fontSize: "0.75rem",
                              fontWeight: 600,
                            }}
                          >
                            締め済み
                          </span>
                        ) : null}
                      </td>
                    )}
                    <td style={{ padding: "0.75rem" }}>
                      {line.debit > 0 ? `${line.accountName} / ${line.debit.toLocaleString()} 円` : ""}
                    </td>
                    <td style={{ padding: "0.75rem" }}>
                      {line.credit > 0 ? `${line.accountName} / ${line.credit.toLocaleString()} 円` : ""}
                    </td>
                    <td style={{ padding: "0.75rem" }}>{line.memo ?? ""}</td>
                    {index === 0 && (
                      <td
                        rowSpan={linesCount}
                        style={{ padding: "0.75rem", verticalAlign: "top" }}
                      >
                        <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                          <button
                            type="button"
                            onClick={() => handleEdit(entry.id, isLocked)}
                            disabled={isLocked || editMutation.isPending || deleteMutation.isPending}
                            style={{
                              padding: "0.4rem 0.9rem",
                              borderRadius: "0.65rem",
                              border: "1px solid #2563eb",
                              backgroundColor: isLocked ? "#e2e8f0" : "white",
                              color: isLocked ? "#94a3b8" : "#2563eb",
                              fontWeight: 600,
                              cursor:
                                isLocked || editMutation.isPending || deleteMutation.isPending
                                  ? "not-allowed"
                                  : "pointer",
                            }}
                          >
                            編集
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(entry)}
                            disabled={isLocked || deleteMutation.isPending || editMutation.isPending}
                            style={{
                              padding: "0.4rem 0.9rem",
                              borderRadius: "0.65rem",
                              border: "1px solid #ef4444",
                              backgroundColor: isLocked ? "#fee2e2" : "white",
                              color: isLocked ? "#fca5a5" : "#ef4444",
                              fontWeight: 600,
                              cursor:
                                isLocked || deleteMutation.isPending || editMutation.isPending
                                  ? "not-allowed"
                                  : "pointer",
                            }}
                          >
                            削除
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ));
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
