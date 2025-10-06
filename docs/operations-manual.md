# 会計ソフト運用マニュアル兼作成履歴

最終更新: 2025-10-06

## 1. ドキュメントの目的と更新ルール
- このファイルはプロトタイプの全体像、運用手順、変更履歴を一元管理するためのハンドブックです。
- 新しい機能追加や意思決定を行った際は、詳細を `CHANGELOG.md` に記載した上で、本書の該当セクションにも反映してください。
- 今後の保守・引き継ぎでは「まずこのファイルを読む」ことをチーム共通ルールとし、更新がない場合でもレビュー日時を記録してください。

## 2. プロジェクト概要
- 名称: Simple Accounting Prototype（個人事業主向け軽量会計アプリ）。
- 目的: 日次記帳、リアルタイムな損益・資金繰り把握、確定申告準備の効率化。
- 提供価値: CSV 取込と手入力を中心とした最小限の仕訳管理と帳票出力、PWA によるモバイル体験。
- 想定利用者: 従業員 1〜5 名規模の個人事業主。

## 3. 技術スタックと依存関係
- Next.js 14 (App Router) + React 18 + TypeScript。
- 状態管理/データ取得: TanStack Query (`components/react-query-provider.tsx`)。
- 認証: Clerk（`components/safe-clerk.tsx` で未設定環境でも動作するフェールセーフを実装）。
- データベース: Prisma + SQLite (開発用 `prisma/dev.db`)。将来的に Neon PostgreSQL を想定（`docs/architecture.md` 参照）。
- その他ライブラリ: Papaparse（CSV 取込）、PDFKit（帳票生成下準備）、next-pwa（PWA 対応）。
- Node.js 18 以上を推奨。

## 4. 開発環境セットアップ
### 必要要件
- Node.js 18.x / npm 10.x。
- SQLite3（ローカル開発で Prisma が利用）。

### 初期セットアップ手順
1. 依存関係のインストール: `npm install`
2. （任意）旧ビルドキャッシュ削除: `npm run clean`
3. 開発サーバー起動: `npm run dev` → `http://localhost:3000`
4. Prisma クライアント生成: `npx prisma generate`（`npm install` 時点で自動実行されるが、schema 更新時は再実行）。
5. DB スキーマ適用: `npx prisma migrate dev --name init` もしくは `npx prisma db push`

### 環境変数
- `DATABASE_URL="file:./prisma/dev.db"` を `.env` or `.env.local` に設定。リポジトリには `prisma/dev.db` を同梱済みです。ターミナルの現ディレクトリにスペースが含まれている場合、Prisma CLI コマンド実行時に `DATABASE_URL="file:$(pwd)/prisma/dev.db" npx prisma ...` のように絶対パスで上書きすると失敗を避けられます。
- Clerk を利用する場合は以下を設定し、未設定時は `SafeClerkProvider` がスタブ UI を表示します。
  - `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
  - `CLERK_SECRET_KEY`

## 5. ディレクトリ構成
- `app/` : Next.js App Router。`page.tsx` がダッシュボード、`app/books/page.tsx` に総勘定元帳・仕訳帳、`app/reports` に試算表/損益/貸借対照表、`app/transactions` に取引一覧、`app/settings` に事業設定 UI を配置。
- `app/api/` : REST API ルート。例: `journal-entries`（仕訳 CRUD）、`reports/balance-sheet`（貸借対照表計算）。
- `components/` : UI・ロジック分離コンポーネント。帳票 (`*report.tsx`)、仕訳フォーム (`journal-entry-form.tsx`)、取引テーブル (`transactions-table.tsx`) など。
- `lib/` : サーバーサイド共有ロジック。ビジネスコンテキスト取得 (`business-context.ts`)、仕訳検証 (`journal-entry-validation.ts`)、レポート計算 (`report-data.ts`)、シード (`seed.ts`) 等。
- `prisma/` : Prisma スキーマとマイグレーション。`prisma/schema.prisma` およびローカル DB。
- `docs/` : 補助ドキュメント群（アーキテクチャ、データモデル、帳票設計など）。本マニュアルもここに保存。
- `public/` : PWA マニフェストや静的アセット。
- `middleware.ts` : Next.js ミドルウェア（Clerk 等）設定ポイント。

## 6. 主な機能と関連ファイル
### 認証と事業コンテキスト
- `components/safe-clerk.tsx` で Clerk 有無を判断し、未設定環境でも開発を継続可能。
- `lib/business-context.ts` でリクエストごとに Business を解決し、API 層やサーバーコンポーネントで共通利用。

### ダッシュボード (`app/page.tsx`, `components/dashboard-kpi.tsx`, `components/current-period-summary.tsx`)
- 最近の取引サマリ、KPI カードを表示。React Query 経由で `app/api/dashboard` を参照。

### 取引・仕訳管理 (`app/transactions`, `components/transactions-table.tsx`, `components/journal-entry-form.tsx`)
- 銀行明細や手入力取引を一覧化。編集・削除操作は新設の仕訳 API に連動し、該当レポートを invalidate。
- 仕訳登録フローでは `lib/journal-entry-validation.ts` が貸借一致・税区分整合を検証。

### 帳簿・レポート (`app/books/page.tsx`, `components/general-ledger-report.tsx`, `components/journal-report.tsx`, `components/balance-sheet-report.tsx`, `components/trial-balance-report.tsx`, `components/income-statement-report.tsx`)
- 帳簿ページに総勘定元帳と仕訳帳を集約。レポートページは試算表/貸借対照表/損益計算書の UI に集中。
- レポート計算は `lib/report-data.ts` 及び `lib/report-utils.ts` に実装。

### CSV 取込 (`components/csv-importer.tsx`, `lib/csv-import.ts`)
- Papaparse で CSV を解析し、Prisma 経由で取引データを作成。

### 事業設定 (`app/settings`, `components/business-settings.tsx`)
- 会計年度や税設定を変更。税区分・勘定科目の初期化は `lib/seed.ts` を利用。

## 7. API エンドポイント概要 (`app/api`)
- `journal-entries/` : GET/POST で直近仕訳取得・登録。
- `journal-entries/[id]` : GET/PATCH/DELETE で個別仕訳の参照・更新・削除。
- `transactions/` : 取引明細の CRUD。
- `reports/balance-sheet`, `reports/trial-balance`, `reports/income-statement` : 帳票データ生成。
- `account-balances/`, `accounts/`, `tax-categories/` : マスタ管理 API。
- API ハンドラーは `lib/business-context.ts` で事業を特定し、`JournalEntryValidationError` 等でドメインバリデーションを共通化。

## 8. データベースとシード
- Prisma スキーマは `schema.prisma` に定義。主要モデル: Business, Account, TaxCategory, JournalEntry, JournalEntryLine, Transaction, UserProfile, BusinessMembership, AccountBalance。
- ローカル DB: `DATABASE_URL="file:./prisma/dev.db"`（リポジトリにサンプル DB を含む）。
- シード: `lib/seed.ts` の `ensureBusinessSeed` を API や初回セットアップで呼び出して勘定科目と税区分を生成。
- マイグレーション格納先: `prisma/migrations/`。新しいスキーマ変更時は `npx prisma migrate dev --name <change>` を実行し、結果をコミット。

## 9. 開発・運用フロー
- バージョン管理: まだ Git 初期化されていない場合は `git init` の上、`CHANGELOG.md` と本書を更新単位でコミット。
- コーディング指針: TypeScript strict（デフォルト設定）。React Server Components を基本とし、クライアント側は `"use client"` 宣言を明示。
- テスト: 自動テストは未整備。重要ロジック（仕訳検証、レポート計算）には今後 Vitest などで単体テストを追加予定。
- Lint: `npm run lint`
- ビルド/デプロイ: `npm run build` → Vercel デプロイ想定。PWA 設定は `next.config.mjs` で環境に応じて無効化/有効化。

## 10. 変更履歴の扱い
- 日々の変更は `CHANGELOG.md` のセクション（Unreleased / リリースタグ）に記入。記載内容は「Added/Changed/Removed/Fixes」を基本構造とする。
- 実装着手前にチケット番号や目的をここに追記し、完了後に日付付きでリリースノートを作成。
- 本マニュアルには重要判断（アーキテクチャ変更、運用ルール更新、主要フロー変更）を整理する。更新時は以下の履歴テーブルにも追記すること。

### マニュアル更新履歴
| 日付 | 内容 | 担当 |
| ---- | ---- | ---- |
| 2025-10-06 | ハンドブック初版作成。リポジトリ構成・機能概要・運用ルールを整理。今後の更新ポリシーを明示。 | Codex Agent |

## 11. 参考ドキュメントと位置づけ
- `docs/architecture.md` : 将来的な本番アーキテクチャと懸念メモ。
- `docs/data-model.md` : 拡張を含むデータモデル案。現行 Prisma スキーマとの差分確認に利用。
- `docs/chart-of-accounts.md` : 初期勘定科目と税区分の仕様案。
- `docs/dashboard-reporting.md` : KPI・レポート要件メモ。
- `docs/import-and-entry.md` : CSV 取込/仕訳連携の検討。
- `docs/ocr-options.md` : OCR/AI 連携候補の比較メモ。
- `docs/troubleshooting.md` : よくある問題と対処（随時更新推奨）。
- 今後も補助資料は `docs/` 配下にまとめ、本書から参照先としてリンク記載する。

## 12. 引き継ぎチェックリスト
- [ ] `.env.local` に DB/Clerk 設定があるか確認。
- [ ] `npm run dev` を起動し、ダッシュボード/取引/帳簿ページが動作するか確認。
- [ ] 仕訳登録→編集→削除を一通りテストし、関連レポートが更新されるか確認。
- [ ] `CHANGELOG.md` に最新コミットの内容が反映されているか確認。
- [ ] 本マニュアルの「最終更新」日付と履歴テーブルを更新。

## 13. 既知の課題・今後の検討
- 認証本番化: Clerk API キーが未設定の場合の本番対応方法を決定する必要あり。
- データ移行: 現状 SQLite -> 本番 Postgres への移行設計が未確定（`docs/architecture.md` の Neon 想定を要調整）。
- テスト体制: ドメインロジックに対する自動テストを整備していないため、リグレッションリスクが高い。
- OCR/外部連携: `docs/ocr-options.md` で比較中。優先順位と PoC 方針の決定が必要。
- 監査ログ/権限管理: 実装未着手。金融データ扱いのため早期に仕様確定が必要。

---
今後の更新は必ずこの `docs/operations-manual.md` に追記し、引き継ぎ時は最新状態で共有してください。
