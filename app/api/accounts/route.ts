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

async function generateAccountCode(businessId: string, type: string): Promise<string> {
  // 区分ごとの開始番号
  const baseCode: Record<string, number> = {
    ASSET: 100,
    LIABILITY: 200,
    EQUITY: 300,
    REVENUE: 400,
    EXPENSE: 500,
  };

  const start = baseCode[type] || 100;
  const end = start + 99;

  // 同じ区分の最大コード番号を取得
  const accounts = await prisma.account.findMany({
    where: {
      businessId,
      type,
    },
    select: { code: true },
    orderBy: { code: 'desc' },
  });

  // 既存のコードから最大値を取得
  let maxCode = start - 1;
  for (const account of accounts) {
    const codeNum = parseInt(account.code, 10);
    if (!isNaN(codeNum) && codeNum >= start && codeNum <= end) {
      maxCode = Math.max(maxCode, codeNum);
    }
  }

  // 次の番号を返す
  const nextCode = maxCode + 1;
  if (nextCode > end) {
    throw new Error(`${type}の勘定科目コードが上限に達しました`);
  }

  return nextCode.toString();
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

  const name = body.name?.trim();
  const type = body.type?.toUpperCase();
  const taxCategoryId = body.taxCategoryId;

  if (!name || !type || !taxCategoryId) {
    return NextResponse.json({ message: "名称・区分・税区分は必須です" }, { status: 400 });
  }

  if (!ACCOUNT_TYPES.includes(type as (typeof ACCOUNT_TYPES)[number])) {
    return NextResponse.json({ message: "勘定科目区分が不正です" }, { status: 400 });
  }

  const { business } = await getBusinessContext();

  const taxCategory = await prisma.taxCategory.findUnique({ where: { id: taxCategoryId } });
  if (!taxCategory) {
    return NextResponse.json({ message: "指定された税区分が見つかりません" }, { status: 400 });
  }

  // コードが指定されていない場合は自動採番
  let code = body.code?.trim();
  if (!code) {
    try {
      code = await generateAccountCode(business.id, type);
    } catch (error: any) {
      return NextResponse.json({ message: error.message || "コードの自動採番に失敗しました" }, { status: 500 });
    }
  }

  // コードの重複チェック
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
