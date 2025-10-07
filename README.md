# Simple Accounting Prototype

個人事業主向けの軽量会計アプリのプロトタイプです。CSV 取込と手入力を組み合わせた仕訳管理、帳簿・主要レポート（試算表 / 貸借対照表 / 損益計算書）の参照を想定しています。

## ⚠️ 最新の重要な変更（2025-10-07）

**消費税計算ロジックの重大なバグを修正しました。**

- **影響:** 税抜経理モードで税込金額から消費税を逆算する際、税抜金額と消費税の内訳が不正確でした
- **修正内容:** `lib/tax-helpers.ts` の計算式を修正（詳細は `CHANGELOG.md` を参照）
- **データベース:** 修正前の不整合データは削除済み（データベースをリセット）
- **今後:** 新規作成されるデータは全て正しい計算ロジックで処理されます

詳細は **[CHANGELOG.md](./CHANGELOG.md)** を必ず確認してください。

## 主な機能
- 仕訳 CRUD と取引一覧 (`app/transactions`, `components/journal-entry-form.tsx`, `components/transactions-table.tsx`)
- 帳簿ページに総勘定元帳・仕訳帳を集約 (`app/books/page.tsx`)
- 試算表・損益計算書・貸借対照表 UI (`components/*-report.tsx`)
- CSV 取込（Papaparse）と税区分付き勘定科目初期データ (`lib/csv-import.ts`, `lib/seed.ts`)
- 月次/年次の締め管理で締め済み期間の仕訳ロック (`components/closing-period-manager.tsx`)

## 技術スタック
- Next.js 14 (App Router) / React 18 / TypeScript
- TanStack Query によるデータ取得 (`components/react-query-provider.tsx`)
- Prisma + SQLite（開発用 DB は `prisma/dev.db`）
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

Prisma スキーマ変更後は `npx prisma generate` を実行してください。ローカル DB を利用する場合は `.env` / `.env.local` に `DATABASE_URL="file:./prisma/dev.db"` を設定してください。プロジェクトパス（`pwd`）にスペースが含まれる環境で Prisma CLI が失敗する場合は、コマンド実行時のみ `DATABASE_URL="file:$(pwd)/prisma/dev.db" npx prisma ...` のように絶対パスで上書きしてください。

Clerk を利用する場合は `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` と `CLERK_SECRET_KEY` を設定します。未設定でも `SafeClerkProvider` により開発は継続できます。

### ⚠️ データベース操作時の重要な注意事項

**データ損失を防ぐため、データベース操作を行う前に必ず [docs/database-safety-guidelines.md](./docs/database-safety-guidelines.md) を確認してください。**

以下のコマンドは**既存データを完全に削除**します。実行前に必ずバックアップを取り、ユーザーの明示的な承認を得てください：
- ❌ `npx prisma migrate reset` - データベース全削除
- ❌ `npx prisma db push --force-reset` - データベース再作成
- ❌ `rm prisma/dev.db` - データベースファイル削除

**安全なデータベース操作:**
- ✅ マイグレーション適用（データ保持）: `npx prisma migrate deploy`
- ✅ スキーマ同期（データ保持）: `npx prisma db push`（`--force-reset` なし）
- ✅ 操作前のバックアップ: `cp prisma/dev.db prisma/dev.db.backup.$(date +%Y%m%d_%H%M%S)`

詳細は [docs/database-safety-guidelines.md](./docs/database-safety-guidelines.md) を必ず確認してください。

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
- 直近の優先開発項目は `docs/accounting-roadmap.md` に要件をまとめています。
- **⚠️ データベース操作を行う際は必ず `docs/database-safety-guidelines.md` を確認してください。**

## 引き継ぎ時の推奨読む順番

チームへの引き継ぎ時は以下の順番でドキュメントを確認してください：

1. **README.md（本ファイル）** - プロジェクト概要と最新の重要な変更
2. **[⚠️ docs/database-safety-guidelines.md](./docs/database-safety-guidelines.md)** - **必読**: データ損失を防ぐための重要なルール
3. **[CHANGELOG.md](./CHANGELOG.md)** - 最新の修正内容と技術的詳細
4. **[docs/operations-manual.md](./docs/operations-manual.md)** - 運用マニュアルと設計判断
5. **[docs/accounting-roadmap.md](./docs/accounting-roadmap.md)** - 今後の開発予定

### 特に重要
- **⚠️ データベース操作時は必ず [docs/database-safety-guidelines.md](./docs/database-safety-guidelines.md) を確認してください**
- **消費税計算の修正（2025-10-07）** については必ず `CHANGELOG.md` を確認してください
- データベースはリセット済みなので、既存データは存在しません

## 今後の予定（抜粋）
- Prisma スキーマ拡張と Neon PostgreSQL への移行検討
- 仕訳検証・レポート計算のテスト整備
- Clerk 認証の本番運用フロー、OCR/外部連携の PoC
