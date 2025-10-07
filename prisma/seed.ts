import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Starting database seed...");

  // 税区分の作成
  const taxCategories = [
    { code: "TAX_FREE", name: "非課税", rate: 0 },
    { code: "TAX_EXEMPT", name: "免税", rate: 0 },
    { code: "TAX_10", name: "課税売上10%", rate: 0.1 },
    { code: "TAX_8", name: "課税売上8%(軽減)", rate: 0.08 },
    { code: "TAX_PURCHASE_10", name: "課税仕入10%", rate: 0.1 },
    { code: "TAX_PURCHASE_8", name: "課税仕入8%(軽減)", rate: 0.08 },
    { code: "NON_TAXABLE", name: "不課税", rate: 0 },
  ];

  console.log("Creating tax categories...");
  for (const category of taxCategories) {
    await prisma.taxCategory.upsert({
      where: { code: category.code },
      update: {},
      create: category,
    });
  }

  console.log("✅ Database seeding completed successfully!");
}

main()
  .catch((e) => {
    console.error("❌ Error seeding database:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
