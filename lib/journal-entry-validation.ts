import { applyTaxLogic } from "@/lib/tax-helpers";
import { prisma } from "@/lib/prisma";

type JournalEntryLineInput = {
  accountId: string;
  debit: number;
  credit: number;
  memo?: string;
  taxCategoryId?: string | null;
};

export type JournalEntryInput = {
  entryDate: string;
  description?: string;
  lines: JournalEntryLineInput[];
};

export class JournalEntryValidationError extends Error {
  status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}

type BusinessContext = {
  id: string;
  taxPreference: string;
  vatPayableAccountId: string | null;
  vatReceivableAccountId: string | null;
};

export async function prepareJournalEntryData(
  payload: JournalEntryInput,
  business: BusinessContext
) {
  if (!payload.entryDate || !Array.isArray(payload.lines) || payload.lines.length < 2) {
    throw new JournalEntryValidationError("無効な仕訳データです");
  }

  const parsedDate = new Date(payload.entryDate);
  if (Number.isNaN(parsedDate.getTime())) {
    throw new JournalEntryValidationError("日付の形式が正しくありません");
  }

  let totalDebit = 0;
  let totalCredit = 0;

  for (const line of payload.lines) {
    if (!line.accountId) {
      throw new JournalEntryValidationError("勘定科目が選択されていません");
    }

    if ((line.debit ?? 0) < 0 || (line.credit ?? 0) < 0) {
      throw new JournalEntryValidationError("金額は0以上を入力してください");
    }

    totalDebit += Math.round(line.debit || 0);
    totalCredit += Math.round(line.credit || 0);
  }

  if (totalDebit !== totalCredit) {
    throw new JournalEntryValidationError("借方と貸方の合計が一致していません");
  }

  const accountIds = payload.lines.map((line) => line.accountId);
  const accounts = await prisma.account.findMany({
    where: { id: { in: accountIds }, businessId: business.id },
    include: { taxCategory: true },
  });

  if (accounts.length !== accountIds.length) {
    throw new JournalEntryValidationError("無効な勘定科目が含まれています");
  }

  const accountDefaults = new Map(
    accounts.map((account) => [
      account.id,
      {
        taxCategoryId: account.taxCategoryId ?? null,
        rate: account.taxCategory?.rate ?? 0,
      },
    ])
  );

  const requestedTaxCategoryIds = Array.from(
    new Set(
      payload.lines
        .map((line) => line.taxCategoryId)
        .filter((id): id is string => typeof id === "string" && id.length > 0)
    )
  );

  const extraCategories = requestedTaxCategoryIds.length
    ? await prisma.taxCategory.findMany({ where: { id: { in: requestedTaxCategoryIds } } })
    : [];

  if (extraCategories.length !== requestedTaxCategoryIds.length) {
    throw new JournalEntryValidationError("無効な税区分が含まれています");
  }

  const taxCategoryRates = new Map<string, number>();
  for (const account of accounts) {
    if (account.taxCategoryId && account.taxCategory?.rate !== undefined) {
      taxCategoryRates.set(account.taxCategoryId, account.taxCategory.rate);
    }
  }
  for (const category of extraCategories) {
    taxCategoryRates.set(category.id, category.rate);
  }

  const preparedLines = payload.lines.map((line) => ({
    accountId: line.accountId,
    debit: Math.round(line.debit || 0),
    credit: Math.round(line.credit || 0),
    memo: line.memo,
    taxCategoryId: line.taxCategoryId ?? undefined,
  }));

  const calculatedLines = await applyTaxLogic(
    business.id,
    preparedLines,
    {
      taxPreference: business.taxPreference,
      vatPayableAccountId: business.vatPayableAccountId,
      vatReceivableAccountId: business.vatReceivableAccountId,
    },
    {
      accountDefaults,
      taxCategoryRates,
    }
  );

  // 税処理後の借方・貸方の合計を再チェック
  const finalDebit = calculatedLines.reduce((sum, line) => sum + line.debit, 0);
  const finalCredit = calculatedLines.reduce((sum, line) => sum + line.credit, 0);

  if (finalDebit !== finalCredit) {
    throw new JournalEntryValidationError(
      `税処理後の借方と貸方の合計が一致していません（借方: ${finalDebit}, 貸方: ${finalCredit}）`
    );
  }

  return {
    parsedDate,
    calculatedLines,
  };
}
