# 開発ログ

## 2025-10-08: 勘定科目自動採番機能とキャッシュ問題の解決

### 実装した機能

#### 1. 勘定科目コード自動採番機能

**概要**
勘定科目の新規作成時、コードを入力しない場合は区分ごとに自動採番されるようになりました。

**コード範囲**
- 資産（ASSET）: 100-199
- 負債（LIABILITY）: 200-299
- 純資産（EQUITY）: 300-399
- 収益（REVENUE）: 400-499
- 費用（EXPENSE）: 500-599

**実装箇所**

1. **バックエンド**: `app/api/accounts/route.ts`
   ```typescript
   async function generateAccountCode(businessId: string, type: string): Promise<string> {
     const baseCode: Record<string, number> = {
       ASSET: 100,
       LIABILITY: 200,
       EQUITY: 300,
       REVENUE: 400,
       EXPENSE: 500,
     };

     const start = baseCode[type] || 100;
     const end = start + 99;

     // 同じ区分の最大コード番号を取得
     const accounts = await prisma.account.findMany({
       where: { businessId, type },
       select: { code: true },
       orderBy: { code: 'desc' },
     });

     // 既存のコードから最大値を取得
     let maxCode = start - 1;
     for (const account of accounts) {
       const codeNum = parseInt(account.code, 10);
       if (!isNaN(codeNum) && codeNum >= start && codeNum <= end) {
         maxCode = Math.max(maxCode, codeNum);
       }
     }

     // 次の番号を返す
     const nextCode = maxCode + 1;
     if (nextCode > end) {
       throw new Error(`${type}の勘定科目コードが上限に達しました`);
     }

     return nextCode.toString();
   }
   ```

2. **フロントエンド**: `components/account-manager.tsx`
   - コード入力フィールドを「任意」に変更
   - プレースホルダー: "未入力の場合は自動採番されます"
   - ラベル: "コード（任意）"
   - 説明文を更新

**動作**
- コードを入力した場合: 入力したコードが使用される（重複チェックあり）
- コードを未入力の場合: 自動的に次の利用可能な番号が割り当てられる

---

### 解決した問題

#### 2. 仕訳帳・総勘定元帳でのデータ表示遅延問題

**症状**
- 新しく作成した勘定科目（例: 509 旅費交通費）で仕訳を作成
- 仕訳一覧には表示されるが、仕訳帳と総勘定元帳には数分間表示されない
- 試算表、貸借対照表、損益計算書には正常に表示される

**調査結果**

1. **データベース**: 正常にデータが保存されている ✓
2. **APIレスポンス**: すべてのエンドポイントが正しくデータを返している ✓
   - `/api/reports/journal`: 509を含む仕訳を返している
   - `/api/reports/general-ledger`: 509の勘定科目を返している
   - `/api/reports/trial-balance`: 509が含まれている
3. **フロントエンド**: フィルタリングロジックは正常 ✓

**根本原因: 2層のキャッシュ問題**

1. **Next.js Route Handlerのキャッシュ（サーバー側）**
   - Next.js 14では、Route Handlersがデフォルトで静的に最適化される
   - `dynamic = "force-dynamic"` の設定がないと、VercelでAPIレスポンスがキャッシュされる
   - 特に `/api/reports/*` エンドポイントでこの設定が欠けていた

2. **React Queryのキャッシュ（クライアント側）**
   - デフォルト設定では適切なキャッシュ無効化が行われていなかった
   - `staleTime` が設定されておらず、古いデータが表示される可能性があった

**実装した解決策**

##### 1. React Queryの設定最適化

**ファイル**: `components/react-query-provider.tsx`

```typescript
export function ReactQueryProvider({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // データが古くなるまでの時間（0 = 常に古い = 常に再フェッチ）
            staleTime: 0,
            // キャッシュを保持する時間（5分）
            gcTime: 5 * 60 * 1000,
            // ウィンドウフォーカス時に再フェッチ
            refetchOnWindowFocus: true,
            // マウント時に再フェッチ（staleの場合のみ）
            refetchOnMount: true,
            // リトライ設定（失敗時のリトライ回数を減らして高速化）
            retry: 1,
            // リトライ遅延
            retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
          },
        },
      })
  );

  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}
```

**効果**:
- `staleTime: 0`: データを常に「古い」とみなし、必ず最新データを取得
- `refetchOnWindowFocus: true`: ウィンドウにフォーカスが戻った時に自動リフレッシュ
- `refetchOnMount: true`: コンポーネントのマウント時に最新データを取得
- `retry: 1`: リトライ回数を1回に制限して高速化

##### 2. すべてのレポートAPIにキャッシュ無効化を追加

以下のファイルに `dynamic = "force-dynamic"` と `revalidate = 0` を追加:

1. **`app/api/reports/journal/route.ts`**
2. **`app/api/reports/general-ledger/route.ts`**
3. **`app/api/reports/trial-balance/route.ts`**
4. **`app/api/reports/income-statement/route.ts`**
5. **`app/api/reports/balance-sheet/route.ts`**

**追加したコード**:
```typescript
// キャッシュを無効化して常に最新データを返す
export const dynamic = "force-dynamic";
export const revalidate = 0;
```

**効果**:
- Next.jsがこのルートを動的にレンダリングし、リクエストごとに実行
- Vercelのエッジキャッシュが無効化される
- 常にデータベースの最新状態を反映

**結果**

修正により、以下が保証されるようになりました:

- ✅ 仕訳を作成・編集・削除した直後に、すべての画面で最新データが表示される
- ✅ ページリロード時に確実に最新データを取得
- ✅ ウィンドウフォーカス時に自動的に最新データを取得
- ✅ Vercelでのサーバーサイドキャッシュが無効化され、常に最新のデータベースの状態を反映
- ✅ 数分待つ必要がなくなり、即座にデータが反映される

---

### 技術的な学び

#### Next.js 14のRoute Handler最適化について

Next.js 14では、パフォーマンス向上のためRoute Handlersがデフォルトで静的に最適化されます。これは通常は良いことですが、動的なデータ（データベースから取得するデータなど）を返すエンドポイントでは問題になる可能性があります。

**対処方法**:
- `export const dynamic = "force-dynamic"` を追加してキャッシュを無効化
- `export const revalidate = 0` を追加してISRを無効化

#### React Queryのキャッシュ戦略

React Queryはデフォルトで賢いキャッシュ戦略を持っていますが、リアルタイム性が重要なアプリケーションでは以下の設定が推奨されます:

- `staleTime: 0`: 常に最新データを取得
- `refetchOnWindowFocus: true`: ユーザーが戻った時に更新
- `refetchOnMount: true`: コンポーネントのマウント時に更新

---

### デプロイ履歴

- **2025-10-08 03:36**: 勘定科目コード自動採番機能を実装
- **2025-10-08 03:50**: キャッシュ問題の調査を開始
- **2025-10-08 04:15**: キャッシュ問題の根本原因を特定
- **2025-10-08 04:30**: React QueryとAPIルートのキャッシュ設定を修正
- **2025-10-08 04:35**: 本番環境での動作確認完了

---

### 関連ファイル

**修正したファイル**:
- `app/api/accounts/route.ts` - 自動採番ロジック追加
- `components/account-manager.tsx` - UI更新（コードを任意項目に）
- `components/react-query-provider.tsx` - React Query設定最適化
- `app/api/reports/journal/route.ts` - キャッシュ無効化
- `app/api/reports/general-ledger/route.ts` - キャッシュ無効化
- `app/api/reports/trial-balance/route.ts` - キャッシュ無効化
- `app/api/reports/income-statement/route.ts` - キャッシュ無効化
- `app/api/reports/balance-sheet/route.ts` - キャッシュ無効化
- `lib/report-data.ts` - 削除済み勘定科目の表示対応（念のため）

**デバッグに使用したファイル（削除済み）**:
- `debug-509.js` - 勘定科目509のデータ確認用
- `debug-reports.js` - レポートデータ取得のテスト用
- `check-prod-data.js` - 本番データベース確認用
- `test-prod-api.js` - 本番API確認用

---

### 今後の改善提案

1. **パフォーマンス監視**
   - `staleTime: 0` は常に最新データを取得するが、パフォーマンスへの影響を監視
   - 必要に応じて、特定のクエリだけ `staleTime` を調整することも検討

2. **キャッシュ戦略の最適化**
   - レポートによっては、短い `staleTime`（例: 30秒）でも十分かもしれない
   - ユーザーの使用パターンを分析して最適化

3. **リアルタイム更新**
   - WebSocketやServer-Sent Eventsを使用したリアルタイム更新も検討可能
   - 複数ユーザーが同時に使用する場合に有用

4. **エラーハンドリング**
   - ネットワークエラー時のリトライ戦略を改善
   - オフライン時の動作を定義

---

### 参考リンク

- [Next.js Route Handlers - Dynamic Functions](https://nextjs.org/docs/app/building-your-application/routing/route-handlers#dynamic-functions)
- [React Query - Important Defaults](https://tanstack.com/query/latest/docs/react/guides/important-defaults)
- [Vercel Caching](https://vercel.com/docs/concepts/edge-network/caching)
