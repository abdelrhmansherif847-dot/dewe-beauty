// Public configuration. Only NEXT_PUBLIC_* values are read here, so this file
// is safe to import from client components.
export const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
export const supabasePublishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? "";
export const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/$/, "");

export const isSupabaseConfigured = Boolean(supabaseUrl && supabasePublishableKey);
