/**
 * 実際の実装をインポートして検証
 */

import { applyTaxLogic } from "../lib/tax-helpers";

// モックのPrismaクライアント
jest.mock("../lib/prisma", () => ({
  prisma: {
    account: {
      findUnique: jest.fn((args) => {
        if (args.where.id === "vat-payable") {
          return Promise.resolve({ id: "vat-payable", code: "205", name: "仮受消費税" });
        }
        if (args.where.id === "vat-receivable") {
          return Promise.resolve({ id: "vat-receivable", code: "108", name: "仮払消費税" });
        }
        return Promise.resolve(null);
      }),
      findMany: jest.fn(() => Promise.resolve([])),
    },
  },
}));

async function testActualImplementation() {
  console.log("=== 実装コードの検証 ===\n");

  const context = {
    accountDefaults: new Map([
      ["acc1", { taxCategoryId: "tax1", rate: 0.1 }],
      ["acc2", { taxCategoryId: null, rate: 0 }],
    ]),
    taxCategoryRates: new Map([["tax1", 0.1]]),
  };

  const testCases = [
    {
      name: "税込11,000円の仕訳",
      lines: [
        { accountId: "acc1", debit: 11000, credit: 0, taxCategoryId: "tax1" },
        { accountId: "acc2", debit: 0, credit: 11000, taxCategoryId: null },
      ],
      expected: { base: 10000, tax: 1000 },
    },
    {
      name: "税込5,500円の仕訳",
      lines: [
        { accountId: "acc1", debit: 5500, credit: 0, taxCategoryId: "tax1" },
        { accountId: "acc2", debit: 0, credit: 5500, taxCategoryId: null },
      ],
      expected: { base: 5000, tax: 500 },
    },
    {
      name: "税込1,100,000円の仕訳",
      lines: [
        { accountId: "acc1", debit: 1100000, credit: 0, taxCategoryId: "tax1" },
        { accountId: "acc2", debit: 0, credit: 1100000, taxCategoryId: null },
      ],
      expected: { base: 1000000, tax: 100000 },
    },
  ];

  for (const testCase of testCases) {
    console.log(`テスト: ${testCase.name}`);

    const result = await applyTaxLogic(
      "business1",
      testCase.lines,
      {
        taxPreference: "TAX_EXCLUSIVE",
        vatPayableAccountId: "vat-payable",
        vatReceivableAccountId: "vat-receivable",
      },
      context
    );

    const mainLine = result.find((l) => l.accountId === "acc1");
    const vatLine = result.find((l) => l.accountId === "vat-receivable");
    const otherLine = result.find((l) => l.accountId === "acc2");

    console.log(`  借方: ${mainLine?.accountId} ${mainLine?.debit}円`);
    console.log(`  借方: ${vatLine?.accountId} ${vatLine?.debit}円`);
    console.log(`  貸方: ${otherLine?.accountId} ${otherLine?.credit}円`);

    const totalDebit = result.reduce((sum, line) => sum + line.debit, 0);
    const totalCredit = result.reduce((sum, line) => sum + line.credit, 0);

    const baseMatches = mainLine?.debit === testCase.expected.base;
    const taxMatches = vatLine?.debit === testCase.expected.tax;
    const balanced = totalDebit === totalCredit;

    console.log(`  期待値: 税抜${testCase.expected.base}円 + 税${testCase.expected.tax}円`);
    console.log(`  結果  : 税抜${mainLine?.debit}円 + 税${vatLine?.debit}円`);
    console.log(`  貸借  : ${balanced ? '✓ 一致' : '✗ 不一致'}`);
    console.log(`  税額  : ${baseMatches && taxMatches ? '✓ 正確' : '✗ 不正確'}`);
    console.log();
  }

  console.log("✓ 実装コードの検証が完了しました");
}

testActualImplementation().catch(console.error);
