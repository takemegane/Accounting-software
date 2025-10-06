import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getBusinessContext } from "@/lib/business-context";
import {
  JournalEntryValidationError,
  JournalEntryInput,
  prepareJournalEntryData,
} from "@/lib/journal-entry-validation";
import { assertDateUnlocked } from "@/lib/closing-periods";

export async function GET() {
  const { business } = await getBusinessContext();

  const entries = await prisma.journalEntry.findMany({
    where: { businessId: business.id },
    include: {
      lines: {
        include: { account: true },
        orderBy: { lineNumber: "asc" },
      },
      lockedBy: {
        select: { id: true, clerkUserId: true },
      },
    },
    orderBy: { entryDate: "desc" },
    take: 20,
  });

  return NextResponse.json(
    entries.map((entry) => ({
      id: entry.id,
      entryDate: entry.entryDate,
      description: entry.description,
      lockedAt: entry.lockedAt ?? undefined,
      lockedBy: entry.lockedBy
        ? {
            id: entry.lockedBy.id,
            clerkUserId: entry.lockedBy.clerkUserId,
          }
        : undefined,
      lines: entry.lines.map((line) => ({
        id: line.id,
        accountName: line.account.name,
        debit: line.debit,
        credit: line.credit,
        memo: line.memo ?? undefined,
      })),
    }))
  );
}

export async function POST(request: Request) {
  const body = (await request.json()) as JournalEntryInput;

  const { business } = await getBusinessContext();

  try {
    const { parsedDate, calculatedLines } = await prepareJournalEntryData(body, {
      id: business.id,
      taxPreference: business.taxPreference,
      vatPayableAccountId: business.vatPayableAccountId,
      vatReceivableAccountId: business.vatReceivableAccountId,
    });

    await assertDateUnlocked(business.id, parsedDate);

    const entry = await prisma.journalEntry.create({
      data: {
        businessId: business.id,
        entryDate: parsedDate,
        description: body.description,
        lines: {
          create: calculatedLines.map((line, idx) => ({
            lineNumber: idx + 1,
            accountId: line.accountId,
            debit: line.debit,
          credit: line.credit,
          memo: line.memo,
          taxCategoryId: line.taxCategoryId ?? null,
        })),
      },
    },
      include: {
        lines: {
          include: { account: true },
          orderBy: { lineNumber: "asc" },
        },
      },
    });

    return NextResponse.json({
      id: entry.id,
      entryDate: entry.entryDate,
      description: entry.description,
      lines: entry.lines.map((line) => ({
        id: line.id,
        accountName: line.account.name,
        debit: line.debit,
        credit: line.credit,
        memo: line.memo ?? undefined,
      })),
    });
  } catch (error) {
    if (error instanceof JournalEntryValidationError) {
      return NextResponse.json({ message: error.message }, { status: error.status });
    }
    return NextResponse.json({ message: "仕訳の登録に失敗しました" }, { status: 500 });
  }
}
