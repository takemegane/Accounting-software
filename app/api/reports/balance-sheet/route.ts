import { NextRequest, NextResponse } from "next/server";

import { getBusinessContext } from "@/lib/business-context";
import { getBalanceSheetData } from "@/lib/report-data";

export async function GET(request: NextRequest) {
  const { business } = await getBusinessContext();
  const periodParam = request.nextUrl.searchParams.get("period");
  const report = await getBalanceSheetData(business.id, business.fiscalYearStartMonth, periodParam);

  return NextResponse.json({
    period: report.label,
    fiscalYearStart: report.fiscalYearStart.toISOString(),
    assets: report.assets,
    liabilities: report.liabilities,
    equity: report.equity,
    totals: report.totals,
  });
}
