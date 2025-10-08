# PostgreSQL移行計画書

**作成日:** 2025-10-08
**対象:** Accounting software (会計ソフト)
**目的:** Vercelへのデプロイに向けたSQLite → PostgreSQL移行

---

## 📋 背景・経緯

### 現状
- **会計ソフト:** SQLite使用中（ローカル開発のみ）
- **月チャレ:** Neon PostgreSQL使用中（既にオンライン運用）
- **デプロイ環境:** 未デプロイ（ローカル開発のみ）

### きっかけ
1. オンライン化の予定が近い
2. Vercel + Redis + Neonでのデプロイを検討
3. **SQLiteはVercelのサーバーレス環境で動作しない**という問題が判明

### 検討した代替案
- **Vercel:** SQLite不可（サーバーレスのためファイルが保存できない）
- **Render:** 無料だが15分無操作でスリープ、DBは90日で削除
- **Railway:** SQLite可だが有料（月$5〜）
- **Oracle Cloud:** 無料だが設定が超複雑（上級者向け）

### 結論
**どのデプロイ方法でもPostgreSQL移行がほぼ必須**

---

## 🎯 移行の必要性

### 技術的理由
1. **Vercel（サーバーレス）でSQLiteは動作しない**
   - サーバーレスは一時的なコンテナで実行
   - ファイルシステムが永続化されない
   - SQLiteファイル（dev.db）が保存できない

2. **スケーラビリティの問題**
   - SQLiteは同時書き込みに弱い
   - 複数ユーザーでの利用に不向き
   - 会計ソフトは将来的に複数ユーザー利用の可能性

3. **環境統一のメリット**
   - 月チャレ：既にNeon PostgreSQL使用
   - 会計ソフト：SQLite
   - 同じデータベースに統一することで管理が楽

### ビジネス的理由
1. **今が移行の最適タイミング**
   - 現在はテストデータのみ
   - 本番ユーザーがいない
   - データ量が少ない

2. **後回しのリスク**
   - 本番運用後の移行は複雑
   - ユーザーデータの移行が必要
   - サービス停止時間が発生
   - バグ発生時の影響範囲が大きい

---

## ⚠️ 懸念事項・リスク

### 1. **データ型の違い**

**SQLite:**
- 緩い型システム
- 日付は文字列として保存
- NULLの扱いが柔軟

**PostgreSQL:**
- 厳密な型システム
- 専用の日付型（DATE, TIMESTAMP）
- NULL制約が厳格

**対策:**
- Prismaが自動的に型を変換してくれる
- ただし、念のため全機能のテスト必要

**影響度:** 低（Prismaが吸収）

---

### 2. **IDの生成方式**

**cuid()の挙動:**
- SQLiteとPostgreSQLで生成されるIDの形式が異なる可能性
- 既存のリレーションに影響する可能性

**対策:**
- 新規データベースなので問題なし
- 既存データ移行時のみ注意

**影響度:** 低（新規DBのため）

---

### 3. **トランザクション処理の違い**

**SQLite:**
- ファイルロックベース
- 比較的緩い

**PostgreSQL:**
- MVCCベース
- より厳密な整合性チェック

**対策:**
- Prismaのトランザクション機能を使っているので問題なし
- 既存コードの変更不要

**影響度:** 低

---

### 4. **既存データの移行**

**現在のデータ:**
```
prisma/dev.db (SQLite)
├─ Business
├─ Account
├─ TaxCategory
├─ JournalEntry
├─ JournalEntryLine
├─ Transaction
├─ UserProfile
├─ BusinessMembership
├─ AccountBalance
└─ ClosingPeriod
```

**移行方法:**
1. **テストデータのみの場合:**
   - データベースを作り直す（推奨）
   - シード機能で初期データ投入

2. **本番データがある場合:**
   - SQLダンプを使った移行が必要
   - 手順が複雑（未実装）

**対策:**
- 現在はテストデータのみなので作り直しでOK
- 本番データがある場合は別途移行スクリプトが必要

**影響度:** 低（テストデータのみ）

---

### 5. **環境変数の管理**

**必要な環境変数:**
```bash
# ローカル開発（.env.local）
DATABASE_URL="postgresql://user:pass@localhost:5432/dbname"

# Vercel本番環境
DATABASE_URL="postgresql://user:pass@ep-xxx.neon.tech/dbname?sslmode=require"
CLERK_SECRET_KEY="sk_xxx"
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY="pk_xxx"
```

**懸念:**
- 環境変数の設定ミスでデータベース接続失敗
- 本番と開発で異なるデータベースを使う必要

**対策:**
- `.env.example`に記載
- 設定手順をドキュメント化

**影響度:** 低（手順通りにやればOK）

---

### 6. **Clerkとの統合**

**現在の実装:**
- `lib/business-context.ts`でClerkユーザーIDを使用
- `UserProfile.clerkUserId`でユーザーを識別

**懸念:**
- Clerk未設定時の動作（デモモード）
- PostgreSQL移行後も同じように動くか？

**対策:**
- 既存のコードは変更不要
- `clerkUserId`の型は変わらない

**影響度:** なし

---

### 7. **Prismaマイグレーションの失敗リスク**

**想定されるエラー:**
1. データベース接続エラー
2. スキーマの競合
3. マイグレーション実行中のエラー

**対策:**
```bash
# バックアップ（念のため）
cp prisma/dev.db prisma/dev.db.backup.20251008

# マイグレーション前に確認
npx prisma migrate diff --from-schema-datamodel prisma/schema.prisma --to-schema-datasource prisma/schema.prisma

# 段階的実行
npx prisma migrate dev --create-only  # まず作成のみ
# SQLを確認してから
npx prisma migrate dev  # 実行
```

**影響度:** 中（手順を守れば回避可能）

---

### 8. **デプロイ後の動作確認**

**確認が必要な機能:**
- [ ] ログイン・ログアウト
- [ ] 事業の作成・切り替え
- [ ] 勘定科目の表示
- [ ] 仕訳の登録・編集・削除
- [ ] CSV取込
- [ ] 試算表の表示
- [ ] 損益計算書の表示
- [ ] 貸借対照表の表示
- [ ] 総勘定元帳の表示
- [ ] 仕訳帳の表示
- [ ] 締め処理
- [ ] PDF出力

**対策:**
- チェックリストを作成
- ステージング環境で先にテスト

**影響度:** 高（全機能のテストが必要）

---

## 🛠️ 移行手順

### ステップ1: ローカル環境の準備

#### 1.1 スキーマファイルの編集
```bash
# ファイル: prisma/schema.prisma
```

**変更内容:**
```prisma
datasource db {
  provider = "postgresql"  // "sqlite" から変更
  url      = env("DATABASE_URL")
}
```

**所要時間:** 1分

---

#### 1.2 Neonでデータベース作成

1. Neonにログイン（月チャレと同じアカウント）
2. 新しいプロジェクト作成
   - 名前: `accounting-software` または `会計ソフト`
   - リージョン: `Asia Pacific (Tokyo)` 推奨
3. 接続文字列をコピー
   ```
   postgresql://user:password@ep-xxx.neon.tech/dbname?sslmode=require
   ```

**所要時間:** 5分

---

#### 1.3 環境変数の設定

**ファイル: `.env.local`（新規作成）**
```bash
# Neon PostgreSQL
DATABASE_URL="postgresql://user:password@ep-xxx.neon.tech/dbname?sslmode=require"

# Clerk（既存の値をコピー）
CLERK_SECRET_KEY="sk_xxx"
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY="pk_xxx"
```

**所要時間:** 2分

---

#### 1.4 Prisma Clientの再生成

```bash
cd "Accounting software"
npx prisma generate
```

**所要時間:** 1分

---

#### 1.5 マイグレーションの作成と実行

```bash
# マイグレーション作成
npx prisma migrate dev --name init_postgresql

# 実行確認
# → データベースにテーブルが作成される
```

**所要時間:** 3分

---

#### 1.6 ローカルでの動作確認

```bash
npm run dev
```

**確認項目:**
- [ ] サーバーが起動するか
- [ ] ログインできるか
- [ ] 事業が作成できるか
- [ ] 勘定科目が表示されるか（シードデータ）
- [ ] 仕訳が登録できるか

**所要時間:** 10分

---

### ステップ2: Vercelへのデプロイ

#### 2.1 Vercelプロジェクト作成

1. Vercelにログイン
2. 「New Project」をクリック
3. GitHubリポジトリを接続
4. Root Directoryを指定（必要に応じて）

**所要時間:** 3分

---

#### 2.2 環境変数の設定

Vercelのプロジェクト設定で以下を追加：

```bash
DATABASE_URL=postgresql://user:password@ep-xxx.neon.tech/dbname?sslmode=require
CLERK_SECRET_KEY=sk_xxx
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_xxx
NODE_ENV=production
```

**所要時間:** 2分

---

#### 2.3 初回デプロイ

```bash
# ローカルからデプロイ
npx vercel --prod

# または、GitHubにpushして自動デプロイ
git push origin main
```

**所要時間:** 5分（ビルド時間含む）

---

#### 2.4 マイグレーション実行（本番DB）

```bash
# Vercelの環境変数を使ってマイグレーション
DATABASE_URL="postgresql://..." npx prisma migrate deploy
```

**注意:** 開発用マイグレーション（`migrate dev`）は使わない

**所要時間:** 2分

---

#### 2.5 本番環境での動作確認

デプロイされたURLにアクセスして全機能をテスト

**所要時間:** 20分

---

### 合計所要時間（目安）

- **ローカル環境準備:** 30分
- **Vercelデプロイ:** 30分
- **動作確認:** 30分
- **合計:** 約1.5〜2時間

---

## 📝 ロールバック手順（緊急時）

### 問題が発生した場合

#### 1. SQLiteに戻す

```bash
cd "Accounting software"

# schema.prismaを元に戻す
# datasource db { provider = "sqlite" }

# 環境変数を戻す
# DATABASE_URL="file:./prisma/dev.db"

# Prisma再生成
npx prisma generate

# マイグレーション（SQLite用）
npx prisma migrate dev

# 開発サーバー起動
npm run dev
```

#### 2. Vercelのデプロイを一時停止

- Vercelのダッシュボードから該当デプロイを無効化
- または、以前のデプロイに戻す

---

## ✅ チェックリスト

### 移行前の準備
- [ ] 現在のSQLiteデータのバックアップ
- [ ] Neonアカウントの作成・ログイン確認
- [ ] Vercelアカウントの作成・ログイン確認
- [ ] Clerkの設定情報確認

### ローカル移行
- [ ] `schema.prisma`の編集
- [ ] Neonデータベース作成
- [ ] `.env.local`の設定
- [ ] `npx prisma generate`実行
- [ ] `npx prisma migrate dev`実行
- [ ] ローカルでの動作確認

### Vercelデプロイ
- [ ] Vercelプロジェクト作成
- [ ] 環境変数設定
- [ ] 初回デプロイ
- [ ] `npx prisma migrate deploy`実行
- [ ] 本番環境での動作確認

### 全機能テスト
- [ ] ログイン・ログアウト
- [ ] 事業作成・切り替え
- [ ] 勘定科目表示
- [ ] 仕訳登録・編集・削除
- [ ] CSV取込
- [ ] 試算表
- [ ] 損益計算書
- [ ] 貸借対照表
- [ ] 総勘定元帳
- [ ] 仕訳帳
- [ ] 締め処理
- [ ] PDF出力

---

## 🔗 参考リンク

### 公式ドキュメント
- [Prisma - PostgreSQL](https://www.prisma.io/docs/concepts/database-connectors/postgresql)
- [Neon - Quick Start](https://neon.tech/docs/get-started-with-neon/quick-start)
- [Vercel - Environment Variables](https://vercel.com/docs/concepts/projects/environment-variables)
- [Next.js - Deployment](https://nextjs.org/docs/deployment)

### プロジェクト内ドキュメント
- `README.md` - プロジェクト概要
- `docs/database-safety-guidelines.md` - データベース操作の安全ガイドライン
- `docs/operations-manual.md` - 運用マニュアル
- `CHANGELOG.md` - 変更履歴

---

## 📞 サポート・質問

### 移行中に問題が発生したら

1. **エラーメッセージを確認**
   - データベース接続エラー → 環境変数を確認
   - マイグレーションエラー → schema.prismaを確認

2. **ロールバック手順を実行**
   - 上記の「ロールバック手順」参照

3. **ドキュメントを確認**
   - 公式ドキュメント
   - プロジェクト内ドキュメント

---

## 📈 移行後の運用

### データベース管理

**Neon管理画面でできること:**
- クエリの実行
- テーブルの確認
- データのエクスポート
- パフォーマンスモニタリング

**定期的な確認:**
- [ ] データベースサイズ（無料枠：0.5GB）
- [ ] コネクション数
- [ ] クエリパフォーマンス

### バックアップ戦略

**Neonの自動バックアップ:**
- 無料プランでも7日間のバックアップあり
- ポイントインタイムリカバリー（有料プランのみ）

**手動バックアップ（推奨）:**
```bash
# 定期的にデータをエクスポート
npx prisma db pull
```

---

## 🎯 次のステップ

### 移行完了後
1. **月チャレとの統合検討**
   - 同じNeonアカウントで管理
   - 必要に応じてデータベースを統合

2. **Redisの追加検討**
   - セッション管理
   - キャッシュ
   - 必要になったタイミングで追加

3. **モニタリング設定**
   - Vercel Analytics
   - Sentryでエラートラッキング

---

**最終更新:** 2025-10-08
**ステータス:** 計画中（未実施）
**次のアクション:** ユーザー承認待ち
