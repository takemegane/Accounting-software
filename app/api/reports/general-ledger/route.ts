import { NextResponse } from "next/server";

import { getBusinessContext } from "@/lib/business-context";
import { getGeneralLedgerData } from "@/lib/report-data";

export async function GET() {
  const { business } = await getBusinessContext();
  const ledger = await getGeneralLedgerData(business.id);

  return NextResponse.json(
    ledger.map((account) => ({
      accountId: account.accountId,
      code: account.code,
      name: account.name,
      type: account.type,
      totals: account.totals,
      entries: account.entries.map((entry) => ({
        lineId: entry.lineId,
        journalEntryId: entry.journalEntryId,
        entryDate: entry.entryDate.toISOString(),
        description: entry.description ?? undefined,
        debit: entry.debit,
        credit: entry.credit,
        memo: entry.memo ?? undefined,
        balance: entry.balance,
      })),
    }))
  );
}
