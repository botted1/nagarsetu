import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";

const url = process.env.DATABASE_URL?.replace(/^file:/, "") ?? "./dev.db";
const prisma = new PrismaClient({ adapter: new PrismaBetterSqlite3({ url }) });

async function main() {
  const users = await prisma.user.findMany({
    select: { email: true, role: true, name: true, phone: true, departmentId: true },
    orderBy: { role: "asc" },
  });
  for (const u of users) {
    const name = u.name ? `"${u.name}"` : "<no name>";
    const phone = u.phone ? ` · ${u.phone}` : "";
    console.log(`  ${u.role.padEnd(8)} ${u.email.padEnd(34)} ${name}${phone}`);
  }
  await prisma.$disconnect();
}
main();
