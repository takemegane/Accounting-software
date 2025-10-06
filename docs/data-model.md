# データモデル案

## 概要
- 個人事業主単位で業務管理。
- 一部ユーザーは複数事業所を持つ可能性を考慮。
- 消費税・インボイス要件を考慮した税区分管理。
- 仕訳と取引（銀行・クレカ明細）を分離し、照合・重複検知を実現。

## 主なエンティティ

### users
- `id (uuid)`
- `clerk_user_id` : Clerk 連携用。
- `email`
- `name`
- `created_at`, `updated_at`, `last_login_at`
- `timezone`

### businesses
- `id (uuid)`
- `user_id` : user 所有者。
- `business_name`
- `business_type` : 個人/法人（将来拡張）。
- `tax_pref` : `tax_inclusive` or `tax_exclusive`。
- `invoice_registration_number` : インボイス番号。
- `fiscal_year_start_month`
- `address`
- `created_at`, `updated_at`

### accounts (勘定科目)
- `id (uuid)`
- `business_id`
- `code`: 勘定科目コード。
- `name`
- `account_type` : 資産/負債/純資産/収益/費用。
- `sub_type` : 詳細種別（例: 現金、売掛金）。
- `is_active`
- `tax_category_id` : 消費税区分。
- `created_at`, `updated_at`

### journal_entries (仕訳ヘッダ)
- `id (uuid)`
- `business_id`
- `entry_date`
- `description`
- `source_type` : `manual` / `imported` / `bank_feed` / `invoice` 等。
- `source_id`
- `status` : draft / posted。
- `created_at`, `updated_at`

### journal_entry_lines (仕訳行)
- `id (uuid)`
- `journal_entry_id`
- `line_number`
- `account_id`
- `debit_amount`
- `credit_amount`
- `tax_rate_id` (optional)
- `memo`
- `created_at`, `updated_at`

### transactions (銀行・クレカ取引明細)
- `id (uuid)`
- `business_id`
- `source` : `csv` / `bank_api` / `manual`
- `source_reference` : 明細ID。
- `transaction_date`
- `amount`
- `currency`
- `description`
- `counterparty`
- `status` : `unmatched` / `matched` / `dismissed`
- `matched_journal_entry_id`
- `created_at`, `updated_at`

### receipts (領収書メタ)
- `id (uuid)`
- `business_id`
- `upload_user_id`
- `file_key` : ストレージキー。
- `original_filename`
- `mime_type`
- `upload_source` : web / mobile / email。
- `ocr_provider`
- `ocr_status`
- `ocr_payload` : JSON（構造化情報）。
- `linked_journal_entry_id`
- `created_at`, `updated_at`

### invoices
- `id (uuid)`
- `business_id`
- `invoice_number`
- `issue_date`
- `due_date`
- `customer_id`
- `total_amount`
- `tax_amount`
- `status` : draft / sent / paid / void。
- `created_at`, `updated_at`

### invoice_lines
- `id (uuid)`
- `invoice_id`
- `description`
- `quantity`
- `unit_price`
- `tax_rate_id`
- `account_id` : 売上科目等。

### customers / vendors
- `id (uuid)`
- `business_id`
- `name`
- `type` : customer or vendor。
- `invoice_registration_number`
- `email`, `phone`
- `address`
- `notes`

### tax_rates
- `id (uuid)`
- `business_id (nullable)` : 共通マスタ or 事業専用。
- `code` : `standard`, `reduced`, `exempt` 等。
- `name`
- `rate` : 0.10, 0.08 等。
- `effective_from`, `effective_to`
- `created_at`, `updated_at`

### tax_categories
- `id (uuid)`
- `code`
- `name`
- `description`
- `tax_type` : 課税/非課税/免税 等。
- `default_tax_rate_id`

### attachments
- `id (uuid)`
- `business_id`
- `file_key`
- `file_type`
- `linked_entity_type`
- `linked_entity_id`
- `created_at`

### audit_logs
- `id (uuid)`
- `business_id`
- `user_id`
- `action`
- `entity_type`
- `entity_id`
- `payload`
- `created_at`

## リレーション概要
- `users` 1 - n `businesses`
- `businesses` 1 - n `accounts`, `journal_entries`, `transactions`, `receipts`, `invoices`
- `journal_entries` 1 - n `journal_entry_lines`
- `transactions` - `journal_entries`: 取引照合のため 1 - 1 or 1 - n
- `receipts` - `journal_entries`: 1 - 1 or 1 - n
- `invoices` 1 - n `invoice_lines`; `invoices` と `journal_entries` は売掛計上/入金仕訳で連携。
- `tax_rates`, `tax_categories` は `accounts`, `journal_entry_lines`, `invoice_lines` から参照。

## ビュー / サマリーテーブル案
- `trial_balance_view`: 期間別勘定科目別の借方/貸方集計。
- `cashflow_summary`: 入出金ベースの集計。
- `tax_summary`: 税区分別の課税売上・仕入計。

## 拡張検討
- `bank_connections`: OAuth 認証情報保存用（API連携を正式対応する場合）。
- `scheduled_tasks`: Cron キューの履歴。
- `notifications`: アラート配信。

## 注意点
- Neon の JSONB を活用して OCR 結果や柔軟なメタデータを保持。
- 将来的なマルチテナント対応のため、`business_id` を必須にし tenant 隔離を強化。
- 税率変更の履歴管理により、過去データの再計算時に整合性を維持。
