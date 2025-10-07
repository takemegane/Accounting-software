import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const { rate } = body;

    if (typeof rate !== "number" || rate < 0 || rate > 1) {
      return NextResponse.json(
        { message: "税率は0〜1の範囲で指定してください" },
        { status: 400 }
      );
    }

    const category = await prisma.taxCategory.findUnique({
      where: { id: params.id },
    });

    if (!category) {
      return NextResponse.json(
        { message: "税区分が見つかりません" },
        { status: 404 }
      );
    }

    const updated = await prisma.taxCategory.update({
      where: { id: params.id },
      data: { rate },
    });

    return NextResponse.json({
      id: updated.id,
      code: updated.code,
      name: updated.name,
      rate: updated.rate,
      description: updated.description ?? undefined,
    });
  } catch (error) {
    console.error("Failed to update tax category", error);
    return NextResponse.json(
      { message: "税率の更新に失敗しました" },
      { status: 500 }
    );
  }
}
