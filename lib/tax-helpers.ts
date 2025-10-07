import { prisma } from "@/lib/prisma";

export type CalculatedLine = {
  accountId: string;
  debit: number;
  credit: number;
  memo?: string;
  taxCategoryId?: string | null;
};

export type LineInput = {
  accountId: string;
  debit: number;
  credit: number;
  memo?: string;
  taxCategoryId?: string | null;
};

type TaxContext = {
  accountDefaults: Map<string, { taxCategoryId: string | null; rate: number }>;
  taxCategoryRates: Map<string, number>;
};

export async function applyTaxLogic(
  businessId: string,
  lines: LineInput[],
  options: {
    taxPreference: string;
    vatPayableAccountId?: string | null;
    vatReceivableAccountId?: string | null;
  },
  context?: TaxContext
): Promise<CalculatedLine[]> {
  // 税込経理の場合は入力をそのまま使用
  if (options.taxPreference !== "TAX_EXCLUSIVE") {
    return lines.map((line) => {
      const defaults = context?.accountDefaults?.get(line.accountId);
      const hasExplicitSelection =
        line.taxCategoryId !== undefined && line.taxCategoryId !== null && line.taxCategoryId !== "";
      const selectedTaxCategoryId = hasExplicitSelection
        ? (line.taxCategoryId as string | null)
        : defaults?.taxCategoryId ?? null;

      return {
        accountId: line.accountId,
        debit: line.debit,
        credit: line.credit,
        memo: line.memo,
        taxCategoryId: selectedTaxCategoryId,
      };
    });
  }

  // 税抜経理の場合: 税込金額から税抜と消費税を分離
  const vatPayableId = options.vatPayableAccountId;
  const vatReceivableId = options.vatReceivableAccountId;

  let vatPayable = vatPayableId
    ? await prisma.account.findUnique({ where: { id: vatPayableId } })
    : null;
  let vatReceivable = vatReceivableId
    ? await prisma.account.findUnique({ where: { id: vatReceivableId } })
    : null;

  if (!vatPayable || !vatReceivable) {
    const taxAccounts = await prisma.account.findMany({
      where: {
        businessId,
        code: { in: ["205", "108"] },
      },
    });

    vatPayable = vatPayable ?? taxAccounts.find((account) => account.code === "205") ?? null;
    vatReceivable = vatReceivable ?? taxAccounts.find((account) => account.code === "108") ?? null;
  }

  if (!vatPayable || !vatReceivable) {
    // 消費税勘定が見つからない場合は入力をそのまま使用
    return lines.map((line) => ({
      accountId: line.accountId,
      debit: line.debit,
      credit: line.credit,
      memo: line.memo,
      taxCategoryId: line.taxCategoryId,
    }));
  }

  let accountDefaults = context?.accountDefaults;
  let taxCategoryRates = context?.taxCategoryRates;

  if (!accountDefaults || !taxCategoryRates) {
    const accounts = await prisma.account.findMany({
      where: { businessId },
      include: { taxCategory: true },
    });

    accountDefaults = new Map(
      accounts.map((account) => [
        account.id,
        {
          taxCategoryId: account.taxCategoryId ?? null,
          rate: account.taxCategory?.rate ?? 0,
        },
      ])
    );

    const categoryMap = new Map<string, number>();
    for (const account of accounts) {
      if (account.taxCategoryId && account.taxCategory?.rate !== undefined) {
        categoryMap.set(account.taxCategoryId, account.taxCategory.rate);
      }
    }

    const requestedCategoryIds = Array.from(
      new Set(
        lines
          .map((line) => line.taxCategoryId)
          .filter(
            (id): id is string =>
              typeof id === "string" && id.length > 0 && !categoryMap.has(id)
          )
      )
    );

    if (requestedCategoryIds.length > 0) {
      const extraCategories = await prisma.taxCategory.findMany({
        where: { id: { in: requestedCategoryIds } },
      });
      for (const category of extraCategories) {
        categoryMap.set(category.id, category.rate);
      }
    }

    taxCategoryRates = categoryMap;
  }

  const normalizedLines: CalculatedLine[] = [];
  let totalDebitTax = 0;
  let totalCreditTax = 0;

  for (const line of lines) {
    const defaults = accountDefaults?.get(line.accountId);
    const hasExplicitSelection =
      line.taxCategoryId !== undefined && line.taxCategoryId !== null && line.taxCategoryId !== "";
    const selectedTaxCategoryId = hasExplicitSelection
      ? (line.taxCategoryId as string | null)
      : defaults?.taxCategoryId ?? null;

    let effectiveRate = 0;
    if (selectedTaxCategoryId) {
      const selectedRate = taxCategoryRates?.get(selectedTaxCategoryId);
      effectiveRate = selectedRate !== undefined ? selectedRate : defaults?.rate ?? 0;
    } else {
      effectiveRate = defaults?.rate ?? 0;
    }

    // 税率がある場合は税込金額から税抜と消費税を分離
    if (effectiveRate > 0) {
      const isDebitPositive = line.debit > 0 && line.credit === 0;
      const isCreditPositive = line.credit > 0 && line.debit === 0;

      if (isDebitPositive) {
        // 借方: 税込金額から消費税を計算し、本体価格を逆算
        const taxInclusiveAmount = line.debit;
        const taxExclusiveAmount = Math.round(taxInclusiveAmount / (1 + effectiveRate));
        const taxAmount = taxInclusiveAmount - taxExclusiveAmount;

        normalizedLines.push({
          accountId: line.accountId,
          debit: taxExclusiveAmount,
          credit: 0,
          memo: line.memo,
          taxCategoryId: selectedTaxCategoryId,
        });

        totalDebitTax += taxAmount;
      } else if (isCreditPositive) {
        // 貸方: 税込金額から消費税を計算し、本体価格を逆算
        const taxInclusiveAmount = line.credit;
        const taxExclusiveAmount = Math.round(taxInclusiveAmount / (1 + effectiveRate));
        const taxAmount = taxInclusiveAmount - taxExclusiveAmount;

        normalizedLines.push({
          accountId: line.accountId,
          debit: 0,
          credit: taxExclusiveAmount,
          memo: line.memo,
          taxCategoryId: selectedTaxCategoryId,
        });

        totalCreditTax += taxAmount;
      } else {
        // 両方0または両方入力されている場合はそのまま
        normalizedLines.push({
          accountId: line.accountId,
          debit: line.debit,
          credit: line.credit,
          memo: line.memo,
          taxCategoryId: selectedTaxCategoryId,
        });
      }
    } else {
      // 税率が0の場合はそのまま
      normalizedLines.push({
        accountId: line.accountId,
        debit: line.debit,
        credit: line.credit,
        memo: line.memo,
        taxCategoryId: selectedTaxCategoryId,
      });
    }
  }

  // 消費税行を追加
  const additional: CalculatedLine[] = [];

  if (totalDebitTax > 0) {
    additional.push({
      accountId: vatReceivable.id,
      debit: totalDebitTax,
      credit: 0,
      memo: "仮払消費税",
      taxCategoryId: null,
    });
  }

  if (totalCreditTax > 0) {
    additional.push({
      accountId: vatPayable.id,
      debit: 0,
      credit: totalCreditTax,
      memo: "仮受消費税",
      taxCategoryId: null,
    });
  }

  return [...normalizedLines, ...additional];
}
