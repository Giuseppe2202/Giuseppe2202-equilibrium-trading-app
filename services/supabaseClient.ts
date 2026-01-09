// services/supabaseClient.ts
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://tjnefmxxumabdorrdktj.supabase.co";
const SUPABASE_ANON_KEY =
  "sb_publishable_nQ7FHNCRnPfMK6VNcLdj3g_nrZgign0";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    flowType: "pkce"
  }
});

// Debug only (AI Studio testing)
(window as any).__sb = supabase;
