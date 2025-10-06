import type { Metadata } from "next";
import { SafeClerkProvider } from "@/components/safe-clerk";
import "./globals.css";
import { ReactQueryProvider } from "@/components/react-query-provider";

export const metadata: Metadata = {
  title: "シンプル会計",
  description: "個人事業主向けの軽量会計アプリ prototype",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SafeClerkProvider
      appearance={{
        variables: { colorPrimary: "#2563eb" },
      }}
    >
      <html lang="ja">
        <body>
          <ReactQueryProvider>{children}</ReactQueryProvider>
        </body>
      </html>
    </SafeClerkProvider>
  );
}
