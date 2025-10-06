import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getBusinessContext } from "@/lib/business-context";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ACCOUNT_TYPES = ["ASSET", "LIABILITY", "EQUITY", "REVENUE", "EXPENSE"] as const;

export async function GET() {
  const { business } = await getBusinessContext();

  const accounts = await prisma.account.findMany({
    where: { businessId: business.id, isActive: true },
    include: { taxCategory: true },
    orderBy: [{ type: "asc" }, { code: "asc" }],
  });

  return NextResponse.json(
    accounts.map((account) => ({
      id: account.id,
      code: account.code,
      name: account.name,
      type: account.type,
      taxRate: account.taxCategory?.rate ?? 0,
      taxCategoryCode: account.taxCategory?.code ?? null,
      taxCategoryId: account.taxCategoryId,
    }))
  );
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as
    | {
        code?: string;
        name?: string;
        type?: string;
        taxCategoryId?: string;
      }
    | null;

  if (!body) {
    return NextResponse.json({ message: "入力内容を確認してください" }, { status: 400 });
  }

  const code = body.code?.trim();
  const name = body.name?.trim();
  const type = body.type?.toUpperCase();
  const taxCategoryId = body.taxCategoryId;

  if (!code || !name || !type || !taxCategoryId) {
    return NextResponse.json({ message: "コード・名称・区分・税区分は必須です" }, { status: 400 });
  }

  if (!ACCOUNT_TYPES.includes(type as (typeof ACCOUNT_TYPES)[number])) {
    return NextResponse.json({ message: "勘定科目区分が不正です" }, { status: 400 });
  }

  const { business } = await getBusinessContext();

  const taxCategory = await prisma.taxCategory.findUnique({ where: { id: taxCategoryId } });
  if (!taxCategory) {
    return NextResponse.json({ message: "指定された税区分が見つかりません" }, { status: 400 });
  }

  const duplicate = await prisma.account.findFirst({
    where: {
      businessId: business.id,
      code,
    },
  });
  if (duplicate) {
    return NextResponse.json({ message: "同じコードの勘定科目が既に存在します" }, { status: 409 });
  }

  try {
    const account = await prisma.account.create({
      data: {
        businessId: business.id,
        code,
        name,
        type,
        taxCategoryId,
      },
      include: { taxCategory: true },
    });

    return NextResponse.json(
      {
        id: account.id,
        code: account.code,
        name: account.name,
        type: account.type,
        taxRate: account.taxCategory?.rate ?? 0,
        taxCategoryCode: account.taxCategory?.code ?? null,
        taxCategoryId: account.taxCategoryId,
      },
      { status: 201 }
    );
  } catch (error) {
    return NextResponse.json({ message: "勘定科目の作成に失敗しました" }, { status: 500 });
  }
}
