"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

type TaxCategory = {
  id: string;
  code: string;
  name: string;
  rate: number;
  description?: string;
};

export function TaxCategoryManager() {
  const queryClient = useQueryClient();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editRate, setEditRate] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const { data: categories, isLoading } = useQuery<TaxCategory[]>({
    queryKey: ["tax-categories"],
    queryFn: async () => {
      const response = await fetch("/api/tax-categories");
      if (!response.ok) {
        throw new Error("税区分の取得に失敗しました");
      }
      return response.json();
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, rate }: { id: string; rate: number }) => {
      const response = await fetch(`/api/tax-categories/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rate }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({ message: "更新に失敗しました" }));
        throw new Error(data.message ?? "更新に失敗しました");
      }

      return response.json();
    },
    onSuccess: () => {
      setMessage("税率を更新しました");
      setError(null);
      setEditingId(null);
      setEditRate("");
      queryClient.invalidateQueries({ queryKey: ["tax-categories"] });
      queryClient.invalidateQueries({ queryKey: ["accounts"] });
    },
    onError: (err: Error) => {
      setError(err.message || "税率の更新に失敗しました");
      setMessage(null);
    },
  });

  const handleEdit = (category: TaxCategory) => {
    setEditingId(category.id);
    setEditRate(String(category.rate * 100));
    setMessage(null);
    setError(null);
  };

  const handleSave = () => {
    if (!editingId) return;

    const rateValue = parseFloat(editRate);
    if (isNaN(rateValue) || rateValue < 0 || rateValue > 100) {
      setError("税率は0〜100の範囲で入力してください");
      return;
    }

    updateMutation.mutate({ id: editingId, rate: rateValue / 100 });
  };

  const handleCancel = () => {
    setEditingId(null);
    setEditRate("");
    setMessage(null);
    setError(null);
  };

  if (isLoading) {
    return <p>読み込み中...</p>;
  }

  return (
    <div style={{ display: "grid", gap: "1.5rem" }}>
      <div>
        <h2 style={{ fontSize: "1.25rem", margin: 0, marginBottom: "0.5rem" }}>税区分・税率管理</h2>
        <p style={{ margin: 0, color: "#64748b", fontSize: "0.95rem" }}>
          消費税率を変更できます。変更は新規作成する仕訳に適用されます。
        </p>
      </div>

      {message && (
        <div
          style={{
            background: "#dcfce7",
            border: "1px solid #86efac",
            borderRadius: "0.75rem",
            padding: "0.75rem 1rem",
            color: "#166534",
          }}
        >
          {message}
        </div>
      )}

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

      <div style={{ overflowX: "auto" }}>
        <table
          style={{
            width: "100%",
            borderCollapse: "collapse",
            minWidth: "600px",
          }}
        >
          <thead>
            <tr style={{ borderBottom: "2px solid #e2e8f0" }}>
              <th style={{ padding: "0.75rem", textAlign: "left", fontWeight: 600 }}>コード</th>
              <th style={{ padding: "0.75rem", textAlign: "left", fontWeight: 600 }}>名称</th>
              <th style={{ padding: "0.75rem", textAlign: "right", fontWeight: 600 }}>税率 (%)</th>
              <th style={{ padding: "0.75rem", textAlign: "left", fontWeight: 600 }}>説明</th>
              <th style={{ padding: "0.75rem", textAlign: "center", fontWeight: 600 }}>操作</th>
            </tr>
          </thead>
          <tbody>
            {categories?.map((category) => (
              <tr key={category.id} style={{ borderBottom: "1px solid #e2e8f0" }}>
                <td style={{ padding: "0.75rem" }}>{category.code}</td>
                <td style={{ padding: "0.75rem" }}>{category.name}</td>
                <td style={{ padding: "0.75rem", textAlign: "right" }}>
                  {editingId === category.id ? (
                    <input
                      type="number"
                      min="0"
                      max="100"
                      step="0.1"
                      value={editRate}
                      onChange={(e) => setEditRate(e.target.value)}
                      style={{
                        padding: "0.5rem",
                        borderRadius: "0.5rem",
                        border: "1px solid #cbd5e1",
                        width: "100px",
                        textAlign: "right",
                      }}
                      autoFocus
                    />
                  ) : (
                    <span>{(category.rate * 100).toFixed(1)}</span>
                  )}
                </td>
                <td style={{ padding: "0.75rem", color: "#64748b" }}>
                  {category.description ?? ""}
                </td>
                <td style={{ padding: "0.75rem", textAlign: "center" }}>
                  {editingId === category.id ? (
                    <div style={{ display: "flex", gap: "0.5rem", justifyContent: "center" }}>
                      <button
                        type="button"
                        onClick={handleSave}
                        disabled={updateMutation.isPending}
                        style={{
                          padding: "0.5rem 1rem",
                          borderRadius: "0.5rem",
                          border: "none",
                          backgroundColor: updateMutation.isPending ? "#9ca3af" : "#2563eb",
                          color: "white",
                          fontWeight: 600,
                          cursor: updateMutation.isPending ? "not-allowed" : "pointer",
                        }}
                      >
                        保存
                      </button>
                      <button
                        type="button"
                        onClick={handleCancel}
                        disabled={updateMutation.isPending}
                        style={{
                          padding: "0.5rem 1rem",
                          borderRadius: "0.5rem",
                          border: "1px solid #cbd5e1",
                          backgroundColor: "white",
                          color: "#1f2937",
                          fontWeight: 600,
                          cursor: updateMutation.isPending ? "not-allowed" : "pointer",
                        }}
                      >
                        キャンセル
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleEdit(category)}
                      style={{
                        padding: "0.5rem 1rem",
                        borderRadius: "0.5rem",
                        border: "1px solid #2563eb",
                        backgroundColor: "white",
                        color: "#2563eb",
                        fontWeight: 600,
                        cursor: "pointer",
                      }}
                    >
                      編集
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div
        style={{
          background: "#f8fafc",
          borderRadius: "0.75rem",
          padding: "1rem",
          border: "1px solid #e2e8f0",
          fontSize: "0.9rem",
          color: "#475569",
        }}
      >
        <p style={{ margin: 0, fontWeight: 600, marginBottom: "0.5rem" }}>注意事項</p>
        <ul style={{ margin: 0, paddingLeft: "1.2rem", display: "grid", gap: "0.3rem" }}>
          <li>税率の変更は既存の仕訳には影響しません</li>
          <li>変更後に作成する仕訳から新しい税率が適用されます</li>
          <li>非課税・不課税・対象外の税率は0%のまま変更しないでください</li>
        </ul>
      </div>
    </div>
  );
}
