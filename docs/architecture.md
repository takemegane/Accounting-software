# 会計アプリ構成メモ

最終更新: 2024-??

## 背景
- 個人事業主向けの軽量会計ソフト。
- 日次記帳・売上/経費のリアルタイム把握・確定申告書作成を支援。
- freeeライクな体験を目標。
- 無料枠の GitHub + Vercel + Neon を利用。

## 想定ユーザー
- 1〜5 名程度（小規模事業者）。

## フロントエンド
- Next.js 14 (App Router) + TypeScript。
- 認証: Clerk（メール、パスキー、2FA等）。
- データフェッチ: React Query。
- 状態管理: 必要最小限（Zustand などを検討）。
- UI:
  - PC: 仕訳入力、ダッシュボード、インボイス管理。
  - モバイル: 写真アップロード、入力補助。PWA 対応でネイティブ相当の体験を狙う。

## API / サーバー
- Vercel Functions (Edge/Node) による REST API。
- 主要機能: 仕訳 CRUD、売上/経費集計、帳票生成、OCR/AI 分析ジョブ投入、外部金融機関連携。
- 認証検証: Clerk JWT。
- レートリミットと監査ログ必須。

## バックグラウンドジョブ
- Vercel Cron または外部キュー（例: Upstash Q）を利用し定期同期、日次集計、月次レポート生成。
- OCR や AI 推論処理は外部サーバーレス（例: Cloudflare Workers, AWS Lambda, Replicate）に切り出し検討。

## データベース
- Neon PostgreSQL。
- Prisma でスキーマ管理。
- 想定テーブル（一部）:
  - `users`, `businesses`, `accounts`, `journal_entries`, `transactions`
  - `invoices`, `receipts`, `attachments`
  - `categories`, `tax_rates`, `subscription_plans`, `audit_logs`
- 集計用途に materialized view や summary テーブルを検討。

## ストレージ
- 領収書画像や帳票 PDF は Cloudflare R2 などのオブジェクトストレージを想定（署名付き URL でアクセス）。

## 外部連携
- 初期は銀行/クレカ CSV インポートと手入力をサポート（ユーザー回答）。
- 将来的にマネーツリー等の正式 API 連携を検討。

## 税務対応
- 税込 / 税抜経理を選択可能。
- 消費税（インボイス制度対応、税区分マスタ、軽減税率、税率履歴管理）。
- 2023 年版の確定申告書フォーマットを出力対象（ユーザー回答）。

## モバイル機能
- PWA ベース。
- 領収書撮影アップロード、OCR 解析、重複検知アラート。

## セキュリティ
- 金融情報・個人情報を扱うため、暗号化 (at rest / in transit)、アクセス制御、監査ログを整備。
- 無料枠では限界があるため将来的に Vault サービスや Secrets 管理を追加検討。

## インフラ / CI-CD
- GitHub Actions: lint, test, Prisma migrate diff、自動デプロイ。
- Vercel Preview → main マージで Production。
- Neon ブランチ機能で Preview DB を用意。

## 懸念点
1. 金融 API 連携は無料枠では実運用が難しく、当面は CSV / 手入力で代替。
2. OCR/AI: 無料利用可能なサービス（例: Google Vision 無料枠、Azure Form Recognizer 試用枠）を比較。精度とコストのバランスが課題。
3. 法対応: インボイス制度や消費税改定への追随、税率変更時の挙動確認。
4. セキュリティと個人情報保護: 暗号化・アクセス制御・ログ保全の実装コスト。
5. 無料インフラの制限: Vercel / Neon の接続数、ストレージ容量、コールドスタート。

## 今後の検討メモ
- CSV インポート形式の標準化（銀行別テンプレート）。
- OCR サービス候補の比較表と PoC。
- 勘定科目マスタの初期値とユーザー編集仕様。
- 帳票生成（PDF）ライブラリ選定。
- 監査ログとロールベースアクセス制御の詳細設計。
