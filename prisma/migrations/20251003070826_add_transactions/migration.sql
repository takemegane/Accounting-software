-- CreateTable
CREATE TABLE "Transaction" (
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
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Transaction_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
