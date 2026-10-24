"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { siteUrl } from "@/lib/env";
import { safeNext } from "@/lib/safe-redirect";
import { createSessionClient } from "@/lib/supabase/server";

export type AuthState =
  | { status: "idle" }
  | { status: "error"; message: string }
  | { status: "check_email"; email: string }
  | { status: "signed_in"; next: string };

const credentials = z.object({
  email: z.email("Please enter a valid email address.").max(254),
  password: z.string().min(8, "Use at least 8 characters.").max(72),
});

export async function signIn(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const parsed = credentials.safeParse({ email: formData.get("email"), password: formData.get("password") });
  if (!parsed.success) return { status: "error", message: parsed.error.issues[0].message };
  const supabase = await createSessionClient();
  if (!supabase) return { status: "error", message: "Accounts are not available yet." };

  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) {
    return {
      status: "error",
      message:
        error.code === "email_not_confirmed"
          ? "Please confirm your email first. Check your inbox for the link we sent."
          : "That email and password don't match an account.",
    };
  }
  return { status: "signed_in", next: safeNext(formData.get("next")) };
}

export async function signUp(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const parsed = credentials
    .extend({ full_name: z.string().trim().min(2, "Please enter your name.").max(120) })
    .safeParse({
      email: formData.get("email"),
      password: formData.get("password"),
      full_name: formData.get("full_name"),
    });
  if (!parsed.success) return { status: "error", message: parsed.error.issues[0].message };
  const supabase = await createSessionClient();
  if (!supabase) return { status: "error", message: "Accounts are not available yet." };

  const next = safeNext(formData.get("next"));
  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      data: { full_name: parsed.data.full_name },
      emailRedirectTo: `${siteUrl}/auth/callback?next=${encodeURIComponent(next)}`,
    },
  });
  if (error) {
    return {
      status: "error",
      message: error.code === "weak_password" ? "Please choose a stronger password." : "We couldn't create your account. Please try again.",
    };
  }
  if (data.session) return { status: "signed_in", next };
  return { status: "check_email", email: parsed.data.email };
}

export async function signOut() {
  const supabase = await createSessionClient();
  await supabase?.auth.signOut();
  refresh();
  redirect("/");
}
