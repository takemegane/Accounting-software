import { NextResponse } from "next/server";

import { getBusinessContext } from "@/lib/business-context";
import {
  ClosingPeriodError,
  assertDateUnlocked,
  closePeriod,
  listClosingPeriods,
  reopenPeriod,
} from "@/lib/closing-periods";

export async function GET() {
  const { business } = await getBusinessContext();
  const periods = await listClosingPeriods(business.id);
  return NextResponse.json(periods);
}

type CloseRequestBody = {
  action: "close";
  periodType: string;
  startDate: string;
  endDate: string;
  notes?: string;
};

type ReopenRequestBody = {
  action: "reopen";
  periodId: string;
  notes?: string;
};

type RequestBody = CloseRequestBody | ReopenRequestBody;

export async function POST(request: Request) {
  const body = (await request.json()) as RequestBody;
  const { business, userProfile } = await getBusinessContext();

  try {
    if (body.action === "close") {
      const { periodType, startDate, endDate, notes } = body;
      const start = new Date(startDate);
      const end = new Date(endDate);
      await assertDateUnlocked(business.id, start);
      await assertDateUnlocked(business.id, end);

      const period = await closePeriod({
        businessId: business.id,
        periodType,
        startDate: start,
        endDate: end,
        userId: userProfile.id,
        notes,
      });
      return NextResponse.json(period, { status: 201 });
    }

    if (body.action === "reopen") {
      const { periodId, notes } = body;
      const period = await reopenPeriod({
        businessId: business.id,
        periodId,
        userId: userProfile.id,
        notes,
      });
      return NextResponse.json(period);
    }

    return NextResponse.json({ message: "不正なアクションです" }, { status: 400 });
  } catch (error) {
    if (error instanceof ClosingPeriodError) {
      return NextResponse.json({ message: error.message }, { status: error.status });
    }
    return NextResponse.json({ message: "締め処理に失敗しました" }, { status: 500 });
  }
}
