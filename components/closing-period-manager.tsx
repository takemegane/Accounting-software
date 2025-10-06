"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { FormEvent, useMemo, useState } from "react";

const PERIOD_TYPES = [
  { value: "monthly", label: "月次" },
  { value: "yearly", label: "年次" },
];

type ClosingPeriod = {
  id: string;
  periodType: string;
  startDate: string;
  endDate: string;
  status: string;
  closedAt?: string | null;
  reopenedAt?: string | null;
};

function formatDate(date: string | Date) {
  const d = typeof date === "string" ? new Date(date) : date;
  if (Number.isNaN(d.getTime())) {
    return "-";
  }
  return d.toISOString().slice(0, 10);
}

export function ClosingPeriodManager() {
  const queryClient = useQueryClient();
  const { data, isLoading, error } = useQuery<ClosingPeriod[]>({
    queryKey: ["closing-periods"],
    queryFn: async () => {
      const res = await fetch("/api/closing-periods", { cache: "no-store" });
      if (!res.ok) {
        throw new Error("締め期間の取得に失敗しました");
      }
      return res.json();
    },
  });

  const [periodType, setPeriodType] = useState(PERIOD_TYPES[0]!.value);
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [notes, setNotes] = useState<string>("");
  const [message, setMessage] = useState<string | null>(null);

  const closeMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/closing-periods", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "close",
          periodType,
          startDate,
          endDate,
          notes: notes || undefined,
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({ message: "締め処理に失敗しました" }));
        throw new Error(body.message ?? "締め処理に失敗しました");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["closing-periods"] });
      setMessage("締め処理を完了しました");
    },
    onError: (err: unknown) => {
      setMessage(err instanceof Error ? err.message : "締め処理に失敗しました");
    },
  });

  const reopenMutation = useMutation({
    mutationFn: async (periodId: string) => {
      const res = await fetch("/api/closing-periods", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "reopen",
          periodId,
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({ message: "再オープンに失敗しました" }));
        throw new Error(body.message ?? "再オープンに失敗しました");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["closing-periods"] });
      setMessage("期間を再オープンしました");
    },
    onError: (err: unknown) => {
      setMessage(err instanceof Error ? err.message : "再オープンに失敗しました");
    },
  });

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMessage(null);
    if (!startDate || !endDate) {
      setMessage("開始日と終了日を入力してください");
      return;
    }
    closeMutation.mutate();
  };

  const isSubmitting = closeMutation.isPending || reopenMutation.isPending;

  const latestClosed = useMemo(
    () => data?.find((period) => period.status === "closed"),
    [data]
  );

  return (
    <section
      style={{
        background: "white",
        borderRadius: "1rem",
        padding: "2rem",
        boxShadow: "0 10px 40px rgba(15, 23, 42, 0.06)",
        display: "flex",
        flexDirection: "column",
        gap: "1.5rem",
      }}
    >
      <div>
        <h2 style={{ fontSize: "1.25rem", marginBottom: "0.5rem" }}>期間締め</h2>
        <p style={{ margin: 0, color: "#475569" }}>
          月次・年次の締めを行うと該当期間の仕訳がロックされます。
        </p>
        {latestClosed ? (
          <p style={{ margin: "0.5rem 0 0", fontSize: "0.9rem", color: "#0f172a" }}>
            最新の締め期間: {latestClosed.periodType}（{formatDate(latestClosed.startDate)}〜
            {formatDate(latestClosed.endDate)}）
          </p>
        ) : null}
      </div>

      <form
        onSubmit={handleSubmit}
        style={{ display: "grid", gap: "1rem", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))" }}
      >
        <label style={{ display: "flex", flexDirection: "column", gap: "0.25rem", color: "#1e293b" }}>
          期間タイプ
          <select
            value={periodType}
            onChange={(event) => setPeriodType(event.target.value)}
            style={{
              padding: "0.6rem 0.8rem",
              borderRadius: "0.75rem",
              border: "1px solid #cbd5f5",
              fontSize: "0.95rem",
            }}
          >
            {PERIOD_TYPES.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <label style={{ display: "flex", flexDirection: "column", gap: "0.25rem", color: "#1e293b" }}>
          開始日
          <input
            type="date"
            value={startDate}
            onChange={(event) => setStartDate(event.target.value)}
            style={{
              padding: "0.6rem 0.8rem",
              borderRadius: "0.75rem",
              border: "1px solid #cbd5f5",
              fontSize: "0.95rem",
            }}
          />
        </label>

        <label style={{ display: "flex", flexDirection: "column", gap: "0.25rem", color: "#1e293b" }}>
          終了日
          <input
            type="date"
            value={endDate}
            onChange={(event) => setEndDate(event.target.value)}
            style={{
              padding: "0.6rem 0.8rem",
              borderRadius: "0.75rem",
              border: "1px solid #cbd5f5",
              fontSize: "0.95rem",
            }}
          />
        </label>

        <label style={{ display: "flex", flexDirection: "column", gap: "0.25rem", color: "#1e293b" }}>
          メモ（任意）
          <input
            type="text"
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            placeholder="例: 2025年9月月次締め"
            style={{
              padding: "0.6rem 0.8rem",
              borderRadius: "0.75rem",
              border: "1px solid #cbd5f5",
              fontSize: "0.95rem",
            }}
          />
        </label>

        <div style={{ display: "flex", alignItems: "flex-end" }}>
          <button
            type="submit"
            disabled={isSubmitting}
            style={{
              padding: "0.75rem 1.5rem",
              borderRadius: "9999px",
              border: "none",
              background: "#2563eb",
              color: "white",
              fontSize: "0.95rem",
              fontWeight: 600,
              cursor: isSubmitting ? "not-allowed" : "pointer",
              width: "100%",
            }}
          >
            {closeMutation.isPending ? "締め処理中..." : "この期間を締める"}
          </button>
        </div>
      </form>

      {message ? (
        <div
          style={{
            padding: "0.75rem 1rem",
            background: "#eff6ff",
            borderRadius: "0.75rem",
            color: "#1d4ed8",
            fontSize: "0.9rem",
          }}
        >
          {message}
        </div>
      ) : null}

      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", minWidth: "640px" }}>
          <thead>
            <tr style={{ textAlign: "left", borderBottom: "1px solid #e2e8f0" }}>
              <th style={{ padding: "0.75rem", fontSize: "0.85rem", color: "#64748b" }}>期間タイプ</th>
              <th style={{ padding: "0.75rem", fontSize: "0.85rem", color: "#64748b" }}>開始日</th>
              <th style={{ padding: "0.75rem", fontSize: "0.85rem", color: "#64748b" }}>終了日</th>
              <th style={{ padding: "0.75rem", fontSize: "0.85rem", color: "#64748b" }}>ステータス</th>
              <th style={{ padding: "0.75rem", fontSize: "0.85rem", color: "#64748b" }}>操作</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={5} style={{ padding: "1rem", textAlign: "center", color: "#64748b" }}>
                  読み込み中...
                </td>
              </tr>
            ) : error ? (
              <tr>
                <td colSpan={5} style={{ padding: "1rem", textAlign: "center", color: "#b91c1c" }}>
                  {(error as Error).message}
                </td>
              </tr>
            ) : data && data.length > 0 ? (
              data.map((period) => (
                <tr key={period.id} style={{ borderBottom: "1px solid #e2e8f0" }}>
                  <td style={{ padding: "0.75rem", fontSize: "0.95rem", color: "#0f172a" }}>{period.periodType}</td>
                  <td style={{ padding: "0.75rem", fontSize: "0.95rem", color: "#0f172a" }}>{formatDate(period.startDate)}</td>
                  <td style={{ padding: "0.75rem", fontSize: "0.95rem", color: "#0f172a" }}>{formatDate(period.endDate)}</td>
                  <td style={{ padding: "0.75rem", fontSize: "0.95rem", color: "#0f172a" }}>{period.status}</td>
                  <td style={{ padding: "0.75rem" }}>
                    {period.status === "closed" ? (
                      <button
                        type="button"
                        disabled={isSubmitting}
                        onClick={() => {
                          setMessage(null);
                          reopenMutation.mutate(period.id);
                        }}
                        style={{
                          padding: "0.5rem 1rem",
                          borderRadius: "9999px",
                          border: "1px solid #1d4ed8",
                          background: "transparent",
                          color: "#1d4ed8",
                          fontSize: "0.85rem",
                          fontWeight: 600,
                          cursor: isSubmitting ? "not-allowed" : "pointer",
                        }}
                      >
                        再オープン
                      </button>
                    ) : (
                      <span style={{ fontSize: "0.85rem", color: "#64748b" }}>-</span>
                    )}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={5} style={{ padding: "1rem", textAlign: "center", color: "#64748b" }}>
                  まだ締め期間はありません。
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
