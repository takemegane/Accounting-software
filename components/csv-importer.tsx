"use client";

import { useRef, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";

type ImportResponse = {
  message: string;
  importedCount?: number;
  errors?: string[];
};

export function CsvImporter() {
  const queryClient = useQueryClient();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const mutation = useMutation<ImportResponse, Error, File>({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/transactions/import", {
        method: "POST",
        body: formData,
      });

      const payload = (await response.json()) as ImportResponse;
      if (!response.ok) {
        throw new Error(payload.message ?? "インポートに失敗しました");
      }
      return payload;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
    },
  });

  const handleSelectFile = (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;
    const file = fileList[0];
    setFileName(file.name);
    mutation.mutate(file);
  };

  const onDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(false);
    handleSelectFile(event.dataTransfer.files);
  };

  const onDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(true);
  };

  return (
    <section
      id="csv-import"
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
        <h2 style={{ fontSize: "1.4rem", marginBottom: "0.5rem" }}>CSVインポート</h2>
        <p style={{ margin: 0, color: "#64748b", lineHeight: 1.6 }}>
          銀行やクレジットカードの明細CSVを取り込み、仕訳作成前の取引候補として保存します。重複判定やマッピングは今後追加予定です。
        </p>
      </div>

      <div
        onDrop={onDrop}
        onDragOver={onDragOver}
        onDragLeave={() => setIsDragging(false)}
        onClick={() => inputRef.current?.click()}
        style={{
          border: `2px dashed ${isDragging || mutation.isPending ? "#2563eb" : "#cbd5f5"}`,
          borderRadius: "1rem",
          padding: "2.5rem",
          textAlign: "center",
          background: isDragging || mutation.isPending ? "rgba(37, 99, 235, 0.08)" : "#f8fafc",
          cursor: "pointer",
          transition: "background 0.2s ease, border-color 0.2s ease",
        }}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".csv,text/csv"
          style={{ display: "none" }}
          onChange={(event) => handleSelectFile(event.target.files)}
        />
        <p style={{ fontSize: "1rem", fontWeight: 600, marginBottom: "0.5rem" }}>
          {mutation.isPending ? "アップロード中..." : "CSVファイルをクリックまたはドラッグ＆ドロップ"}
        </p>
        <p style={{ margin: 0, color: "#64748b" }}>
          {fileName ?? "1ファイルのみ選択できます"}
        </p>
      </div>

      {mutation.data && (
        <div
          style={{
            background: "#ecfdf5",
            border: "1px solid #bbf7d0",
            borderRadius: "0.75rem",
            padding: "1rem",
            color: "#047857",
            fontSize: "0.9rem",
          }}
        >
          <p style={{ margin: 0, fontWeight: 600 }}>{mutation.data.message}</p>
          {mutation.data.errors && mutation.data.errors.length > 0 && (
            <ul style={{ margin: "0.5rem 0 0", paddingLeft: "1.25rem", color: "#0f172a" }}>
              {mutation.data.errors.map((error, index) => (
                <li key={index}>{error}</li>
              ))}
            </ul>
          )}
        </div>
      )}

      {mutation.isError && (
        <p style={{ color: "#ef4444", margin: 0 }}>
          {mutation.error instanceof Error ? mutation.error.message : "インポートに失敗しました"}
        </p>
      )}
    </section>
  );
}
