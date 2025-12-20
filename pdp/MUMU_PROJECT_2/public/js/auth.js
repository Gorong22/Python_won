/**
 * Supabase Auth Wrapper
 *
 * 창작자 인증을 위한 Supabase Auth 래퍼 함수들
 * - user_id를 email 형식으로 변환하여 Supabase Auth 사용
 * - 비밀번호는 Auth에만 저장, creators 테이블에는 저장하지 않음
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "./config.js";

// Supabase 클라이언트 생성 (singleton)
let supabaseClient = null;

/**
 * Supabase 클라이언트 초기화
 */
function getSupabaseClient() {
  if (!supabaseClient) {
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
      throw new Error(
        "Invalid supabaseUrl or anon key. Please check config.js"
      );
    }
    supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  }
  return supabaseClient;
}

/**
 * user_id를 Supabase Auth email 형식으로 변환
 * @param {string} user_id - 사용자 아이디
 * @returns {string} 변환된 email 형식 (user_id+mumu@gmail.com)
 *
 * Note: This email is INTERNAL ONLY. User must NEVER see or input it.
 * Supabase Auth requires a real, deliverable email domain.
 * We use Gmail with plus addressing (user_id+mumu@gmail.com).
 * Login remains ID + password only - users never see this email.
 */
export function transformUserIdToEmail(user_id) {
  if (!user_id || typeof user_id !== "string") {
    throw new Error("user_id must be a non-empty string");
  }
  return `${user_id.trim()}+mumu@gmail.com`;
}

/**
 * Supabase Auth에서 회원가입
 * @param {string} user_id - 사용자 아이디
 * @param {string} password - 비밀번호
 * @returns {Promise<Object>} Auth user 객체
 */
export async function signUp(user_id, password) {
  const supabaseClient = getSupabaseClient();
  const email = transformUserIdToEmail(user_id);

  // DEBUG: Log the exact email being sent to Supabase
  console.log("AUTH EMAIL SENT TO SUPABASE:", email);

  const { data, error } = await supabaseClient.auth.signUp({
    email,
    password,
    options: {
      // Disable email confirmation requirement - status is the only source of truth
      emailRedirectTo: undefined,
      data: {
        skip_email_confirmation: true, // Internal flag (may not be used by Supabase, but status controls access)
      },
    },
  });

  if (error) {
    console.error("Auth signup error:", error);

    // Filter out email-related errors - status is the only source of truth
    const errorMsg = error.message?.toLowerCase() || "";
    const errorCode = error.code || "";
    const isEmailConfirmationError =
      (errorMsg.includes("email") &&
        (errorMsg.includes("confirm") ||
          errorMsg.includes("verification") ||
          errorMsg.includes("not confirmed"))) ||
      errorCode.includes("email_not_confirmed");

    if (isEmailConfirmationError) {
      // Email confirmation errors are ignored - status will control access
      console.warn(
        "Email confirmation error ignored - status-based control will be used"
      );
      // Continue if user was created despite the error
      if (data && data.user) {
        return data.user;
      }
    }

    throw error;
  }

  if (!data || !data.user) {
    throw new Error("User creation failed: No user data returned");
  }

  return data.user;
}

/**
 * Supabase Auth에서 로그인
 * @param {string} user_id - 사용자 아이디
 * @param {string} password - 비밀번호
 * @returns {Promise<Object>} Auth session 객체
 */
export async function signIn(user_id, password) {
  const supabaseClient = getSupabaseClient();
  const email = transformUserIdToEmail(user_id);

  // DEBUG: Log the exact email being sent to Supabase
  console.log("AUTH EMAIL SENT TO SUPABASE:", email);

  const { data, error } = await supabaseClient.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    console.error("Auth signin error:", error);

    // Filter out email confirmation errors - status is the only source of truth
    const errorMsg = error.message?.toLowerCase() || "";
    const errorCode = error.code || "";
    const isEmailConfirmationError =
      (errorMsg.includes("email") &&
        (errorMsg.includes("confirm") ||
          errorMsg.includes("verification") ||
          errorMsg.includes("not confirmed"))) ||
      errorCode.includes("email_not_confirmed");

    if (isEmailConfirmationError) {
      // Email confirmation errors are ignored - status controls access
      console.warn(
        "Email confirmation error ignored - status-based control will be used"
      );

      // Try to get the user session anyway - Supabase may have created it
      const { data: sessionData } = await supabaseClient.auth.getSession();
      if (sessionData?.session?.user) {
        return {
          user: sessionData.session.user,
          session: sessionData.session,
        };
      }

      // If no session, try to get user directly
      const { data: userData } = await supabaseClient.auth.getUser();
      if (userData?.user) {
        return {
          user: userData.user,
          session: null, // Session might not be available
        };
      }
    }

    throw error;
  }

  return data;
}

/**
 * 현재 인증된 사용자 가져오기
 * @returns {Promise<Object|null>} Auth user 객체 또는 null
 */
export async function getCurrentUser() {
  const supabaseClient = getSupabaseClient();

  const {
    data: { user },
    error,
  } = await supabaseClient.auth.getUser();

  if (error) {
    console.error("Error getting current user:", error);
    return null;
  }

  return user;
}

/**
 * 현재 세션 가져오기
 * @returns {Promise<Object|null>} Session 객체 또는 null
 */
export async function getSession() {
  const supabaseClient = getSupabaseClient();

  const {
    data: { session },
    error,
  } = await supabaseClient.auth.getSession();

  if (error) {
    console.error("Error getting session:", error);
    return null;
  }

  return session;
}

/**
 * 로그아웃
 * @returns {Promise<void>}
 */
export async function signOut() {
  const supabaseClient = getSupabaseClient();
  const { error } = await supabaseClient.auth.signOut();

  if (error) {
    console.error("Error signing out:", error);
    throw error;
  }
}

/**
 * Supabase 클라이언트 직접 접근 (필요한 경우)
 * @returns {Object} Supabase client
 */
export function getSupabase() {
  return getSupabaseClient();
}
