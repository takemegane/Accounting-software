"use client";

import { useQuery } from "@tanstack/react-query";
import { useFailedEntries } from "@/components/failed-entries-context";
import { useJournalEntryEditor } from "@/components/journal-entry-editor-context";

type Account = {
  id: string;
  code: string;
  name: string;
};

export function FailedEntriesList() {
  const { failedEntries, removeFailedEntry, clearAllFailedEntries } = useFailedEntries();
  const { setEditingEntry } = useJournalEntryEditor();

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

  const handleRetry = (entry: typeof failedEntries[0]) => {
    // 編集フォームに内容を復元
    setEditingEntry({
      id: "", // 新規登録として扱う
      entryDate: entry.date,
      description: entry.description,
      lines: entry.lines.map((line) => ({
        id: "",
        accountId: line.accountId,
        debit: Number(line.debit) || 0,
        credit: Number(line.credit) || 0,
        memo: line.memo || undefined,
        taxCategoryId: line.taxCategoryId || null,
      })),
    });
    // 要確認一覧から削除
    removeFailedEntry(entry.id);
  };

  if (failedEntries.length === 0) {
    return (
      <section
        style={{
          background: "white",
          borderRadius: "1rem",
          padding: "1.5rem",
          boxShadow: "0 10px 40px rgba(15, 23, 42, 0.06)",
        }}
      >
        <header style={{ marginBottom: "0.5rem" }}>
          <h2 style={{ fontSize: "1.25rem", margin: 0 }}>要確認一覧</h2>
          <p style={{ margin: "0.25rem 0 0", color: "#64748b", fontSize: "0.9rem" }}>
            エラーになった仕訳がここに並びます。内容を確認して再登録してください。
          </p>
        </header>
        <p style={{ margin: 0, color: "#64748b" }}>登録に失敗した仕訳はありません。</p>
      </section>
    );
  }

  return (
    <section
      style={{
        background: "white",
        borderRadius: "1rem",
        padding: "1.5rem",
        boxShadow: "0 10px 40px rgba(15, 23, 42, 0.06)",
        display: "grid",
        gap: "1rem",
      }}
    >
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
        <div>
          <h2 style={{ fontSize: "1.25rem", margin: 0 }}>要確認一覧</h2>
          <p style={{ margin: "0.25rem 0 0", color: "#64748b", fontSize: "0.9rem" }}>
            仕訳登録に失敗したデータがここに溜まります。内容を確認して再登録してください。
          </p>
        </div>
        {failedEntries.length > 0 && (
          <button
            type="button"
            onClick={clearAllFailedEntries}
            style={{
              padding: "0.4rem 0.9rem",
              borderRadius: "0.5rem",
              border: "1px solid #cbd5e1",
              background: "white",
              color: "#64748b",
              fontSize: "0.85rem",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            全て削除
          </button>
        )}
      </header>
      <span
        style={{
          marginBottom: "0.5rem",
          background: "#fee2e2",
          color: "#991b1b",
          padding: "0.2rem 0.6rem",
          borderRadius: "999px",
          fontSize: "0.85rem",
          fontWeight: 600,
          alignSelf: "flex-start",
        }}
      >
        {failedEntries.length}件
      </span>

      <div style={{ display: "grid", gap: "1rem" }}>
        {failedEntries.map((entry) => (
          <div
            key={entry.id}
            style={{
              border: "2px solid #fecaca",
              borderRadius: "0.75rem",
              padding: "1rem",
              background: "#fef2f2",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "0.75rem" }}>
              <div>
                <div style={{ fontSize: "0.85rem", color: "#7f1d1d", marginBottom: "0.25rem" }}>
                  {new Date(entry.timestamp).toLocaleString("ja-JP")}
                </div>
                <div style={{ fontWeight: 600, color: "#991b1b" }}>
                  ❌ {entry.error}
                </div>
              </div>
              <button
                type="button"
                onClick={() => removeFailedEntry(entry.id)}
                style={{
                  background: "transparent",
                  border: "none",
                  color: "#64748b",
                  cursor: "pointer",
                  fontSize: "1.2rem",
                  lineHeight: 1,
                }}
              >
                ×
              </button>
            </div>

            <div
              style={{
                background: "white",
                borderRadius: "0.5rem",
                padding: "1rem",
                marginBottom: "0.75rem",
              }}
            >
              <div style={{ marginBottom: "0.5rem", fontSize: "0.9rem" }}>
                <strong>日付:</strong> {new Date(entry.date).toLocaleDateString("ja-JP")}
              </div>
              {entry.description && (
                <div style={{ marginBottom: "0.5rem", fontSize: "0.9rem" }}>
                  <strong>摘要:</strong> {entry.description}
                </div>
              )}

              <table style={{ width: "100%", fontSize: "0.85rem", marginTop: "0.5rem", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid #e5e7eb" }}>
                    <th style={{ textAlign: "left", padding: "0.35rem", color: "#64748b" }}>勘定科目</th>
                    <th style={{ textAlign: "right", padding: "0.35rem", color: "#64748b" }}>借方</th>
                    <th style={{ textAlign: "right", padding: "0.35rem", color: "#64748b" }}>貸方</th>
                    <th style={{ textAlign: "left", padding: "0.35rem", color: "#64748b" }}>メモ</th>
                  </tr>
                </thead>
                <tbody>
                  {entry.lines
                    .filter((line) => line.accountId)
                    .map((line, idx) => {
                      const account = accounts?.find((a) => a.id === line.accountId);
                      return (
                        <tr key={idx} style={{ borderBottom: "1px solid #f3f4f6" }}>
                          <td style={{ padding: "0.35rem" }}>{account?.name || ""}</td>
                          <td style={{ textAlign: "right", padding: "0.35rem" }}>
                            {line.debit ? `${Number(line.debit).toLocaleString()}円` : ""}
                          </td>
                          <td style={{ textAlign: "right", padding: "0.35rem" }}>
                            {line.credit ? `${Number(line.credit).toLocaleString()}円` : ""}
                          </td>
                          <td style={{ padding: "0.35rem" }}>{line.memo || ""}</td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>

            <button
              type="button"
              onClick={() => handleRetry(entry)}
              style={{
                padding: "0.5rem 1rem",
                borderRadius: "0.5rem",
                border: "none",
                background: "#dc2626",
                color: "white",
                fontWeight: 600,
                cursor: "pointer",
                fontSize: "0.9rem",
              }}
            >
              再入力する
            </button>
          </div>
        ))}
      </div>
    </section>
  );
}
