import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

const hasClerk = Boolean(process.env.CLERK_SECRET_KEY && process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY);

const isPublicRoute = createRouteMatcher([
  "/",
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/manifest.webmanifest",
  "/icon-192.png",
  "/icon-512.png",
  "/sw.js",
]);

const clerkAuthMiddleware = clerkMiddleware(async (auth, req) => {
  const authResult = await auth();
  if (!isPublicRoute(req) && !authResult.userId) {
    return authResult.redirectToSignIn({ returnBackUrl: req.url });
  }
});

export default hasClerk
  ? clerkAuthMiddleware
  : function middleware() {
      return NextResponse.next();
    };

export const config = {
  matcher: ["/((?!_next|.*\\..*).*)"],
};
