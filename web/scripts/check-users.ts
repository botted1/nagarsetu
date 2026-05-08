import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const url = process.env.DATABASE_URL;
if (!url) throw new Error("DATABASE_URL is not set");
const prisma = new PrismaClient({ adapter: new PrismaPg(url) });

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
