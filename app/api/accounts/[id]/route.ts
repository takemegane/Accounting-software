import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { getBusinessContext } from "@/lib/business-context";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ACCOUNT_TYPES = ["ASSET", "LIABILITY", "EQUITY", "REVENUE", "EXPENSE"] as const;

type AccountPatchBody = {
  code?: string;
  name?: string;
  type?: string;
  taxCategoryId?: string | null;
};

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  const { business } = await getBusinessContext();
  const accountId = params.id;

  const existing = await prisma.account.findFirst({
    where: {
      id: accountId,
      businessId: business.id,
      isActive: true,
    },
  });

  if (!existing) {
    return NextResponse.json({ message: "勘定科目が見つかりません" }, { status: 404 });
  }

  const body = (await request.json().catch(() => null)) as AccountPatchBody | null;
  if (!body) {
    return NextResponse.json({ message: "更新内容を確認してください" }, { status: 400 });
  }

  const data: {
    code?: string;
    name?: string;
    type?: string;
    taxCategoryId?: string;
  } = {};

  if (body.code !== undefined) {
    const code = body.code.trim();
    if (!code) {
      return NextResponse.json({ message: "コードは必須です" }, { status: 400 });
    }

    const duplicate = await prisma.account.findFirst({
      where: {
        businessId: business.id,
        code,
        NOT: { id: accountId },
      },
    });

    if (duplicate) {
      return NextResponse.json({ message: "同じコードの勘定科目が既に存在します" }, { status: 409 });
    }

    data.code = code;
  }

  if (body.name !== undefined) {
    const name = body.name.trim();
    if (!name) {
      return NextResponse.json({ message: "名称は必須です" }, { status: 400 });
    }
    data.name = name;
  }

  if (body.type !== undefined) {
    const type = body.type.toUpperCase();
    if (!ACCOUNT_TYPES.includes(type as (typeof ACCOUNT_TYPES)[number])) {
      return NextResponse.json({ message: "勘定科目区分が不正です" }, { status: 400 });
    }
    data.type = type;
  }

  if (body.taxCategoryId !== undefined) {
    if (body.taxCategoryId === null || !body.taxCategoryId) {
      return NextResponse.json({ message: "税区分は必須です" }, { status: 400 });
    }

    const taxCategory = await prisma.taxCategory.findUnique({ where: { id: body.taxCategoryId } });
    if (!taxCategory) {
      return NextResponse.json({ message: "指定された税区分が見つかりません" }, { status: 400 });
    }
    data.taxCategoryId = taxCategory.id;
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ message: "更新内容が指定されていません" }, { status: 400 });
  }

  try {
    const updated = await prisma.account.update({
      where: { id: accountId },
      data,
      include: { taxCategory: true },
    });

    return NextResponse.json({
      id: updated.id,
      code: updated.code,
      name: updated.name,
      type: updated.type,
      taxRate: updated.taxCategory?.rate ?? 0,
      taxCategoryCode: updated.taxCategory?.code ?? null,
      taxCategoryId: updated.taxCategoryId,
    });
  } catch (error) {
    return NextResponse.json({ message: "勘定科目の更新に失敗しました" }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: { id: string } }
) {
  const { business } = await getBusinessContext();
  const accountId = params.id;

  const existing = await prisma.account.findFirst({
    where: {
      id: accountId,
      businessId: business.id,
      isActive: true,
    },
  });

  if (!existing) {
    return NextResponse.json({ message: "勘定科目が見つかりません" }, { status: 404 });
  }

  try {
    await prisma.account.update({
      where: { id: accountId },
      data: { isActive: false },
    });

    return NextResponse.json({ message: "勘定科目を削除しました" });
  } catch (error) {
    return NextResponse.json({ message: "勘定科目の削除に失敗しました" }, { status: 500 });
  }
}
