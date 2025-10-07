import { applyTaxLogic, LineInput, CalculatedLine } from "../tax-helpers";

// モックのPrismaクライアント
jest.mock("../prisma", () => ({
  prisma: {
    account: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
    },
  },
}));

const { prisma } = require("../prisma");

describe("applyTaxLogic", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("税込経理モード", () => {
    it("入力をそのまま返す", async () => {
      const lines: LineInput[] = [
        { accountId: "acc1", debit: 11000, credit: 0, taxCategoryId: "tax1" },
        { accountId: "acc2", debit: 0, credit: 11000, taxCategoryId: "tax2" },
      ];

      const result = await applyTaxLogic("business1", lines, {
        taxPreference: "TAX_INCLUSIVE",
      });

      expect(result).toEqual([
        { accountId: "acc1", debit: 11000, credit: 0, memo: undefined, taxCategoryId: "tax1" },
        { accountId: "acc2", debit: 0, credit: 11000, memo: undefined, taxCategoryId: "tax2" },
      ]);
    });
  });

  describe("税抜経理モード", () => {
    beforeEach(() => {
      // 消費税勘定のモック
      (prisma.account.findUnique as jest.Mock).mockImplementation(({ where }) => {
        if (where.id === "vat-payable") {
          return Promise.resolve({ id: "vat-payable", code: "205", name: "仮受消費税" });
        }
        if (where.id === "vat-receivable") {
          return Promise.resolve({ id: "vat-receivable", code: "108", name: "仮払消費税" });
        }
        return Promise.resolve(null);
      });

      (prisma.account.findMany as jest.Mock).mockResolvedValue([]);
    });

    it("借方の税込11,000円を税抜10,000円+消費税1,000円に分離", async () => {
      const context = {
        accountDefaults: new Map([["acc1", { taxCategoryId: "tax1", rate: 0.1 }]]),
        taxCategoryRates: new Map([["tax1", 0.1]]),
      };

      const lines: LineInput[] = [
        { accountId: "acc1", debit: 11000, credit: 0, taxCategoryId: "tax1" },
        { accountId: "acc2", debit: 0, credit: 11000, taxCategoryId: null },
      ];

      const result = await applyTaxLogic(
        "business1",
        lines,
        {
          taxPreference: "TAX_EXCLUSIVE",
          vatPayableAccountId: "vat-payable",
          vatReceivableAccountId: "vat-receivable",
        },
        context
      );

      // 税抜金額と消費税を確認
      const mainLine = result.find((l) => l.accountId === "acc1");
      const vatLine = result.find((l) => l.accountId === "vat-receivable");

      expect(mainLine?.debit).toBe(10000);
      expect(vatLine?.debit).toBe(1000);

      // 借方・貸方の合計が一致することを確認
      const totalDebit = result.reduce((sum, line) => sum + line.debit, 0);
      const totalCredit = result.reduce((sum, line) => sum + line.credit, 0);
      expect(totalDebit).toBe(totalCredit);
    });

    it("貸方の税込11,000円を税抜10,000円+消費税1,000円に分離", async () => {
      const context = {
        accountDefaults: new Map([["acc2", { taxCategoryId: "tax2", rate: 0.1 }]]),
        taxCategoryRates: new Map([["tax2", 0.1]]),
      };

      const lines: LineInput[] = [
        { accountId: "acc1", debit: 11000, credit: 0, taxCategoryId: null },
        { accountId: "acc2", debit: 0, credit: 11000, taxCategoryId: "tax2" },
      ];

      const result = await applyTaxLogic(
        "business1",
        lines,
        {
          taxPreference: "TAX_EXCLUSIVE",
          vatPayableAccountId: "vat-payable",
          vatReceivableAccountId: "vat-receivable",
        },
        context
      );

      const mainLine = result.find((l) => l.accountId === "acc2");
      const vatLine = result.find((l) => l.accountId === "vat-payable");

      expect(mainLine?.credit).toBe(10000);
      expect(vatLine?.credit).toBe(1000);

      const totalDebit = result.reduce((sum, line) => sum + line.debit, 0);
      const totalCredit = result.reduce((sum, line) => sum + line.credit, 0);
      expect(totalDebit).toBe(totalCredit);
    });

    it("端数が出る金額でも貸借が一致する（11,001円）", async () => {
      const context = {
        accountDefaults: new Map([["acc1", { taxCategoryId: "tax1", rate: 0.1 }]]),
        taxCategoryRates: new Map([["tax1", 0.1]]),
      };

      const lines: LineInput[] = [
        { accountId: "acc1", debit: 11001, credit: 0, taxCategoryId: "tax1" },
        { accountId: "acc2", debit: 0, credit: 11001, taxCategoryId: null },
      ];

      const result = await applyTaxLogic(
        "business1",
        lines,
        {
          taxPreference: "TAX_EXCLUSIVE",
          vatPayableAccountId: "vat-payable",
          vatReceivableAccountId: "vat-receivable",
        },
        context
      );

      const totalDebit = result.reduce((sum, line) => sum + line.debit, 0);
      const totalCredit = result.reduce((sum, line) => sum + line.credit, 0);

      // 貸借が一致することを確認（最も重要）
      expect(totalDebit).toBe(totalCredit);
      expect(totalDebit).toBe(11001);
    });

    it("複数の課税取引が混在しても貸借が一致する", async () => {
      const context = {
        accountDefaults: new Map([
          ["acc1", { taxCategoryId: "tax1", rate: 0.1 }],
          ["acc2", { taxCategoryId: "tax2", rate: 0.1 }],
        ]),
        taxCategoryRates: new Map([
          ["tax1", 0.1],
          ["tax2", 0.1],
        ]),
      };

      const lines: LineInput[] = [
        { accountId: "acc1", debit: 5500, credit: 0, taxCategoryId: "tax1" },
        { accountId: "acc1", debit: 3300, credit: 0, taxCategoryId: "tax1" },
        { accountId: "acc2", debit: 0, credit: 8800, taxCategoryId: "tax2" },
      ];

      const result = await applyTaxLogic(
        "business1",
        lines,
        {
          taxPreference: "TAX_EXCLUSIVE",
          vatPayableAccountId: "vat-payable",
          vatReceivableAccountId: "vat-receivable",
        },
        context
      );

      const totalDebit = result.reduce((sum, line) => sum + line.debit, 0);
      const totalCredit = result.reduce((sum, line) => sum + line.credit, 0);

      expect(totalDebit).toBe(totalCredit);
    });

    it("税率0%の場合は消費税行を追加しない", async () => {
      const context = {
        accountDefaults: new Map([["acc1", { taxCategoryId: "tax-exempt", rate: 0 }]]),
        taxCategoryRates: new Map([["tax-exempt", 0]]),
      };

      const lines: LineInput[] = [
        { accountId: "acc1", debit: 10000, credit: 0, taxCategoryId: "tax-exempt" },
        { accountId: "acc2", debit: 0, credit: 10000, taxCategoryId: null },
      ];

      const result = await applyTaxLogic(
        "business1",
        lines,
        {
          taxPreference: "TAX_EXCLUSIVE",
          vatPayableAccountId: "vat-payable",
          vatReceivableAccountId: "vat-receivable",
        },
        context
      );

      // 消費税行が追加されていないことを確認
      expect(result.length).toBe(2);
      expect(result.find((l) => l.accountId === "vat-receivable")).toBeUndefined();
      expect(result.find((l) => l.accountId === "vat-payable")).toBeUndefined();
    });
  });
});
