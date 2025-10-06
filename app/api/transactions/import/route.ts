import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { parseTransactionCsv } from "@/lib/csv-import";
import { getBusinessContext } from "@/lib/business-context";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const contentType = request.headers.get("content-type") ?? "";
  if (!contentType.includes("multipart/form-data")) {
    return NextResponse.json({ message: "ファイルが選択されていません" }, { status: 400 });
  }

  const formData = await request.formData();
  const file = formData.get("file");

  if (!(file instanceof File)) {
    return NextResponse.json({ message: "CSVファイルを選択してください" }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const text = buffer.toString("utf-8");

  const { transactions, errors } = parseTransactionCsv(text);

  if (transactions.length === 0) {
    return NextResponse.json(
      {
        message: "インポート可能な取引が見つかりませんでした",
        errors,
      },
      { status: 422 }
    );
  }

  const { business } = await getBusinessContext();

  let importedCount = 0;
  let duplicateCount = 0;

  for (const transaction of transactions) {
    const duplicate = await prisma.transaction.findFirst({
      where: {
        businessId: business.id,
        transactionDate: transaction.transactionDate,
        amount: transaction.amount,
      },
    });

    if (duplicate) {
      duplicateCount += 1;
      continue;
    }

    await prisma.transaction.create({
      data: {
        businessId: business.id,
        transactionDate: transaction.transactionDate,
        amount: transaction.amount,
        description: transaction.description,
        counterparty: transaction.counterparty,
        rawLine: transaction.rawLine,
        source: "csv",
        status: "pending",
      },
    });
    importedCount += 1;
  }

  return NextResponse.json({
    message: `${importedCount}件の取引を取り込みました` + (duplicateCount ? `（重複 ${duplicateCount}件は除外）` : ""),
    importedCount,
    duplicateCount,
    errors,
  });
}
