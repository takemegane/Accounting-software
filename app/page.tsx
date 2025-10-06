import Link from "next/link";
import { SafeSignedIn, SafeSignedOut, SafeSignInButton } from "@/components/safe-clerk";

export default function HomePage() {
  return (
    <main style={{ maxWidth: "720px", margin: "0 auto", padding: "3rem 1.5rem" }}>
      <section>
        <h1 style={{ fontSize: "2.5rem", marginBottom: "1rem" }}>シンプルな会計ツール</h1>
        <p style={{ lineHeight: 1.7, marginBottom: "2rem" }}>
          日々の仕訳入力から試算表・確定申告書の作成までを支援する、個人事業主向けの軽量な会計アプリのプロトタイプです。
        </p>
        <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap" }}>
          <SafeSignedIn>
            <Link
              href="/dashboard"
              style={{
                padding: "0.75rem 1.5rem",
                borderRadius: "0.75rem",
                backgroundColor: "#2563eb",
                color: "white",
                fontWeight: 600,
              }}
            >
              ダッシュボードへ
            </Link>
            <Link
              href="/transactions"
              style={{
                padding: "0.75rem 1.5rem",
                borderRadius: "0.75rem",
                border: "1px solid #d1d5db",
                fontWeight: 600,
                backgroundColor: "white",
              }}
            >
              取引管理へ
            </Link>
          </SafeSignedIn>
          <SafeSignedOut>
            <SafeSignInButton mode="modal">
              <button
                style={{
                  padding: "0.75rem 1.5rem",
                  borderRadius: "0.75rem",
                  backgroundColor: "#2563eb",
                  color: "white",
                  fontWeight: 600,
                  border: "none",
                  cursor: "pointer",
                }}
              >
                ログインして始める
              </button>
            </SafeSignInButton>
          </SafeSignedOut>
          <Link
            href="https://github.com/"
            target="_blank"
            rel="noreferrer"
            style={{
              padding: "0.75rem 1.5rem",
              borderRadius: "0.75rem",
              border: "1px solid #d1d5db",
              fontWeight: 600,
            }}
          >
            GitHub リポジトリ
          </Link>
        </div>
      </section>
    </main>
  );
}
