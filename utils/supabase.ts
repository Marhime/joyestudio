import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let client: SupabaseClient | null = null;

/**
 * Singleton Supabase client — client-side only.
 * Reads URL and anon key from Nuxt runtime config.
 */
export function getSupabaseClient(): SupabaseClient | null {
  if (!import.meta.client) return null;
  if (client) return client;

  const config = useRuntimeConfig();
  const url = config.public.supabaseUrl as string;
  const key = config.public.supabaseAnonKey as string;

  if (!url || !key) {
    console.warn(
      "[supabase] Missing SUPABASE_URL or SUPABASE_ANON_KEY in runtime config",
    );
    return null;
  }

  client = createClient(url, key);
  return client;
}
