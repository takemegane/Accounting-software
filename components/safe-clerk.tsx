"use client";

import { ClerkProvider, SignInButton, SignedIn, SignedOut, UserButton } from "@clerk/nextjs";
import type { ComponentProps, ReactNode } from "react";

const hasClerk = Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY);

type ProviderProps = ComponentProps<typeof ClerkProvider>;

export function SafeClerkProvider({ children, ...rest }: ProviderProps) {
  if (!hasClerk) {
    return <>{children}</>;
  }
  return (
    <ClerkProvider {...rest}>
      {children}
    </ClerkProvider>
  );
}

export function SafeSignedIn({ children }: { children: ReactNode }) {
  if (!hasClerk) {
    return <>{children}</>;
  }
  return <SignedIn>{children}</SignedIn>;
}

export function SafeSignedOut({ children }: { children: ReactNode }) {
  if (!hasClerk) {
    return null;
  }
  return <SignedOut>{children}</SignedOut>;
}

export function SafeSignInButton({ children, mode, ...rest }: { children?: ReactNode; mode?: "modal" | "redirect" } & Record<string, unknown>) {
  const buttonProps = rest;
  if (!hasClerk) {
    return (
      <button
        type="button"
        {...buttonProps}
        onClick={() => alert("Clerk APIキーが設定されていません。サインインを利用するには .env にキーを設定してください。")}>
        {children ?? "ログイン"}
      </button>
    );
  }
  return (
    <SignInButton mode={mode} {...rest}>
      {children}
    </SignInButton>
  );
}

export function SafeUserButton(props: Record<string, unknown>) {
  if (!hasClerk) {
    return (
      <div style={{
        padding: "0.4rem 0.8rem",
        borderRadius: "999px",
        background: "rgba(255,255,255,0.2)",
        color: "white",
        fontSize: "0.85rem",
      }}>
        Demo User
      </div>
    );
  }
  return <UserButton {...props} />;
}

export { hasClerk };
