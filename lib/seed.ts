import { prisma } from "@/lib/prisma";

const defaultTaxCategories = [
  {
    code: "EXEMPT",
    name: "非課税",
    rate: 0,
    description: "非課税取引用",
  },
  {
    code: "NON_TAXABLE",
    name: "不課税",
    rate: 0,
    description: "不課税取引用（給与・寄付金など）",
  },
  {
    code: "OUT_OF_SCOPE",
    name: "対象外",
    rate: 0,
    description: "消費税の課税対象外取引用",
  },
  {
    code: "SALE_10",
    name: "課税売上(10%)",
    rate: 0.1,
    description: "通常税率の課税売上",
  },
  {
    code: "PURCHASE_10",
    name: "課税仕入(10%)",
    rate: 0.1,
    description: "通常税率の課税仕入",
  },
];

const defaultAccounts = [
  {
    code: "101",
    name: "現金",
    type: "ASSET" as const,
    taxCategoryCode: "EXEMPT",
  },
  {
    code: "102",
    name: "普通預金",
    type: "ASSET" as const,
    taxCategoryCode: "EXEMPT",
  },
  {
    code: "108",
    name: "仮払消費税等",
    type: "ASSET" as const,
    taxCategoryCode: "PURCHASE_10",
  },
  {
    code: "205",
    name: "仮受消費税等",
    type: "LIABILITY" as const,
    taxCategoryCode: "SALE_10",
  },
  {
    code: "401",
    name: "売上高",
    type: "REVENUE" as const,
    taxCategoryCode: "SALE_10",
  },
  {
    code: "501",
    name: "仕入高",
    type: "EXPENSE" as const,
    taxCategoryCode: "PURCHASE_10",
  },
  {
    code: "507",
    name: "通信費",
    type: "EXPENSE" as const,
    taxCategoryCode: "PURCHASE_10",
  },
];

export async function ensureBusinessSeed(businessId: string) {
  for (const category of defaultTaxCategories) {
    await prisma.taxCategory.upsert({
      where: { code: category.code },
      update: {
        name: category.name,
        rate: category.rate,
        description: category.description,
      },
      create: {
        code: category.code,
        name: category.name,
        rate: category.rate,
        description: category.description,
      },
    });
  }

  let business = await prisma.business.findUnique({ where: { id: businessId } });
  if (!business) {
    throw new Error("事業が見つかりません");
  }

  const accounts = await prisma.account.findMany({
    where: { businessId },
  });

  if (accounts.length === 0) {
    for (const account of defaultAccounts) {
      const taxCategory = await prisma.taxCategory.findUnique({
        where: { code: account.taxCategoryCode },
      });
      if (!taxCategory) {
        continue;
      }

      await prisma.account.create({
        data: {
          businessId,
          code: account.code,
          name: account.name,
          type: account.type,
          taxCategoryId: taxCategory.id,
        },
      });
    }
  }

  const vatReceivable = await prisma.account.findFirst({ where: { businessId, code: "108" } });
  const vatPayable = await prisma.account.findFirst({ where: { businessId, code: "205" } });

  if (!business.vatReceivableAccountId || !business.vatPayableAccountId) {
    business = await prisma.business.update({
      where: { id: businessId },
      data: {
        vatReceivableAccountId: vatReceivable?.id ?? business.vatReceivableAccountId,
        vatPayableAccountId: vatPayable?.id ?? business.vatPayableAccountId,
      },
    });
  }

  return business;
}
