import Papa from "papaparse";

export type ParsedTransaction = {
  transactionDate: Date;
  amount: number;
  description?: string;
  counterparty?: string;
  rawLine: string;
};

const DATE_CANDIDATES = ["date", "transaction_date", "日付", "取引日", "利用日", "精算日"];
const DESCRIPTION_CANDIDATES = [
  "description",
  "details",
  "memo",
  "内容",
  "摘要",
  "備考",
  "利用者",
];
const COUNTERPARTY_CANDIDATES = ["counterparty", "payee", "相手先", "支払先", "利用店名", "取引先"];
const AMOUNT_CANDIDATES = ["amount", "金額", "利用金額"];
const DEPOSIT_CANDIDATES = ["deposit", "入金", "入金金額", "預かり金額", "入金額"];
const WITHDRAWAL_CANDIDATES = ["withdrawal", "出金", "出金金額", "支払金額", "支払額"]; 

function normaliseKey(key: string) {
  return key.trim().toLowerCase();
}

function findColumn(headers: string[], candidates: string[]) {
  const normalized = headers.map((header) => ({ original: header, key: normaliseKey(header) }));
  for (const candidate of candidates) {
    const candidateKey = normaliseKey(candidate);
    const found = normalized.find((header) => header.key.includes(candidateKey));
    if (found) {
      return found.original;
    }
  }
  return undefined;
}

function parseAmount(value: string | undefined) {
  if (!value) return undefined;
  const normalised = value
    .replace(/,/g, "")
    .replace(/円/g, "")
    .replace(/\s/g, "")
    .replace(/\(([^)]+)\)/g, "-$1");
  const parsed = Number(normalised);
  if (Number.isFinite(parsed) && parsed !== 0) {
    return Math.round(parsed);
  }
  return undefined;
}

function parseDate(value: string | undefined) {
  if (!value) return undefined;
  const trimmed = value.trim().replace(/\./g, "-");
  const isoLike = trimmed.match(/^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})$/);
  if (isoLike) {
    const [_, year, month, day] = isoLike;
    const date = new Date(Number(year), Number(month) - 1, Number(day));
    if (!Number.isNaN(date.getTime())) {
      return date;
    }
  }
  const altLike = trimmed.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})$/);
  if (altLike) {
    const [_, month, day, year] = altLike;
    const y = Number(year.length === 2 ? `20${year}` : year);
    const date = new Date(y, Number(month) - 1, Number(day));
    if (!Number.isNaN(date.getTime())) {
      return date;
    }
  }
  const parsed = new Date(trimmed);
  if (!Number.isNaN(parsed.getTime())) {
    return parsed;
  }
  return undefined;
}

export function parseTransactionCsv(csvText: string): {
  transactions: ParsedTransaction[];
  errors: string[];
} {
  const parsed = Papa.parse<Record<string, string>>(csvText, {
    header: true,
    skipEmptyLines: "greedy",
  });

  const errors: string[] = [];
  if (parsed.errors.length > 0) {
    parsed.errors.forEach((error) => {
      if (error.message) {
        errors.push(error.message);
      }
    });
  }

  const rows = parsed.data ?? [];
  if (!parsed.meta.fields || parsed.meta.fields.length === 0) {
    return { transactions: [], errors: [...errors, "CSV にヘッダー行が見つかりませんでした"] };
  }
  const headers = parsed.meta.fields;

  const dateColumn = findColumn(headers, DATE_CANDIDATES);
  const amountColumn = findColumn(headers, AMOUNT_CANDIDATES);
  const depositColumn = findColumn(headers, DEPOSIT_CANDIDATES);
  const withdrawalColumn = findColumn(headers, WITHDRAWAL_CANDIDATES);

  if (!dateColumn || (!amountColumn && !depositColumn && !withdrawalColumn)) {
    return {
      transactions: [],
      errors: [...errors, "対応する日付または金額の列が見つかりませんでした"],
    };
  }

  const descriptionColumn = findColumn(headers, DESCRIPTION_CANDIDATES);
  const counterpartyColumn = findColumn(headers, COUNTERPARTY_CANDIDATES);

  const transactions: ParsedTransaction[] = [];

  for (const row of rows) {
    const rawLine = JSON.stringify(row);
    const dateValue = row[dateColumn];
    const parsedDate = parseDate(dateValue);
    if (!parsedDate) {
      continue;
    }

    let amount: number | undefined;

    if (amountColumn) {
      amount = parseAmount(row[amountColumn]);
    }

    if (amount === undefined && (depositColumn || withdrawalColumn)) {
      const deposit = parseAmount(depositColumn ? row[depositColumn] : undefined) ?? 0;
      const withdrawal = parseAmount(withdrawalColumn ? row[withdrawalColumn] : undefined) ?? 0;
      amount = deposit - withdrawal;
    }

    if (amount === undefined || amount === 0) {
      continue;
    }

    const description = descriptionColumn ? row[descriptionColumn]?.trim() : undefined;
    const counterparty = counterpartyColumn ? row[counterpartyColumn]?.trim() : undefined;

    transactions.push({
      transactionDate: parsedDate,
      amount,
      description,
      counterparty,
      rawLine,
    });
  }

  return { transactions, errors };
}
