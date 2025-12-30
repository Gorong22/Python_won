// External Imports
const auth = window.firebaseAuth;
const app = window.firebaseApp;
const db = window.firebaseDb;

// --- app_init.js ---
// =========================
// LEGACY CODE PROTECTION
// =========================
(function blockLegacyFetch() {
  const originalFetch = window.fetch;
  window.fetch = function (input, init) {
    const url = typeof input === "string" ? input : input?.url || "";
    if (
      url.includes("supabase.co") ||
      url.includes("/auth/") ||
      url.includes("/rest/v1/")
    ) {
      return originalFetch(input, init);
    }
    if (
      url.includes("firebase_uid=eq.") ||
      (url.includes("moodboard_id=eq.") && !url.match(/[0-9a-fA-F-]{36}/))
    ) {
      // console.error("[BLOCKED LEGACY FETCH]", url);
      return Promise.reject(
        new Error("Legacy fetch blocked: UID used in UUID context")
      );
    }
    return originalFetch(input, init);
  };
})();

// =========================
// APP NAMESPACE & AUTH INITIALIZATION
// =========================
window.App = {
  user: null,
  auth: {},
  data: {},
  ui: {},
  utils: {
    isUUID: (v) =>
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        v
      ),
    isFirebaseUID: (v) =>
      typeof v === "string" &&
      !window.App.utils.isUUID(v) &&
      /^[a-zA-Z0-9]{20,28}$/.test(v),
  },
};

// Restore window.log as a no-op to prevent ReferenceErrors in legacy code
window.log = () => {};
window.revealPage = () => {
  document.body.classList.remove("mumu-preload");
  if (typeof window.hideMumuLoader === "function") window.hideMumuLoader();
};

async function determineUserRole(uid) {
  return { role: "reader", creatorId: null };
}

async function initializeAppUser() {
  try {
    if (typeof window.getCurrentFirebaseUser !== "function") return;
    const user = await window.getCurrentFirebaseUser();
    if (!user?.uid) {
      window.App.user = null;
      return;
    }
    const { role, creatorId } = await determineUserRole(user.uid);
    window.App.user = { uid: user.uid, role, creatorId };
  } catch (err) {
    console.error("[App] User Init Failed:", err);
  }
}

function setupAppUserListener() {
  if (typeof window.setupAuthStateListener !== "function") return;
  window.setupAuthStateListener(async (user) => {
    if (!user?.uid) {
      window.App.user = null;
      return;
    }
    if (typeof window.initializeSupabaseAuth === "function")
      await window.initializeSupabaseAuth().catch(() => null);
    const { role, creatorId } = await determineUserRole(user.uid);
    window.App.user = { uid: user.uid, role, creatorId };
  });
}

// =========================
// CAPTURE DETERRENCE (UX ENGINEER SPEC)
// =========================
(function setupCaptureDeterrence() {
  // PART 1 — FOCUS / VISIBILITY DETECTION
  const privacyOverlay = document.createElement("div");
  privacyOverlay.id = "mumu-privacy-overlay";
  privacyOverlay.style.cssText =
    "position:fixed;top:0;left:0;width:100%;height:100%;background:#000;z-index:2147483647;display:none;align-items:center;justify-content:center;color:white;font-family:sans-serif;font-weight:bold;letter-spacing:2px;";
  privacyOverlay.innerHTML = "MUMU";
  document.documentElement.appendChild(privacyOverlay);

  const toggleDeterrence = (show) =>
    (privacyOverlay.style.display = show ? "flex" : "none");
  window.addEventListener("blur", () => toggleDeterrence(true));
  window.addEventListener("focus", () => toggleDeterrence(false));
  document.addEventListener("visibilitychange", () =>
    toggleDeterrence(document.hidden)
  );

  // PART 2 & 3 — CONTEXT MENU & LONG-PRESS PRESERVATION
  document.addEventListener(
    "contextmenu",
    (e) => {
      // Preserve long-press context menu on feed cut elements
      if (
        e.target.closest(
          ".feed-cut-item, .moodboard-block-cut, .save-target, .long-press-target"
        )
      )
        return;
      if (e.target.tagName !== "INPUT" && e.target.tagName !== "TEXTAREA")
        e.preventDefault();
    },
    false
  );

  // Styling for deterrence
  const style = document.createElement("style");
  style.innerHTML = `
    * { -webkit-tap-highlight-color: transparent; }
    html, body { -webkit-user-select: none; user-select: none; -webkit-touch-callout: none; }
    input, textarea, [contenteditable="true"] { -webkit-user-select: text !important; user-select: text !important; }
    img { 
      -webkit-user-drag: none !important; 
      user-drag: none !important; 
      pointer-events: auto !important; 
    }
    .feed-cut-item, .moodboard-block-cut, .save-target, .long-press-target { 
      -webkit-touch-callout: none !important; 
      -webkit-user-select: none !important; 
    }
    .mumu-lp-progress {
      position: fixed; width: 40px; height: 40px; border: 4px solid rgba(255,94,0,0.3); border-top: 4px solid #ff5e00;
      border-radius: 50%; z-index: 2000000; pointer-events: none; display: none;
      animation: mumu-lp-spin 2s linear forwards;
    }
    @keyframes mumu-lp-spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
  `;
  document.head.appendChild(style);

  // PART 4 — ZOOM & DESKTOP BEHAVIOR
  document.addEventListener(
    "touchstart",
    (e) => {
      if (e.touches.length > 1) e.preventDefault();
    },
    { passive: false }
  );
  let lastTouchEnd = 0;
  document.addEventListener(
    "touchend",
    (e) => {
      const now = Date.now();
      if (now - lastTouchEnd <= 300) e.preventDefault();
      lastTouchEnd = now;
    },
    { passive: false }
  );

  // PART 5 — GLOBAL 2S LONG-PRESS FOR CUT SAVE
  let lpTimer = null;
  const lpIndicator = document.createElement("div");
  lpIndicator.className = "mumu-lp-progress";
  document.body.appendChild(lpIndicator);

  document.addEventListener(
    "touchstart",
    (e) => {
      const el = e.target.closest(
        ".feed-cut-item, .moodboard-block-cut, .save-target, .long-press-target"
      );
      if (!el) return;

      // Position indicator near finger
      const touch = e.touches[0];
      lpIndicator.style.left = `${touch.clientX - 20}px`;
      lpIndicator.style.top = `${touch.clientY - 60}px`;
      lpIndicator.style.display = "block";

      clearTimeout(lpTimer);
      lpTimer = setTimeout(() => {
        lpIndicator.style.display = "none";
        const cutId =
          el.dataset.cutId ||
          el.dataset.targetId ||
          el.closest("[data-feed-id]")?.dataset.feedId;
        if (cutId && typeof window.handleCutLongPress === "function") {
          window.handleCutLongPress(cutId);
        }
      }, 1200); // reduced to 1.2s for better UX
    },
    { passive: false }
  );

  document.addEventListener("mousedown", (e) => {
    const el = e.target.closest(
      ".feed-cut-item, .moodboard-block-cut, .save-target, .long-press-target"
    );
    if (!el) return;

    lpIndicator.style.left = `${e.clientX - 20}px`;
    lpIndicator.style.top = `${e.clientY - 60}px`;
    lpIndicator.style.display = "block";

    clearTimeout(lpTimer);
    lpTimer = setTimeout(() => {
      lpIndicator.style.display = "none";
      const cutId =
        el.dataset.cutId ||
        el.dataset.targetId ||
        el.closest("[data-feed-id]")?.dataset.feedId;
      if (cutId && typeof window.handleCutLongPress === "function") {
        window.handleCutLongPress(cutId);
      }
    }, 1200);
  });

  const cancelLP = () => {
    clearTimeout(lpTimer);
    lpIndicator.style.display = "none";
  };
  document.addEventListener("touchmove", cancelLP);
  document.addEventListener("touchend", cancelLP);
  document.addEventListener("touchcancel", cancelLP);
  document.addEventListener("mousemove", cancelLP);
  document.addEventListener("mouseup", cancelLP);
})();

// =========================
// UNIFIED UI SYSTEM
// =========================
(function setupUnifiedUI() {
  const ALERT_ID = "customAlertModal";
  const CONFIRM_ID = "customConfirmModal";

  window.showMumuLoader = () => {
    const loader =
      document.getElementById("full-page-loader") || injectLoader();
    loader.classList.remove("hidden");
    loader.style.display = "flex";
  };

  window.hideMumuLoader = () => {
    const loader = document.getElementById("full-page-loader");
    if (loader) {
      loader.classList.add("hidden");
      setTimeout(() => {
        if (loader.classList.contains("hidden")) loader.style.display = "none";
      }, 300);
    }
  };

  function injectLoader() {
    const html = `<div id="full-page-loader" class="full-page-loader" style="z-index:999999;"><div class="loader-content"><div class="loader-spinner"></div></div></div>`;
    document.body.insertAdjacentHTML("afterbegin", html);
    return document.getElementById("full-page-loader");
  }

  function ensureModals() {
    if (document.getElementById(ALERT_ID)) return;
    const html = `
      <div id="${ALERT_ID}" class="custom-modal" style="display:none"><div class="custom-modal-backdrop" onclick="closeCustomAlert()"></div><div class="custom-modal-content"><div class="custom-modal-header"><h3 id="customAlertTitle">알림</h3></div><div class="custom-modal-body"><p id="customAlertMessage"></p></div><div class="custom-modal-footer"><button class="custom-modal-btn primary" onclick="closeCustomAlert()">확인</button></div></div></div>
      <div id="${CONFIRM_ID}" class="custom-modal" style="display:none"><div class="custom-modal-backdrop" onclick="closeCustomConfirm(false)"></div><div class="custom-modal-content"><div class="custom-modal-header"><h3 id="customConfirmTitle">확인</h3></div><div class="custom-modal-body"><p id="customConfirmMessage"></p></div><div class="custom-modal-footer"><button class="custom-modal-btn secondary" onclick="closeCustomConfirm(false)">취소</button><button class="custom-modal-btn primary" onclick="closeCustomConfirm(true)">확인</button></div></div></div>
    `;
    document.body.insertAdjacentHTML("beforeend", html);
  }

  let alertRes = null;
  let confirmRes = null;
  window.closeCustomAlert = () => {
    document.getElementById(ALERT_ID).style.display = "none";
    if (alertRes) alertRes();
    alertRes = null;
  };
  window.closeCustomConfirm = (r) => {
    document.getElementById(CONFIRM_ID).style.display = "none";
    if (confirmRes) confirmRes(r);
    confirmRes = null;
  };

  window.alert = (msg, title = "알림") => {
    if (!msg) return Promise.resolve();
    ensureModals();
    return new Promise((r) => {
      alertRes = r;
      document.getElementById("customAlertMessage").textContent = msg;
      document.getElementById("customAlertTitle").textContent = title;
      document.getElementById(ALERT_ID).style.display = "flex";
    });
  };
  window.confirm = (msg, title = "확인") => {
    if (!msg) return Promise.resolve(false);
    ensureModals();
    return new Promise((r) => {
      confirmRes = r;
      document.getElementById("customConfirmMessage").textContent = msg;
      document.getElementById("customConfirmTitle").textContent = title;
      document.getElementById(CONFIRM_ID).style.display = "flex";
    });
  };

  // Legacy Aliases
  window.showCustomAlert = window.alert;
  window.showCustomConfirm = window.confirm;
})();

// =========================
// BOOTSTRAP & UTILS
// =========================
function initApp() {
  initializeAppUser()
    .then(() => setupAppUserListener())
    .catch((e) => console.error(e));

  // Viewport setup
  const updateVH = () => {
    document.documentElement.style.setProperty(
      "--vh",
      `${window.innerHeight * 0.01}px`
    );
    document.documentElement.style.setProperty(
      "--app-height",
      CSS.supports("height", "100dvh") ? "100dvh" : `${window.innerHeight}px`
    );
  };
  window.addEventListener("resize", updateVH);
  updateVH();
}

if (document.readyState === "loading")
  document.addEventListener("DOMContentLoaded", initApp);
else initApp();

(function bridgeFirebaseLater() {
  let synced = false;
  const trySync = () => {
    if (synced || window.App?.user) return;
    if (typeof window.getCurrentFirebaseUser === "function") {
      window
        .getCurrentFirebaseUser()
        .then((u) => {
          if (u?.uid) {
            window.App.user = { uid: u.uid, role: "reader", creatorId: null };
            synced = true;
          }
        })
        .catch(() => null);
    }
  };
  setTimeout(trySync, 500);
  setTimeout(trySync, 1500);
})();

// --- api-functions.js ---
// =========================
// API FUNCTIONS - DB INSERT/UPDATE/DELETE
// =========================
// 목표: 모든 DB 작업을 통일된 방식으로 처리
// 규칙: user_id는 항상 Firebase UID (text) 직접 사용
//       UUID는 콘텐츠/대상 ID만 사용 (feed.id, comment.id, cut.id 등)

// Firebase Functions import (동적)
async function getFirebaseFunctions() {
  try {
    const { getFunctions, httpsCallable } = await import(
      "https://www.gstatic.com/firebasejs/9.23.0/firebase-functions.js"
    );
    // const { app } = await import("./firebase_init.js");
    const app = window.firebaseApp;
    const functions = getFunctions(app);
    return { functions, httpsCallable };
  } catch (err) {
    console.error("[API Functions] Firebase Functions import 실패:", err);
    return null;
  }
}

/**
 * 좋아요 추가
 * @param {string} targetType - "feed" | "work" | "cut" | "comment" | "reply"
 * @param {string} targetId - UUID (콘텐츠/대상 ID)
 * @param {string} firebaseUid - Firebase UID (user_id로 직접 사용)
 * @returns {Promise<{error: Error|null}>}
 */
window.likeTarget = async function (targetType, targetId, firebaseUid) {
  const supabase =
    typeof window.getSupabase === "function"
      ? await window.getSupabase()
      : window.supabase;

  if (!supabase) {
    return { error: new Error("Supabase client not initialized") };
  }

  if (!firebaseUid) {
    return { error: new Error("Firebase UID is required") };
  }

  // target_type 검증: creator는 허용하지 않음
  // target_type 검증: production 스키마와 일치시킴
  const allowedTypes = ["feed", "work", "cut", "comment", "reply", "moodboard"];
  if (!allowedTypes.includes(targetType)) {
    return {
      error: new Error(
        `Invalid target_type: ${targetType}. Allowed: ${allowedTypes.join(
          ", "
        )}`
      ),
    };
  }

  // 강제 가드: creator는 절대 target이 될 수 없음
  if (targetType === "creator") {
    console.error(
      "[BLOCKED] likeTarget: creator는 절대 target이 될 수 없습니다."
    );
    console.log("[BLOCKED TARGET]", targetType, targetId);
    return { error: new Error("creator is not a valid target") };
  }

  try {
    // UUID 검증
    const isUUID = (v) => {
      if (typeof window.App?.utils?.isUUID === "function")
        return window.App.utils.isUUID(v);
      return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        v
      );
    };

    if (!isUUID(targetId)) {
      console.error("[likeTarget] target_id가 UUID가 아닙니다:", targetId);
      return { error: new Error("target_id must be a valid UUID") };
    }

    // ✅ 먼저 좋아요 상태 확인 (409 Conflict 방지)
    const { data: existingLikes, error: checkError } = await supabase
      .from("likes")
      .select("id")
      .eq("target_type", targetType)
      .eq("target_id", targetId)
      .eq("user_id", firebaseUid)
      .limit(1);

    if (checkError) {
      console.error("[likeTarget] 좋아요 상태 확인 실패:", checkError);
      return { error: checkError };
    }

    // 이미 좋아요가 있으면 unlike로 전환
    if (existingLikes && existingLikes.length > 0) {
      console.log("[likeTarget] 이미 좋아요가 존재함 -> unlike로 전환");
      if (typeof window.unlikeTarget === "function") {
        return window.unlikeTarget(targetType, targetId, firebaseUid);
      } else {
        console.error("[LIKE] unlikeTarget not found for toggle");
        return { error: new Error("unlikeTarget function not found") };
      }
    }

    // 좋아요가 없으면 새로 추가
    const payload = {
      id: crypto.randomUUID(), // 명시적 UUID 생성 (22P02 에러 방지)
      target_type: targetType,
      target_id: targetId,
      user_id: firebaseUid, // Firebase UID 직접 사용
    };

    console.log("[FINAL INSERT PAYLOAD] likeTarget", {
      ...payload,
      isTargetIdUUID: isUUID(targetId),
      isUserIdFirebaseUID:
        !isUUID(firebaseUid) &&
        typeof firebaseUid === "string" &&
        firebaseUid.length > 0,
    });

    // 코드 레벨 강제 검증
    if (!isUUID(payload.target_id)) {
      const error = new Error(
        `BLOCKED: target_id is not UUID. Got: ${payload.target_id}`
      );
      console.error("[FINAL INSERT PAYLOAD BLOCKED]", {
        ...payload,
        reason: "target_id is not a valid UUID",
      });
      throw error;
    }

    const { data, error } = await supabase.from("likes").insert(payload);

    // 401 에러(Unauthorized) 또는 RLS 위반(로그인 안 된 것으로 오인)인 경우 재시도
    // PostgrestError는 status 대신 code (42501 등) 사용.
    // 실제 401은 PostgREST 수준에서 보통 error.message에 "JWT" 또는 "Unauthorized" 포함
    if (
      error &&
      (error.code === "42501" ||
        error.message?.includes("JWT") ||
        error.message?.includes("security policy"))
    ) {
      console.warn("[likeTarget] 인증/보안 에러 감지 -> 토큰 재발급 후 재시도");
      if (typeof window.initializeSupabaseAuth === "function") {
        const newSupabase = await window.initializeSupabaseAuth();
        // 재시도
        const retryResult = await newSupabase.from("likes").insert(payload);
        if (retryResult.error) {
          console.error("[likeTarget] Retry failed:", retryResult.error);
        } else {
          console.log("[likeTarget] Retry success");
        }
        return { error: retryResult.error };
      }
    }

    // 409 Conflict 처리: 이미 좋아요가 있으면 조용히 unlike로 전환
    if (
      error &&
      (error.code === "23505" || error.message?.includes("duplicate"))
    ) {
      console.log("[likeTarget] 중복 좋아요 감지 -> unlike로 전환");
      if (typeof window.unlikeTarget === "function") {
        return window.unlikeTarget(targetType, targetId, firebaseUid);
      }
      // unlikeTarget이 없으면 에러 없이 성공으로 처리
      return { error: null };
    }

    // 다른 에러만 로그
    if (error) {
      console.error("[likeTarget] Insert failed:", error);
    }

    return { error };
  } catch (err) {
    console.error("[likeTarget] 예외:", err);
    return { error: err };
  }
};

/**
 * 좋아요 취소
 * @param {string} targetType - "feed" | "work" | "cut" | "comment" | "reply"
 * @param {string} targetId - UUID (콘텐츠/대상 ID)
 * @param {string} firebaseUid - Firebase UID (user_id로 직접 사용)
 * @returns {Promise<{error: Error|null}>}
 */
window.unlikeTarget = async function (targetType, targetId, firebaseUid) {
  const supabase =
    typeof window.getSupabase === "function"
      ? await window.getSupabase()
      : window.supabase;

  if (!supabase) {
    return { error: new Error("Supabase client not initialized") };
  }

  if (!firebaseUid) {
    return { error: new Error("Firebase UID is required") };
  }

  // target_type 검증: creator는 허용하지 않음
  // target_type 검증: production 스키마와 일치시킴
  const allowedTypes = ["feed", "work", "cut", "comment", "reply", "moodboard"];
  if (!allowedTypes.includes(targetType)) {
    return {
      error: new Error(
        `Invalid target_type: ${targetType}. Allowed: ${allowedTypes.join(
          ", "
        )}`
      ),
    };
  }

  try {
    // UUID 검증
    const isUUID = (v) => {
      if (typeof window.App?.utils?.isUUID === "function")
        return window.App.utils.isUUID(v);
      return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        v
      );
    };

    if (!isUUID(targetId)) {
      console.error("[unlikeTarget] target_id가 UUID가 아닙니다:", targetId);
      console.error("[DELETE PAYLOAD BLOCKED]", {
        user_id: firebaseUid,
        target_type: targetType,
        target_id: targetId,
        reason: "targetId is not a valid UUID",
      });
      return { error: new Error("target_id must be a valid UUID") };
    }

    // DELETE 직전 검증 로그
    console.log("[DELETE PAYLOAD]", {
      user_id: firebaseUid,
      target_type: targetType,
      target_id: targetId,
    });

    const { error } = await supabase
      .from("likes")
      .delete()
      .eq("target_type", targetType)
      .eq("target_id", targetId)
      .eq("user_id", firebaseUid); // Firebase UID 직접 사용

    // 401 에러(Unauthorized)인 경우 토큰 재발급 후 1회 재시도
    if (
      error &&
      (error.code === "42501" ||
        error.message?.includes("JWT") ||
        error.message?.includes("security policy"))
    ) {
      console.warn(
        "[unlikeTarget] 인증/보안 에러 감지 -> 토큰 재발급 후 재시도"
      );
      if (typeof window.initializeSupabaseAuth === "function") {
        const newSupabase = await window.initializeSupabaseAuth();
        const retryResult = await newSupabase
          .from("likes")
          .delete()
          .eq("target_type", targetType)
          .eq("target_id", targetId)
          .eq("user_id", firebaseUid);
        return { error: retryResult.error };
      }
    }
    return { error };
  } catch (err) {
    console.error("[unlikeTarget] 예외:", err);
    return { error: err };
  }
};

/**
 * 댓글/대댓글 작성
 * @param {string} targetType - "feed"
 * @param {string} targetId - UUID (feeds.id)
 * @param {string|null} parentCommentId - UUID (parent comment id) or null for top-level comment
 * @param {string} content - 댓글 내용
 * @returns {Promise<{error: Error|null}>}
 */
window.createComment = async function (
  targetType,
  targetId,
  parentCommentId,
  content
) {
  if (!window.supabase) {
    return { error: new Error("Supabase client not initialized") };
  }

  // Firebase UID 자동 가져오기
  let firebaseUid = null;
  try {
    if (typeof window.getCurrentFirebaseUser === "function") {
      const user = await window.getCurrentFirebaseUser();
      firebaseUid = user?.uid || null;
    }
  } catch (err) {
    console.error("[createComment] Firebase UID 가져오기 실패:", err);
  }

  if (!firebaseUid) {
    return { error: new Error("로그인이 필요합니다.") };
  }

  // target_type 검증: feed만 허용
  const allowedTypes = ["feed"];
  if (!allowedTypes.includes(targetType)) {
    return {
      error: new Error(
        `Invalid target_type: ${targetType}. Allowed: ${allowedTypes.join(
          ", "
        )}`
      ),
    };
  }

  try {
    // UUID 검증
    const isUUID = (v) => {
      if (typeof window.App?.utils?.isUUID === "function")
        return window.App.utils.isUUID(v);
      return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        v
      );
    };

    if (!isUUID(targetId)) {
      console.error("[createComment] target_id가 UUID가 아닙니다:", targetId);
      return { error: new Error("target_id must be a valid UUID") };
    }

    // 대댓글인 경우 - comment_replies 테이블에 삽입
    if (parentCommentId) {
      if (!isUUID(parentCommentId)) {
        console.error(
          "[createComment] comment_id가 UUID가 아닙니다:",
          parentCommentId
        );
        return { error: new Error("comment_id must be a valid UUID") };
      }

      const replyPayload = {
        id: crypto.randomUUID(),
        comment_id: parentCommentId,
        content: content,
        user_id: firebaseUid,
      };

      console.log("[FINAL INSERT PAYLOAD] comment_replies", replyPayload);

      const { data, error } = await supabase
        .from("comment_replies")
        .insert(replyPayload);

      if (
        error &&
        (error.code === "42501" ||
          error.message?.includes("JWT") ||
          error.message?.includes("security policy"))
      ) {
        console.warn(
          "[createComment] 인증/보안 에러 감지 -> 토큰 재발급 후 재시도"
        );
        if (typeof window.initializeSupabaseAuth === "function") {
          const newSupabase = await window.initializeSupabaseAuth();
          const retryResult = await newSupabase
            .from("comment_replies")
            .insert(replyPayload);
          return { error: retryResult.error };
        }
      }
      return { error };
    }

    // 최상위 댓글인 경우 - comments 테이블에 삽입
    const payload = {
      id: crypto.randomUUID(),
      target_type: targetType,
      target_id: targetId,
      content: content,
      user_id: firebaseUid,
    };

    console.log("[FINAL INSERT PAYLOAD] comments", payload);

    if (!isUUID(payload.target_id)) {
      const error = new Error(
        `BLOCKED: target_id is not UUID. Got: ${payload.target_id}`
      );
      console.error("[FINAL INSERT PAYLOAD BLOCKED]", {
        ...payload,
        reason: "target_id is not a valid UUID",
      });
      throw error;
    }

    const { data, error } = await supabase.from("comments").insert(payload);

    if (
      error &&
      (error.code === "42501" ||
        error.message?.includes("JWT") ||
        error.message?.includes("security policy"))
    ) {
      console.warn(
        "[createComment] 인증/보안 에러 감지 -> 토큰 재발급 후 재시도"
      );
      if (typeof window.initializeSupabaseAuth === "function") {
        const newSupabase = await window.initializeSupabaseAuth();
        const retryResult = await newSupabase.from("comments").insert(payload);
        return { error: retryResult.error };
      }
    }
    return { error };
  } catch (err) {
    console.error("[createComment] 예외:", err);
    return { error: err };
  }
};

/**
 * 댓글 목록 조회 (reader/creator 자동 구분)
 * @param {string} feedId - UUID (feeds.id)
 * @returns {Promise<{data: Array|null, error: Error|null}>}
 */
window.loadComments = async function (feedId) {
  if (!window.supabase) {
    return { data: null, error: new Error("Supabase client not initialized") };
  }

  if (!feedId || feedId === "undefined" || feedId === "null") {
    console.error("[loadComments] Invalid feedId", feedId);
    return { data: null, error: new Error("feedId is required") };
  }

  const isUUID = (v) => {
    if (typeof window.App?.utils?.isUUID === "function")
      return window.App.utils.isUUID(v);
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      v
    );
  };

  if (!isUUID(feedId)) {
    console.error("[loadComments] feedId is not a valid UUID", feedId);
    return { data: null, error: new Error("feedId must be a valid UUID") };
  }

  try {
    // 최상위 댓글만 조회 (comments 테이블)
    const { data: comments, error } = await window.supabase
      .from("comments")
      .select("id, content, created_at, user_id, target_type")
      .eq("target_type", "feed")
      .eq("target_id", feedId)
      .eq("is_deleted", false)
      .order("created_at", { ascending: true });

    if (error) {
      return { data: null, error };
    }

    if (!comments || comments.length === 0) {
      return { data: [], error: null };
    }

    // 대댓글 조회 (comment_replies 테이블)
    const commentIds = comments.map((c) => c.id);
    let replies = [];
    if (commentIds.length > 0) {
      const { data: repliesData } = await window.supabase
        .from("comment_replies")
        .select("id, content, created_at, user_id, comment_id")
        .in("comment_id", commentIds)
        .order("created_at", { ascending: true });
      replies = repliesData || [];
    }

    const allComments = [...comments, ...replies];
    const userIds = [
      ...new Set(allComments.map((c) => c.user_id).filter(Boolean)),
    ];

    let creators = null;
    try {
      const result = await window.supabase
        .from("creators")
        .select("firebase_uid, pen_name")
        .in("firebase_uid", userIds);
      creators = result.data || [];
    } catch (err) {
      console.warn("[loadComments] creators 조회 실패:", err);
      creators = [];
    }

    const creatorMap = {};
    (creators || []).forEach((c) => {
      if (c.firebase_uid) creatorMap[c.firebase_uid] = c;
    });

    // 독자 정보는 reader_public_profiles 테이블에서 조회
    const readerMap = {};
    const readerIds = userIds.filter((uid) => !creatorMap[uid]);

    console.log("[loadComments] readerIds to fetch:", readerIds);

    if (readerIds.length > 0) {
      try {
        // uid 컬럼 존재 여부를 알 수 없으므로 reader_id만 일단 가져오되, 에러 시 로깅 강화
        const { data: readers, error: readerError } = await window.supabase
          .from("reader_public_profiles")
          .select("*") // 모든 정보를 가져와서 로그로 구조 확인
          .in("reader_id", readerIds);

        if (readerError) {
          console.error(
            "[loadComments] reader_public_profiles 조회 에러 (reader_id 기준):",
            readerError
          );

          // 만약 reader_id 컬럼이 없어서 실패한 것이라면 uid로 재시도 (혹시 모를 하위 호환성)
          if (readerError.message?.includes("reader_id")) {
            console.log(
              "[loadComments] reader_id 컬럼 없음 -> uid 컬럼으로 재시도"
            );
            const { data: readersUid, error: readerErrorUid } =
              await window.supabase
                .from("reader_public_profiles")
                .select("*")
                .in("uid", readerIds);

            if (!readerErrorUid && readersUid) {
              readersUid.forEach((r) => {
                const key = r.uid || r.reader_id;
                if (key) readerMap[key] = r;
              });
            }
          }
        } else {
          console.log(
            "[loadComments] reader_public_profiles 조회 성공 (Data structure):",
            readers
          );
          (readers || []).forEach((r) => {
            // reader_id 또는 uid 중 있는 것을 키로 사용
            const key = r.reader_id || r.uid;
            if (key) readerMap[key] = r;
          });
        }
      } catch (err) {
        console.error("[loadComments] reader_public_profiles 예외:", err);
      }
    }

    // 3차 Fallback: 여전히 정보를 찾지 못한 ID들에 대해 readers 테이블 조회
    const stillMissingIds = readerIds.filter((id) => !readerMap[id]);

    // 현재 사용자 확인
    let currentUid = null;
    try {
      // const user = (await import("./firebase_init.js")).auth.currentUser;
      const user = auth.currentUser;
      currentUid = user?.uid;
    } catch (e) {}

    if (stillMissingIds.length > 0) {
      console.log(
        "[loadComments] Profiles missing in public profiles, checking fallback:",
        stillMissingIds
      );

      // 만약 현재 사용자가 누락되었다면 Firestore에서 직접 가져오기 (가장 확실한 방법)
      if (currentUid && stillMissingIds.includes(currentUid)) {
        try {
          const { getFirestore, doc, getDoc } = await import(
            "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js"
          );
          const db = getFirestore();
          const snap = await getDoc(doc(db, "readers", currentUid));
          if (snap.exists()) {
            const data = snap.data();
            readerMap[currentUid] = {
              nickname: data.nickname || data.username,
              username: data.username,
              full_name: data.name,
            };
            console.log(
              "[loadComments] ✅ Current user profile recovered from Firestore:",
              readerMap[currentUid].nickname
            );
          }
        } catch (e) {
          console.warn("[loadComments] Firestore recovery failed:", e);
        }
      }

      // 나머지 누락된 ID들에 대해 Supabase readers 테이블 조회
      const remMissingIds = stillMissingIds.filter((id) => !readerMap[id]);
      if (remMissingIds.length > 0) {
        try {
          const { data: privReaders } = await window.supabase
            .from("readers")
            .select("user_id, username, full_name")
            .in("user_id", remMissingIds);

          if (privReaders) {
            privReaders.forEach((r) => {
              if (!readerMap[r.user_id]) {
                readerMap[r.user_id] = {
                  nickname: r.username,
                  username: r.username,
                  full_name: r.full_name,
                };
              }
            });
          }
        } catch (err) {
          console.warn("[loadComments] readers 테이블 조회 실패:", err);
        }
      }
    }

    // 대댓글 그룹화 (comment_id 기준)
    const repliesMap = {};
    replies.forEach((reply) => {
      const parentId = reply.comment_id;
      if (!repliesMap[parentId]) {
        repliesMap[parentId] = [];
      }
      repliesMap[parentId].push(reply);
    });

    const processedData = comments.map((comment) => {
      const userId = comment.user_id;
      let displayName = "사용자";
      let userRole = "reader";

      if (creatorMap[userId]) {
        displayName = creatorMap[userId].pen_name || "사용자";
        userRole = "creator";
      } else if (readerMap[userId]) {
        const readerData = readerMap[userId];
        // 닉네임 우선, 없으면 name, username, 마지막으로 '사용자'
        displayName =
          readerData.nickname ||
          readerData.username ||
          readerData.full_name ||
          readerData.name ||
          "사용자";
        userRole = "reader";
      } else {
        // 매칭되는 프로필이 없는 경우 UID 앞글자로 임시 표시 (디버깅용)
        // 나중에 "사용자"로 돌려도 됨. 현재는 추적을 위해 ID 일부 노출
        console.warn(`[loadComments] No profile found for userId: ${userId}`);
        displayName = "사용자";
        userRole = "reader";
      }

      // 대댓글 처리
      const commentReplies = (repliesMap[comment.id] || []).map((reply) => {
        const replyUserId = reply.user_id;
        let replyDisplayName = "사용자";
        let replyUserRole = "reader";

        if (creatorMap[replyUserId]) {
          replyDisplayName = creatorMap[replyUserId].pen_name || "사용자";
          replyUserRole = "creator";
        } else if (readerMap[replyUserId]) {
          const readerData = readerMap[replyUserId];
          replyDisplayName =
            readerData.nickname ||
            readerData.name ||
            readerData.username ||
            "사용자";
          replyUserRole = "reader";
        }

        return {
          id: reply.id,
          content: reply.content,
          created_at: reply.created_at,
          user_id: reply.user_id,
          display_name: replyDisplayName,
          user_role: replyUserRole,
        };
      });

      return {
        id: comment.id,
        content: comment.content,
        created_at: comment.created_at,
        user_id: comment.user_id,
        display_name: displayName,
        user_role: userRole,
        replies: commentReplies, // 대댓글 배열 추가
      };
    });

    return { data: processedData, error: null };
  } catch (err) {
    console.error("[loadComments] 예외:", err);
    return { data: null, error: err };
  }
};

/**
 * 댓글 삭제
 * @param {string} commentId - UUID (댓글 ID)
 * @param {string} firebaseUid - Firebase UID (user_id로 직접 사용)
 * @returns {Promise<{error: Error|null}>}
 */
window.deleteComment = async function (commentId, firebaseUid) {
  if (!window.supabase) {
    return { error: new Error("Supabase client not initialized") };
  }

  if (!firebaseUid) {
    return { error: new Error("Firebase UID is required") };
  }

  try {
    // UUID 검증
    const isUUID = (v) => {
      if (typeof window.App?.utils?.isUUID === "function")
        return window.App.utils.isUUID(v);
      return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        v
      );
    };

    if (!isUUID(commentId)) {
      console.error("[deleteComment] comment_id가 UUID가 아닙니다:", commentId);
      console.error("[DELETE PAYLOAD BLOCKED]", {
        user_id: firebaseUid,
        comment_id: commentId,
        reason: "commentId is not a valid UUID",
      });
      return { error: new Error("comment_id must be a valid UUID") };
    }

    // DELETE 직전 검증 로그
    console.log("[DELETE PAYLOAD]", {
      user_id: firebaseUid,
      comment_id: commentId,
    });

    const { error } = await window.supabase
      .from("comments")
      .delete()
      .eq("id", commentId)
      .eq("user_id", firebaseUid); // Firebase UID 직접 사용
    return { error };
  } catch (err) {
    console.error("[deleteComment] 예외:", err);
    return { error: err };
  }
};

/**
 * 대댓글 작성
 * @param {string} commentId - UUID (댓글 ID)
 * @param {string} content - 대댓글 내용
 * @param {string} firebaseUid - Firebase UID (user_id로 직접 사용)
 * @returns {Promise<{error: Error|null}>}
 */
window.createReply = async function (commentId, content, firebaseUid) {
  if (!window.supabase) {
    return { error: new Error("Supabase client not initialized") };
  }

  if (!firebaseUid) {
    return { error: new Error("Firebase UID is required") };
  }

  try {
    // UUID 검증
    const isUUID = (v) => {
      if (typeof window.App?.utils?.isUUID === "function")
        return window.App.utils.isUUID(v);
      return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        v
      );
    };

    if (!isUUID(commentId)) {
      console.error("[createReply] comment_id가 UUID가 아닙니다:", commentId);
      return { error: new Error("comment_id must be a valid UUID") };
    }

    // 🔍 4️⃣ INSERT 직전 payload 로그 및 코드 레벨 검증
    const payload = {
      id: crypto.randomUUID(), // 명시적 UUID 생성 (22P02 에러 방지)
      comment_id: commentId,
      content: content,
      user_id: firebaseUid, // Firebase UID 직접 사용
    };

    console.log("[FINAL INSERT PAYLOAD] createReply", {
      ...payload,
      target_type: "comment",
      target_id: commentId,
      isTargetIdUUID: isUUID(commentId),
      isUserIdFirebaseUID:
        !isUUID(firebaseUid) &&
        typeof firebaseUid === "string" &&
        firebaseUid.length > 0,
    });

    // 코드 레벨 강제 검증
    if (!isUUID(payload.comment_id)) {
      const error = new Error(
        `BLOCKED: comment_id is not UUID. Got: ${payload.comment_id}`
      );
      console.error("[FINAL INSERT PAYLOAD BLOCKED]", {
        ...payload,
        reason: "comment_id is not a valid UUID",
      });
      throw error;
    }

    // 🔥 SUPABASE FINAL INSERT - 실제 전달되는 payload 확인
    console.log(
      "🔥 SUPABASE FINAL INSERT",
      "comment_replies",
      JSON.stringify(payload),
      Object.keys(payload),
      Object.values(payload)
    );

    const { data, error } = await window.supabase
      .from("comment_replies")
      .insert(payload);
    return { error };
  } catch (err) {
    console.error("[createReply] 예외:", err);
    return { error: err };
  }
};

/**
 * 대댓글 목록 조회 (reader/creator 자동 구분)
 * @param {string} commentId - UUID (댓글 ID)
 * @returns {Promise<{data: Array|null, error: Error|null}>}
 */
window.loadReplies = async function (commentId) {
  if (!window.supabase) {
    return { data: null, error: new Error("Supabase client not initialized") };
  }

  try {
    // 대댓글 조회
    const { data: replies, error } = await window.supabase
      .from("comment_replies")
      .select("id, content, created_at, user_id")
      .eq("comment_id", commentId)
      .order("created_at", { ascending: true });

    if (error) {
      return { data: null, error };
    }

    if (!replies || replies.length === 0) {
      return { data: [], error: null };
    }

    // 모든 user_id 수집
    const userIds = [...new Set(replies.map((r) => r.user_id).filter(Boolean))];

    // creators 조회 (Supabase)
    let creators = null;
    try {
      const result = await window.supabase
        .from("creators")
        .select("firebase_uid, pen_name")
        .in("firebase_uid", userIds);
      creators = result.data || [];
    } catch (err) {
      console.warn("[loadReplies] creators 조회 실패:", err);
      creators = [];
    }

    // creator 매핑 생성
    const creatorMap = {};
    (creators || []).forEach((c) => {
      if (c.firebase_uid) creatorMap[c.firebase_uid] = c;
    });

    // Firebase Firestore에서 readers 정보 조회
    const readerMap = {};
    if (window.firestoreUtils && window.firestoreUtils.getReader) {
      // creator가 아닌 user_id들만 조회
      const readerIds = userIds.filter((uid) => !creatorMap[uid]);
      for (const uid of readerIds) {
        try {
          const readerData = await window.firestoreUtils.getReader(uid);
          if (readerData) {
            readerMap[uid] = readerData;
          }
        } catch (err) {
          console.warn(
            `[loadReplies] Firebase Firestore readers 조회 실패 (${uid}):`,
            err
          );
        }
      }
    }

    // 대댓글 데이터에 표시명과 역할 추가
    const processedData = replies.map((reply) => {
      const userId = reply.user_id;
      let displayName = "사용자";
      let userRole = "reader";

      if (creatorMap[userId]) {
        // creator인 경우
        displayName = creatorMap[userId].pen_name || "사용자";
        userRole = "creator";
      } else if (readerMap[userId]) {
        // reader인 경우 (Firebase Firestore에서 가져온 정보)
        const readerData = readerMap[userId];
        displayName =
          readerData.nickname ||
          readerData.name ||
          readerData.username ||
          "사용자";
        userRole = "reader";
      }

      return {
        id: reply.id,
        content: reply.content,
        created_at: reply.created_at,
        user_id: reply.user_id,
        display_name: displayName,
        user_role: userRole,
      };
    });

    return { data: processedData, error: null };
  } catch (err) {
    console.error("[loadReplies] 예외:", err);
    return { data: null, error: err };
  }
};

/**
 * 대댓글 삭제
 * @param {string} replyId - UUID (대댓글 ID)
 * @param {string} firebaseUid - Firebase UID (user_id로 직접 사용)
 * @returns {Promise<{error: Error|null}>}
 */
window.deleteReply = async function (replyId, firebaseUid) {
  if (!window.supabase) {
    return { error: new Error("Supabase client not initialized") };
  }

  if (!firebaseUid) {
    return { error: new Error("Firebase UID is required") };
  }

  try {
    // UUID 검증
    const isUUID = (v) => {
      if (typeof window.App?.utils?.isUUID === "function")
        return window.App.utils.isUUID(v);
      return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        v
      );
    };

    if (!isUUID(replyId)) {
      console.error("[deleteReply] reply_id가 UUID가 아닙니다:", replyId);
      console.error("[DELETE PAYLOAD BLOCKED]", {
        user_id: firebaseUid,
        reply_id: replyId,
        reason: "replyId is not a valid UUID",
      });
      return { error: new Error("reply_id must be a valid UUID") };
    }

    // DELETE 직전 검증 로그
    console.log("[DELETE PAYLOAD]", {
      user_id: firebaseUid,
      reply_id: replyId,
    });

    const { error } = await window.supabase
      .from("comment_replies")
      .delete()
      .eq("id", replyId)
      .eq("user_id", firebaseUid); // Firebase UID 직접 사용
    return { error };
  } catch (err) {
    console.error("[deleteReply] 예외:", err);
    return { error: err };
  }
};

/**
 * 댓글 수정
 * @param {string} commentId - UUID (댓글 ID)
 * @param {string} content - 수정할 댓글 내용
 * @param {string} firebaseUid - Firebase UID (user_id로 직접 사용)
 * @returns {Promise<{error: Error|null}>}
 */
window.updateComment = async function (commentId, content, firebaseUid) {
  if (!window.supabase) {
    return { error: new Error("Supabase client not initialized") };
  }

  if (!firebaseUid) {
    return { error: new Error("Firebase UID is required") };
  }

  try {
    // UUID 검증
    const isUUID = (v) => {
      if (typeof window.App?.utils?.isUUID === "function")
        return window.App.utils.isUUID(v);
      return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        v
      );
    };

    if (!isUUID(commentId)) {
      console.error("[updateComment] comment_id가 UUID가 아닙니다:", commentId);
      console.error("[UPDATE PAYLOAD BLOCKED]", {
        user_id: firebaseUid,
        comment_id: commentId,
        reason: "commentId is not a valid UUID",
      });
      return { error: new Error("comment_id must be a valid UUID") };
    }

    // UPDATE 직전 검증 로그
    console.log("[UPDATE PAYLOAD]", {
      user_id: firebaseUid,
      comment_id: commentId,
    });

    const { error } = await window.supabase
      .from("comments")
      .update({ content: content })
      .eq("id", commentId)
      .eq("user_id", firebaseUid); // Firebase UID 직접 사용
    return { error };
  } catch (err) {
    console.error("[updateComment] 예외:", err);
    return { error: err };
  }
};

/**
 * 대댓글 수정
 * @param {string} replyId - UUID (대댓글 ID)
 * @param {string} content - 수정할 대댓글 내용
 * @param {string} firebaseUid - Firebase UID (user_id로 직접 사용)
 * @returns {Promise<{error: Error|null}>}
 */
window.updateReply = async function (replyId, content, firebaseUid) {
  if (!window.supabase) {
    return { error: new Error("Supabase client not initialized") };
  }

  if (!firebaseUid) {
    return { error: new Error("Firebase UID is required") };
  }

  try {
    // UUID 검증
    const isUUID = (v) => {
      if (typeof window.App?.utils?.isUUID === "function")
        return window.App.utils.isUUID(v);
      return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        v
      );
    };

    if (!isUUID(replyId)) {
      console.error("[updateReply] reply_id가 UUID가 아닙니다:", replyId);
      console.error("[UPDATE PAYLOAD BLOCKED]", {
        user_id: firebaseUid,
        reply_id: replyId,
        reason: "replyId is not a valid UUID",
      });
      return { error: new Error("reply_id must be a valid UUID") };
    }

    // UPDATE 직전 검증 로그
    console.log("[UPDATE PAYLOAD]", {
      user_id: firebaseUid,
      reply_id: replyId,
    });

    const { error } = await window.supabase
      .from("comment_replies")
      .update({ content: content })
      .eq("id", replyId)
      .eq("user_id", firebaseUid); // Firebase UID 직접 사용
    return { error };
  } catch (err) {
    console.error("[updateReply] 예외:", err);
    return { error: err };
  }
};

/**
 * 크리에이터 팔로우 추가
 * @param {Object} params - 파라미터 객체
 * @param {string} params.creatorId - creator의 Firebase UID (text)
 * @returns {Promise<{error: Error|null}>}
 */
window.followCreator = async function ({ creatorId }) {
  try {
    // Firebase UID 가져오기
    const firebaseUid = await (async () => {
      if (typeof window.getCurrentFirebaseUid === "function") {
        return await window.getCurrentFirebaseUid();
      }
      if (typeof window.getCurrentFirebaseUser === "function") {
        const user = await window.getCurrentFirebaseUser();
        return user?.uid || null;
      }
      return null;
    })();

    if (!firebaseUid) {
      return { error: new Error("Firebase UID not available") };
    }

    if (!creatorId) {
      return { error: new Error("creatorId is required") };
    }

    // Firebase UID 검증
    const isFirebaseUID =
      window.App?.utils?.isFirebaseUID ||
      function (v) {
        if (!v || typeof v !== "string") return false;
        if (window.App?.utils?.isUUID?.(v)) return false;
        return /^[a-zA-Z0-9]{20,28}$/.test(v);
      };

    if (!isFirebaseUID(firebaseUid)) {
      console.error(
        "[followCreator] reader_id가 Firebase UID가 아닙니다:",
        firebaseUid
      );
      return { error: new Error("reader_id must be a valid Firebase UID") };
    }

    if (!isFirebaseUID(creatorId)) {
      console.error(
        "[followCreator] creator_id가 Firebase UID가 아닙니다:",
        creatorId
      );
      return { error: new Error("creator_id must be a valid Firebase UID") };
    }

    // Firebase Functions 호출
    const firebaseFunctions = await getFirebaseFunctions();
    if (!firebaseFunctions) {
      return { error: new Error("Firebase Functions not available") };
    }

    const { functions, httpsCallable } = firebaseFunctions;
    const toggleCreatorFollowServer = httpsCallable(
      functions,
      "toggleCreatorFollowServer"
    );

    // 상태 확인 후 INSERT (서버 함수가 토글이므로 현재 상태 확인 필요)
    const checkResult = await window.supabase
      .from("creator_follows")
      .select("reader_id, creator_id")
      .eq("reader_id", firebaseUid)
      .eq("creator_id", creatorId)
      .limit(1);

    if (checkResult.error) {
      return { error: checkResult.error };
    }

    const isFollowing =
      checkResult.data &&
      Array.isArray(checkResult.data) &&
      checkResult.data.length > 0;

    // 이미 팔로우 중이면 에러 없이 성공 반환
    if (isFollowing) {
      return { error: null };
    }

    // 서버 함수 호출 (토글이므로 INSERT 수행)
    try {
      const result = await toggleCreatorFollowServer({
        readerId: firebaseUid,
        creatorId: creatorId,
      });

      if (result.data?.isFollowing) {
        console.log("[followCreator][INSERT SUCCESS]", {
          table: "creator_follows",
          reader_id: firebaseUid,
          creator_id: creatorId,
        });
        return { error: null };
      } else {
        return { error: new Error("Failed to follow creator") };
      }
    } catch (err) {
      return { error: err };
    }
  } catch (err) {
    console.error("[followCreator] 예외:", err);
    return { error: err };
  }
};

/**
 * 크리에이터 팔로우 취소
 * @param {Object} params - 파라미터 객체
 * @param {string} params.creatorId - creator의 Firebase UID (text)
 * @returns {Promise<{error: Error|null}>}
 */
window.unfollowCreator = async function ({ creatorId }) {
  try {
    // Firebase UID 가져오기
    const firebaseUid = await (async () => {
      if (typeof window.getCurrentFirebaseUid === "function") {
        return await window.getCurrentFirebaseUid();
      }
      if (typeof window.getCurrentFirebaseUser === "function") {
        const user = await window.getCurrentFirebaseUser();
        return user?.uid || null;
      }
      return null;
    })();

    if (!firebaseUid) {
      return { error: new Error("Firebase UID not available") };
    }

    if (!creatorId) {
      return { error: new Error("creatorId is required") };
    }

    // Firebase UID 검증
    const isFirebaseUID =
      window.App?.utils?.isFirebaseUID ||
      function (v) {
        if (!v || typeof v !== "string") return false;
        if (window.App?.utils?.isUUID?.(v)) return false;
        return /^[a-zA-Z0-9]{20,28}$/.test(v);
      };

    if (!isFirebaseUID(firebaseUid)) {
      console.error(
        "[unfollowCreator] reader_id가 Firebase UID가 아닙니다:",
        firebaseUid
      );
      return { error: new Error("reader_id must be a valid Firebase UID") };
    }

    if (!isFirebaseUID(creatorId)) {
      console.error(
        "[unfollowCreator] creator_id가 Firebase UID가 아닙니다:",
        creatorId
      );
      return { error: new Error("creator_id must be a valid Firebase UID") };
    }

    // Firebase Functions 호출
    const firebaseFunctions = await getFirebaseFunctions();
    if (!firebaseFunctions) {
      return { error: new Error("Firebase Functions not available") };
    }

    const { functions, httpsCallable } = firebaseFunctions;
    const toggleCreatorFollowServer = httpsCallable(
      functions,
      "toggleCreatorFollowServer"
    );

    // 상태 확인 후 DELETE (서버 함수가 토글이므로 현재 상태 확인 필요)
    const checkResult = await window.supabase
      .from("creator_follows")
      .select("reader_id, creator_id")
      .eq("reader_id", firebaseUid)
      .eq("creator_id", creatorId)
      .limit(1);

    if (checkResult.error) {
      return { error: checkResult.error };
    }

    const isFollowing =
      checkResult.data &&
      Array.isArray(checkResult.data) &&
      checkResult.data.length > 0;

    // 이미 언팔로우 상태면 에러 없이 성공 반환
    if (!isFollowing) {
      return { error: null };
    }

    // 서버 함수 호출 (토글이므로 DELETE 수행)
    try {
      const result = await toggleCreatorFollowServer({
        readerId: firebaseUid,
        creatorId: creatorId,
      });

      if (!result.data?.isFollowing) {
        console.log("[unfollowCreator][DELETE SUCCESS]", {
          table: "creator_follows",
          reader_id: firebaseUid,
          creator_id: creatorId,
        });
        return { error: null };
      } else {
        return { error: new Error("Failed to unfollow creator") };
      }
    } catch (err) {
      return { error: err };
    }
  } catch (err) {
    console.error("[unfollowCreator] 예외:", err);
    return { error: err };
  }
};

/**
 * 크리에이터 팔로우 토글
 * @param {Object} params - 파라미터 객체
 * @param {string} params.creatorId - creator의 Firebase UID (text)
 * @returns {Promise<{error: Error|null, isFollowing: boolean}>}
 */
// 백업: feed-stat-interaction.js에서 덮어쓰기 전에 백업
window.__toggleCreatorFollowAPI = async function ({ creatorId }) {
  if (!window.supabase) {
    return {
      error: new Error("Supabase client not initialized"),
      isFollowing: false,
    };
  }

  try {
    // Firebase UID 가져오기
    const firebaseUid = await (async () => {
      if (typeof window.getCurrentFirebaseUid === "function") {
        return await window.getCurrentFirebaseUid();
      }
      if (typeof window.getCurrentFirebaseUser === "function") {
        const user = await window.getCurrentFirebaseUser();
        return user?.uid || null;
      }
      return null;
    })();

    if (!firebaseUid) {
      return {
        error: new Error("Firebase UID not available"),
        isFollowing: false,
      };
    }

    if (!creatorId) {
      return { error: new Error("creatorId is required"), isFollowing: false };
    }

    // Firebase UID 검증
    const isFirebaseUID =
      window.App?.utils?.isFirebaseUID ||
      function (v) {
        if (!v || typeof v !== "string") return false;
        if (window.App?.utils?.isUUID?.(v)) return false;
        return /^[a-zA-Z0-9]{20,28}$/.test(v);
      };

    if (!isFirebaseUID(firebaseUid)) {
      console.error(
        "[toggleCreatorFollow] reader_id가 Firebase UID가 아닙니다:",
        firebaseUid
      );
      return {
        error: new Error("reader_id must be a valid Firebase UID"),
        isFollowing: false,
      };
    }

    if (!isFirebaseUID(creatorId)) {
      console.error(
        "[toggleCreatorFollow] creator_id가 Firebase UID가 아닙니다:",
        creatorId
      );
      return {
        error: new Error("creator_id must be a valid Firebase UID"),
        isFollowing: false,
      };
    }

    // ============================================
    // STEP 1: 상태 확인 (creator_follows 테이블 SELECT)
    // ============================================
    let isFollowing = false;
    let checkError = null;
    try {
      const checkPayload = {
        reader_id: firebaseUid,
        creator_id: creatorId,
      };

      console.log(
        "[toggleCreatorFollow][STEP 1 CHECK] 팔로우 상태 확인:",
        checkPayload
      );

      const result = await window.supabase
        .from("creator_follows")
        .select("reader_id, creator_id")
        .eq("reader_id", firebaseUid) // Firebase UID 직접 사용
        .eq("creator_id", creatorId) // Firebase UID 직접 사용
        .maybeSingle();

      checkError = result.error;

      if (checkError) {
        console.error("[toggleCreatorFollow][STEP 1 CHECK FAILED]", {
          table: "creator_follows",
          checkPayload,
          error: checkError,
          errorCode: checkError.code,
          errorMessage: checkError.message,
          errorDetails: checkError.details,
          errorHint: checkError.hint,
        });

        // 406 에러 특별 처리
        if (
          checkError.code === "PGRST116" ||
          checkError.message?.includes("406")
        ) {
          console.error("[toggleCreatorFollow][406 ERROR]", {
            table: "creator_follows",
            checkPayload,
            error: checkError,
            message:
              "PostgREST 406 에러 - .single() 사용으로 인한 문제일 수 있습니다. .limit(1) + 배열 체크로 변경되었습니다.",
          });
        }

        // 22P02 에러 체크
        if (
          checkError.message &&
          checkError.message.includes("invalid input syntax for type uuid")
        ) {
          const uuidMatch = checkError.message.match(
            /invalid input syntax for type uuid: "([^"]+)"/
          );
          const invalidValue = uuidMatch ? uuidMatch[1] : "unknown";
          console.error("[toggleCreatorFollow][22P02 ERROR]", {
            table: "creator_follows",
            invalidValue,
            checkPayload,
            message: `Firebase UID "${invalidValue}"가 creator_follows 테이블의 UUID 컬럼에 들어간 것으로 추정됩니다.`,
          });
        }

        // 에러가 있어도 계속 진행 (팔로우 안 함으로 간주)
        isFollowing = false;
      } else {
        // .maybeSingle() results in object or null
        const existingFollow = result.data;
        isFollowing = !!existingFollow;

        console.log("[toggleCreatorFollow][STEP 1 CHECK SUCCESS]", {
          table: "creator_follows",
          checkPayload,
          isFollowing,
          foundRows: result.data ? 1 : 0,
        });
      }
    } catch (err) {
      console.error("[toggleCreatorFollow][STEP 1 CHECK EXCEPTION]", {
        table: "creator_follows",
        error: err.message,
        stack: err.stack,
      });
      // 예외 발생 시 팔로우 안 함으로 간주하고 계속 진행
      isFollowing = false;
    }

    // ============================================
    // STEP 2: INSERT 또는 DELETE (Firebase Function 호출)
    // ============================================
    let step2Error = null;
    let newIsFollowing = false;

    try {
      // Firebase Functions 호출
      const firebaseFunctions = await getFirebaseFunctions();
      if (!firebaseFunctions) {
        step2Error = new Error("Firebase Functions not available");
        newIsFollowing = isFollowing;
      } else {
        const { functions, httpsCallable } = firebaseFunctions;
        const toggleCreatorFollowServer = httpsCallable(
          functions,
          "toggleCreatorFollowServer"
        );

        console.log(
          `[toggleCreatorFollow][STEP 2 ${
            isFollowing ? "DELETE" : "INSERT"
          }] 서버 함수 호출 시작`
        );

        const result = await toggleCreatorFollowServer({
          readerId: firebaseUid,
          creatorId: creatorId,
        });

        if (result.data?.isFollowing !== undefined) {
          newIsFollowing = result.data.isFollowing;
          step2Error = null;
          console.log(
            `[toggleCreatorFollow][STEP 2 ${
              isFollowing ? "DELETE" : "INSERT"
            } SUCCESS]`,
            { isFollowing: newIsFollowing }
          );
        } else {
          step2Error = new Error("Invalid response from server");
          newIsFollowing = isFollowing;
          console.error("[toggleCreatorFollow][STEP 2 FAILED]", {
            step: isFollowing ? "DELETE" : "INSERT",
            error: step2Error,
          });
        }
      }
    } catch (err) {
      console.error("[toggleCreatorFollow][STEP 2 EXCEPTION]", {
        step: isFollowing ? "DELETE" : "INSERT",
        error: err.message,
        stack: err.stack,
      });
      step2Error = err;
      newIsFollowing = isFollowing;
    }

    // ============================================
    // STEP 3: 부수 효과 (user_feed_events 등) - 현재 없음
    // ============================================
    // 향후 필요 시 여기에 추가

    return { error: step2Error, isFollowing: newIsFollowing };
  } catch (err) {
    console.error("[toggleCreatorFollow] 예외:", err);
    return { error: err, isFollowing: false };
  }
};

// feed-stat-interaction.js에서 window.toggleCreatorFollow를 덮어쓸 수 있도록
// 여기서는 백업만 하고, feed-stat-interaction.js가 없을 때만 기본 함수로 설정
if (typeof window.toggleCreatorFollow === "undefined") {
  window.toggleCreatorFollow = window.__toggleCreatorFollowAPI;
}

console.log(
  "[API Functions] ✅ window.likeTarget, window.createComment, window.toggleCreatorFollow 등 함수 정의 완료"
);

function openCommentsModal(feedId) {
  console.log("[COMMENT MODAL] open", feedId);

  if (typeof loadComments === "function") {
    loadComments(feedId).then((result) => {
      console.log(
        "[COMMENT MODAL] fetched comments",
        result?.data?.length ?? "error"
      );
    });
  }

  const modal = document.getElementById("commentsModal");
  if (modal) {
    modal.classList.add("active");
    console.log("[COMMENT MODAL] DOM mounted (active)");
  }
}

function closeModal() {
  const modal = document.getElementById("commentsModal");
  if (modal) modal.classList.remove("active");
}

window.openCommentsModal = openCommentsModal;
window.closeModal = closeModal;

// [ADDED] Global Handler for Creator Profile
window.openCreatorProfile = function (creatorId) {
  console.log("[API] openCreatorProfile called", creatorId);
  // Found real modal: openCreatorPreviewModal in feed-stat-interaction.js
  if (typeof window.openCreatorPreviewModal === "function") {
    window.openCreatorPreviewModal(creatorId);
    return;
  }

  console.error(
    "[openCreatorProfile] Implementation invalid - openCreatorPreviewModal not found."
  );
};

// Ensure toggleCreatorFollow is globally accessible per requirement
if (typeof window.toggleCreatorFollow !== "function") {
  window.toggleCreatorFollow = function (creatorId, btnElement) {
    console.log("[API] toggleCreatorFollow placeholder", creatorId);
    // Implement or link to real logic
  };
}

// --- tabbar-init.js ---
/**
 * Tabbar initialization - works in both local and Firebase Hosting
 * Single source of truth for active tab detection
 */
(function () {
  function getCurrentPageKey() {
    const currentPath = window.location.pathname;
    // Handle both "/index.html" and "/" and "" cases
    let currentPage = currentPath.split("/").pop();

    // Handle root/index case
    if (!currentPage || currentPage === "" || currentPage === "index.html") {
      return "index";
    }

    // Remove .html extension if present
    if (currentPage.endsWith(".html")) {
      currentPage = currentPage.replace(".html", "");
    }

    // Map page names (with or without .html) to data-page values
    const pageMap = {
      index: "index",
      community: "community",
      moodboard_detail: "community", // 무드보드 상세 페이지는 커뮤니티 탭 활성화
      explore: "explore",
      store: "store",
      mypage_reader: "mypage_reader",
      mypage_creator: "mypage_reader", // creator pages use same tab
      moodboard_editor: "mypage_reader", // 에디터 페이지에서는 마이페이지 탭 활성화
    };

    return pageMap[currentPage] || "index";
  }

  function setActiveTab() {
    const currentPath = window.location.pathname;
    let currentPage = currentPath.split("/").pop();

    // Handle root path or empty - explicitly check for index
    if (
      !currentPage ||
      currentPage === "" ||
      currentPage === "index.html" ||
      currentPath === "/" ||
      currentPath.endsWith("/index.html")
    ) {
      currentPage = "index";
    } else if (currentPage.endsWith(".html")) {
      currentPage = currentPage.replace(".html", "");
    }

    // mypage_creator에서는 탭바 활성화하지 않음
    if (currentPage === "mypage_creator") {
      // Remove active from all tabs
      document.querySelectorAll(".tabbar-tab").forEach((tab) => {
        tab.classList.remove("active");
      });
      return;
    }

    const currentPageKey = getCurrentPageKey();

    // Find and activate the correct tab
    const activeTab = document.querySelector(
      `.tabbar-tab[data-page="${currentPageKey}"]`
    );

    if (activeTab) {
      // Remove active from all tabs
      document.querySelectorAll(".tabbar-tab").forEach((tab) => {
        tab.classList.remove("active");
        // Remove any inline styles that might interfere with CSS
        const icon = tab.querySelector(".tabbar-icon");
        if (icon) {
          icon.style.filter = "";
          icon.style.opacity = "";
          icon.style.transform = "";
        }
      });
      // Add active to current tab
      activeTab.classList.add("active");
    } else {
      // Fallback: if no tab found and we're on index, try to activate index tab
      if (currentPage === "index" || currentPageKey === "index") {
        const indexTab = document.querySelector(
          '.tabbar-tab[data-page="index"]'
        );
        if (indexTab) {
          document.querySelectorAll(".tabbar-tab").forEach((tab) => {
            tab.classList.remove("active");
            // Remove any inline styles that might interfere with CSS
            const icon = tab.querySelector(".tabbar-icon");
            if (icon) {
              icon.style.filter = "";
              icon.style.opacity = "";
              icon.style.transform = "";
            }
          });
          indexTab.classList.add("active");
        }
      }
    }

    // Add click feedback (doesn't prevent navigation)
    const tabbarTabs = document.querySelectorAll(".tabbar-tab");
    tabbarTabs.forEach((tab) => {
      // Remove existing listeners to avoid duplicates
      const newTab = tab.cloneNode(true);
      tab.parentNode.replaceChild(newTab, tab);

      newTab.addEventListener("click", function (e) {
        // Visual feedback only - navigation happens naturally
        // Don't prevent default - let href work
        // 역할 분기는 mypage_router.html에서 처리됨
        document.querySelectorAll(".tabbar-tab").forEach((t) => {
          t.classList.remove("active");
          // Remove any inline styles that might interfere with CSS
          const icon = t.querySelector(".tabbar-icon");
          if (icon) {
            icon.style.filter = "";
            icon.style.opacity = "";
            icon.style.transform = "";
          }
        });
        this.classList.add("active");
      });
    });
  }

  function initTabbar() {
    const tabbarContainer = document.getElementById("tabbar");

    if (!tabbarContainer) {
      console.error("Tabbar container not found");
      return;
    }

    // Fetch tabbar HTML component
    fetch("components/tabbar.html")
      .then((response) => {
        if (!response.ok) {
          throw new Error(`Failed to fetch tabbar: ${response.status}`);
        }
        return response.text();
      })
      .then((html) => {
        // Insert tabbar HTML into container
        tabbarContainer.innerHTML = html;

        // Set active tab after HTML is loaded (use requestAnimationFrame to ensure DOM is ready)
        requestAnimationFrame(() => {
          setActiveTab();
          // Also set active tab after a short delay to ensure it persists
          setTimeout(() => {
            setActiveTab();
          }, 100);
        });

        // Force visibility
        const tabbar = tabbarContainer.querySelector(".tabbar, nav.tabbar");
        if (tabbar) {
          tabbar.style.display = "flex";
          tabbar.style.visibility = "visible";
          tabbar.style.opacity = "1";
        }
      })
      .catch((error) => {
        console.error("Error loading tabbar:", error);
        // Fallback: show error or use empty tabbar
        tabbarContainer.innerHTML = "<!-- Tabbar failed to load -->";
      });
  }

  // Initialize when DOM is ready
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initTabbar);
  } else {
    initTabbar();
  }

  // Re-apply active state on page load/visibility change to ensure it persists
  window.addEventListener("load", () => {
    setTimeout(() => {
      setActiveTab();
    }, 200);
  });

  // Also re-apply when page becomes visible (e.g., returning from another tab)
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) {
      setTimeout(() => {
        setActiveTab();
      }, 100);
    }
  });
})();

// --- reader_auth.js ---
// =========================
// READER FIREBASE AUTH
// =========================

import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
} from "https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js";

// auth 객체 확인
// console.log("[로그인] auth 객체 로드 확인:", auth ? "✅ 로드됨" : "❌ 없음");

/**
 * Sign in with username (ID) and password
 * @param {string} username - User's login ID
 * @param {string} password - User's password
 * @returns {Promise<Object>} UserCredential 객체
 */
export async function signInWithUsername(username, password) {
  // console.log("[로그인] signInWithUsername 호출:", username);

  // username 이 들어오면 도메인 붙이고, 이메일이 들어오면 그대로 사용
  const normalized = (username || "").trim();
  const email = normalized.includes("@")
    ? normalized
    : `${normalized}@mumu.app`;
  // console.log("[로그인] 변환된 email:", email);

  // auth 객체 확인
  if (!auth) {
    console.error("[로그인] ❌ auth 객체가 없습니다!");
    throw new Error("인증 시스템을 초기화할 수 없습니다.");
  }
  /* 
  console.log(
    "[로그인] auth 객체 확인 완료:",
    auth.app?.name || "앱 이름 없음"
  );
  */

  // signInWithEmailAndPassword 함수 확인
  if (typeof signInWithEmailAndPassword !== "function") {
    console.error("[로그인] ❌ signInWithEmailAndPassword 함수가 없습니다!");
    throw new Error("로그인 함수를 로드할 수 없습니다.");
  }
  // console.log("[로그인] signInWithEmailAndPassword 함수 확인 완료");

  try {
    /*
    console.log(
      "[로그인] signInWithEmailAndPassword 호출 시작 - email:",
      email
    );
    console.log("[로그인] password 길이:", password ? password.length : 0);
    */

    // Promise가 제대로 처리되도록 명시적으로 await
    const userCredential = await Promise.resolve(
      signInWithEmailAndPassword(auth, email, password)
    ).catch((err) => {
      console.error("[로그인] Promise catch에서 에러:", err);
      throw err;
    });

    // console.log("[로그인] ✅ signInWithEmailAndPassword 성공");
    // console.log("[로그인] ✅ 로그인 성공:", userCredential.user.uid);

    // Firebase 로그인 성공 후 Supabase Custom JWT 초기화
    try {
      // const { initializeSupabaseAuth } = await import("./supabase-auth.js");
      if (typeof window.initializeSupabaseAuth === "function") {
        await window.initializeSupabaseAuth();
      }
      // console.log("[로그인] ✅ Supabase Custom JWT 초기화 완료");
    } catch (supabaseError) {
      console.warn(
        "[로그인] ⚠️ Supabase Custom JWT 초기화 실패 (계속 진행):",
        supabaseError
      );
      // Custom JWT 초기화 실패해도 Firebase 로그인은 성공했으므로 계속 진행
    }

    // 로그인 성공 시 localStorage에 상태 저장
    localStorage.setItem("mumu_logged_in", "true");
    // console.log("[로그인] localStorage 저장 완료: mumu_logged_in = true");

    return userCredential;
  } catch (error) {
    console.error("[로그인] ❌ 로그인 실패:", error);
    console.error("[로그인] 에러 코드:", error.code);
    console.error("[로그인] 에러 메시지:", error.message);
    console.error("[로그인] 전체 에러 객체:", error);
    throw error; // 에러를 상위로 전달하여 호출자가 처리하도록
  }
}

// 전역 스코프에 노출 (일반 script에서도 사용 가능하도록)
window.signInWithUsername = signInWithUsername;

/**
 * Create user with username (ID) and password
 * @param {string} username - User's login ID
 * @param {string} password - User's password
 */
export async function createUserWithUsername(username, password) {
  try {
    const email = `${username}@mumu.app`;

    const userCredential = await createUserWithEmailAndPassword(
      auth,
      email,
      password
    );

    return userCredential;
  } catch (error) {
    console.error("Signup failed:", error);
    throw error;
  }
}

/**
 * Get current Firebase Auth user
 * @returns {Promise<User|null>} - Current authenticated user or null
 */
export function getCurrentFirebaseUser() {
  return new Promise((resolve) => {
    const unsub = onAuthStateChanged(auth, (user) => {
      unsub();
      resolve(user || null);
    });
  });
}

// 전역 스코프에 노출
window.getCurrentFirebaseUser = getCurrentFirebaseUser;

/**
 * onAuthStateChanged를 전역으로 노출 (index.html에서 사용)
 */
export function setupAuthStateListener(callback) {
  return onAuthStateChanged(auth, callback);
}

// 전역 스코프에 노출
window.setupAuthStateListener = setupAuthStateListener;

/**
 * Sign out current user
 */
export async function signOutFirebase() {
  try {
    console.log("[로그아웃] signOutFirebase 호출");
    await signOut(auth);

    // Supabase Auth 클리어
    try {
      // const { clearSupabaseAuth } = await import("./supabase-auth.js");
      if (typeof window.clearSupabaseAuth === "function") {
        window.clearSupabaseAuth();
      }
      console.log("[로그아웃] ✅ Supabase Auth 클리어 완료");
    } catch (supabaseError) {
      console.warn("[로그아웃] ⚠️ Supabase Auth 클리어 실패:", supabaseError);
    }

    // 로그아웃 성공 시 localStorage 초기화
    localStorage.removeItem("mumu_logged_in");
    console.log("[로그아웃] ✅ 로그아웃 성공 및 localStorage 초기化");
  } catch (error) {
    console.error("[로그아웃] ❌ 로그아웃 실패:", error);
    throw error;
  }
}

// 전역 스코프에 노출
window.signOutFirebase = signOutFirebase;

/**
 * Route to MyPage based on role (Firestore check)
 * Creator → mypage_creator.html
 * Reader → mypage_reader.html
 */
export async function routeToMyPage() {
  const user = await getCurrentFirebaseUser();

  if (!user || !user.uid) {
    console.warn("[MyPage Route] No user, redirect to login");
    window.location.href = "login.html";
    return;
  }

  try {
    const db = window.firebase.firestore();
    const creatorDoc = await db.collection("creators").doc(user.uid).get();

    if (creatorDoc.exists) {
      console.log("[MyPage Route] Creator detected → mypage_creator.html");
      window.location.href = "mypage_creator.html";
    } else {
      console.log("[MyPage Route] Reader (default) → mypage_reader.html");
      window.location.href = "mypage_reader.html";
    }
  } catch (error) {
    console.error("[MyPage Route] Firestore check failed:", error);
    console.log("[MyPage Route] Fallback → mypage_reader.html");
    window.location.href = "mypage_reader.html";
  }
}

// 전역 스코프에 노출
window.routeToMyPage = routeToMyPage;

// =========================
// LOGIN FORM EVENT BINDING
// =========================
// login.html 페이지에서 로그인 폼 제출 이벤트를 자동으로 바인딩

function initLoginForm() {
  // login.html 페이지에서만 실행
  const loginForm = document.getElementById("loginForm");
  if (!loginForm) {
    // login.html이 아닌 경우 종료
    return;
  }

  console.log("[로그인] 로그인 폼 이벤트 바인딩 시작");

  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const username = document.getElementById("username")?.value.trim();
    const password = document.getElementById("password")?.value;
    const loginBtn = document.getElementById("loginBtn");
    const errorMessage = document.getElementById("errorMessage");

    // 입력값 검증
    if (!username || !password) {
      if (errorMessage) {
        errorMessage.textContent = "사용자명과 비밀번호를 입력해주세요.";
        errorMessage.classList.add("show");
      }
      return;
    }

    // Clear previous errors
    if (errorMessage) {
      errorMessage.classList.remove("show");
    }
    if (loginBtn) {
      loginBtn.disabled = true;
      loginBtn.textContent = "로그인 중...";
    }

    try {
      console.log("[로그인] 폼 제출 시작 - username:", username);

      // signInWithUsername 호출 (내부적으로 email 변환)
      const userCredential = await signInWithUsername(username, password);

      if (!userCredential || !userCredential.user) {
        throw new Error("로그인에 실패했습니다");
      }

      console.log("[로그인] ✅ 로그인 성공 - 홈으로 이동");

      // 로그인 성공 플래그 설정 (index.html에서 즉시 UI 업데이트)
      localStorage.setItem("mumu_just_logged_in", "true");

      // 로그인 성공 시 홈으로 리다이렉트
      window.location.href = "index.html";
    } catch (error) {
      console.error("[로그인] ❌ 로그인 에러:", error);
      let errorMessageText = "로그인에 실패했습니다. 다시 시도해주세요.";

      // User-friendly error messages
      if (error.code === "auth/user-not-found") {
        errorMessageText = "사용자명을 찾을 수 없습니다.";
      } else if (error.code === "auth/wrong-password") {
        errorMessageText = "비밀번호가 올바르지 않습니다.";
      } else if (error.code === "auth/invalid-email") {
        errorMessageText = "올바른 사용자명을 입력해주세요.";
      } else if (
        error.code === "auth/invalid-credential" ||
        error.code === "auth/invalid-login-credentials"
      ) {
        errorMessageText = "사용자명 또는 비밀번호가 올바르지 않습니다.";
      } else if (error.message) {
        errorMessageText = error.message;
      }

      if (errorMessage) {
        errorMessage.textContent = errorMessageText;
        errorMessage.classList.add("show");
      }
      if (loginBtn) {
        loginBtn.disabled = false;
        loginBtn.textContent = "로그인";
      }
    }
  });

  console.log("[로그인] ✅ 로그인 폼 이벤트 바인딩 완료");
}

// 페이지 로드 시 전역 초기화 및 로그인 페이지용 오토 리다이렉트
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => {
    initLoginForm();

    // 로그인 페이지에서 이미 Firebase 세션이 있는 경우 자동 이동
    if (window.location.pathname.includes("login.html")) {
      onAuthStateChanged(auth, (user) => {
        if (user) {
          console.log("[Auth] 세션 발견 -> index.html 자동 이동");
          localStorage.setItem("mumu_logged_in", "true");
          window.location.replace("index.html");
        }
      });
    }
  });
} else {
  initLoginForm();
  if (window.location.pathname.includes("login.html")) {
    onAuthStateChanged(auth, (user) => {
      if (user) {
        localStorage.setItem("mumu_logged_in", "true");
        window.location.replace("index.html");
      }
    });
  }
}
