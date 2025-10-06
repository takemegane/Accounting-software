import { NextRequest, NextResponse } from "next/server";
import { getIncomeStatementData } from "@/lib/report-data";
import { getBusinessContext } from "@/lib/business-context";

export async function GET(request: NextRequest) {
  const { business } = await getBusinessContext();
  const periodParam = request.nextUrl.searchParams.get("period");
  const report = await getIncomeStatementData(business.id, business.fiscalYearStartMonth, periodParam);

  return NextResponse.json({
    period: report.label,
    fiscalYearStart: report.fiscalYearStart.toISOString(),
    rows: report.rows,
    totals: report.totals,
    yearToDate: report.yearToDate,
  });
}
