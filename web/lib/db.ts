import { PrismaClient } from "@prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";

declare global {
  // eslint-disable-next-line no-var
  var __prismaClient: PrismaClient | undefined;
}

function createClient() {
  const url = process.env.DATABASE_URL?.replace(/^file:/, "") ?? "./dev.db";
  const adapter = new PrismaBetterSqlite3({ url });
  return new PrismaClient({ adapter });
}

export const prisma = globalThis.__prismaClient ?? createClient();

if (process.env.NODE_ENV !== "production") {
  globalThis.__prismaClient = prisma;
}
