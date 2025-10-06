import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getBusinessContext } from "@/lib/business-context";

export async function GET() {
  const { business } = await getBusinessContext();

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

  const aggregated = await prisma.journalEntryLine.aggregate({
    _sum: {
      debit: true,
      credit: true,
    },
    where: {
      journalEntry: {
        businessId: business.id,
        entryDate: {
          gte: startOfMonth,
          lte: endOfMonth,
        },
      },
    },
  });

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

  let netIncome = 0;

  for (const line of lines) {
    const debit = line.debit;
    const credit = line.credit;

    if (line.account.type === "REVENUE") {
      netIncome += credit - debit;
    }

    if (line.account.type === "EXPENSE") {
      netIncome -= debit - credit;
    }
  }

  const period = `${now.getFullYear()}年${now.getMonth() + 1}月`;

  return NextResponse.json({
    period,
    totals: {
      debit: aggregated._sum.debit ?? 0,
      credit: aggregated._sum.credit ?? 0,
    },
    netIncome,
  });
}
