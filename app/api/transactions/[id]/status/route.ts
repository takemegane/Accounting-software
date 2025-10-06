import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getBusinessContext } from "@/lib/business-context";

const ALLOWED_STATUS = ["pending", "matched", "dismissed"] as const;

type AllowedStatus = (typeof ALLOWED_STATUS)[number];

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  const { business } = await getBusinessContext();
  const transaction = await prisma.transaction.findUnique({ where: { id: params.id } });

  if (!transaction || transaction.businessId !== business.id) {
    return NextResponse.json({ message: "取引が見つかりません" }, { status: 404 });
  }

  const body = (await request.json().catch(() => null)) as { status?: AllowedStatus } | null;
  if (!body?.status || !ALLOWED_STATUS.includes(body.status)) {
    return NextResponse.json({ message: "不正なステータスです" }, { status: 400 });
  }

  const updated = await prisma.transaction.update({
    where: { id: transaction.id },
    data: {
      status: body.status,
    },
  });

  return NextResponse.json({ id: updated.id, status: updated.status });
}
