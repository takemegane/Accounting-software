export type PeriodRange = {
  start: Date;
  end: Date;
  label: string;
  fiscalYearStart: Date;
};

function toDateUTC(year: number, month: number, day: number) {
  return new Date(Date.UTC(year, month, day));
}

export function resolveMonthlyPeriod(period: string | null, fiscalYearStartMonth: number): PeriodRange {
  const now = new Date();
  const [yearInput, monthInput] = period?.split("-") ?? [];
  const year = yearInput ? Number(yearInput) : now.getFullYear();
  const month = monthInput ? Number(monthInput) : now.getMonth() + 1;

  const start = toDateUTC(year, month - 1, 1);
  const end = toDateUTC(year, month, 0);

  let fiscalYearStartYear = year;
  if (month < fiscalYearStartMonth) {
    fiscalYearStartYear -= 1;
  }

  const fiscalYearStart = toDateUTC(fiscalYearStartYear, fiscalYearStartMonth - 1, 1);

  return {
    start,
    end: new Date(end.getFullYear(), end.getMonth(), end.getDate(), 23, 59, 59, 999),
    label: `${year}年${month}月`,
    fiscalYearStart,
  };
}

export function calcNetByAccountType(accountType: string, debit: number, credit: number) {
  if (accountType === "ASSET" || accountType === "EXPENSE") {
    return debit - credit;
  }
  return credit - debit;
}

export function formatCurrency(value: number) {
  if (!Number.isFinite(value)) return "0";
  return value.toLocaleString("ja-JP");
}
