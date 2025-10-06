"use client";

import { SignUp } from "@clerk/nextjs";

export default function SignUpPage() {
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#f8fafc",
        padding: "2rem",
      }}
    >
      <SignUp routing="path" path="/sign-up" signInUrl="/sign-in" />
    </div>
  );
}
