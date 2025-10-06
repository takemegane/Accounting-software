# Simple Accounting Prototype

個人事業主向けの軽量会計アプリのプロトタイプです。CSV 取込と手入力を組み合わせた仕訳管理、帳簿・主要レポート（試算表 / 貸借対照表 / 損益計算書）の参照を想定しています。

## 主な機能
- 仕訳 CRUD と取引一覧 (`app/transactions`, `components/journal-entry-form.tsx`, `components/transactions-table.tsx`)
- 帳簿ページに総勘定元帳・仕訳帳を集約 (`app/books/page.tsx`)
- 試算表・損益計算書・貸借対照表 UI (`components/*-report.tsx`)
- CSV 取込（Papaparse）と税区分付き勘定科目初期データ (`lib/csv-import.ts`, `lib/seed.ts`)

## 技術スタック
- Next.js 14 (App Router) / React 18 / TypeScript
- TanStack Query によるデータ取得 (`components/react-query-provider.tsx`)
- Prisma + SQLite（開発用 DB は `prisma/prisma/dev.db`）
- Clerk 認証ラッパー (`components/safe-clerk.tsx`) と next-pwa による PWA 対応

## セットアップ手順
### 前提
- Node.js 18.x / npm 10.x
- SQLite3（Prisma が利用）

### 初回セットアップ
```bash
npm install
npm run clean        # 既存の .next キャッシュがある場合
npm run dev          # http://localhost:3000
```

Prisma スキーマ変更後は `npx prisma generate` を実行してください。ローカル DB を利用する場合は `.env` / `.env.local` に `DATABASE_URL="file:./prisma/dev.db"` を設定するか、同梱の `prisma/prisma/dev.db` を参照するために `DATABASE_URL="file:./prisma/prisma/dev.db"` としてください。

Clerk を利用する場合は `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` と `CLERK_SECRET_KEY` を設定します。未設定でも `SafeClerkProvider` により開発は継続できます。

## npm スクリプト
- `npm run dev` – 開発サーバーを起動
- `npm run build` / `npm run start` – 本番ビルドと起動
- `npm run lint` – ESLint 実行
- `npm run clean` – `.next` ディレクトリを削除

## ディレクトリ概要
- `app/` – Next.js App Router。ダッシュボード (`app/page.tsx`)、帳簿 (`app/books`)、レポート (`app/reports`)、取引 (`app/transactions`)、設定 (`app/settings`) を配置。
- `app/api/` – 仕訳・帳票・マスタ API。`lib/business-context.ts` と連携して事業コンテキストを解決。
- `components/` – UI コンポーネントとロジック。帳票 UI、仕訳フォーム、取引テーブル、React Query プロバイダーなど。
- `lib/` – サーバーサイド共通処理（仕訳検証、CSV 取込、レポート計算、Prisma クライアント、シード）。
- `prisma/` – Prisma スキーマとマイグレーション、ローカル DB。
- `docs/` – アーキテクチャ、データモデル、運用マニュアルなどの補助ドキュメント。
- `public/` – PWA マニフェストや静的アセット。

## ドキュメントと更新ルール
- 運用マニュアルと作成履歴は `docs/operations-manual.md` に集約しています。新しい意思決定や大きな変更を行った際は必ず同ファイルを更新してください。
- 実装単位の差分は `CHANGELOG.md` に追記します（Added / Changed / Removed 形式）。
- 追加資料（アーキテクチャ、データモデル案など）は `docs/` 配下に保管し、マニュアルから参照します。

## 今後の予定（抜粋）
- Prisma スキーマ拡張と Neon PostgreSQL への移行検討
- 仕訳検証・レポート計算のテスト整備
- Clerk 認証の本番運用フロー、OCR/外部連携の PoC

チームへの引き継ぎ時は README → `docs/operations-manual.md` → `CHANGELOG.md` の順に確認する運用を推奨します。
