import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { ensureBusinessSeed } from "@/lib/seed";
import { getBusinessContext } from "@/lib/business-context";

const TAX_PREF_VALUES = ["TAX_INCLUSIVE", "TAX_EXCLUSIVE"] as const;

function serializeBusiness(business: { id: string; name: string; taxPreference: string; vatPayableAccountId: string | null; vatReceivableAccountId: string | null; fiscalYearStartMonth: number; createdAt: Date; updatedAt: Date; }) {
  return {
    id: business.id,
    name: business.name,
    taxPreference: business.taxPreference,
    vatPayableAccountId: business.vatPayableAccountId,
    vatReceivableAccountId: business.vatReceivableAccountId,
    fiscalYearStartMonth: business.fiscalYearStartMonth,
    createdAt: business.createdAt,
    updatedAt: business.updatedAt,
  };
}

export async function GET() {
  const { business, userProfile } = await getBusinessContext();

  const memberships = await prisma.businessMembership.findMany({
    where: { userId: userProfile.id },
    include: { business: true },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json({
    activeBusiness: serializeBusiness(business),
    businesses: memberships.map((membership) => ({
      id: membership.business.id,
      name: membership.business.name,
      role: membership.role,
      isActive: membership.businessId === userProfile.activeBusinessId,
    })),
  });
}

export async function POST(request: Request) {
  const { userProfile } = await getBusinessContext();
  const body = (await request.json().catch(() => null)) as { name?: string; fiscalYearStartMonth?: number } | null;

  const name = body?.name?.trim() || "新しい事業";
  const fiscalYearStartMonth = body?.fiscalYearStartMonth && body.fiscalYearStartMonth >= 1 && body.fiscalYearStartMonth <= 12
    ? body.fiscalYearStartMonth
    : 1;

  const business = await prisma.business.create({
    data: {
      name,
      fiscalYearStartMonth,
    },
  });

  await prisma.businessMembership.create({
    data: {
      businessId: business.id,
      userId: userProfile.id,
      role: "owner",
    },
  });

  await prisma.userProfile.update({
    where: { id: userProfile.id },
    data: { activeBusinessId: business.id },
  });

  await ensureBusinessSeed(business.id);

  return NextResponse.json({ message: "事業を作成しました", business: serializeBusiness(business) }, { status: 201 });
}

export async function PATCH(request: Request) {
  const { business, userProfile } = await getBusinessContext();

  const body = (await request.json().catch(() => null)) as {
    taxPreference?: string;
    vatPayableAccountId?: string | null;
    vatReceivableAccountId?: string | null;
    activeBusinessId?: string;
    name?: string;
  } | null;

  if (!body) {
    return NextResponse.json({ message: "更新内容が指定されていません" }, { status: 400 });
  }

  if (body.activeBusinessId) {
    const membership = await prisma.businessMembership.findFirst({
      where: {
        userId: userProfile.id,
        businessId: body.activeBusinessId,
      },
    });
    if (!membership) {
      return NextResponse.json({ message: "アクセス権のない事業です" }, { status: 403 });
    }
    await prisma.userProfile.update({
      where: { id: userProfile.id },
      data: { activeBusinessId: body.activeBusinessId },
    });
    const updatedBusiness = await prisma.business.findUniqueOrThrow({ where: { id: body.activeBusinessId } });
    await ensureBusinessSeed(updatedBusiness.id);
    return NextResponse.json({
      message: "アクティブ事業を切り替えました",
      activeBusiness: serializeBusiness(updatedBusiness),
    });
  }

  const data: Partial<{ taxPreference: string; vatPayableAccountId: string | null; vatReceivableAccountId: string | null; name: string }> = {};

  if (body.taxPreference) {
    const nextPref = body.taxPreference.toUpperCase();
    if (!TAX_PREF_VALUES.includes(nextPref as (typeof TAX_PREF_VALUES)[number])) {
      return NextResponse.json({ message: "税区分の指定が不正です" }, { status: 400 });
    }
    data.taxPreference = nextPref;
  }

  if (body.name) {
    data.name = body.name.trim();
  }

  const needsVatPayableCheck = Object.prototype.hasOwnProperty.call(body, "vatPayableAccountId");
  const needsVatReceivableCheck = Object.prototype.hasOwnProperty.call(body, "vatReceivableAccountId");

  if (needsVatPayableCheck) {
    if (body.vatPayableAccountId === null) {
      data.vatPayableAccountId = null;
    } else {
      const account = await prisma.account.findFirst({
        where: {
          id: body.vatPayableAccountId ?? undefined,
          businessId: business.id,
        },
      });
      if (!account) {
        return NextResponse.json({ message: "仮受消費税の勘定科目が無効です" }, { status: 400 });
      }
      data.vatPayableAccountId = account.id;
    }
  }

  if (needsVatReceivableCheck) {
    if (body.vatReceivableAccountId === null) {
      data.vatReceivableAccountId = null;
    } else {
      const account = await prisma.account.findFirst({
        where: {
          id: body.vatReceivableAccountId ?? undefined,
          businessId: business.id,
        },
      });
      if (!account) {
        return NextResponse.json({ message: "仮払消費税の勘定科目が無効です" }, { status: 400 });
      }
      data.vatReceivableAccountId = account.id;
    }
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ message: "更新内容が指定されていません" }, { status: 400 });
  }

  const updated = await prisma.business.update({
    where: { id: business.id },
    data,
  });

  return NextResponse.json({
    message: "事業を更新しました",
    business: serializeBusiness(updated),
  });
}
