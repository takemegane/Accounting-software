import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const categories = await prisma.taxCategory.findMany({
      orderBy: [{ code: "asc" }],
    });

    return NextResponse.json(
      categories.map((category) => ({
        id: category.id,
        code: category.code,
        name: category.name,
        rate: category.rate,
        description: category.description ?? undefined,
      }))
    );
  } catch (error) {
    console.error("Failed to load tax categories", error);
    return NextResponse.json(
      { message: "税区分の取得に失敗しました" },
      { status: 500 }
    );
  }
}
