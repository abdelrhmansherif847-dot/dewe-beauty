"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { PHONE_ERROR, normalizeEgMobile } from "@/lib/phone";
import { safeNext } from "@/lib/safe-redirect";
import { createSessionClient } from "@/lib/supabase/server";

/*
 * Phone-first accounts on Supabase Auth: the mobile number and a password
 * identify the customer. When phone confirmations are on, Supabase texts a
 * one-time code and the account is only usable after verifyPhone() succeeds.
 * Nothing here marks a number as verified by itself.
 *
 * An optional email is kept as contact_email in the profile only. It is not
 * a login and nothing is sent to it until email delivery is set up.
 */

export type AuthState =
  | { status: "idle" }
  | { status: "error"; message: string; phone?: string }
  | { status: "verify_phone"; phone: string; next: string; message?: string }
  | { status: "signed_in"; next: string };

const phoneField = z.string().transform((v, ctx) => {
  const phone = normalizeEgMobile(v);
  if (!phone) {
    ctx.addIssue({ code: "custom", message: PHONE_ERROR });
    return z.NEVER;
  }
  return phone;
});

const credentials = z.object({
  phone: phoneField,
  password: z.string().min(8, "Use at least 8 characters.").max(72),
});

const NOT_ENABLED =
  "Creating accounts with a mobile number isn't switched on yet. You can still check out as a guest.";

/** Supabase Auth error codes that need their own copy. */
function authErrorCopy(code: string | undefined, fallback: string): string {
  switch (code) {
    case "phone_provider_disabled":
    case "signup_disabled":
      return NOT_ENABLED;
    case "sms_send_failed":
      return "We couldn't send a code to that number. Please check it and try again.";
    case "over_sms_send_rate_limit":
    case "over_request_rate_limit":
      return "Too many attempts. Please wait a minute and try again.";
    case "phone_exists":
    case "user_already_exists":
      return "That number already has an account. Please sign in instead.";
    case "weak_password":
      return "Please choose a stronger password.";
    case "otp_expired":
      return "That code is wrong or has expired. Please try again or send a new one.";
    default:
      return fallback;
  }
}

export async function signIn(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const parsed = credentials.safeParse({ phone: formData.get("phone"), password: formData.get("password") });
  if (!parsed.success) return { status: "error", message: parsed.error.issues[0].message };
  const supabase = await createSessionClient();
  if (!supabase) return { status: "error", message: "Accounts are not available yet." };
  const next = safeNext(formData.get("next"));

  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) {
    if (error.code === "phone_not_confirmed") {
      // The account exists but the number was never confirmed: send a code.
      const { error: resendError } = await supabase.auth.resend({ type: "sms", phone: parsed.data.phone });
      if (resendError) return { status: "error", message: authErrorCopy(resendError.code, NOT_ENABLED) };
      return {
        status: "verify_phone",
        phone: parsed.data.phone,
        next,
        message: "Please confirm your number first. We've sent you a new code.",
      };
    }
    return {
      status: "error",
      message: authErrorCopy(error.code, "That number and password don't match an account."),
    };
  }
  return { status: "signed_in", next };
}

export async function signUp(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const parsed = credentials
    .extend({
      full_name: z.string().trim().min(2, "Please enter your name.").max(120),
      email: z
        .string()
        .trim()
        .toLowerCase()
        .max(254)
        .pipe(z.union([z.literal(""), z.email("Please check your email address, or leave it empty.")])),
    })
    .safeParse({
      phone: formData.get("phone"),
      password: formData.get("password"),
      full_name: formData.get("full_name"),
      email: formData.get("email") ?? "",
    });
  if (!parsed.success) return { status: "error", message: parsed.error.issues[0].message };
  const supabase = await createSessionClient();
  if (!supabase) return { status: "error", message: "Accounts are not available yet." };

  const next = safeNext(formData.get("next"));
  const { data, error } = await supabase.auth.signUp({
    phone: parsed.data.phone,
    password: parsed.data.password,
    options: {
      channel: "sms",
      data: {
        full_name: parsed.data.full_name,
        ...(parsed.data.email ? { contact_email: parsed.data.email } : {}),
      },
    },
  });
  if (error) {
    return { status: "error", message: authErrorCopy(error.code, "We couldn't create your account. Please try again.") };
  }
  // A session straight away means the project does not require phone
  // confirmation. Otherwise Supabase has texted a code.
  if (data.session) return { status: "signed_in", next };
  return { status: "verify_phone", phone: parsed.data.phone, next };
}

const verifySchema = z.object({
  phone: phoneField,
  token: z
    .string()
    .trim()
    .regex(/^[0-9]{6}$/, "Please enter the 6-digit code from the text message."),
});

export async function verifyPhone(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const next = safeNext(formData.get("next"));
  const parsed = verifySchema.safeParse({ phone: formData.get("phone"), token: formData.get("token") });
  const phone = normalizeEgMobile(String(formData.get("phone") ?? "")) ?? "";
  if (!parsed.success) {
    return { status: "verify_phone", phone, next, message: parsed.error.issues[0].message };
  }
  const supabase = await createSessionClient();
  if (!supabase) return { status: "error", message: "Accounts are not available yet." };

  const { error } = await supabase.auth.verifyOtp({ phone: parsed.data.phone, token: parsed.data.token, type: "sms" });
  if (error) {
    return {
      status: "verify_phone",
      phone,
      next,
      message: authErrorCopy(error.code === "invalid_credentials" ? "otp_expired" : error.code, authErrorCopy("otp_expired", "")),
    };
  }
  return { status: "signed_in", next };
}

export async function resendCode(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const next = safeNext(formData.get("next"));
  const phone = normalizeEgMobile(String(formData.get("phone") ?? ""));
  if (!phone) return { status: "error", message: PHONE_ERROR };
  const supabase = await createSessionClient();
  if (!supabase) return { status: "error", message: "Accounts are not available yet." };

  const { error } = await supabase.auth.resend({ type: "sms", phone });
  return {
    status: "verify_phone",
    phone,
    next,
    message: error ? authErrorCopy(error.code, "We couldn't send a new code. Please try again shortly.") : "We've sent you a new code.",
  };
}

export async function signOut() {
  const supabase = await createSessionClient();
  await supabase?.auth.signOut();
  refresh();
  redirect("/");
}
