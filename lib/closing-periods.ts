import { prisma } from "@/lib/prisma";

export class ClosingPeriodError extends Error {
  status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.name = "ClosingPeriodError";
    this.status = status;
  }
}

type CloseInput = {
  businessId: string;
  periodType: string;
  startDate: Date;
  endDate: Date;
  userId: string;
  notes?: string;
};

type ReopenInput = {
  businessId: string;
  periodId: string;
  userId: string;
  notes?: string;
};

function toDate(value: Date | string) {
  return value instanceof Date ? value : new Date(value);
}

function datesOverlap(
  aStart: Date,
  aEnd: Date,
  bStart: Date,
  bEnd: Date
) {
  return aStart <= bEnd && aEnd >= bStart;
}

export async function assertDateUnlocked(businessId: string, entryDate: Date) {
  const lockedPeriod = await prisma.closingPeriod.findFirst({
    where: {
      businessId,
      status: { in: ["closed"] },
      startDate: { lte: entryDate },
      endDate: { gte: entryDate },
    },
    select: { id: true, periodType: true, startDate: true, endDate: true },
  });

  if (lockedPeriod) {
    throw new ClosingPeriodError(
      `指定日付は締め切られています (${lockedPeriod.periodType}: ${lockedPeriod.startDate.toISOString().slice(0, 10)} - ${lockedPeriod.endDate
        .toISOString()
        .slice(0, 10)})`,
      409
    );
  }
}

export async function closePeriod({
  businessId,
  periodType,
  startDate,
  endDate,
  userId,
  notes,
}: CloseInput) {
  const start = toDate(startDate);
  const end = toDate(endDate);
  if (start > end) {
    throw new ClosingPeriodError("開始日が終了日より後になっています", 400);
  }

  const overlapping = await prisma.closingPeriod.findMany({
    where: {
      businessId,
      periodType,
      status: { in: ["closed"] },
    },
    select: { id: true, startDate: true, endDate: true },
  });

  for (const period of overlapping) {
    if (datesOverlap(start, end, period.startDate, period.endDate)) {
      throw new ClosingPeriodError(
        "指定期間は既に締め処理済みです。先に再オープンしてください。",
        409
      );
    }
  }

  const now = new Date();

  const result = await prisma.$transaction(async (tx) => {
    const existing = await tx.closingPeriod.findFirst({
      where: {
        businessId,
        periodType,
        startDate,
        endDate,
      },
    });

    const period = existing
      ? await tx.closingPeriod.update({
          where: { id: existing.id },
          data: {
            status: "closed",
            closedAt: now,
            closedById: userId,
            notes: notes ?? existing.notes,
            reopenedAt: null,
            reopenedById: null,
          },
        })
      : await tx.closingPeriod.create({
          data: {
            businessId,
            periodType,
            startDate,
            endDate,
            status: "closed",
            closedAt: now,
            closedById: userId,
            notes,
          },
        });

    await tx.journalEntry.updateMany({
      where: {
        businessId,
        entryDate: {
          gte: start,
          lte: end,
        },
      },
      data: {
        lockedAt: now,
        lockedById: userId,
      },
    });

    return period;
  });

  return result;
}

export async function reopenPeriod({ businessId, periodId, userId, notes }: ReopenInput) {
  const period = await prisma.closingPeriod.findUnique({
    where: { id: periodId },
  });

  if (!period || period.businessId !== businessId) {
    throw new ClosingPeriodError("締め期間が見つかりません", 404);
  }

  if (period.status !== "closed") {
    throw new ClosingPeriodError("指定期間は既にオープンです", 400);
  }

  const start = period.startDate;
  const end = period.endDate;
  const now = new Date();

  const result = await prisma.$transaction(async (tx) => {
    const updated = await tx.closingPeriod.update({
      where: { id: periodId },
      data: {
        status: "reopened",
        reopenedAt: now,
        reopenedById: userId,
        notes: notes ?? period.notes,
      },
    });

    await tx.journalEntry.updateMany({
      where: {
        businessId,
        entryDate: {
          gte: start,
          lte: end,
        },
      },
      data: {
        lockedAt: null,
        lockedById: null,
      },
    });

    return updated;
  });

  return result;
}

export async function listClosingPeriods(businessId: string) {
  return prisma.closingPeriod.findMany({
    where: { businessId },
    orderBy: [{ endDate: "desc" }],
    include: {
      closedBy: {
        select: { id: true, clerkUserId: true },
      },
      reopenedBy: {
        select: { id: true, clerkUserId: true },
      },
    },
  });
}

export async function getLockStatusForRange(
  businessId: string,
  start: Date,
  end: Date
) {
  return prisma.closingPeriod.findFirst({
    where: {
      businessId,
      status: { in: ["closed"] },
      startDate: { lte: end },
      endDate: { gte: start },
    },
    select: { id: true, periodType: true, startDate: true, endDate: true },
  });
}
