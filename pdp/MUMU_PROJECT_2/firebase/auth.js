/**
 * Firebase Authentication 유틸리티 함수
 *
 * 독자(reader) 인증을 위한 Firebase Auth 헬퍼 함수들입니다.
 * 로그인 식별자는 username이며, Firebase Auth에는 email 형식으로 저장됩니다.
 *
 * ⚠️ 중요: 비밀번호는 Firebase Auth에만 저장되며, Firestore에는 절대 저장하지 않습니다.
 *
 * ⚠️ Auth email 규칙은 반드시 username@mumu.app 로 통일할 것.
 * 회원가입/로그인 불일치 시 인증 실패 발생함.
 */

/**
 * Username을 Firebase Auth email 형식으로 변환
 *
 * @param {string} username - 사용자 로그인 ID (username)
 * @returns {string} Firebase Auth용 email 형식 문자열 (username@mumu.app)
 */
function usernameToEmail(username) {
  if (!username || typeof username !== "string") {
    throw new Error("Username must be a non-empty string");
  }

  return `${username}@mumu.app`;
}

/**
 * Firebase Auth 인스턴스 가져오기
 *
 * @returns {firebase.auth.Auth} Firebase Auth 인스턴스
 */
function getAuth() {
  if (typeof window !== "undefined" && window.firebaseUtils) {
    return window.firebaseUtils.getAuth();
  }

  // 폴백: 직접 firebase 사용
  if (typeof firebase === "undefined") {
    throw new Error(
      "Firebase SDK is not loaded. Please include Firebase scripts."
    );
  }

  if (firebase.apps.length === 0) {
    throw new Error(
      "Firebase is not initialized. Please initialize Firebase first."
    );
  }

  return firebase.auth();
}

/**
 * 현재 로그인한 사용자 가져오기
 *
 * @returns {Promise<firebase.User|null>} 현재 사용자 또는 null
 */
async function getCurrentUser() {
  const auth = getAuth();
  return new Promise((resolve) => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      unsubscribe();
      resolve(user);
    });
  });
}

/**
 * Username과 비밀번호로 로그인
 *
 * @param {string} username - 사용자 로그인 ID
 * @param {string} password - 비밀번호
 * @returns {Promise<firebase.auth.UserCredential>} 사용자 인증 정보
 */
async function signInWithUsername(username, password) {
  if (!username || !password) {
    throw new Error("Username and password are required");
  }

  const auth = getAuth();
  const email = usernameToEmail(username);

  try {
    const userCredential = await auth.signInWithEmailAndPassword(
      email,
      password
    );

    // 로그인 성공 시 last_login_at 업데이트 (Firestore)
    if (userCredential.user) {
      await updateLastLoginTime(userCredential.user.uid);
    }

    return userCredential;
  } catch (error) {
    // 사용자 친화적인 에러 메시지로 변환
    let errorMessage = "로그인에 실패했습니다.";

    switch (error.code) {
      case "auth/user-not-found":
      case "auth/wrong-password":
      case "auth/invalid-email":
        errorMessage = "사용자명 또는 비밀번호가 올바르지 않습니다.";
        break;
      case "auth/user-disabled":
        errorMessage = "계정이 비활성화되었습니다.";
        break;
      case "auth/too-many-requests":
        errorMessage =
          "너무 많은 로그인 시도가 있었습니다. 나중에 다시 시도해주세요.";
        break;
      case "auth/network-request-failed":
        errorMessage = "네트워크 오류가 발생했습니다. 연결을 확인해주세요.";
        break;
      default:
        console.error("Login error:", error);
    }

    const customError = new Error(errorMessage);
    customError.code = error.code;
    throw customError;
  }
}

/**
 * Username과 비밀번호로 새 계정 생성
 *
 * @param {string} username - 사용자 로그인 ID
 * @param {string} password - 비밀번호
 * @returns {Promise<firebase.auth.UserCredential>} 사용자 인증 정보
 */
async function createUserWithUsername(username, password) {
  if (!username || !password) {
    throw new Error("Username and password are required");
  }

  // Username 유효성 검사 (영문/숫자/언더스코어, 3-20자)
  const usernameRegex = /^[a-zA-Z0-9_]{3,20}$/;
  if (!usernameRegex.test(username)) {
    throw new Error(
      "사용자명은 3-20자의 영문/숫자/언더스코어만 사용 가능합니다."
    );
  }

  // 비밀번호 최소 길이 검사
  if (password.length < 6) {
    throw new Error("비밀번호는 최소 6자 이상이어야 합니다.");
  }

  const auth = getAuth();
  const email = usernameToEmail(username);

  try {
    const userCredential = await auth.createUserWithEmailAndPassword(
      email,
      password
    );
    return userCredential;
  } catch (error) {
    // 사용자 친화적인 에러 메시지로 변환
    let errorMessage = "계정 생성에 실패했습니다.";

    switch (error.code) {
      case "auth/email-already-in-use":
        errorMessage = "이미 사용 중인 사용자명입니다.";
        break;
      case "auth/invalid-email":
        errorMessage = "사용자명 형식이 올바르지 않습니다.";
        break;
      case "auth/weak-password":
        errorMessage =
          "비밀번호가 너무 약합니다. 더 강한 비밀번호를 사용해주세요.";
        break;
      case "auth/network-request-failed":
        errorMessage = "네트워크 오류가 발생했습니다. 연결을 확인해주세요.";
        break;
      default:
        console.error("Signup error:", error);
    }

    const customError = new Error(errorMessage);
    customError.code = error.code;
    throw customError;
  }
}

/**
 * 로그아웃
 *
 * @returns {Promise<void>}
 */
async function signOut() {
  const auth = getAuth();

  try {
    await auth.signOut();

    // 세션 초기화
    if (typeof window !== "undefined" && window.datetimeUtils) {
      window.datetimeUtils.clearSession();
    }
  } catch (error) {
    console.error("Sign out error:", error);
    throw error;
  }
}

/**
 * Firestore에서 사용자의 last_login_at 업데이트
 *
 * @param {string} uid - 사용자 UID
 * @returns {Promise<void>}
 */
async function updateLastLoginTime(uid) {
  if (typeof window === "undefined") {
    return; // 서버 사이드에서는 실행하지 않음
  }

  try {
    const firestore =
      typeof window.firebaseUtils !== "undefined"
        ? window.firebaseUtils.getFirestore()
        : firebase.firestore();

    const { getKSTDateTimeString } = window.datetimeUtils || {};
    const kstString = getKSTDateTimeString
      ? getKSTDateTimeString()
      : new Date().toISOString();

    await firestore.collection("readers").doc(uid).update({
      last_login_at: firebase.firestore.FieldValue.serverTimestamp(),
      last_login_at_kst: kstString,
    });
  } catch (error) {
    // 로그인 시간 업데이트 실패는 로그인 자체를 막지 않음
    console.error("Failed to update last_login_at:", error);
  }
}

// 전역으로 노출 (브라우저 환경)
if (typeof window !== "undefined") {
  window.firebaseAuth = {
    usernameToEmail,
    getCurrentUser,
    signInWithUsername,
    createUserWithUsername,
    signOut,
    updateLastLoginTime,
  };
}
