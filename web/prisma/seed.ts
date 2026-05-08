import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { DEPARTMENT_SEED } from "../lib/departments";

const url = process.env.DATABASE_URL?.replace(/^file:/, "") ?? "./dev.db";
const adapter = new PrismaBetterSqlite3({ url });
const prisma = new PrismaClient({ adapter });

async function main() {
  for (const dept of DEPARTMENT_SEED) {
    await prisma.department.upsert({
      where: { slug: dept.slug },
      create: {
        slug: dept.slug,
        name: dept.name,
        description: dept.description,
        contactEmail: dept.contactEmail,
        color: dept.color,
        icon: dept.icon,
      },
      update: {
        name: dept.name,
        description: dept.description,
        contactEmail: dept.contactEmail,
        color: dept.color,
        icon: dept.icon,
      },
    });
  }

  const adminEmail = (process.env.ADMIN_EMAIL ?? "admin@smartcity.local")
    .trim()
    .toLowerCase();
  const publicWorks = await prisma.department.findUnique({
    where: { slug: "public-works" },
  });

  // Demote any existing ADMIN whose email no longer matches ADMIN_EMAIL.
  // This keeps role state in sync when you change ADMIN_EMAIL and re-seed.
  await prisma.user.updateMany({
    where: { role: "ADMIN", email: { not: adminEmail } },
    data: { role: "CITIZEN", departmentId: null },
  });

  // Promote the configured admin email.
  await prisma.user.upsert({
    where: { email: adminEmail },
    create: {
      email: adminEmail,
      name: "Municipal Admin",
      role: "ADMIN",
      departmentId: publicWorks?.id,
      emailVerified: new Date(),
    },
    update: {
      role: "ADMIN",
      departmentId: publicWorks?.id,
    },
  });

  // Demo citizen + a couple of seed grievances so the dashboard isn't empty on first load.
  const demoCitizen = await prisma.user.upsert({
    where: { email: "demo.citizen@smartcity.local" },
    create: {
      email: "demo.citizen@smartcity.local",
      name: "Riya Sharma",
      role: "CITIZEN",
      emailVerified: new Date(),
    },
    update: {},
  });

  const sanitation = await prisma.department.findUnique({
    where: { slug: "sanitation" },
  });
  const electrical = await prisma.department.findUnique({
    where: { slug: "electrical" },
  });

  const existingDemo = await prisma.grievance.findFirst({
    where: { userId: demoCitizen.id, title: "Large pothole near 12th Main" },
  });

  if (!existingDemo && publicWorks && sanitation && electrical) {
    await prisma.grievance.create({
      data: {
        userId: demoCitizen.id,
        title: "Large pothole near 12th Main",
        description:
          "There's a deep pothole on 12th Main Road, Indiranagar that's been there for two weeks. Two-wheelers have already had close calls.",
        category: "Roads",
        priority: "HIGH",
        status: "ACKNOWLEDGED",
        departmentId: publicWorks.id,
        address: "12th Main Rd, Indiranagar, Bengaluru",
        lat: 12.9719,
        lng: 77.6412,
        draftedComplaint:
          "To,\nThe Commissioner,\nBruhat Bengaluru Mahanagara Palike,\n\nSubject: Urgent attention required — large pothole on 12th Main, Indiranagar\n\nRespected Sir/Madam,\nI am writing to formally bring to your notice...",
        agentReasoning:
          "Description mentions 'pothole' and 'road' — clearly a Public Works concern. Priority HIGH because of safety risk to two-wheelers.",
      },
    });

    await prisma.grievance.create({
      data: {
        userId: demoCitizen.id,
        title: "Streetlight out at 4th Cross",
        description:
          "The streetlight at 4th Cross, HSR Layout, Sector 2 has been out for 4 nights. The whole stretch is pitch dark.",
        category: "Street Lighting",
        priority: "MEDIUM",
        status: "IN_PROGRESS",
        departmentId: electrical.id,
        address: "4th Cross, HSR Layout Sector 2, Bengaluru",
        lat: 12.9116,
        lng: 77.6473,
      },
    });

    await prisma.grievance.create({
      data: {
        userId: demoCitizen.id,
        title: "Garbage uncleared near park",
        description:
          "Garbage has been piling up next to the children's park on 5th Block for over a week. Smell is unbearable.",
        category: "Solid Waste",
        priority: "MEDIUM",
        status: "RESOLVED",
        departmentId: sanitation.id,
        address: "5th Block, Koramangala, Bengaluru",
        lat: 12.9352,
        lng: 77.6245,
      },
    });
  }

  console.log("✅ Seed complete — departments, admin, demo citizen.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
