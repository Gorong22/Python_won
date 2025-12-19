/**
 * Configuration
 * 
 * Supabase 및 Firebase 설정을 관리합니다.
 */

// =========================
// Supabase Configuration
// =========================

// 환경변수에서 가져오거나, 기본값 사용
// 프로덕션에서는 환경변수를 사용하고, 개발 환경에서는 기본값 사용
const SUPABASE_URL =
  window.SUPABASE_URL ||
  import.meta.env?.VITE_SUPABASE_URL ||
  "https://ksipcrcimsnjkgmwzovo.supabase.co";

const SUPABASE_ANON_KEY =
  window.SUPABASE_ANON_KEY ||
  import.meta.env?.VITE_SUPABASE_ANON_KEY ||
  "sb_publishable_lowQ9k2fr_1QaQo3BNMTUg_s-4Wf5az";

// 설정 검증
if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  throw new Error(
    "Supabase configuration is missing. Please set SUPABASE_URL and SUPABASE_ANON_KEY."
  );
}

// =========================
// Firebase Configuration
// =========================

/**
 * Firebase 프로젝트 설정
 * 실제 프로젝트의 Firebase 설정 값으로 교체해야 합니다.
 */
const FIREBASE_CONFIG = {
  apiKey: window.FIREBASE_API_KEY || "YOUR_API_KEY",
  authDomain: window.FIREBASE_AUTH_DOMAIN || "YOUR_AUTH_DOMAIN",
  projectId: window.FIREBASE_PROJECT_ID || "YOUR_PROJECT_ID",
  storageBucket: window.FIREBASE_STORAGE_BUCKET || "YOUR_STORAGE_BUCKET",
  messagingSenderId: window.FIREBASE_MESSAGING_SENDER_ID || "YOUR_MESSAGING_SENDER_ID",
  appId: window.FIREBASE_APP_ID || "YOUR_APP_ID"
};

// 브라우저 전역으로 노출 (필요시)
if (typeof window !== 'undefined') {
  window.FIREBASE_CONFIG = FIREBASE_CONFIG;
}

export { SUPABASE_URL, SUPABASE_ANON_KEY, FIREBASE_CONFIG };
