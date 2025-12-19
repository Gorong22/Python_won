/**
 * Creator Signup Logic
 *
 * 창작자 회원가입 처리 로직
 * 1. Firebase Auth에 회원가입 (email = ${user_id}@mumu.app)
 * 2. Firestore creators/{uid} 문서 생성
 * 3. Cloud Function을 통해 Supabase creators 테이블에 INSERT (승인 상태 pending)
 */

import { auth, db, app } from "./firebase_init.js";
import { createUserWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js";
import {
  doc,
  setDoc,
  serverTimestamp,
} from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";
import {
  getFunctions,
  httpsCallable,
} from "https://www.gstatic.com/firebasejs/9.23.0/firebase-functions.js";

/**
 * 파일을 Base64로 변환 (포트폴리오 파일 업로드용)
 * @param {File} file - 업로드할 파일
 * @returns {Promise<string>} Base64 문자열
 */
async function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/**
 * 여러 파일을 JSONB 형식으로 변환
 * @param {FileList} files - 파일 리스트
 * @returns {Promise<Array>} 파일 정보 배열
 */
async function processPortfolioFiles(files) {
  if (!files || files.length === 0) {
    return null;
  }

  const fileArray = Array.from(files);
  const processedFiles = await Promise.all(
    fileArray.map(async (file) => {
      const base64 = await fileToBase64(file);
      return {
        name: file.name,
        type: file.type,
        size: file.size,
        data: base64, // Base64 인코딩된 파일 데이터
      };
    })
  );

  return processedFiles;
}

/**
 * 활동 링크를 JSONB 형식으로 변환
 * @param {string} linksInput - 쉼표로 구분된 URL 문자열
 * @returns {Array|null} URL 배열 또는 null
 */
function processActivityLinks(linksInput) {
  if (!linksInput || !linksInput.trim()) {
    return null;
  }

  const links = linksInput
    .split(",")
    .map((link) => link.trim())
    .filter((link) => link.length > 0 && isValidUrl(link));

  return links.length > 0 ? links : null;
}

/**
 * URL 유효성 검사
 * @param {string} url - 검사할 URL
 * @returns {boolean}
 */
function isValidUrl(url) {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

/**
 * 창작자 회원가입 처리
 * @param {Object} formData - 회원가입 폼 데이터
 * @returns {Promise<Object>} 생성된 Auth user 객체
 */
export async function handleCreatorSignup(formData) {
  const {
    user_id,
    password,
    email,
    real_name,
    age,
    gender,
    pen_name,
    introduction,
    portfolio_files,
    activity_links,
    contact_email,
  } = formData;

  // 1. 필수 필드 검증
  if (
    !user_id ||
    !password ||
    !email ||
    !real_name ||
    !age ||
    !gender ||
    !pen_name ||
    !introduction
  ) {
    throw new Error("필수 항목을 모두 입력해주세요.");
  }

  // 2. Firebase Auth에 회원가입 (email = ${user_id}@mumu.app)
  let uid;
  let authUser;

  try {
    const emailForAuth = `${user_id}@mumu.app`;
    const userCredential = await createUserWithEmailAndPassword(
      auth,
      emailForAuth,
      password
    );

    if (!userCredential || !userCredential.user) {
      throw new Error("회원가입에 실패했습니다.");
    }

    authUser = userCredential.user;
    uid = authUser.uid;
  } catch (err) {
    if (err.code === "auth/email-already-in-use") {
      alert("이미 가입된 아이디입니다. 로그인해주세요.");
      return; // 이후 로직(Supabase/Firestore) 실행 금지
    }
    throw err;
  }

  // 안전 가드: uid가 없으면 이후 로직 실행 금지
  if (!uid) {
    console.error("Creator signup aborted: uid missing");
    return;
  }

  // 3. 포트폴리오 파일 처리
  let portfolioFilesJson = null;
  if (portfolio_files && portfolio_files.length > 0) {
    portfolioFilesJson = await processPortfolioFiles(portfolio_files);
  }

  // 4. 활동 링크 처리
  const activityLinksJson = processActivityLinks(activity_links);

  // 5. Firestore creators/{uid} 문서 생성
  const kstString = new Date().toLocaleString("ko-KR", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });

  try {
    await setDoc(doc(db, "creators", uid), {
      uid: uid,
      user_id: user_id,
      pen_name: pen_name,
      status: "pending", // Supabase와 동일하게
      created_at: serverTimestamp(),
      created_at_kst: kstString,
    });
  } catch (firestoreError) {
    console.error(
      "Firestore creators document creation error:",
      firestoreError
    );
    // Firestore 실패 시 Firebase Auth 계정은 이미 생성되었으므로 롤백 필요
    // 하지만 사용자에게는 에러 표시만 하고, 수동 정리 필요
    throw new Error("창작자 정보 저장에 실패했습니다. 다시 시도해주세요.");
  }

  // 6. Cloud Function을 통해 Supabase creators 테이블에 INSERT
  // Service Role Key를 사용하여 RLS를 우회합니다
  const ageValue = age && !isNaN(parseInt(age, 10)) ? parseInt(age, 10) : null;

  const creatorPayload = {
    user_id: user_id,
    email: email || `${user_id}@mumu.app`,
    real_name: real_name || "",
    age: ageValue,
    gender: gender || "",
    pen_name: pen_name || "",
    introduction: introduction || "",
    portfolio_files: portfolioFilesJson || null,
    activity_links: activityLinksJson || null,
    contact_email: contact_email || null,
  };

  try {
    // Firebase Functions 초기화 (region 명시: us-central1)
    const functions = getFunctions(app, "us-central1");
    const createCreatorProfile = httpsCallable(
      functions,
      "createCreatorProfile"
    );

    // Cloud Function 호출 (Callable Function - CORS 자동 처리)
    const result = await createCreatorProfile(creatorPayload);

    if (!result.data || !result.data.success) {
      throw new Error("창작자 정보 저장에 실패했습니다. 다시 시도해주세요.");
    }

    console.log("Creator profile created via Cloud Function:", result.data);
  } catch (functionError) {
    console.error("Cloud Function createCreatorProfile error:", functionError);

    // Firestore는 성공했지만 Supabase 실패
    // 사용자에게는 에러 표시
    throw new Error("창작자 정보 저장에 실패했습니다. 다시 시도해주세요.");
  }

  // 7. 회원가입은 신청(application)이므로 자동 로그인하지 않음
  // Firebase Auth는 기본적으로 로그인 상태가 되지만, 승인 대기이므로 로그아웃
  try {
    await auth.signOut();
  } catch (signOutError) {
    console.warn("Sign out after signup failed (non-critical):", signOutError);
  }

  return authUser;
}
