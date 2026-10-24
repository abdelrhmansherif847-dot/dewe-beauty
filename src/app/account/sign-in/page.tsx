import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { AuthForm } from "@/components/account/auth-form";
import { safeNext } from "@/lib/safe-redirect";

export const metadata: Metadata = { title: "Sign in", robots: { index: false } };

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default function SignInPage({ searchParams }: { searchParams: SearchParams }) {
  return (
    <div className="container section">
      <div className="auth-card stack" style={{ "--stack-gap": "1.5rem" } as React.CSSProperties}>
        <div className="stack" style={{ "--stack-gap": "0.5rem", textAlign: "center" } as React.CSSProperties}>
          <p className="eyebrow">Your account</p>
          <h1 className="title-lg">Welcome to DEWÉ</h1>
          <p className="muted">Sign in with your mobile number to follow your orders.</p>
        </div>
        <Suspense fallback={<div className="skeleton" style={{ height: 320 }} />}>
          <AuthPanel searchParams={searchParams} />
        </Suspense>
      </div>
    </div>
  );
}

async function AuthPanel({ searchParams }: { searchParams: SearchParams }) {
  const sp = await searchParams;
  const mode = sp.mode === "sign-up" ? "sign-up" : "sign-in";
  const next = safeNext(typeof sp.next === "string" ? sp.next : undefined);
  const qs = (m: string) => `/account/sign-in?mode=${m}&next=${encodeURIComponent(next)}`;
  return (
    <>
      <nav className="tabs" aria-label="Account options">
        <Link href={qs("sign-in")} aria-current={mode === "sign-in" ? "page" : undefined} replace>
          Sign in
        </Link>
        <Link href={qs("sign-up")} aria-current={mode === "sign-up" ? "page" : undefined} replace>
          Create account
        </Link>
      </nav>
      <div className="panel">
        <AuthForm key={mode} mode={mode} next={next} />
      </div>
      {next.startsWith("/checkout") && (
        <p className="muted" style={{ textAlign: "center" }}>
          No account needed to order.{" "}
          <Link href="/checkout?as=guest" data-testid="guest-from-sign-in">
            Continue as guest
          </Link>
        </p>
      )}
      {sp.error === "auth" && (
        <p className="alert" role="alert">
          That sign-in link has expired or was already used. Please sign in again.
        </p>
      )}
    </>
  );
}
