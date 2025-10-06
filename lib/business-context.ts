import { auth } from "@clerk/nextjs/server";

import { prisma } from "@/lib/prisma";
import { ensureBusinessSeed } from "@/lib/seed";

export async function getBusinessContext() {
  const hasClerk = Boolean(process.env.CLERK_SECRET_KEY && process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY);
  let userId: string | null = null;
  if (hasClerk) {
    const authResult = await auth();
    userId = authResult.userId;
  } else {
    userId = "demo-user";
  }

  if (!userId) {
    throw new Error("認証されていません");
  }

  let userProfile = await prisma.userProfile.findUnique({
    where: { clerkUserId: userId },
    include: {
      memberships: {
        include: { business: true },
      },
      activeBusiness: true,
    },
  });

  if (!userProfile) {
    const business = await prisma.business.create({
      data: {
        name: "Demo Business",
      },
    });
    const createdUser = await prisma.userProfile.create({
      data: {
        clerkUserId: userId,
        activeBusinessId: business.id,
      },
    });
    await prisma.businessMembership.create({
      data: {
        businessId: business.id,
        userId: createdUser.id,
        role: "owner",
      },
    });
    userProfile = await prisma.userProfile.findUnique({
      where: { clerkUserId: userId },
      include: {
        memberships: {
          include: { business: true },
        },
        activeBusiness: true,
      },
    });
  }

  if (!userProfile) {
    throw new Error("ユーザープロファイルの作成に失敗しました");
  }

  let activeBusiness = userProfile.activeBusiness;
  if (!activeBusiness) {
    const membership = userProfile.memberships[0];
    if (!membership) {
      const business = await prisma.business.create({
        data: {
          name: "Demo Business",
        },
      });
      await prisma.businessMembership.create({
        data: {
          businessId: business.id,
          userId: userProfile.id,
          role: "owner",
        },
      });
      userProfile = await prisma.userProfile.update({
        where: { id: userProfile.id },
        data: { activeBusinessId: business.id },
        include: {
          memberships: {
            include: { business: true },
          },
          activeBusiness: true,
        },
      });
      activeBusiness = userProfile.activeBusiness;
    } else {
      activeBusiness = membership.business;
      await prisma.userProfile.update({
        where: { id: userProfile.id },
        data: { activeBusinessId: activeBusiness.id },
      });
    }
  }

  if (!activeBusiness) {
    throw new Error("事業の取得に失敗しました");
  }

  await ensureBusinessSeed(activeBusiness.id);

  return {
    userProfile,
    business: activeBusiness,
  };
}
