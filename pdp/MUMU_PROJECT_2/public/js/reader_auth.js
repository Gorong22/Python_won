// =========================
// READER FIREBASE AUTH
// =========================

import { auth } from "./firebase_init.js";
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
} from "https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js";

// auth 객체 확인
console.log("[로그인] auth 객체 로드 확인:", auth ? "✅ 로드됨" : "❌ 없음");

/**
 * Sign in with username (ID) and password
 * @param {string} username - User's login ID
 * @param {string} password - User's password
 * @returns {Promise<Object>} UserCredential 객체
 */
export async function signInWithUsername(username, password) {
  console.log("[로그인] signInWithUsername 호출:", username);

  // username 이 들어오면 도메인 붙이고, 이메일이 들어오면 그대로 사용
  const normalized = (username || "").trim();
  const email = normalized.includes("@")
    ? normalized
    : `${normalized}@mumu.app`;
  console.log("[로그인] 변환된 email:", email);

  // auth 객체 확인
  if (!auth) {
    console.error("[로그인] ❌ auth 객체가 없습니다!");
    throw new Error("인증 시스템을 초기화할 수 없습니다.");
  }
  console.log(
    "[로그인] auth 객체 확인 완료:",
    auth.app?.name || "앱 이름 없음"
  );

  // signInWithEmailAndPassword 함수 확인
  if (typeof signInWithEmailAndPassword !== "function") {
    console.error("[로그인] ❌ signInWithEmailAndPassword 함수가 없습니다!");
    throw new Error("로그인 함수를 로드할 수 없습니다.");
  }
  console.log("[로그인] signInWithEmailAndPassword 함수 확인 완료");

  try {
    console.log(
      "[로그인] signInWithEmailAndPassword 호출 시작 - email:",
      email
    );
    console.log("[로그인] password 길이:", password ? password.length : 0);

    // Promise가 제대로 처리되도록 명시적으로 await
    const userCredential = await Promise.resolve(
      signInWithEmailAndPassword(auth, email, password)
    ).catch((err) => {
      console.error("[로그인] Promise catch에서 에러:", err);
      throw err;
    });

    console.log("[로그인] ✅ signInWithEmailAndPassword 성공");
    console.log("[로그인] ✅ 로그인 성공:", userCredential.user.uid);

    // 로그인 성공 시 localStorage에 상태 저장
    localStorage.setItem("mumu_logged_in", "true");
    console.log("[로그인] localStorage 저장 완료: mumu_logged_in = true");

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
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      unsubscribe();
      resolve(user);
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

    // 로그아웃 성공 시 localStorage 초기화
    localStorage.removeItem("mumu_logged_in");
    console.log("[로그아웃] ✅ 로그아웃 성공 및 localStorage 초기화");
  } catch (error) {
    console.error("[로그아웃] ❌ 로그아웃 실패:", error);
    throw error;
  }
}

// 전역 스코프에 노출
window.signOutFirebase = signOutFirebase;

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

// DOMContentLoaded 또는 이미 로드된 경우 실행
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initLoginForm);
} else {
  // DOM이 이미 로드된 경우 즉시 실행
  initLoginForm();
}
