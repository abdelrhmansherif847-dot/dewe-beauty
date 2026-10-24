"use client";

import { useActionState, useEffect } from "react";
import { signIn, signUp, type AuthState } from "@/app/account/actions";

export function AuthForm({ mode, next }: { mode: "sign-in" | "sign-up"; next: string }) {
  const [state, action, pending] = useActionState<AuthState, FormData>(mode === "sign-in" ? signIn : signUp, {
    status: "idle",
  });

  // A full page load after signing in, so no page the browser rendered while
  // signed out (such as a checkout that redirected here) is reused.
  useEffect(() => {
    if (state.status === "signed_in") window.location.assign(state.next);
  }, [state]);

  if (state.status === "signed_in") {
    return (
      <p className="alert alert--success" role="status">
        <span className="spinner" aria-hidden="true" /> Signed in. Taking you back…
      </p>
    );
  }

  if (state.status === "check_email") {
    return (
      <div className="alert alert--success" role="status">
        Check {state.email} for a confirmation link. Once confirmed, you&apos;ll come straight back here.
      </div>
    );
  }

  return (
    <form action={action} className="stack" style={{ "--stack-gap": "1.25rem" } as React.CSSProperties} noValidate>
      <input type="hidden" name="next" value={next} />
      {state.status === "error" && (
        <p className="alert" role="alert">
          {state.message}
        </p>
      )}
      {mode === "sign-up" && (
        <div className="field">
          <label htmlFor="full_name">Full name</label>
          <input id="full_name" name="full_name" className="input" autoComplete="name" required />
        </div>
      )}
      <div className="field">
        <label htmlFor="email">Email</label>
        <input id="email" name="email" type="email" className="input" autoComplete="email" required />
      </div>
      <div className="field">
        <label htmlFor="password">Password</label>
        <input
          id="password"
          name="password"
          type="password"
          className="input"
          autoComplete={mode === "sign-in" ? "current-password" : "new-password"}
          minLength={8}
          required
        />
        {mode === "sign-up" && <span className="field__hint">At least 8 characters.</span>}
      </div>
      <button type="submit" className="btn btn--block" disabled={pending}>
        {pending ? <span className="spinner" aria-hidden="true" /> : null}
        {mode === "sign-in" ? "Sign in" : "Create account"}
      </button>
    </form>
  );
}
