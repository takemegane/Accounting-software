-- RedefineTables
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Transaction" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "businessId" TEXT NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'csv',
    "sourceReference" TEXT,
    "transactionDate" DATETIME NOT NULL,
    "amount" INTEGER NOT NULL,
    "description" TEXT,
    "counterparty" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "rawLine" TEXT,
    "journalEntryId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Transaction_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Transaction_journalEntryId_fkey" FOREIGN KEY ("journalEntryId") REFERENCES "JournalEntry" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Transaction" ("amount", "businessId", "counterparty", "createdAt", "description", "id", "rawLine", "source", "sourceReference", "status", "transactionDate", "updatedAt") SELECT "amount", "businessId", "counterparty", "createdAt", "description", "id", "rawLine", "source", "sourceReference", "status", "transactionDate", "updatedAt" FROM "Transaction";
DROP TABLE "Transaction";
ALTER TABLE "new_Transaction" RENAME TO "Transaction";
PRAGMA foreign_key_check("Transaction");
PRAGMA foreign_keys=ON;
