// Mumu Bundle
// External Imports
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getAuth } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";

// --- config.js ---
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
  messagingSenderId:
    window.FIREBASE_MESSAGING_SENDER_ID || "YOUR_MESSAGING_SENDER_ID",
  appId: window.FIREBASE_APP_ID || "YOUR_APP_ID",
};

// 브라우저 전역으로 노출 (필요시)
if (typeof window !== "undefined") {
  window.FIREBASE_CONFIG = FIREBASE_CONFIG;
}

export { SUPABASE_URL, SUPABASE_ANON_KEY, FIREBASE_CONFIG };

// --- firebase_init.js ---
// public/js/firebase_init.js
// Firebase 초기화 단일화 - 모든 파일에서 이 파일만 사용
import {
  initializeApp,
  getApps,
} from "https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js";

// Firebase 프로젝트 설정 (실제 값)
const firebaseConfig = {
  apiKey: "AIzaSyB9CE6mr0leyh9DL_PLDD_nm3MBY6HZzrE",
  authDomain: "mumu-3db59.firebaseapp.com",
  projectId: "mumu-3db59",
  storageBucket: "mumu-3db59.firebasestorage.app",
  messagingSenderId: "436159743714",
  appId: "1:436159743714:web:49330772ad51141ace00bb",
};

// Firebase 초기화 (한 번만 실행)
let app;
const existingApps = getApps();
if (existingApps.length === 0) {
  app = initializeApp(firebaseConfig);
} else {
  app = existingApps[0];
}

export const auth = getAuth(app);
export const db = getFirestore(app);
export { app };

// 일반 스크립트에서도 사용할 수 있도록 전역 변수로 노출
if (typeof window !== "undefined") {
  window.firebaseAuth = auth;
  window.firebaseDb = db;
  window.firebaseApp = app;
}

// --- supabase-auth.js ---
// Import Supabase SDK via ESM CDN
// Using esm.sh for better ESM compatibility
import {
  getFunctions,
  httpsCallable,
} from "https://www.gstatic.com/firebasejs/9.23.0/firebase-functions.js";

// ================================
// Browser-safe config resolver
// (NO process.env, NO import.meta.env)
// ================================
function getConfig(key, fallback = null) {
  // 1) window.__ENV__ (옵션)
  if (
    typeof window !== "undefined" &&
    window.__ENV__ &&
    window.__ENV__[key] != null
  ) {
    return window.__ENV__[key];
  }

  // 2) <meta name="..."> (옵션)
  if (typeof document !== "undefined") {
    const meta = document.querySelector(`meta[name="${key}"]`);
    if (meta && meta.content) return meta.content;
  }

  // 3) localStorage (옵션)
  if (typeof localStorage !== "undefined") {
    const v = localStorage.getItem(key);
    if (v) return v;
  }

  return fallback;
}

// Supabase configuration (hardcoded, browser-safe)
const supabaseUrl = getConfig(
  "SUPABASE_URL",
  "https://ksipcrcimsnjkgmwzovo.supabase.co"
);
const supabaseAnonKey = getConfig(
  "SUPABASE_ANON_KEY",
  "sb_publishable_lowQ9k2fr_1QaQo3BNMTUg_s-4Wf5az"
);

// Singleton Supabase Client (Custom JWT로 한 번만 생성)
let supabaseClient = null;
let customJwtToken = null;
let initPromise = null;

/**
 * Firebase Functions에서 Custom JWT 토큰 가져오기
 */
async function getCustomJwtToken() {
  if (customJwtToken) {
    // 토큰 만료 여부 대략적 확인 (옵션)
    try {
      const payload = JSON.parse(atob(customJwtToken.split(".")[1]));
      const exp = payload.exp * 1000;
      if (Date.now() < exp - 60000) {
        // 만료 1분 전까지는 재사용
        return customJwtToken;
      }
      console.log("[SUPABASE] 토큰 만료 임박 -> 재발급 시도");
    } catch (e) {
      // 파싱 실패 시 그냥 새로 받음
    }
  }

  try {
    // const { auth } = await import("./firebase_init.js");
    const user = auth.currentUser;

    if (!user) {
      console.log(
        "[SUPABASE] 로그인된 사용자가 없어 Custom JWT 획득을 건너뜁니다."
      );
      return null;
    }

    console.log("[SUPABASE] Custom JWT 토큰 요청 중... (UID:", user.uid, ")");
    const functions = getFunctions(app, "us-central1");
    const getSupabaseCustomToken = httpsCallable(
      functions,
      "getSupabaseCustomToken"
    );
    const result = await getSupabaseCustomToken();

    if (result?.data?.token) {
      // console.log("[SUPABASE] Custom JWT 토큰 획득 성공");
      customJwtToken = result.data.token;
      return customJwtToken;
    }

    // console.warn("[SUPABASE] Custom JWT 토큰 결과에 토큰이 없습니다.");
    return null;
  } catch (error) {
    console.error("[SUPABASE] Custom JWT 토큰 획득 에러:", error);
    // 401 에러(Unauthorized)인 경우 로그를 남기지 않거나 경고로 처리
    if (error.code === "unauthenticated" || error.message?.includes("401")) {
      return null;
    }
    return null;
  }
}

/**
 * Supabase 요청 instrumentation을 위한 fetch wrapper
 * 모든 Supabase 요청의 URL/메서드/바디/응답을 로깅
 */
function createInstrumentedFetch() {
  const originalFetch = window.fetch;

  return async function instrumentedFetch(url, options = {}) {
    // Supabase 요청만 추적 (supabaseUrl로 시작하는 요청)
    const isSupabaseRequest =
      typeof url === "string" && url.startsWith(supabaseUrl);

    if (isSupabaseRequest) {
      const requestId = `req_${Date.now()}_${Math.random()
        .toString(36)
        .substr(2, 9)}`;
      const method = options.method || "GET";
      const requestBody = options.body
        ? typeof options.body === "string"
          ? JSON.parse(options.body)
          : options.body
        : null;

      // URL에서 테이블명 추출 (예: /rest/v1/creator_follows -> creator_follows)
      const urlMatch = url.match(/\/rest\/v1\/([^?]+)/);
      const tableName = urlMatch ? urlMatch[1] : "unknown";

      // 헤더 추출 (Headers 객체 대응)
      let requestHeaders = {};
      if (options.headers) {
        if (options.headers instanceof Headers) {
          options.headers.forEach((v, k) => (requestHeaders[k] = v));
        } else {
          requestHeaders = { ...options.headers };
        }
      }

      // JWT 토큰 정보 로깅
      let tokenUid = "NONE";
      let tokenRole = "NONE";
      if (requestHeaders["Authorization"] || requestHeaders["authorization"]) {
        try {
          const authHeader =
            requestHeaders["Authorization"] || requestHeaders["authorization"];
          const t = authHeader.split(" ")[1];
          if (t && t.includes(".")) {
            const p = JSON.parse(atob(t.split(".")[1]));
            tokenUid = p.sub || p.uid || p.user_id || "MISSING_UID";
            tokenRole = p.role || "MISSING_ROLE";
          }
        } catch (e) {
          tokenUid = "INVALID_TOKEN";
          tokenRole = "ERROR";
        }
      }

      // Silent request tracking (Enable only for deep debugging if needed)
      // console.log(`[SUPABASE REQUEST ${requestId}]`, { ... });

      try {
        const response = await originalFetch(url, options);
        const status = response.status;
        const statusText = response.statusText;

        // 응답 본문 복사 (한 번만 읽을 수 있으므로)
        const responseClone = response.clone();
        let responseBody = null;

        try {
          responseBody = await responseClone.json();
        } catch (e) {
          // JSON 파싱 실패 시 텍스트로 읽기 시도
          try {
            const textClone = response.clone();
            responseBody = await textClone.text();
          } catch (e2) {
            responseBody = "[Unable to read response body]";
          }
        }

        // 에러 상태 코드인 경우 상세 로깅
        if (status >= 400) {
          // Suppress 409 Conflict on follows/likes (expected behavior for duplicates)
          const is409Conflict =
            status === 409 &&
            (tableName === "likes" || tableName === "follows") &&
            (responseBody?.code === "23505" ||
              responseBody?.message?.includes("duplicate"));

          if (!is409Conflict) {
            console.error(`[SUPABASE ERROR ${requestId}]`, {
              status,
              statusText,
              method,
              url,
              table: tableName,
              requestBody,
              responseBody,
              errorCode: responseBody?.code || responseBody?.error_code || null,
              errorMessage:
                responseBody?.message ||
                responseBody?.error ||
                responseBody?.hint ||
                JSON.stringify(responseBody),
            });
          }

          // 22P02 에러 (invalid input syntax for type uuid) 특별 처리
          if (
            responseBody?.message &&
            responseBody.message.includes("invalid input syntax for type uuid")
          ) {
            const uuidMatch = responseBody.message.match(
              /invalid input syntax for type uuid: "([^"]+)"/
            );
            const invalidValue = uuidMatch ? uuidMatch[1] : "unknown";
            console.error(`[SUPABASE 22P02 ERROR ${requestId}]`, {
              table: tableName,
              invalidValue,
              isFirebaseUID:
                /^[a-zA-Z0-9]{20,28}$/.test(invalidValue) &&
                !invalidValue.includes("-"),
              requestBody,
              message: "Firebase UID가 UUID 컬럼에 들어간 것으로 추정됩니다.",
            });
          }

          // 406 에러 (Not Acceptable) 특별 처리
          if (status === 406) {
            console.error(`[SUPABASE 406 ERROR ${requestId}]`, {
              table: tableName,
              method,
              url,
              requestBody,
              responseBody,
              message:
                "PostgREST 406 에러 - Accept 헤더 또는 return=representation 문제일 수 있습니다.",
            });
          }
        } else {
          // Silent success for production performance
          // console.log(`[SUPABASE SUCCESS ${requestId}]`, { ... });
        }

        return response;
      } catch (error) {
        console.error(`[SUPABASE FETCH ERROR ${requestId}]`, {
          method,
          url,
          table: tableName,
          requestBody,
          error: error.message,
          stack: error.stack,
        });
        throw error;
      }
    } else {
      // Supabase 요청이 아닌 경우 원래 fetch 사용
      return originalFetch(url, options);
    }
  };
}

/**
 * Supabase Client 생성 (singleton)
 * Custom JWT를 Authorization 헤더로 사용
 */
async function createSupabaseClient() {
  if (supabaseClient) {
    return supabaseClient;
  }

  let token = null;
  try {
    token = await getCustomJwtToken();
  } catch (error) {
    console.warn(
      "[SUPABASE] Custom JWT 획득 실패. 익명(Anon) 키 모드로 동작합니다. (비로그인 상태 또는 토큰 서버 오류)"
    );
  }

  // Instrumented fetch를 사용하여 모든 요청 추적
  const instrumentedFetch = createInstrumentedFetch();

  const clientOptions = {
    global: {
      fetch: instrumentedFetch,
    },
  };

  // 토큰이 있는 경우에만 Authorization 헤더 명시 (없으면 anonKey가 기본 사용됨)
  if (token) {
    clientOptions.global.headers = {
      Authorization: `Bearer ${token}`,
    };
  }

  supabaseClient = createClient(supabaseUrl, supabaseAnonKey, clientOptions);

  // 인증 상태 플래그 설정
  window.__supabase_is_authenticated = !!token;

  // 전역에 설정
  window.supabase = supabaseClient;
  window.__supabase_singleton = supabaseClient;

  /* 
  console.log(
    `[SUPABASE] Singleton 클라이언트 생성 완료 (${
      token ? "Authenticated" : "Anonymous"
    }, Instrumented fetch enabled)`
  );
  */
  return supabaseClient;
}

/**
 * Get Supabase client instance (singleton)
 */
export async function getSupabase() {
  // const { auth } = await import("./firebase_init.js");

  // 0. Firebase 인증 상태가 결정될 때까지 잠시 대기 (최대 2초)
  let user = auth.currentUser;
  if (!user && !window.__firebase_auth_checked) {
    // console.log("[SUPABASE] Waiting for Firebase Auth...");
    await new Promise((resolve) => {
      const unsubscribe = auth.onAuthStateChanged((u) => {
        user = u;
        window.__firebase_auth_checked = true;
        unsubscribe();
        resolve();
      });
      // 최대 2초만 대기
      setTimeout(() => {
        unsubscribe();
        resolve();
      }, 2000);
    });
  }

  // 1. 세션 환경 변화 감지 (사용자 변경 또는 만료)
  if (customJwtToken) {
    try {
      const payload = JSON.parse(atob(customJwtToken.split(".")[1]));
      const isExpired = Date.now() >= payload.exp * 1000 - 30000;
      // 토큰의 UID와 현재 Firebase UID가 다르면 재로그인/사용자 전환 상황
      const isDifferentUser =
        user && payload.sub !== user.uid && payload.uid !== user.uid;

      if (isExpired || isDifferentUser) {
        console.log(
          "[SUPABASE] 세션 환경 변화 감지 (만료 또는 사용자 변경) -> 초기화 데이터 클리어"
        );
        customJwtToken = null;
        supabaseClient = null;
        initPromise = null;
      }
    } catch (e) {
      console.error("[SUPABASE] 토큰 파싱 에러:", e);
    }
  }

  // 2. 로그인 상태인데 익명 클라이언트만 있거나 생성 중인 경우
  // (initPromise가 있더라도 그것이 anon 기반이라면 무효화하고 새로 시작해야 함)
  if (user && !customJwtToken) {
    // 만약 현재 supabaseClient가 있는데 익명(header에 Authorization 없음)이라면 클리어
    if (supabaseClient && !window.__supabase_is_authenticated) {
      console.log(
        "[SUPABASE] 로그인 감지: 기존 익명 클라이언트를 제거하고 인증 클라이언트를 생성합니다."
      );
      supabaseClient = null;
      initPromise = null;
      window.__supabase_profile_synced = null; // Reset sync flag
    }
  }

  // 3. 싱글톤 반환 로직
  if (supabaseClient) {
    // 이미 인증된 클라이언트라면 백그라운드에서 프로필 동기화 시도 (세션당 1회)
    if (
      window.__supabase_is_authenticated &&
      !window.__supabase_profile_synced
    ) {
      syncFirestoreProfileToSupabase(supabaseClient, user.uid);
    }
    return supabaseClient;
  }

  if (initPromise) {
    return await initPromise;
  }

  // console.log("[SUPABASE] 새로운 클라이언트 생성 시작...");
  initPromise = createSupabaseClient();
  const client = await initPromise;

  // 성공적으로 생성된 후 동기화 (세션당 1회)
  if (window.__supabase_is_authenticated && user) {
    syncFirestoreProfileToSupabase(client, user.uid);
  }

  // 성공적으로 생성된 후 동기화
  initPromise = null;
  return client;
}

/**
 * Firestore의 닉네임을 Supabase reader_public_profiles로 동기화 (Read Model 보강)
 */
async function syncFirestoreProfileToSupabase(supabase, uid) {
  if (!uid || window.__supabase_profile_synced) return;
  window.__supabase_profile_synced = true; // 중복 실행 방지

  try {
    console.log(`[SUPABASE SYNC] Profile sync check for ${uid}...`);

    // 1. 먼저 Supabase에 이미 있는지 확인
    const { data: existing } = await supabase
      .from("reader_public_profiles")
      .select("nickname")
      .eq("reader_id", uid)
      .maybeSingle();

    // 2. 이미 닉네임이 있다면 종료 (강제 업데이트가 필요한 경우는 나중에 고려)
    if (existing && existing.nickname) {
      // console.log("[SUPABASE SYNC] Profile already exists in Supabase.");
      return;
    }

    console.log(
      "[SUPABASE SYNC] Missing in Supabase. Fetching from Firestore..."
    );

    // 3. Firestore에서 데이터 가져오기 (동적 임포트)
    const { getFirestore, doc, getDoc } = await import(
      "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js"
    );
    // const { app } = await import("./firebase_init.js");
    const db = getFirestore(app);

    const userDocRef = doc(db, "readers", uid);
    const userDocSnap = await getDoc(userDocRef);

    if (userDocSnap.exists()) {
      const fsData = userDocSnap.data();
      const nickname = fsData.nickname || fsData.username;

      if (nickname) {
        console.log(
          `[SUPABASE SYNC] Found Firestore nickname: ${nickname}. Updating Supabase...`
        );
        const { error: upsertError } = await supabase
          .from("reader_public_profiles")
          .upsert({
            reader_id: uid,
            nickname: nickname,
            updated_at: new Date().toISOString(),
          });

        if (upsertError) {
          console.error("[SUPABASE SYNC] Upsert error:", upsertError);
          window.__supabase_profile_synced = false; // 실패 시 재시도 허용
        } else {
          console.log("[SUPABASE SYNC] ✅ Sync complete.");
        }
      }
    }
  } catch (err) {
    console.error("[SUPABASE SYNC] Sync failed:", err);
    window.__supabase_profile_synced = false;
  }
}

/**
 * Custom JWT 토큰 초기화 (로그인 후 호출)
 */
export async function initializeSupabaseAuth() {
  customJwtToken = null;
  supabaseClient = null;
  initPromise = null;
  window.__supabase_singleton = null;

  const client = await getSupabase();
  // console.log("[SUPABASE] Auth 초기화 완료");
  return client;
}

/**
 * Custom JWT 토큰 초기화 (로그아웃 시 호출)
 */
export function clearSupabaseAuth() {
  customJwtToken = null;
  supabaseClient = null;
  initPromise = null;
  window.__supabase_singleton = null;
  window.supabase = null;
  // console.log("[SUPABASE] Auth 클리어 완료");
}

// 기본 export는 없음 (모든 접근은 getSupabase()를 통해)

// ================================
// Global Exposure (Ensure contracts)
// ================================
if (typeof window !== "undefined") {
  window.getSupabase = getSupabase;
  window.initializeSupabaseAuth = initializeSupabaseAuth;
  window.clearSupabaseAuth = clearSupabaseAuth;
}

// ================================
// 빌드/런타임 확인용 로그
// ================================
// console.log("[SUPABASE-AUTH] loaded. process is", typeof process);

// ================================
// GLOBAL BRIDGE (REMOVED REDUNDANT)
// ================================
// The bridge was overwriting the real initializeSupabaseAuth.
// Now rely on lines 312-316 for global exposure.

// --- supabase_client.js ---
// =========================
// SUPABASE CLIENT (READER)
// =========================
// Uses Firebase Auth for authentication
// Supabase is used ONLY as a database (Postgres)
// Custom JWT is used via Authorization header

// supabase-auth.js의 단일 인스턴스를 재사용

/**
 * Get Supabase client instance (singleton)
 * @returns {Promise<Object>} Supabase client instance
 */
export async function getSupabaseClient() {
  return await getSupabase();
}

// window.supabase를 비동기로 설정 (다른 파일에서 사용 가능)
getSupabase()
  .then((client) => {
    window.supabase = client;
    console.log(
      "[INIT] Supabase client ready (Custom JWT via Authorization header)"
    );
  })
  .catch((error) => {
    console.error("[INIT] Supabase client 초기화 실패:", error);
  });

// 기본 export는 Promise (하위 호환성)
export const supabase = getSupabase();
