import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getBusinessContext } from "@/lib/business-context";

type PeriodTotals = {
  month: string;
  revenue: number;
  expense: number;
};

export async function GET() {
  const { business } = await getBusinessContext();
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

  const lines = await prisma.journalEntryLine.findMany({
    where: {
      journalEntry: {
        businessId: business.id,
        entryDate: {
          gte: startOfMonth,
          lte: endOfMonth,
        },
      },
    },
    include: {
      account: true,
    },
  });

  let revenue = 0;
  let expense = 0;
  let cash = 0;

  for (const line of lines) {
    const debit = line.debit;
    const credit = line.credit;

    switch (line.account.type) {
      case "REVENUE":
        revenue += credit - debit;
        break;
      case "EXPENSE":
        expense += debit - credit;
        break;
      case "ASSET":
        cash += debit - credit;
        break;
      default:
        break;
    }
  }

  const netIncome = revenue - expense;

  // simple history for last 6 months
  const periods: PeriodTotals[] = [];
  for (let i = 5; i >= 0; i--) {
    const base = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const periodStart = new Date(base.getFullYear(), base.getMonth(), 1);
    const periodEnd = new Date(base.getFullYear(), base.getMonth() + 1, 0, 23, 59, 59, 999);

    const periodLines = await prisma.journalEntryLine.findMany({
      where: {
        journalEntry: {
          businessId: business.id,
          entryDate: {
            gte: periodStart,
            lte: periodEnd,
          },
        },
      },
      include: { account: true },
    });

    let periodRevenue = 0;
    let periodExpense = 0;

    for (const line of periodLines) {
      const debit = line.debit;
      const credit = line.credit;
      if (line.account.type === "REVENUE") {
        periodRevenue += credit - debit;
      }
      if (line.account.type === "EXPENSE") {
        periodExpense += debit - credit;
      }
    }

    periods.push({
      month: `${periodStart.getFullYear()}-${String(periodStart.getMonth() + 1).padStart(2, "0")}`,
      revenue: periodRevenue,
      expense: periodExpense,
    });
  }

  const recentEntriesCount = await prisma.journalEntry.count({
    where: {
      businessId: business.id,
      entryDate: {
        gte: startOfMonth,
        lte: endOfMonth,
      },
    },
  });

  return NextResponse.json({
    period: `${now.getFullYear()}年${now.getMonth() + 1}月`,
    revenue,
    expense,
    cash,
    netIncome,
    recentEntriesCount,
    periods,
  });
}
