import { prisma } from "@/lib/prisma";
import { calcNetByAccountType, resolveMonthlyPeriod } from "@/lib/report-utils";

export async function getTrialBalanceData(businessId: string, fiscalYearStartMonth: number, period: string | null) {
  const { start, end, label, fiscalYearStart } = resolveMonthlyPeriod(period, fiscalYearStartMonth);

  const accounts = await prisma.account.findMany({
    where: { businessId, isActive: true },
    orderBy: [{ type: "asc" }, { code: "asc" }],
  });

  const accountBalances = await prisma.accountBalance.findMany({ where: { businessId } });
  const balanceMap = new Map(accountBalances.map((balance) => [balance.accountId, balance.amount]));

  const currentLines = await prisma.journalEntryLine.groupBy({
    by: ["accountId"],
    where: {
      journalEntry: {
        businessId,
        entryDate: {
          gte: start,
          lte: end,
        },
      },
    },
    _sum: { debit: true, credit: true },
  });
  const currentMap = new Map(currentLines.map((line) => [line.accountId, line._sum]));

  const beforeLines = await prisma.journalEntryLine.groupBy({
    by: ["accountId"],
    where: {
      journalEntry: {
        businessId,
        entryDate: {
          gte: fiscalYearStart,
          lt: start,
        },
      },
    },
    _sum: { debit: true, credit: true },
  });
  const beforeMap = new Map(beforeLines.map((line) => [line.accountId, line._sum]));

  let totalDebit = 0;
  let totalCredit = 0;

  const rows = accounts.map((account) => {
    const currentSum = currentMap.get(account.id) ?? { debit: 0, credit: 0 };
    const beforeSum = beforeMap.get(account.id) ?? { debit: 0, credit: 0 };

    const openingBalance = (balanceMap.get(account.id) ?? 0) +
      calcNetByAccountType(account.type, beforeSum.debit ?? 0, beforeSum.credit ?? 0);
    const periodDebit = currentSum.debit ?? 0;
    const periodCredit = currentSum.credit ?? 0;
    const netChange = calcNetByAccountType(account.type, periodDebit, periodCredit);
    const closingBalance = openingBalance + netChange;

    totalDebit += periodDebit;
    totalCredit += periodCredit;

    return {
      accountId: account.id,
      code: account.code,
      name: account.name,
      type: account.type,
      openingBalance,
      debit: periodDebit,
      credit: periodCredit,
      closingBalance,
    };
  });

  return {
    label,
    start,
    end,
    fiscalYearStart,
    rows,
    totals: {
      debit: totalDebit,
      credit: totalCredit,
    },
  };
}

export async function getIncomeStatementData(
  businessId: string,
  fiscalYearStartMonth: number,
  period: string | null
) {
  const { start, end, label, fiscalYearStart } = resolveMonthlyPeriod(period, fiscalYearStartMonth);

  const accounts = await prisma.account.findMany({
    where: { businessId, type: { in: ["REVENUE", "EXPENSE"] }, isActive: true },
    orderBy: [{ type: "asc" }, { code: "asc" }],
  });

  const currentLines = await prisma.journalEntryLine.groupBy({
    by: ["accountId"],
    where: {
      journalEntry: {
        businessId,
        entryDate: {
          gte: start,
          lte: end,
        },
      },
    },
    _sum: { debit: true, credit: true },
  });
  const currentMap = new Map(currentLines.map((line) => [line.accountId, line._sum]));

  const ytdLines = await prisma.journalEntryLine.groupBy({
    by: ["accountId"],
    where: {
      journalEntry: {
        businessId,
        entryDate: {
          gte: fiscalYearStart,
          lte: end,
        },
      },
    },
    _sum: { debit: true, credit: true },
  });
  const ytdMap = new Map(ytdLines.map((line) => [line.accountId, line._sum]));

  let totalRevenue = 0;
  let totalExpense = 0;
  let ytdRevenue = 0;
  let ytdExpense = 0;

  const rows = accounts.map((account) => {
    const current = currentMap.get(account.id) ?? { debit: 0, credit: 0 };
    const ytd = ytdMap.get(account.id) ?? { debit: 0, credit: 0 };

    const currentNet = calcNetByAccountType(account.type, current.debit ?? 0, current.credit ?? 0);
    const ytdNet = calcNetByAccountType(account.type, ytd.debit ?? 0, ytd.credit ?? 0);

    if (account.type === "REVENUE") {
      totalRevenue += currentNet;
      ytdRevenue += ytdNet;
    } else {
      totalExpense += currentNet;
      ytdExpense += ytdNet;
    }

    return {
      accountId: account.id,
      code: account.code,
      name: account.name,
      type: account.type,
      current: currentNet,
      yearToDate: ytdNet,
    };
  });

  return {
    label,
    start,
    end,
    fiscalYearStart,
    rows,
    totals: {
      revenue: totalRevenue,
      expense: totalExpense,
      netIncome: totalRevenue - totalExpense,
    },
    yearToDate: {
      revenue: ytdRevenue,
      expense: ytdExpense,
      netIncome: ytdRevenue - ytdExpense,
    },
  };
}

export async function getBalanceSheetData(
  businessId: string,
  fiscalYearStartMonth: number,
  period: string | null
) {
  const trial = await getTrialBalanceData(businessId, fiscalYearStartMonth, period);

  const pick = (type: string) =>
    trial.rows
      .filter((row) => row.type === type)
      .map((row) => ({
        accountId: row.accountId,
        code: row.code,
        name: row.name,
        closingBalance: row.closingBalance,
      }));

  const sum = (rows: { closingBalance: number }[]) =>
    rows.reduce((total, row) => total + row.closingBalance, 0);

  const assets = pick("ASSET");
  const liabilities = pick("LIABILITY");
  const equity = pick("EQUITY");

  const totalAssets = sum(assets);
  const totalLiabilities = sum(liabilities);
  const totalEquity = sum(equity);

  return {
    label: trial.label,
    start: trial.start,
    end: trial.end,
    fiscalYearStart: trial.fiscalYearStart,
    assets: {
      rows: assets,
      total: totalAssets,
    },
    liabilities: {
      rows: liabilities,
      total: totalLiabilities,
    },
    equity: {
      rows: equity,
      total: totalEquity,
    },
    totals: {
      assets: totalAssets,
      liabilitiesAndEquity: totalLiabilities + totalEquity,
    },
  };
}

export async function getJournalDetailData(businessId: string) {
  const entries = await prisma.journalEntry.findMany({
    where: { businessId },
    include: {
      lines: {
        include: {
          account: {
            // 削除済み（isActive: false）の勘定科目も含める
            select: {
              id: true,
              code: true,
              name: true,
              isActive: true,
            },
          },
        },
        orderBy: { lineNumber: "asc" },
      },
    },
    orderBy: [{ entryDate: "asc" }, { createdAt: "asc" }],
  });

  return entries.map((entry) => {
    const totals = entry.lines.reduce(
      (acc, line) => {
        acc.debit += line.debit;
        acc.credit += line.credit;
        return acc;
      },
      { debit: 0, credit: 0 }
    );

    return {
      id: entry.id,
      entryDate: entry.entryDate,
      description: entry.description ?? undefined,
      totals,
      lines: entry.lines.map((line) => ({
        id: line.id,
        accountId: line.accountId,
        accountCode: line.account.code,
        accountName: line.account.name,
        debit: line.debit,
        credit: line.credit,
        memo: line.memo ?? undefined,
      })),
    };
  });
}

export async function getGeneralLedgerData(businessId: string) {
  const lines = await prisma.journalEntryLine.findMany({
    where: { journalEntry: { businessId } },
    include: {
      account: {
        // 削除済み（isActive: false）の勘定科目も含める
        select: {
          id: true,
          code: true,
          name: true,
          type: true,
          isActive: true,
        },
      },
      journalEntry: true,
    },
    orderBy: [
      { account: { code: "asc" } },
      { journalEntry: { entryDate: "asc" } },
      { journalEntry: { createdAt: "asc" } },
      { lineNumber: "asc" },
    ],
  });

  const ledgerMap = new Map<
    string,
    {
      accountId: string;
      code: string;
      name: string;
      type: string;
      entries: {
        lineId: string;
        journalEntryId: string;
        entryDate: Date;
        description?: string | null;
        debit: number;
        credit: number;
        memo?: string | null;
        balance: number;
      }[];
      totals: { debit: number; credit: number; balance: number };
    }
  >();

  for (const line of lines) {
    const accountId = line.accountId;
    if (!ledgerMap.has(accountId)) {
      ledgerMap.set(accountId, {
        accountId,
        code: line.account.code,
        name: line.account.name,
        type: line.account.type,
        entries: [],
        totals: { debit: 0, credit: 0, balance: 0 },
      });
    }

    const ledger = ledgerMap.get(accountId)!;
    ledger.totals.debit += line.debit;
    ledger.totals.credit += line.credit;
    ledger.totals.balance += line.debit - line.credit;

    ledger.entries.push({
      lineId: line.id,
      journalEntryId: line.journalEntryId,
      entryDate: line.journalEntry.entryDate,
      description: line.journalEntry.description,
      debit: line.debit,
      credit: line.credit,
      memo: line.memo,
      balance: ledger.totals.balance,
    });
  }

  return Array.from(ledgerMap.values());
}
