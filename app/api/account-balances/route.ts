import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getBusinessContext } from "@/lib/business-context";

type BalanceRequest = {
  balances: {
    accountId: string;
    amount: number;
  }[];
};

export async function GET() {
  const { business } = await getBusinessContext();

  const [accounts, balances] = await Promise.all([
    prisma.account.findMany({
      where: { businessId: business.id, isActive: true },
      orderBy: [{ type: "asc" }, { code: "asc" }],
    }),
    prisma.accountBalance.findMany({
      where: { businessId: business.id },
    }),
  ]);

  const balanceMap = new Map(balances.map((b) => [b.accountId, b.amount]));

  return NextResponse.json(
    accounts.map((account) => ({
      accountId: account.id,
      accountCode: account.code,
      accountName: account.name,
      amount: balanceMap.get(account.id) ?? 0,
    }))
  );
}

export async function PUT(request: Request) {
  const { business } = await getBusinessContext();

  const body = (await request.json().catch(() => null)) as BalanceRequest | null;
  if (!body || !Array.isArray(body.balances)) {
    return NextResponse.json({ message: "更新データが不正です" }, { status: 400 });
  }

  const accountIds = body.balances.map((item) => item.accountId);
  const accounts = await prisma.account.findMany({
    where: {
      id: { in: accountIds },
      businessId: business.id,
    },
  });

  if (accounts.length !== accountIds.length) {
    return NextResponse.json({ message: "存在しない勘定科目が含まれています" }, { status: 400 });
  }

  await prisma.$transaction(async (tx) => {
    await tx.accountBalance.deleteMany({
      where: { businessId: business.id },
    });

    for (const item of body.balances) {
      await tx.accountBalance.create({
        data: {
          businessId: business.id,
          accountId: item.accountId,
          amount: Math.round(item.amount),
        },
      });
    }
  });

  return NextResponse.json({ message: "初期残高を更新しました" });
}
