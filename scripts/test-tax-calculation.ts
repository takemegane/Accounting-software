/**
 * 消費税計算ロジックの手動テストスクリプト
 */

type LineInput = {
  accountId: string;
  debit: number;
  credit: number;
  taxCategoryId?: string | null;
};

// 現在のバグのある実装
function calculateTaxCurrentBuggy(taxInclusiveAmount: number, effectiveRate: number) {
  const taxAmount = Math.floor(taxInclusiveAmount * effectiveRate / (1 + effectiveRate));
  const taxExclusiveAmount = taxInclusiveAmount - taxAmount;
  return { taxExclusiveAmount, taxAmount };
}

// 修正後の正しい実装
function calculateTaxCorrected(taxInclusiveAmount: number, effectiveRate: number) {
  const taxExclusiveAmount = Math.round(taxInclusiveAmount / (1 + effectiveRate));
  const taxAmount = taxInclusiveAmount - taxExclusiveAmount;
  return { taxExclusiveAmount, taxAmount };
}

console.log("=== 消費税計算ロジックのテスト ===\n");

const testCases = [
  { amount: 11000, rate: 0.1, expected: { base: 10000, tax: 1000 } },
  { amount: 11001, rate: 0.1, expected: { base: 10001, tax: 1000 } },
  { amount: 5500, rate: 0.1, expected: { base: 5000, tax: 500 } },
  { amount: 3300, rate: 0.1, expected: { base: 3000, tax: 300 } },
  { amount: 1100, rate: 0.1, expected: { base: 1000, tax: 100 } },
  { amount: 1, rate: 0.1, expected: { base: 1, tax: 0 } },
  { amount: 10, rate: 0.1, expected: { base: 9, tax: 1 } },
  { amount: 108, rate: 0.08, expected: { base: 100, tax: 8 } },
  { amount: 109, rate: 0.08, expected: { base: 101, tax: 8 } },
];

let buggyFailures = 0;
let correctedFailures = 0;

testCases.forEach((testCase, index) => {
  const buggy = calculateTaxCurrentBuggy(testCase.amount, testCase.rate);
  const corrected = calculateTaxCorrected(testCase.amount, testCase.rate);

  const buggySum = buggy.taxExclusiveAmount + buggy.taxAmount;
  const correctedSum = corrected.taxExclusiveAmount + corrected.taxAmount;

  const buggyMatches = buggySum === testCase.amount;
  const correctedMatches = correctedSum === testCase.amount;

  console.log(`テストケース ${index + 1}: 税込${testCase.amount}円 (税率${testCase.rate * 100}%)`);
  console.log(`  現在の実装: 税抜${buggy.taxExclusiveAmount}円 + 税${buggy.taxAmount}円 = ${buggySum}円 ${buggyMatches ? '✓' : '✗ 貸借不一致!'}`);
  console.log(`  修正後実装: 税抜${corrected.taxExclusiveAmount}円 + 税${corrected.taxAmount}円 = ${correctedSum}円 ${correctedMatches ? '✓' : '✗'}`);

  if (!buggyMatches) buggyFailures++;
  if (!correctedMatches) correctedFailures++;

  console.log();
});

console.log("=== テスト結果サマリー ===");
console.log(`現在の実装: ${testCases.length - buggyFailures}/${testCases.length} 成功, ${buggyFailures} 失敗`);
console.log(`修正後実装: ${testCases.length - correctedFailures}/${testCases.length} 成功, ${correctedFailures} 失敗`);

if (buggyFailures > 0) {
  console.log("\n⚠️  現在の実装にはバグがあります！");
  console.log("一部のケースで貸借が一致しません。");
}

if (correctedFailures === 0) {
  console.log("\n✓ 修正後の実装は全てのテストケースで貸借が一致します。");
}

// 複合仕訳のテスト
console.log("\n=== 複合仕訳のテスト ===\n");

const complexTransaction = [
  { amount: 5500, rate: 0.1 },
  { amount: 3300, rate: 0.1 },
];

let buggyTotalBase = 0;
let buggyTotalTax = 0;
let correctedTotalBase = 0;
let correctedTotalTax = 0;
const totalInclusive = complexTransaction.reduce((sum, t) => sum + t.amount, 0);

console.log("取引: 5,500円 + 3,300円 = 8,800円\n");

complexTransaction.forEach((t, i) => {
  const buggy = calculateTaxCurrentBuggy(t.amount, t.rate);
  const corrected = calculateTaxCorrected(t.amount, t.rate);

  buggyTotalBase += buggy.taxExclusiveAmount;
  buggyTotalTax += buggy.taxAmount;
  correctedTotalBase += corrected.taxExclusiveAmount;
  correctedTotalTax += corrected.taxAmount;

  console.log(`行${i + 1}: 税込${t.amount}円`);
  console.log(`  現在: 税抜${buggy.taxExclusiveAmount}円 + 税${buggy.taxAmount}円`);
  console.log(`  修正: 税抜${corrected.taxExclusiveAmount}円 + 税${corrected.taxAmount}円`);
});

const buggyTotal = buggyTotalBase + buggyTotalTax;
const correctedTotal = correctedTotalBase + correctedTotalTax;

console.log(`\n現在の実装: 税抜${buggyTotalBase}円 + 税${buggyTotalTax}円 = ${buggyTotal}円 ${buggyTotal === totalInclusive ? '✓' : '✗ 貸借不一致!'}`);
console.log(`修正後実装: 税抜${correctedTotalBase}円 + 税${correctedTotalTax}円 = ${correctedTotal}円 ${correctedTotal === totalInclusive ? '✓' : '✗'}`);
