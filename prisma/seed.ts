import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { hash } from "bcryptjs";
import "dotenv/config";

const connectionString = process.env.DATABASE_URL!;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("🌱 Starting database seed...");

  // Create Farmitecture organization
  const farmitecture = await prisma.organization.upsert({
    where: { slug: "farmitecture" },
    update: {},
    create: {
      name: "Farmitecture",
      slug: "farmitecture",
      brandName: "Farmitecture AI Assistant",
      vectorDbNamespace: "farmitecture_ns",
    },
  });

  console.log("✅ Created organization: Farmitecture");

  // Create Cultivate organization (platform admin)
  const cultivate = await prisma.organization.upsert({
    where: { slug: "cultivate" },
    update: {},
    create: {
      name: "Cultivate",
      slug: "cultivate",
      brandName: "Cultivate Platform",
      vectorDbNamespace: "cultivate_ns",
    },
  });

  console.log("✅ Created organization: Cultivate");

  // Create organization quotas
  const nextMonth = new Date();
  nextMonth.setMonth(nextMonth.getMonth() + 1);

  await prisma.organizationQuota.upsert({
    where: { organizationId: farmitecture.id },
    update: {},
    create: {
      organizationId: farmitecture.id,
      monthlyTokenLimit: 1000000,
      monthlyBudgetUSD: 100,
      resetDate: nextMonth,
    },
  });

  await prisma.organizationQuota.upsert({
    where: { organizationId: cultivate.id },
    update: {},
    create: {
      organizationId: cultivate.id,
      monthlyTokenLimit: 500000,
      monthlyBudgetUSD: 50,
      resetDate: nextMonth,
    },
  });

  console.log("✅ Created organization quotas");

  // Hash passwords
  const hashedPassword = await hash("password123", 12);

  // Create test agronomist for Farmitecture
  const agronomist = await prisma.user.upsert({
    where: { email: "agronomist@farmitecture.com" },
    update: {},
    create: {
      email: "agronomist@farmitecture.com",
      name: "Salia Abdalla",
      password: hashedPassword,
      phone: "+233 24 123 4567",
      role: "AGRONOMIST",
      organizationId: farmitecture.id,
    },
  });

  console.log("✅ Created agronomist: agronomist@farmitecture.com (password: password123)");

  // Create test farmer for Farmitecture
  const farmer = await prisma.user.upsert({
    where: { email: "farmer@farmitecture.com" },
    update: {},
    create: {
      email: "farmer@farmitecture.com",
      name: "Kevin Anokye-Kontoh",
      password: hashedPassword,
      phone: "+233 20 987 6543",
      role: "FARMER",
      organizationId: farmitecture.id,
    },
  });

  console.log("✅ Created farmer: farmer@farmitecture.com (password: password123)");

  // Create platform admin
  const admin = await prisma.user.upsert({
    where: { email: "admin@cultivate.com" },
    update: {},
    create: {
      email: "admin@cultivate.com",
      name: "Admin User",
      password: hashedPassword,
      role: "ADMIN",
      organizationId: cultivate.id,
    },
  });

  console.log("✅ Created admin: admin@cultivate.com (password: password123)");

  console.log("\n🎉 Database seeding completed!\n");
  console.log("Test accounts created:");
  console.log("  Agronomist: agronomist@farmitecture.com / password123");
  console.log("  Farmer: farmer@farmitecture.com / password123");
  console.log("  Admin: admin@cultivate.com / password123");
}

main()
  .catch((e) => {
    console.error("❌ Error seeding database:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
