# 会計機能ロードマップ（優先4項目）

最終更新: 2025-10-06

## 1. 決算締め・期間ロック
### 目的
- 過去仕訳の恣意的な改変を防ぎ、決算確定後の帳簿整合性を保証する。
- 月次・年次の締め状態と再オープン履歴を管理する。

### 要件
- 期間定義: 月次締め、年次締めの2階層をサポート。
- 状態管理: `open` / `locked` / `pending_close` のようなステータスを持つ。
- 権限: 現状ロールが Owner のみのため、締め操作も Owner 限定にする。権限拡張時に承認フローを追加可能に。
- 履歴: 締め日、実施ユーザー、再オープン理由を監査ログに記録。
- バリデーション: ロック期間内の仕訳/取引編集・削除を禁止。例外は特別権限のみ。

### データモデル案
- 新モデル `ClosingPeriod` (`id`, `businessId`, `periodType`, `startDate`, `endDate`, `status`, `closedAt`, `closedByUserId`, `reopenedAt`, `reopenedByUserId`, `notes`).
- `JournalEntry` に `lockedAt`, `lockedBy` を追加し、ロック状態を仕訳側でも確認可能にする。
- 監査ログモデルが未実装のため、後続で `AuditLog` を導入して操作履歴を保存。

### API / UI 変更
- `app/api/business/closing-periods` を新設し、締め/再オープンを POST/PATCH で管理。
- 設定画面 (`app/settings`) に締め操作モーダルと履歴表示を追加。
- 一括ロック処理時はトランザクション内で `JournalEntry` ステータスを更新。

### 未決事項
- 再オープン時の再集計: 残高リセット or 差分のみ？
- 仕訳入力画面でのロック表示方法。ステータスバッジや警告の UX を決める。

## 2. 消費税・申告フロー強化
### 目的
- 消費税課税事業者が月次/四半期/年次の申告資料を出力できるようにする。
- インボイス制度に準拠した税区分管理と納付額計算を行う。

### 要件
- 期間集計: 課税区分別の売上/仕入、みなし仕入控除、課税区分ごとの消費税額を算出。
- 納付額計算: 簡易課税/本則課税の切替（設定で選択）。
- 申告書テンプレート: CSV/PDF 出力（国税庁フォーマットに合わせる）。
- 例外処理: 課税売上 5,000 万円超の届出、みなし仕入率の管理。
- 税率履歴: `TaxCategory` に有効期間を追加し、税率変更時に履歴を保持。

### データモデル案
- `TaxCategory` に `effectiveFrom`, `effectiveTo`, `taxType` を追加。
- 新モデル `TaxReturn` (`id`, `businessId`, `periodStart`, `periodEnd`, `method`, `status`, `submittedAt`, `payload` JSON)。
- `Transaction` / `JournalEntryLine` にインボイス番号、仕入税額控除対象フラグを追加。

### API / UI 変更
- `app/api/reports/tax-summary` を追加し、期間・課税方式で集計結果を返す。
- レポート画面に消費税サマリーと納付額確認モーダルを追加。
- 申告書 PDF/CSV ダウンロード API を `app/api/reports/tax-return` として実装。

### 未決事項
- インボイス番号登録 UI をどこに置くか（取引入力 vs 仕訳行）。
- 申告書フォーマットの最新仕様確認とテストデータ準備。

## 3. 売掛・買掛（債権債務）ワークフロー
### 目的
- 請求/支払の発生主義処理と入金管理を可能にする。
- 未収入金・未払金を自動計上し、消込作業を効率化する。

### 要件
- 請求書発行とステータス管理（draft/issued/paid/overdue）。
- 入金・支払い記録の紐付け、部分入金/支払にも対応。
- 得意先/仕入先マスタを管理し、残高一覧を表示。
- リマインド通知（メール or ダッシュボード）で滞留債権を把握。

### データモデル案
- 新モデル `Contact` (`id`, `businessId`, `type`, `name`, `invoiceRegistrationNumber`, `email`, `phone`, `address`, `notes`).
- `Invoice` / `InvoiceLine` モデルを追加し、売掛を管理。
- `Bill` / `BillLine` モデルで買掛を管理。
- `Payment` モデルで入金/支払を記録し、`Invoice` / `Bill` と多対多（部分消込対応）。
- `JournalEntry` に `sourceType` / `sourceId` を追加し、請求・支払とリンク。

### API / UI 変更
- `app/api/contacts`, `app/api/invoices`, `app/api/bills`, `app/api/payments` を実装。
- 取引一覧に請求書/支払依頼のフィルタとステータス表示を追加。
- ダッシュボードに滞留債権・債務カードを追加。

### 未決事項
- 消費税計算との整合（課税方式別の計算順序）。
- 請求書フォーマットと送付方法（PDF メール送信など）。

## 4. 銀行明細照合と残高調整
### 目的
- 取り込んだ銀行取引を仕訳と自動マッチングし、残高差異を可視化する。
- 銀行残高と帳簿残高のズレを早期に検知し修正する。

### 要件
- 口座マスタ: 口座ごとの期首残高、現在残高を保持。
- 自動マッチング: 日付±n日・金額一致・キーワード一致で候補を提示。
- 照合作業画面: 残高調整ステップ（銀行側差異/帳簿側差異の仕訳追加）。
- 重複取込の検知と解消ワークフロー。

### データモデル案
- 新モデル `BankAccount` (`id`, `businessId`, `name`, `number`, `institution`, `openingBalance`, `currentBalance`, `currency`).
- `Transaction` に `bankAccountId`, `matchedJournalEntryId`, `matchConfidence`, `reviewStatus` を追加。
- `BankReconciliation` (`id`, `bankAccountId`, `statementDate`, `statementBalance`, `status`, `notes`) を追加し、調整履歴を管理。

### API / UI 変更
- `app/api/bank-accounts`, `app/api/bank-reconciliation` を新設。
- 取引画面に自動マッチング候補 UI と確認フローを追加。
- 設定画面で口座情報と残高初期化を行う。

### 未決事項
- 自動マッチングアルゴリズム（閾値、優先順位）の詳細。
- 銀行 API 連携との整合（将来的に Moneytree 等を使うか）。

---
各項目の仕様が確定したら、個別のチケット化とマイグレーション設計を進めてください。
