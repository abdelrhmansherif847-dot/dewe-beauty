"use client";

import { useActionState, useEffect } from "react";
import { resendCode, signIn, signUp, verifyPhone, type AuthState } from "@/app/account/actions";
import { PHONE_HINT, formatEgMobile } from "@/lib/phone";
import { keepFieldsOnSubmit } from "@/components/ui/use-keep-fields";

const optional = <span style={{ textTransform: "none", letterSpacing: 0, fontWeight: 400 }}> (optional)</span>;

export function AuthForm({ mode, next }: { mode: "sign-in" | "sign-up"; next: string }) {
  const [state, action, pending] = useActionState<AuthState, FormData>(mode === "sign-in" ? signIn : signUp, {
    status: "idle",
  });

  // A full page load after signing in, so no page the browser rendered while
  // signed out (such as a checkout that redirected here) is reused.
  useEffect(() => {
    if (state.status === "signed_in") window.location.assign(state.next);
  }, [state]);

  if (state.status === "signed_in") return <SignedIn />;
  if (state.status === "verify_phone") return <VerifyPhoneForm initial={state} />;

  return (
    <form onSubmit={keepFieldsOnSubmit(action)} className="stack" style={{ "--stack-gap": "1.25rem" } as React.CSSProperties} noValidate>
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
        <label htmlFor="phone">Mobile number</label>
        <input
          id="phone"
          name="phone"
          type="tel"
          inputMode="tel"
          className="input"
          autoComplete="tel"
          aria-describedby="phone-hint"
          required
        />
        <span id="phone-hint" className="field__hint">
          {PHONE_HINT}
        </span>
      </div>
      {mode === "sign-up" && (
        <div className="field">
          <label htmlFor="email">Email{optional}</label>
          <input
            id="email"
            name="email"
            type="email"
            className="input"
            autoComplete="email"
            aria-describedby="email-hint"
          />
          <span id="email-hint" className="field__hint">
            Not needed to sign in. We don&apos;t send emails yet.
          </span>
        </div>
      )}
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

function SignedIn() {
  return (
    <p className="alert alert--success" role="status">
      <span className="spinner" aria-hidden="true" /> Signed in. Taking you back…
    </p>
  );
}

const verifyOrResend = (prev: AuthState, formData: FormData) =>
  formData.get("intent") === "resend" ? resendCode(prev, formData) : verifyPhone(prev, formData);

/** The one-time code step. The account only works once Supabase accepts the code. */
function VerifyPhoneForm({ initial }: { initial: Extract<AuthState, { status: "verify_phone" }> }) {
  const [state, action, pending] = useActionState<AuthState, FormData>(verifyOrResend, initial);

  useEffect(() => {
    if (state.status === "signed_in") window.location.assign(state.next);
  }, [state]);

  if (state.status === "signed_in") return <SignedIn />;
  const phone = state.status === "verify_phone" ? state.phone : initial.phone;
  const message = state.status === "verify_phone" ? state.message : state.status === "error" ? state.message : undefined;

  return (
    <form onSubmit={keepFieldsOnSubmit(action)} className="stack" style={{ "--stack-gap": "1.25rem" } as React.CSSProperties} noValidate>
      <input type="hidden" name="phone" value={phone} />
      <input type="hidden" name="next" value={initial.next} />
      <p className="muted" data-testid="otp-sent">
        We texted a 6-digit code to <strong dir="ltr">{formatEgMobile(phone)}</strong>. Enter it to confirm your number.
      </p>
      {message && (
        <p className="alert" role="alert">
          {message}
        </p>
      )}
      <div className="field">
        <label htmlFor="token">Code from the text message</label>
        <input
          id="token"
          name="token"
          className="input"
          inputMode="numeric"
          autoComplete="one-time-code"
          pattern="[0-9]{6}"
          maxLength={6}
          required
        />
      </div>
      <button type="submit" name="intent" value="verify" className="btn btn--block" disabled={pending}>
        {pending ? <span className="spinner" aria-hidden="true" /> : null}
        Confirm number
      </button>
      <button type="submit" name="intent" value="resend" className="btn btn--ghost btn--block" disabled={pending} formNoValidate>
        Send a new code
      </button>
    </form>
  );
}
