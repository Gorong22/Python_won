/**
 * Creator Login Logic
 *
 * 창작자 로그인 처리 로직
 * 1. Firebase Auth 로그인 (email = ${user_id}@mumu.app)
 * 2. Cloud Function으로 creators status 확인
 * 3. status에 따라 분기 처리:
 *    - 'approved' → creator_studio.html
 *    - 'pending' → 승인 대기 화면
 *    - 'rejected' → 거절 안내 화면
 */

import { auth, app } from "./firebase_init.js";
import { signInWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js";
import {
  getFunctions,
  httpsCallable,
} from "https://www.gstatic.com/firebasejs/9.23.0/firebase-functions.js";

/**
 * Cloud Function을 통해 현재 사용자의 creator status 조회
 * @returns {Promise<{exists: boolean, status?: string, creator_id?: string}>}
 */
async function fetchCreatorStatus() {
  const functions = getFunctions(app, "us-central1");
  const checkCreatorStatus = httpsCallable(functions, "checkCreatorStatus");
  const result = await checkCreatorStatus();
  return result.data;
}

/**
 * 창작자 로그인 처리
 * @param {string} user_id - 사용자 아이디
 * @param {string} password - 비밀번호
 * @returns {Promise<Object>} { status, redirectPath }
 */
export async function handleCreatorLogin(user_id, password) {
  // 1. 필수 필드 검증
  if (!user_id || !password) {
    throw new Error("아이디와 비밀번호를 입력해주세요.");
  }

  // 2. Firebase Auth 로그인 (email = ${user_id}@mumu.app)
  const emailForAuth = `${user_id}@mumu.app`;
  const userCredential = await signInWithEmailAndPassword(
    auth,
    emailForAuth,
    password
  );

  if (!userCredential || !userCredential.user) {
    throw new Error("로그인에 실패했습니다.");
  }

  // Firebase 로그인으로 auth 컨텍스트 확보 후 Cloud Function 호출
  const statusResult = await fetchCreatorStatus();

  if (!statusResult?.exists) {
    // 창작자 레코드가 없는 경우
    throw new Error("창작자 계정을 찾을 수 없습니다.");
  }

  const status = statusResult.status;

  // 4. status에 따라 분기 처리
  let redirectPath = null;
  let message = null;

  switch (status) {
    case "approved":
      redirectPath = "creator_studio.html";
      message = "로그인 성공";
      break;

    case "pending":
      redirectPath = "creator_pending.html";
      message = "승인 대기 중입니다.";
      break;

    case "rejected":
      redirectPath = "creator_rejected.html";
      message = "신청이 반려되었습니다.";
      break;

    default:
      throw new Error("알 수 없는 상태입니다.");
  }

  return {
    status,
    redirectPath,
    message,
    user: userCredential.user,
  };
}

/**
 * 현재 로그인한 창작자의 status 확인
 * @returns {Promise<string|null>} status 또는 null
 */
export async function checkCreatorStatus() {
  const { getCurrentFirebaseUser } = await import("./reader_auth.js");
  const user = await getCurrentFirebaseUser();

  if (!user) {
    return null;
  }

  const statusResult = await fetchCreatorStatus();
  return statusResult?.status || null;
}
