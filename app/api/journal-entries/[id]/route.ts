import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { getBusinessContext } from "@/lib/business-context";
import {
  JournalEntryInput,
  JournalEntryValidationError,
  prepareJournalEntryData,
} from "@/lib/journal-entry-validation";

export async function GET(
  _request: Request,
  { params }: { params: { id: string } }
) {
  const { business } = await getBusinessContext();
  const entry = await prisma.journalEntry.findFirst({
    where: { id: params.id, businessId: business.id },
    include: {
      lines: {
        include: { account: true },
        orderBy: { lineNumber: "asc" },
      },
    },
  });

  if (!entry) {
    return NextResponse.json({ message: "仕訳が見つかりません" }, { status: 404 });
  }

  return NextResponse.json({
    id: entry.id,
    entryDate: entry.entryDate,
    description: entry.description ?? undefined,
    lines: entry.lines.map((line) => ({
      id: line.id,
      accountId: line.accountId,
      accountName: line.account.name,
      accountCode: line.account.code,
      debit: line.debit,
      credit: line.credit,
      memo: line.memo ?? undefined,
      taxCategoryId: line.taxCategoryId ?? undefined,
    })),
  });
}

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  const body = (await request.json()) as JournalEntryInput;
  const { business } = await getBusinessContext();

  const existing = await prisma.journalEntry.findFirst({
    where: { id: params.id, businessId: business.id },
  });

  if (!existing) {
    return NextResponse.json({ message: "仕訳が見つかりません" }, { status: 404 });
  }

  try {
    const { parsedDate, calculatedLines } = await prepareJournalEntryData(body, {
      id: business.id,
      taxPreference: business.taxPreference,
      vatPayableAccountId: business.vatPayableAccountId,
      vatReceivableAccountId: business.vatReceivableAccountId,
    });

    const updated = await prisma.journalEntry.update({
      where: { id: params.id },
      data: {
        entryDate: parsedDate,
        description: body.description,
        lines: {
          deleteMany: {},
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
      id: updated.id,
      entryDate: updated.entryDate,
      description: updated.description ?? undefined,
      lines: updated.lines.map((line) => ({
        id: line.id,
        accountId: line.accountId,
        accountName: line.account.name,
        accountCode: line.account.code,
        debit: line.debit,
        credit: line.credit,
        memo: line.memo ?? undefined,
        taxCategoryId: line.taxCategoryId ?? undefined,
      })),
    });
  } catch (error) {
    if (error instanceof JournalEntryValidationError) {
      return NextResponse.json({ message: error.message }, { status: error.status });
    }
    return NextResponse.json({ message: "仕訳の更新に失敗しました" }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: { id: string } }
) {
  const { business } = await getBusinessContext();

  const existing = await prisma.journalEntry.findFirst({
    where: { id: params.id, businessId: business.id },
  });

  if (!existing) {
    return NextResponse.json({ message: "仕訳が見つかりません" }, { status: 404 });
  }

  try {
    await prisma.journalEntry.delete({ where: { id: params.id } });
    return NextResponse.json({ message: "仕訳を削除しました" });
  } catch (_error) {
    return NextResponse.json({ message: "仕訳の削除に失敗しました" }, { status: 500 });
  }
}
