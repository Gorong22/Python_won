import { auth, app } from "./firebase_init.js";
import {
  getFunctions,
  httpsCallable,
} from "https://www.gstatic.com/firebasejs/9.23.0/firebase-functions.js";

const functions = getFunctions(app, "us-central1");
const checkCreatorStatus = httpsCallable(functions, "checkCreatorStatus");

// 과거 가드 캐시 제거 (role/status 관련 값)
try {
  localStorage.removeItem("user_role");
  localStorage.removeItem("creator_status");
  sessionStorage.removeItem("user_role");
  sessionStorage.removeItem("creator_status");
} catch (cacheError) {
  console.warn("Cache cleanup skipped:", cacheError);
}

auth.onAuthStateChanged(async (user) => {
  if (!user) {
    window.location.href = "/login_creator.html";
    return;
  }

  try {
    const result = await checkCreatorStatus();
    const data = result?.data;

    if (!data?.exists) {
      window.location.href = "/login_creator.html";
      return;
    }

    if (data.status !== "approved") {
      window.location.href = "/creator_pending.html";
      return;
    }

    // approved → 통과 (리다이렉트 없음)
  } catch (error) {
    console.error("creator_guard check failed:", error);
    window.location.href = "/login_creator.html";
  }
});
