// Import Supabase SDK via ESM CDN
// Using esm.sh for better ESM compatibility
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Supabase configuration (hardcoded)
const supabaseUrl = "https://ksipcrcimsnjkgmwzovo.supabase.co";
const supabaseAnonKey = "sb_publishable_lowQ9k2fr_1QaQo3BNMTUg_s-4Wf5az";

// Create Supabase client (singleton - created once at module load)
// Validate that createClient is available before calling
if (typeof createClient !== "function") {
  throw new Error("Supabase createClient is not available. Check ESM import.");
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export async function signUpCreator(email, password, creatorData) {
  // Validate supabase client is initialized
  const supabaseClient = supabase;
  if (!supabaseClient || !supabaseClient.auth) {
    throw new Error("Supabase client is not properly initialized");
  }

  // Step 1: Create Supabase Auth user
  const { data, error } = await supabaseClient.auth.signUp({
    email,
    password,
  });

  if (error) {
    console.error("Supabase auth signup error:", error);
    throw error;
  }

  if (!data || !data.user) {
    throw new Error("User creation failed: No user data returned");
  }

  const user = data.user;

  // Step 2: Insert creator record
  // Map to DB schema: id, email, display_name, bio, sns_links, status
  // Note: intro → bio, portfolio_url removed (not in schema)
  // sns_links is jsonb: convert comma-separated string to JSON array if provided
  let snsLinksJson = null;
  if (creatorData.sns_links && creatorData.sns_links.trim()) {
    // Convert comma-separated string to JSON array
    const linksArray = creatorData.sns_links
      .split(",")
      .map((link) => link.trim())
      .filter((link) => link.length > 0);
    snsLinksJson = linksArray.length > 0 ? linksArray : null;
  }

  const { error: insertError } = await supabaseClient.from("creators").insert({
    id: user.id, // auth.user.id
    email: email,
    display_name: creatorData.display_name,
    bio: creatorData.intro || null, // intro → bio mapping
    sns_links: snsLinksJson, // jsonb format
    status: "pending",
  });

  if (insertError) {
    console.error("Creator record insert error:", insertError);
    throw insertError;
  }

  return user;
}

/**
 * Sign in creator with email and password
 */
export async function signInCreator(email, password) {
  const supabaseClient = supabase;
  const { data, error } = await supabaseClient.auth.signInWithPassword({
    email,
    password,
  });

  if (error) throw error;

  return data;
}

/**
 * Get current authenticated creator user
 */
export async function getCurrentCreatorUser() {
  const supabaseClient = supabase;
  const {
    data: { user },
    error,
  } = await supabaseClient.auth.getUser();

  if (error) {
    console.error("Error getting creator user:", error);
    return null;
  }

  return user;
}

/**
 * Get creator record for current user
 * Returns null if user is not a creator
 */
export async function getCreatorRecord(userId) {
  const supabaseClient = supabase;
  const { data, error } = await supabaseClient
    .from("creators")
    .select("*")
    .eq("id", userId)
    .single();

  if (error) {
    // User is not a creator (record doesn't exist)
    if (error.code === "PGRST116") {
      return null;
    }
    console.error("Error fetching creator record:", error);
    return null;
  }

  return data;
}

/**
 * Sign out current creator user
 */
export async function signOutCreator() {
  const supabaseClient = supabase;
  const { error } = await supabaseClient.auth.signOut();
  if (error) {
    console.error("Error signing out:", error);
  }
}
