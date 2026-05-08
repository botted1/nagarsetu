import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

declare global {
  // eslint-disable-next-line no-var
  var __prismaClient: PrismaClient | undefined;
}

function createClient() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error(
      "DATABASE_URL is not set. On Vercel, set it in Project → Settings → Environment Variables. Locally, set it in web/.env to a Postgres connection string (e.g. from Neon)."
    );
  }
  const adapter = new PrismaPg(url);
  return new PrismaClient({ adapter });
}

export const prisma = globalThis.__prismaClient ?? createClient();

if (process.env.NODE_ENV !== "production") {
  globalThis.__prismaClient = prisma;
}
