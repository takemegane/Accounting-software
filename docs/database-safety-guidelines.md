# データベース安全管理ガイドライン

## ⚠️ 重要: データ保護の原則

このドキュメントは、データベース操作時の重大なデータ損失を防ぐための必須ガイドラインです。

---

## 🚨 絶対に実行してはいけないコマンド（ユーザー指示なし）

以下のコマンドは**既存データを完全に削除**します。ユーザーの明示的な指示がない限り、**絶対に実行しないでください**。

### 1. `npx prisma migrate reset`
```bash
# ❌ 危険: すべてのデータを削除
npx prisma migrate reset
npx prisma migrate reset --force
```

**影響:**
- データベース内のすべてのテーブルとデータを削除
- 事業名、仕訳データ、マスターデータなどすべてが失われる
- 復旧は不可能（バックアップがない場合）

### 2. データベースファイルの削除
```bash
# ❌ 危険: データベースファイルを削除
rm prisma/dev.db
rm -rf prisma/*.db
```

### 3. データベースの再作成
```bash
# ❌ 危険: データベースを再作成
npx prisma db push --force-reset
```

---

## ✅ 安全なトラブルシューティング手順

### 問題: テーブルが存在しない / マイグレーションエラー

**手順:**

1. **まず現状を確認**
   ```bash
   # データベースファイルの場所を確認
   ls -la prisma/*.db
   find . -name "*.db" -type f | grep -v node_modules

   # データベースの内容を確認
   sqlite3 prisma/dev.db ".tables"
   sqlite3 prisma/dev.db "SELECT COUNT(*) FROM Business;"
   ```

2. **既存データが存在する場合は必ずバックアップ**
   ```bash
   # バックアップを作成
   cp prisma/dev.db prisma/dev.db.backup.$(date +%Y%m%d_%H%M%S)
   ```

3. **問題の特定**
   - データベースファイルのパス問題
   - マイグレーションの未適用
   - テーブル構造の不整合

4. **最小限の修正**
   ```bash
   # パス問題の場合: ファイルを移動
   mv prisma/prisma/dev.db prisma/dev.db

   # マイグレーション未適用の場合
   npx prisma migrate deploy  # データを保持したままマイグレーション

   # スキーマ同期（既存データを保持）
   npx prisma db push  # --force-reset は使わない
   ```

---

## 📋 データ損失が発生する前のチェックリスト

データベース操作を実行する前に、以下を必ず確認してください：

- [ ] ユーザーから明示的な削除・リセット指示があるか？
- [ ] 既存データの有無を確認したか？
- [ ] バックアップを作成したか？
- [ ] より安全な代替方法はないか？
- [ ] ユーザーにデータ損失のリスクを説明したか？

---

## 🔄 安全なマイグレーション手順

### 新しいマイグレーションを適用する場合

```bash
# 1. 現在のデータベース状態を確認
npx prisma migrate status

# 2. バックアップ作成
cp prisma/dev.db prisma/dev.db.backup.$(date +%Y%m%d_%H%M%S)

# 3. マイグレーション適用（データ保持）
npx prisma migrate deploy

# または開発環境で
npx prisma migrate dev
```

### スキーマ変更を反映する場合

```bash
# 1. バックアップ作成
cp prisma/dev.db prisma/dev.db.backup.$(date +%Y%m%d_%H%M%S)

# 2. スキーマをプッシュ（データ保持）
npx prisma db push

# ❌ 絶対に --force-reset を使わない
```

---

## 🛡️ バックアップとリストア

### 定期バックアップ

```bash
# 日次バックアップスクリプト例
#!/bin/bash
BACKUP_DIR="backups"
mkdir -p $BACKUP_DIR
cp prisma/dev.db "$BACKUP_DIR/dev.db.$(date +%Y%m%d_%H%M%S)"

# 古いバックアップを削除（30日以上前）
find $BACKUP_DIR -name "*.db.*" -mtime +30 -delete
```

### リストア

```bash
# バックアップから復元
cp prisma/dev.db.backup.20251007_172000 prisma/dev.db
```

---

## 📝 インシデント発生時の対応

データ損失が発生した場合：

1. **即座にユーザーに報告**
   - 何が失われたか明確に伝える
   - 原因を説明する
   - 謝罪する

2. **バックアップの確認**
   ```bash
   # バックアップファイルを探す
   find . -name "*.db.backup*" -o -name "*.db.*"
   ```

3. **可能であれば復旧**
   - 最新のバックアップから復元
   - Git履歴から復元できるか確認

4. **再発防止**
   - 何が原因だったか記録
   - プロセスを改善

---

## 🎯 重要なルール まとめ

1. **ユーザーの明示的な指示なしに破壊的コマンドを実行しない**
2. **操作前に必ずバックアップを作成する**
3. **最小限の変更で問題を解決する**
4. **データ損失のリスクがある場合は必ずユーザーに確認する**
5. **不明な場合はユーザーに質問する**

---

## 🔗 関連ドキュメント

- [operations-manual.md](./operations-manual.md) - 運用マニュアル
- [troubleshooting.md](./troubleshooting.md) - トラブルシューティング
- [data-model.md](./data-model.md) - データモデル仕様

---

**最終更新**: 2025-10-07
**重要度**: 🔴 CRITICAL
