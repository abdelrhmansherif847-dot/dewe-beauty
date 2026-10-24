// Public configuration, safe to import from client components: besides the
// NEXT_PUBLIC_* values it only reads Vercel's non-secret system variables,
// which are simply undefined in the browser.
export const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
export const supabasePublishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? "";
export const siteUrl = resolveSiteUrl({
  NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
  VERCEL_ENV: process.env.VERCEL_ENV,
  VERCEL_PROJECT_PRODUCTION_URL: process.env.VERCEL_PROJECT_PRODUCTION_URL,
  VERCEL_BRANCH_URL: process.env.VERCEL_BRANCH_URL,
  VERCEL_URL: process.env.VERCEL_URL,
});

export const isSupabaseConfigured = Boolean(supabaseUrl && supabasePublishableKey);

// The explicit setting wins. On Vercel, fall back to the deployment's own
// address so sign-up emails never point at localhost.
export function resolveSiteUrl(env: Record<string, string | undefined>): string {
  const vercelHost =
    env.VERCEL_ENV === "production"
      ? env.VERCEL_PROJECT_PRODUCTION_URL
      : (env.VERCEL_BRANCH_URL ?? env.VERCEL_URL);
  const url =
    env.NEXT_PUBLIC_SITE_URL || (vercelHost ? `https://${vercelHost}` : "http://localhost:3000");
  return url.replace(/\/$/, "");
}
