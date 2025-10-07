/**
 * エッジケースのテスト
 */

function calculateTaxCurrentBuggy(taxInclusiveAmount: number, effectiveRate: number) {
  const taxAmount = Math.floor(taxInclusiveAmount * effectiveRate / (1 + effectiveRate));
  const taxExclusiveAmount = taxInclusiveAmount - taxAmount;
  return { taxExclusiveAmount, taxAmount };
}

function calculateTaxCorrected(taxInclusiveAmount: number, effectiveRate: number) {
  const taxExclusiveAmount = Math.round(taxInclusiveAmount / (1 + effectiveRate));
  const taxAmount = taxInclusiveAmount - taxExclusiveAmount;
  return { taxExclusiveAmount, taxAmount };
}

console.log("=== エッジケースのテスト ===\n");

const edgeCases = [
  { name: "非常に小さい金額", amount: 1, rate: 0.1 },
  { name: "10円未満", amount: 9, rate: 0.1 },
  { name: "ちょうど割り切れる", amount: 11000, rate: 0.1 },
  { name: "1円の端数", amount: 11001, rate: 0.1 },
  { name: "大きな金額", amount: 1100000, rate: 0.1 },
  { name: "旧税率8%", amount: 10800, rate: 0.08 },
  { name: "旧税率5%", amount: 10500, rate: 0.05 },
  { name: "軽減税率8%", amount: 1080, rate: 0.08 },
];

console.log("問題点: 税抜金額と消費税の内訳が不正確\n");

let issuesFound = 0;

edgeCases.forEach((testCase) => {
  const buggy = calculateTaxCurrentBuggy(testCase.amount, testCase.rate);
  const corrected = calculateTaxCorrected(testCase.amount, testCase.rate);

  // 正しい税抜金額を計算（四捨五入）
  const expectedBase = Math.round(testCase.amount / (1 + testCase.rate));
  const expectedTax = testCase.amount - expectedBase;

  const baseMatches = buggy.taxExclusiveAmount === expectedBase;
  const taxMatches = buggy.taxAmount === expectedTax;

  console.log(`${testCase.name}: 税込${testCase.amount}円 (税率${testCase.rate * 100}%)`);
  console.log(`  期待値: 税抜${expectedBase}円 + 税${expectedTax}円`);
  console.log(`  現在  : 税抜${buggy.taxExclusiveAmount}円 + 税${buggy.taxAmount}円 ${baseMatches && taxMatches ? '✓' : '✗ 内訳が不正確'}`);
  console.log(`  修正後: 税抜${corrected.taxExclusiveAmount}円 + 税${corrected.taxAmount}円 ${corrected.taxExclusiveAmount === expectedBase ? '✓' : '✗'}`);

  if (!baseMatches || !taxMatches) {
    issuesFound++;
  }

  console.log();
});

console.log(`=== 結果 ===`);
console.log(`${issuesFound}件のケースで税抜金額または消費税の計算が不正確でした。`);

if (issuesFound > 0) {
  console.log("\n⚠️  これは以下の問題を引き起こします:");
  console.log("  1. 消費税申告時の課税標準額が不正確になる");
  console.log("  2. 仮払消費税・仮受消費税の金額が実際の税額と合わない");
  console.log("  3. 決算時に消費税の差異が発生する可能性がある");
}
