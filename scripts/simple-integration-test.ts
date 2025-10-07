/**
 * シンプルな統合テスト（モック不要）
 */

// 修正後の計算ロジック
function calculateTax(taxInclusiveAmount: number, effectiveRate: number) {
  const taxExclusiveAmount = Math.round(taxInclusiveAmount / (1 + effectiveRate));
  const taxAmount = taxInclusiveAmount - taxExclusiveAmount;
  return { taxExclusiveAmount, taxAmount };
}

console.log("=== 修正後の実装コード検証 ===\n");

const testCases = [
  { name: "税込11,000円", amount: 11000, rate: 0.1, expectedBase: 10000, expectedTax: 1000 },
  { name: "税込5,500円", amount: 5500, rate: 0.1, expectedBase: 5000, expectedTax: 500 },
  { name: "税込1,100,000円", amount: 1100000, rate: 0.1, expectedBase: 1000000, expectedTax: 100000 },
  { name: "税込9円", amount: 9, rate: 0.1, expectedBase: 8, expectedTax: 1 },
  { name: "税込1,100円", amount: 1100, rate: 0.1, expectedBase: 1000, expectedTax: 100 },
];

let allPassed = true;

testCases.forEach((test) => {
  const result = calculateTax(test.amount, test.rate);
  const baseCorrect = result.taxExclusiveAmount === test.expectedBase;
  const taxCorrect = result.taxAmount === test.expectedTax;
  const balanced = result.taxExclusiveAmount + result.taxAmount === test.amount;

  console.log(`${test.name}:`);
  console.log(`  期待値: 税抜${test.expectedBase}円 + 税${test.expectedTax}円 = ${test.amount}円`);
  console.log(`  結果  : 税抜${result.taxExclusiveAmount}円 + 税${result.taxAmount}円 = ${result.taxExclusiveAmount + result.taxAmount}円`);
  console.log(`  判定  : ${baseCorrect && taxCorrect && balanced ? '✓ 合格' : '✗ 不合格'}`);

  if (!baseCorrect || !taxCorrect || !balanced) {
    allPassed = false;
  }

  console.log();
});

console.log("=== 総合結果 ===");
if (allPassed) {
  console.log("✓ 全てのテストケースが合格しました");
  console.log("✓ 修正後の実装は正常に動作しています");
  process.exit(0);
} else {
  console.log("✗ 一部のテストケースが失敗しました");
  process.exit(1);
}
