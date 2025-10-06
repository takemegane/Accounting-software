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
  if (options.taxPreference !== "TAX_EXCLUSIVE") {
    return lines.map((line) => ({ ...line }));
  }

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
    return lines.map((line) => ({ ...line }));
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
  const additional: CalculatedLine[] = [];

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

    const normalizedLine: CalculatedLine = {
      accountId: line.accountId,
      debit: line.debit,
      credit: line.credit,
      memo: line.memo,
      taxCategoryId: selectedTaxCategoryId,
    };

    normalizedLines.push(normalizedLine);

    if (effectiveRate <= 0) {
      continue;
    }

    const isDebitPositive = normalizedLine.debit > 0 && normalizedLine.credit === 0;
    const isCreditPositive = normalizedLine.credit > 0 && normalizedLine.debit === 0;

    if (!isDebitPositive && !isCreditPositive) {
      continue;
    }

    if (isDebitPositive) {
      const taxAmount = Math.round(normalizedLine.debit * effectiveRate);
      if (taxAmount > 0) {
        additional.push({
          accountId: vatReceivable.id,
          debit: taxAmount,
          credit: 0,
          memo: "仮払消費税",
        });
      }
    }

    if (isCreditPositive) {
      const taxAmount = Math.round(normalizedLine.credit * effectiveRate);
      if (taxAmount > 0) {
        additional.push({
          accountId: vatPayable.id,
          debit: 0,
          credit: taxAmount,
          memo: "仮受消費税",
        });
      }
    }
  }

  return [...normalizedLines, ...additional];
}
