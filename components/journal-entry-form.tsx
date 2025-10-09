"use client";

import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useJournalEntryEditor } from "@/components/journal-entry-editor-context";

type Account = {
  id: string;
  code: string;
  name: string;
  type: string;
  taxRate?: number;
  taxCategoryId?: string | null;
  taxCategoryCode?: string | null;
};

type LineState = {
  accountId: string;
  debit: string;
  credit: string;
  memo: string;
  taxCategoryId: string;
};

const createInitialLines = (): LineState[] => [
  { accountId: "", debit: "", credit: "", memo: "", taxCategoryId: "" },
  { accountId: "", debit: "", credit: "", memo: "", taxCategoryId: "" },
];

const getToday = () => new Date().toISOString().slice(0, 10);

type TaxPreview = {
  accountName: string;
  taxAmount: number;
  direction: "debit" | "credit";
  taxCategoryCode?: string | null;
};

const getTaxRate = (account?: Account) => account?.taxRate ?? 0;

const fallbackTaxCategoryLabel: Record<string, string> = {
  EXEMPT: "非課税",
  NON_TAXABLE: "不課税",
  OUT_OF_SCOPE: "対象外",
  SALE_10: "課税売上(10%)",
  PURCHASE_10: "課税仕入(10%)",
};

export function JournalEntryForm() {
  const queryClient = useQueryClient();
  const [entryDate, setEntryDate] = useState(getToday);
  const [description, setDescription] = useState("");
  const { data: businessResponse } = useQuery<{ activeBusiness: { taxPreference: string } }>({
    queryKey: ["business"],
    queryFn: async () => {
      const response = await fetch("/api/business");
      if (!response.ok) {
        throw new Error("事業情報の取得に失敗しました");
      }
      return response.json();
    },
  });

  const [lines, setLines] = useState<LineState[]>(createInitialLines);
  const taxPreference = businessResponse?.activeBusiness?.taxPreference;
  const taxMode = taxPreference === "TAX_EXCLUSIVE" ? "税抜" : "税込";
  const [taxPreview, setTaxPreview] = useState<TaxPreview[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { editingEntry, cancelEditing } = useJournalEntryEditor();
  const isEditing = Boolean(editingEntry);

  const {
    data: accounts,
    isLoading: isLoadingAccounts,
    isError: accountsError,
    error: accountsQueryError,
  } = useQuery<Account[]>({
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

  const {
    data: taxCategories,
    isError: taxCategoriesError,
    error: taxCategoriesQueryError,
  } = useQuery<{ id: string; code: string; name: string; rate: number }[]>({
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

  useEffect(() => {
    if (editingEntry) {
      const normalizedDate = new Date(editingEntry.entryDate).toISOString().slice(0, 10);
      setEntryDate(normalizedDate);
      setDescription(editingEntry.description ?? "");
      const mappedLines = editingEntry.lines.map((line) => ({
        accountId: line.accountId,
        debit: line.debit > 0 ? String(line.debit) : "",
        credit: line.credit > 0 ? String(line.credit) : "",
        memo: line.memo ?? "",
        taxCategoryId: line.taxCategoryId ?? "",
      }));
      if (mappedLines.length >= 2) {
        setLines(mappedLines);
      } else {
        const filler = createInitialLines().slice(mappedLines.length);
        setLines([...mappedLines, ...filler]);
      }
    } else {
      setEntryDate(getToday());
      setDescription("");
      setLines(createInitialLines());
      setTaxPreview([]);
    }
    setMessage(null);
    setError(null);
  }, [editingEntry]);

  const availableTaxCategories = useMemo(() => {
    if (taxCategories) {
      return taxCategories;
    }
    if (!accounts) {
      return [] as { id: string; code: string; name: string; rate: number }[];
    }
    const unique = new Map<string, { id: string; code: string; name: string; rate: number }>();
    accounts.forEach((account) => {
      if (!account.taxCategoryId) {
        return;
      }
      if (!unique.has(account.taxCategoryId)) {
        const fallbackName =
          fallbackTaxCategoryLabel[account.taxCategoryCode ?? ""] ??
          account.taxCategoryCode ??
          account.taxCategoryId;
        unique.set(account.taxCategoryId, {
          id: account.taxCategoryId,
          code: account.taxCategoryCode ?? account.taxCategoryId.slice(0, 6),
          name: fallbackName,
          rate: account.taxRate ?? 0,
        });
      }
    });
    return Array.from(unique.values()).sort((a, b) => a.name.localeCompare(b.name, "ja"));
  }, [taxCategories, accounts]);

  const buildPayload = () => ({
    entryDate,
    description: description || undefined,
    lines: lines.map((line) => ({
      accountId: line.accountId,
      debit: Math.round(Number(line.debit) || 0),
      credit: Math.round(Number(line.credit) || 0),
      memo: line.memo || undefined,
      taxCategoryId: line.taxCategoryId || undefined,
    })),
  });

  const mutation = useMutation<
    unknown,
    Error,
    { mode: "create" | "update"; entryId?: string }
  >({
    mutationFn: async ({ mode, entryId }) => {
      const payload = buildPayload();
      const url = mode === "create" ? "/api/journal-entries" : `/api/journal-entries/${entryId}`;
      const method = mode === "create" ? "POST" : "PATCH";

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({ message: "仕訳の保存に失敗しました" }));
        throw new Error(data.message ?? "仕訳の保存に失敗しました");
      }

      return response.json();
    },
    onSuccess: (_data, variables) => {
      const successMessage = variables.mode === "create" ? "仕訳を登録しました" : "仕訳を更新しました";
      setMessage(successMessage);
      setError(null);
      setDescription("");
      setLines(createInitialLines());
      setTaxPreview([]);
      if (variables.mode === "update") {
        cancelEditing();
        setEntryDate(getToday());
      }
      // 仕訳一覧のみ自動更新（帳票は手動更新ボタンで更新）
      queryClient.invalidateQueries({ queryKey: ["journal-entries"] });
    },
    onError: (error) => {
      setError(error.message || "仕訳の保存に失敗しました");
      setMessage(null);
    },
  });

  useEffect(() => {
    if (taxPreference !== "TAX_EXCLUSIVE" || !accounts) {
      setTaxPreview([]);
      return;
    }

    const preview: TaxPreview[] = [];
    for (const line of lines) {
      const account = accounts.find((item) => item.id === line.accountId);
      if (!account) {
        continue;
      }

      const selectedTaxCategoryId = line.taxCategoryId || account.taxCategoryId || null;
      const selectedTaxCategory = selectedTaxCategoryId
        ? availableTaxCategories.find((category) => category.id === selectedTaxCategoryId)
        : undefined;
      const rate = selectedTaxCategory?.rate ?? getTaxRate(account);
      if (!rate || rate <= 0) {
        continue;
      }

      const debit = Number(line.debit) || 0;
      const credit = Number(line.credit) || 0;

      if (debit > 0 && credit === 0) {
        preview.push({
          accountName: account.name,
          taxAmount: Math.round(debit * rate),
          direction: "debit",
          taxCategoryCode: selectedTaxCategory?.code ?? account.taxCategoryCode,
        });
      }

      if (credit > 0 && debit === 0) {
        preview.push({
          accountName: account.name,
          taxAmount: Math.round(credit * rate),
          direction: "credit",
          taxCategoryCode: selectedTaxCategory?.code ?? account.taxCategoryCode,
        });
      }
    }
    setTaxPreview(preview);
  }, [accounts, taxPreference, lines, availableTaxCategories]);

  // 全角数字を半角に変換する関数
  const toHalfWidth = (str: string): string => {
    return str.replace(/[０-９]/g, (char) => {
      return String.fromCharCode(char.charCodeAt(0) - 0xFEE0);
    });
  };

  const updateLine = (index: number, updates: Partial<LineState>) => {
    // 借方・貸方の金額を自動的に半角変換
    if ('debit' in updates && updates.debit !== undefined) {
      updates.debit = toHalfWidth(updates.debit);
    }
    if ('credit' in updates && updates.credit !== undefined) {
      updates.credit = toHalfWidth(updates.credit);
    }
    setLines((prev) => prev.map((line, i) => (i === index ? { ...line, ...updates } : line)));
  };

  const addLine = () => {
    setLines((prev) => [...prev, { accountId: "", debit: "", credit: "", memo: "", taxCategoryId: "" }]);
  };

  const removeLine = (index: number) => {
    setLines((prev) => prev.filter((_, i) => i !== index));
  };

  const debitTotal = lines.reduce((sum, line) => sum + (Number(line.debit) || 0), 0);
  const creditTotal = lines.reduce((sum, line) => sum + (Number(line.credit) || 0), 0);
  const taxTotalDebit = taxPreview.filter((item) => item.direction === "debit").reduce((sum, item) => sum + item.taxAmount, 0);
  const taxTotalCredit = taxPreview.filter((item) => item.direction === "credit").reduce((sum, item) => sum + item.taxAmount, 0);

  // 借方と貸方の合計が一致しているかチェック
  const finalDebitTotal = debitTotal + taxTotalDebit;
  const finalCreditTotal = creditTotal + taxTotalCredit;
  const isBalanced = finalDebitTotal === finalCreditTotal && finalDebitTotal > 0;

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    setMessage(null);
    setError(null);
    mutation.mutate({
      mode: isEditing ? "update" : "create",
      entryId: editingEntry?.id,
    });
  };

  const handleCancelEditing = () => {
    cancelEditing();
    setMessage(null);
    setError(null);
  };

  return (
    <section
      style={{
        background: "white",
        borderRadius: "1rem",
        padding: "2rem",
        boxShadow: "0 10px 40px rgba(15, 23, 42, 0.06)",
      }}
    >
      <h2 style={{ fontSize: "1.5rem", marginBottom: "1.5rem" }}>仕訳入力</h2>
      {isEditing && (
        <div
          style={{
            marginBottom: "1rem",
            padding: "0.75rem 1rem",
            borderRadius: "0.75rem",
            background: "#eff6ff",
            border: "1px solid #bfdbfe",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: "1rem",
            flexWrap: "wrap",
          }}
        >
          <span style={{ color: "#1d4ed8", fontWeight: 600 }}>編集モード: 選択した仕訳を更新します。</span>
          <button
            type="button"
            onClick={handleCancelEditing}
            disabled={mutation.isPending}
            style={{
              padding: "0.5rem 1rem",
              borderRadius: "0.65rem",
              border: "1px solid #2563eb",
              backgroundColor: "white",
              color: "#2563eb",
              fontWeight: 600,
              cursor: mutation.isPending ? "not-allowed" : "pointer",
            }}
          >
            編集をやめる
          </button>
        </div>
      )}
      {(accountsError || taxCategoriesError) && (
        <div
          style={{
            background: "#fffbeb",
            border: "1px solid #fbbf24",
            borderRadius: "0.75rem",
            padding: "0.75rem 1rem",
            color: "#92400e",
            fontSize: "0.9rem",
            marginBottom: "1rem",
          }}
        >
          <p style={{ margin: 0, fontWeight: 600 }}>一部のマスターデータを取得できませんでした。</p>
          <ul style={{ margin: "0.5rem 0 0", paddingLeft: "1.2rem" }}>
            {accountsError && (
              <li>勘定科目の読み込みに失敗しました: {(accountsQueryError as Error | undefined)?.message ?? "不明なエラー"}</li>
            )}
            {taxCategoriesError && (
              <li>税区分の一覧取得に失敗しました。既存の区分のみ選択できます。</li>
            )}
          </ul>
        </div>
      )}
      <form onSubmit={handleSubmit} onKeyDown={(e) => {
        // Enterキーだけでの送信を防止（Ctrl+EnterやCmd+Enterは許可）
        if (e.key === 'Enter' && !e.ctrlKey && !e.metaKey) {
          e.preventDefault();
        }
      }} style={{ display: "grid", gap: "1.5rem" }}>
        <div style={{ display: "grid", gap: "0.5rem" }}>
          <label style={{ fontWeight: 600 }}>仕訳日</label>
          <input
            type="date"
            value={entryDate}
            onChange={(event) => setEntryDate(event.target.value)}
            style={{ padding: "0.5rem", borderRadius: "0.5rem", border: "1px solid #cbd5f5" }}
            required
          />
        </div>

        <div style={{ display: "grid", gap: "0.5rem" }}>
          <label style={{ fontWeight: 600 }}>摘要</label>
          <input
            type="text"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder="摘要を入力"
            style={{ padding: "0.5rem", borderRadius: "0.5rem", border: "1px solid #cbd5f5" }}
          />
        </div>

        <div style={{ display: "grid", gap: "1rem" }}>
          <p style={{ margin: 0, fontSize: "0.85rem", color: "#64748b" }}>
            入力金額は{taxMode}で記帳されます。
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(6, minmax(0, 1fr))", gap: "0.5rem", fontWeight: 600 }}>
            <span>勘定科目</span>
            <span>借方</span>
            <span>貸方</span>
            <span>メモ</span>
            <span>税区分</span>
            <span></span>
          </div>

          {lines.map((line, index) => (
            <div
              key={index}
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(6, minmax(0, 1fr))",
                gap: "0.5rem",
                alignItems: "center",
              }}
            >
              <select
                value={line.accountId}
                onChange={(event) => {
                  const nextAccountId = event.target.value;
                  const nextAccount = accounts?.find((item) => item.id === nextAccountId);
                  updateLine(index, {
                    accountId: nextAccountId,
                    taxCategoryId: nextAccount?.taxCategoryId ?? availableTaxCategories[0]?.id ?? "",
                  });
                }}
                disabled={isLoadingAccounts}
                style={{ padding: "0.5rem", borderRadius: "0.5rem", border: "1px solid #cbd5f5" }}
                required
              >
                <option value="">選択してください</option>
                {accounts?.map((account) => (
                  <option key={account.id} value={account.id}>
                    {account.code} {account.name}
                  </option>
                ))}
              </select>

              <input
                type="number"
                min={0}
                step="1"
                value={line.debit}
                onChange={(event) => {
                  updateLine(index, { debit: event.target.value, credit: event.target.value ? "" : line.credit });
                }}
                placeholder="0"
                style={{ padding: "0.5rem", borderRadius: "0.5rem", border: "1px solid #cbd5f5" }}
              />

              <input
                type="number"
                min={0}
                step="1"
                value={line.credit}
                onChange={(event) => {
                  updateLine(index, { credit: event.target.value, debit: event.target.value ? "" : line.debit });
                }}
                placeholder="0"
                style={{ padding: "0.5rem", borderRadius: "0.5rem", border: "1px solid #cbd5f5" }}
              />

              <input
                type="text"
                value={line.memo}
                onChange={(event) => updateLine(index, { memo: event.target.value })}
                placeholder="メモ"
                style={{ padding: "0.5rem", borderRadius: "0.5rem", border: "1px solid #cbd5f5" }}
              />

              <select
                value={availableTaxCategories.length > 0 ? line.taxCategoryId : ""}
                onChange={(event) => updateLine(index, { taxCategoryId: event.target.value })}
                disabled={!line.accountId || availableTaxCategories.length === 0}
                style={{ padding: "0.5rem", borderRadius: "0.5rem", border: "1px solid #cbd5f5" }}
              >
                <option value="">
                  {(() => {
                    const account = accounts?.find((item) => item.id === line.accountId);
                    if (!account?.taxCategoryId) {
                      return "選択";
                    }
                    const matched = availableTaxCategories.find((category) => category.id === account.taxCategoryId);
                    if (matched) {
                      return matched.name;
                    }
                    return (
                      fallbackTaxCategoryLabel[account.taxCategoryCode ?? ""] ??
                      account.taxCategoryCode ??
                      "選択"
                    );
                  })()}
                </option>
                {availableTaxCategories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>

              <div style={{ display: "flex", justifyContent: "flex-end" }}>
                {lines.length > 2 && (
                  <button
                    type="button"
                    onClick={() => removeLine(index)}
                    style={{
                      background: "transparent",
                      border: "none",
                      color: "#ef4444",
                      cursor: "pointer",
                    }}
                  >
                    削除
                  </button>
                )}
              </div>
            </div>
          ))}

          <button
            type="button"
            onClick={addLine}
            style={{
              padding: "0.5rem 1rem",
              borderRadius: "0.5rem",
              border: "1px solid #2563eb",
              background: "white",
              color: "#2563eb",
              fontWeight: 600,
              justifySelf: "flex-start",
            }}
          >
            行を追加
          </button>
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", fontWeight: 600 }}>
          <span>
            借方合計: {debitTotal.toLocaleString()} 円
            {taxPreview.length > 0 && ` (+消費税 ${taxTotalDebit.toLocaleString()} 円)`}
          </span>
          <span>
            貸方合計: {creditTotal.toLocaleString()} 円
            {taxPreview.length > 0 && ` (+消費税 ${taxTotalCredit.toLocaleString()} 円)`}
          </span>
        </div>

        {taxPreview.length > 0 && (
          <div
            style={{
              background: "#f8fafc",
              borderRadius: "0.75rem",
              padding: "1rem",
              border: "1px solid #e2e8f0",
              fontSize: "0.9rem",
            }}
          >
            <p style={{ margin: 0, fontWeight: 600, marginBottom: "0.5rem" }}>自動追加予定の消費税行</p>
            <ul style={{ margin: 0, paddingLeft: "1.2rem", color: "#334155", display: "grid", gap: "0.3rem" }}>
              {taxPreview.map((item, idx) => (
                <li key={idx}>
                  {item.accountName} ({item.direction === "debit" ? "借方" : "貸方"})
                  {item.taxCategoryCode ? ` / ${item.taxCategoryCode}` : ""}
                  : {item.taxAmount.toLocaleString()} 円
                </li>
              ))}
            </ul>
          </div>
        )}

        {error && <p style={{ color: "#ef4444" }}>{error}</p>}
        {message && <p style={{ color: "#16a34a" }}>{message}</p>}

        {/* 借方貸方不一致時の警告メッセージ */}
        {!isBalanced && (debitTotal > 0 || creditTotal > 0) && (
          <div
            style={{
              background: "#fef3c7",
              border: "1px solid #fbbf24",
              borderRadius: "0.75rem",
              padding: "0.75rem 1rem",
              color: "#92400e",
              fontSize: "0.9rem",
            }}
          >
            ⚠️ 借方と貸方の合計が一致していません。仕訳を登録できません。
          </div>
        )}

        <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
          <button
            type="submit"
            disabled={mutation.isPending || !isBalanced}
            style={{
              padding: "0.75rem 1.5rem",
              borderRadius: "0.75rem",
              backgroundColor: mutation.isPending || !isBalanced ? "#9ca3af" : "#2563eb",
              color: "white",
              fontWeight: 600,
              border: "none",
              cursor: mutation.isPending || !isBalanced ? "not-allowed" : "pointer",
            }}
          >
            {mutation.isPending
              ? isEditing
                ? "保存中..."
                : "登録中..."
              : isEditing
              ? "変更を保存"
              : "仕訳を登録"}
          </button>
          {isEditing && (
            <button
              type="button"
              onClick={handleCancelEditing}
              disabled={mutation.isPending}
              style={{
                padding: "0.75rem 1.5rem",
                borderRadius: "0.75rem",
                border: "1px solid #cbd5f5",
                backgroundColor: "white",
                fontWeight: 600,
                color: "#1f2937",
                cursor: mutation.isPending ? "not-allowed" : "pointer",
              }}
            >
              編集をやめる
            </button>
          )}
        </div>
      </form>
    </section>
  );
}
