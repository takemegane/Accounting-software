import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getBusinessContext } from "@/lib/business-context";

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  const { business } = await getBusinessContext();
  const transaction = await prisma.transaction.findUnique({
    where: { id: params.id },
  });

  if (!transaction || transaction.businessId !== business.id) {
    return NextResponse.json({ message: "取引が見つかりません" }, { status: 404 });
  }

  if (transaction.status === "matched" && transaction.journalEntryId) {
    return NextResponse.json({ message: "既に仕訳化されています" }, { status: 400 });
  }

  const body = (await request.json().catch(() => null)) as {
    counterpartAccountId?: string;
    bankAccountId?: string;
    memo?: string;
  } | null;

  if (!body?.counterpartAccountId) {
    return NextResponse.json({ message: "対応する勘定科目を指定してください" }, { status: 400 });
  }

  const bankAccountId = body.bankAccountId;
  const bankAccount = bankAccountId
    ? await prisma.account.findFirst({
        where: { id: bankAccountId, businessId: business.id },
      })
    : await prisma.account.findFirst({
        where: {
          businessId: business.id,
          code: { in: ["102", "101"] },
        },
        orderBy: { code: "asc" },
      });

  if (!bankAccount) {
    return NextResponse.json({ message: "現金・預金科目が見つかりません" }, { status: 400 });
  }

  const counterpartAccount = await prisma.account.findFirst({
    where: { id: body.counterpartAccountId, businessId: business.id },
  });

  if (!counterpartAccount) {
    return NextResponse.json({ message: "対応勘定科目が無効です" }, { status: 400 });
  }

  const amount = Math.abs(transaction.amount);
  const isIncome = transaction.amount > 0;

  const description =
    body.memo?.trim() ||
    transaction.description ||
    `${transaction.counterparty ?? "取引"}の${isIncome ? "入金" : "出金"}`;

  const created = await prisma.$transaction(async (tx) => {
    const entry = await tx.journalEntry.create({
      data: {
        businessId: business.id,
        entryDate: transaction.transactionDate,
        description,
        lines: {
          create: isIncome
            ? [
                {
                  lineNumber: 1,
                  accountId: bankAccount.id,
                  debit: amount,
                  credit: 0,
                  memo: transaction.description ?? undefined,
                },
                {
                  lineNumber: 2,
                  accountId: counterpartAccount.id,
                  debit: 0,
                  credit: amount,
                  memo: transaction.counterparty ?? undefined,
                },
              ]
            : [
                {
                  lineNumber: 1,
                  accountId: counterpartAccount.id,
                  debit: amount,
                  credit: 0,
                  memo: transaction.counterparty ?? undefined,
                },
                {
                  lineNumber: 2,
                  accountId: bankAccount.id,
                  debit: 0,
                  credit: amount,
                  memo: transaction.description ?? undefined,
                },
              ],
        },
      },
      include: {
        lines: true,
      },
    });

    await tx.transaction.update({
      where: { id: transaction.id },
      data: {
        status: "matched",
        journalEntryId: entry.id,
      },
    });

    return entry;
  });

  return NextResponse.json({
    journalEntryId: created.id,
    message: "仕訳を登録しました",
  });
}
