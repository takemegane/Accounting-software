import { NextResponse } from "next/server";

import { getBusinessContext } from "@/lib/business-context";
import { getJournalDetailData } from "@/lib/report-data";

export async function GET() {
  const { business } = await getBusinessContext();
  const entries = await getJournalDetailData(business.id);

  return NextResponse.json(
    entries.map((entry) => ({
      id: entry.id,
      entryDate: entry.entryDate.toISOString(),
      description: entry.description,
      totals: entry.totals,
      lines: entry.lines.map((line) => ({
        id: line.id,
        accountId: line.accountId,
        accountCode: line.accountCode,
        accountName: line.accountName,
        debit: line.debit,
        credit: line.credit,
        memo: line.memo ?? undefined,
      })),
    }))
  );
}
