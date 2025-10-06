import { PrismaClient } from "@prisma/client";
import path from "path";

const dbUrl = process.env.DATABASE_URL;
if (dbUrl?.startsWith("file:./")) {
  const filePath = dbUrl.slice("file:".length);
  const resolved = path.resolve(process.cwd(), filePath).split(path.sep).join("/");
  process.env.DATABASE_URL = `file:${resolved}`;
}

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: ["warn", "error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
