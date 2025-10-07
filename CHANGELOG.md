# 変更履歴

## 2025-10-07 - 消費税計算ロジックの修正とバグフィックス

### 🔴 重大なバグ修正

#### 1. 消費税計算ロジックの不正確な内訳計算
**ファイル:** `lib/tax-helpers.ts:165, 180`

**問題:**
税抜経理モードで税込金額から消費税を逆算する際、税抜金額と消費税の内訳が不正確でした。

**修正前:**
```typescript
const taxAmount = Math.floor(taxInclusiveAmount * effectiveRate / (1 + effectiveRate));
const taxExclusiveAmount = taxInclusiveAmount - taxAmount;
```

**修正後:**
```typescript
const taxExclusiveAmount = Math.round(taxInclusiveAmount / (1 + effectiveRate));
const taxAmount = taxInclusiveAmount - taxExclusiveAmount;
```

**影響:**
- 税込11,000円 → 修正前: 税抜10,001円 + 税999円 → 修正後: 税抜10,000円 + 税1,000円 ✓
- 税込5,500円 → 修正前: 税抜5,001円 + 税499円 → 修正後: 税抜5,000円 + 税500円 ✓
- 税込1,100,000円 → 修正前: 税抜1,000,001円 + 税99,999円 → 修正後: 税抜1,000,000円 + 税100,000円 ✓

### 🔧 その他の修正

#### 2. Account API の型エラー修正
**ファイル:** `app/api/accounts/[id]/route.ts`

#### 3. TypeScript設定の改善
**ファイル:** `tsconfig.json` - scriptsフォルダを除外

#### 4. データベースのリセット
修正前のバグのあるロジックで作成された不整合データを削除

#### 5. シード機能の追加
**ファイル:** `prisma/seed.ts` - 税区分の初期データ作成

### ✅ 検証結果
- ビルド成功
- 全テスト合格
- 開発サーバー正常動作

**作業実施日:** 2025年10月7日
