import "server-only";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";
import { supabaseUrl } from "../env";

/**
 * Client that runs as `service_role`. Only for database functions the public
 * API cannot call (guest orders). The key has no NEXT_PUBLIC_ prefix, so it is
 * never inlined into browser bundles; never log it or put it in a response.
 * Returns null when the key is not set (local dev without it, previews).
 */
export function createServiceClient() {
  const secretKey = process.env.SUPABASE_SECRET_KEY;
  if (!supabaseUrl || !secretKey) return null;
  return createClient<Database>(supabaseUrl, secretKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}
