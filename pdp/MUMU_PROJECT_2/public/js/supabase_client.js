// =========================
// SUPABASE CLIENT (READER)
// =========================
// Uses Firebase Auth for authentication
// Supabase is used ONLY as a database (Postgres)

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Supabase configuration
const supabaseUrl = "https://ksipcrcimsnjkgmwzovo.supabase.co";
const supabaseAnonKey = "sb_publishable_lowQ9k2fr_1QaQo3BNMTUg_s-4Wf5az";

// Create Supabase client (singleton)
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Attach to window for global access (반드시 보장)
window.supabase = supabase;
console.log("[INIT] Supabase client ready");
