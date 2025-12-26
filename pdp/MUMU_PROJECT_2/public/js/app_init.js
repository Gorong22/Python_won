// =========================
// LEGACY CODE PROTECTION
// =========================
(function blockLegacyFetch() {
  const originalFetch = window.fetch;
  window.fetch = function (input, init) {
    const url = typeof input === "string" ? input : input?.url || "";
    if (
      url.includes("firebase_uid=eq.") ||
      (url.includes("moodboard_id=eq.") && !url.match(/[0-9a-fA-F-]{36}/))
    ) {
      console.error("[BLOCKED LEGACY FETCH]", url);
      // throw new Error("Legacy fetch blocked: UID used in UUID context");
      // Instead of throwing, we can return a rejected promise to avoid crashing synchronous code if any
      return Promise.reject(
        new Error("Legacy fetch blocked: UID used in UUID context")
      );
    }
    return originalFetch(input, init);
  };
})();

// =========================
// APP NAMESPACE INITIALIZATION (STEP 1)
// =========================
// 목표: 전역 구조를 통일할 수 있는 "기준점" 생성
// 규칙: 기존 코드는 절대 수정하지 않고, 추가만 함

/**
 * App 네임스페이스 생성
 * 기존 window 함수/변수는 절대 삭제하지 않음
 */
window.App = {
  user: null,
  auth: {},
  data: {},
  ui: {},
  events: {},
  utils: {
    /**
     * Firebase UID 캐시 (미사용)
     * NOTE: This project does NOT convert Firebase UID to UUID.
     * Firebase UID is used directly as text in all user_id columns.
     * key: firebaseUid, value: resolved id string or null
     */
    userIdCache: new Map(),
    /**
     * UUID 검증 함수 (통일된 유틸리티)
     * @param {string} v - 검증할 문자열
     * @returns {boolean} UUID 형식이면 true
     */
    isUUID: function (v) {
      if (!v || typeof v !== "string") return false;
      return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        v
      );
    },
    /**
     * Firebase UID 검증 함수
     * Firebase UID는 일반적으로 28자 길이의 영숫자 문자열
     * @param {string} v - 검증할 문자열
     * @returns {boolean} Firebase UID 형식이면 true
     */
    isFirebaseUID: function (v) {
      if (!v || typeof v !== "string") return false;
      // Firebase UID는 보통 28자 길이의 영숫자 문자열 (하이픈 없음)
      // UUID가 아닌 것 중에서 Firebase UID 형식인지 확인
      if (window.App?.utils?.isUUID(v)) return false; // UUID는 Firebase UID가 아님
      // Firebase UID는 보통 20-28자 길이의 영숫자 문자열
      return /^[a-zA-Z0-9]{20,28}$/.test(v);
    },
  },
};

/**
 * Firebase UID로 Supabase creators 테이블 조회하여 역할 판별
 * NOTE: Legacy logic removed. All users are treated as readers by default in this app context.
 * The creators table query using firebase_uid is blocked by legacy guard rails.
 * @param {string} firebaseUid - Firebase UID
 * @returns {Promise<{role: string, creatorId: number|null}>}
 */
async function determineUserRole(firebaseUid) {
  // Always default to reader to avoid blocked legacy queries
  // console.log("[App] determineUserRole: Defaulting to reader");
  return { role: "reader", creatorId: null };
}

/**
 * Firebase Auth 상태가 확정되면 사용자 역할을 판별하고 App.user 설정
 */
async function initializeAppUser() {
  try {
    // Firebase Auth 상태 확인
    const { getCurrentFirebaseUser } = await import("./reader_auth.js");
    const firebaseUser = await getCurrentFirebaseUser();

    if (!firebaseUser || !firebaseUser.uid) {
      // 로그인하지 않은 상태
      console.log("[App] 로그인하지 않은 상태 → App.user = null");
      window.App.user = null;
      return;
    }

    // Firebase UID 획득
    const firebaseUid = firebaseUser.uid;
    console.log("[App] Firebase UID 획득:", firebaseUid);

    // Supabase에서 역할 판별
    const { role, creatorId } = await determineUserRole(firebaseUid);

    // App.user 설정
    window.App.user = {
      uid: firebaseUid,
      role: role,
      creatorId: creatorId,
    };

    console.log("[App] ✅ App.user 설정 완료:", window.App.user);
  } catch (error) {
    console.error("[App] ❌ App.user 초기화 실패:", error);
    // 에러 발생 시 null로 설정
    window.App.user = null;
  }
}

/**
 * Firebase Auth 상태 변경 감지하여 App.user 업데이트
 */
function setupAppUserListener() {
  try {
    // reader_auth.js의 setupAuthStateListener 사용
    if (typeof window.setupAuthStateListener === "function") {
      window.setupAuthStateListener(async (firebaseUser) => {
        console.log("[App] Firebase Auth 상태 변경 감지");

        if (!firebaseUser || !firebaseUser.uid) {
          // 로그아웃
          window.App.user = null;
          console.log("[App] 로그아웃 → App.user = null");
          return;
        }

        // 로그인 또는 사용자 변경
        await window.initializeSupabaseAuth();
        const firebaseUid = firebaseUser.uid;
        const { role, creatorId } = await determineUserRole(firebaseUid);

        window.App.user = {
          uid: firebaseUid,
          role: role,
          creatorId: creatorId,
        };

        console.log("[App] ✅ App.user 업데이트 완료:", window.App.user);
      });
    } else {
      console.warn("[App] setupAuthStateListener를 찾을 수 없음");
    }
  } catch (error) {
    console.error("[App] ❌ Auth 상태 리스너 설정 실패:", error);
  }
}

// 페이지 로드 시 초기화 (Classic script safe)
function initApp() {
  initializeAppUser()
    .then(() => {
      setupAppUserListener();
    })
    .catch((e) => {
      console.error("[App] Init failed:", e);
    });
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initApp);
} else {
  initApp();
}

// FORCE EXECUTION: Guarantee Supabase Init
function forceSupabaseInitIfNeeded() {
  if (!window.initializeSupabaseAuth) {
    // console.log("[App] initializeSupabaseAuth missing - wait for subsequent loads");
    return;
  }

  if (window.__supabase_singleton) {
    return;
  }

  console.log("[App] Forcing Supabase Init via app_init.js");
  window
    .initializeSupabaseAuth()
    .then(() => {
      console.log("[App] Supabase init forced successfully");
    })
    .catch((err) => {
      console.error("[App] Supabase init force failed:", err);
    });
}

forceSupabaseInitIfNeeded();
