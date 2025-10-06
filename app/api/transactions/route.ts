import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getBusinessContext } from "@/lib/business-context";

export const dynamic = "force-dynamic";

export async function GET() {
  const { business } = await getBusinessContext();

  const transactions = await prisma.transaction.findMany({
    where: { businessId: business.id },
    orderBy: [{ transactionDate: "desc" }, { createdAt: "desc" }],
    take: 50,
  });

  return NextResponse.json(
    transactions.map((transaction) => ({
      id: transaction.id,
      transactionDate: transaction.transactionDate,
      amount: transaction.amount,
      description: transaction.description ?? undefined,
      counterparty: transaction.counterparty ?? undefined,
      status: transaction.status,
      source: transaction.source,
      createdAt: transaction.createdAt,
      journalEntryId: transaction.journalEntryId ?? undefined,
      sourceReference: transaction.sourceReference ?? undefined,
    }))
  );
}
