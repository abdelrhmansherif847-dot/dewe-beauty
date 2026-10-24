import "server-only";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";
import { isSupabaseConfigured, supabasePublishableKey, supabaseUrl } from "../env";

/**
 * Cookie-less client for public catalog reads. It always runs as the `anon`
 * role, so results are safe to cache and share between visitors.
 */
export function createPublicClient() {
  if (!isSupabaseConfigured) return null;
  return createClient<Database>(supabaseUrl, supabasePublishableKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}
