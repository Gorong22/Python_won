/**
 * Firebase Cloud Functions
 *
 * MUMU 프로젝트용 Cloud Functions
 */

const functions = require("firebase-functions");
const { createClient } = require("@supabase/supabase-js");
const { randomUUID } = require("crypto");

/**
 * Supabase Admin Client 초기화 (런타임에만 체크)
 */
function getSupabaseAdmin() {
  const supabaseUrl =
    functions.config().supabase?.url || process.env.SUPABASE_URL;
  const supabaseServiceKey =
    functions.config().supabase?.service_role_key ||
    process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error(
      "Supabase configuration missing. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in functions config or environment variables."
    );
  }

  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

/**
 * Creator 프로필 생성 (HTTPS Callable)
 *
 * Firebase Auth로 생성된 사용자의 Supabase creators 레코드를 생성합니다.
 * Service Role Key를 사용하여 RLS를 우회합니다.
 *
 * @param {Object} data - Creator 정보
 * @param {string} data.uid - Firebase user.uid
 * @param {string} data.user_id - 사용자 아이디
 * @param {string} data.email - 이메일
 * @param {string} data.real_name - 실명
 * @param {number|null} data.age - 나이
 * @param {string} data.gender - 성별
 * @param {string} data.pen_name - 작가명
 * @param {string} data.introduction - 자기소개
 * @param {Array|null} data.portfolio_files - 포트폴리오 파일 (JSONB)
 * @param {Array|null} data.activity_links - 활동 링크 (JSONB)
 * @param {string|null} data.contact_email - 연락용 이메일
 *
 * @returns {Object} 생성된 creator 레코드
 */
exports.createCreatorProfile = functions.https.onCall(async (data, context) => {
  // 인증 확인 (Firebase Auth 토큰 필요)
  if (!context.auth?.uid) {
    throw new functions.https.HttpsError("unauthenticated", "No Firebase auth");
  }

  const firebaseUid = context.auth.uid;
  console.log("createCreatorProfile called by uid:", firebaseUid);

  // 입력값 검증
  const {
    user_id,
    email,
    real_name,
    age,
    gender,
    pen_name,
    introduction,
    portfolio_files,
    activity_links,
    contact_email,
  } = data;

  // 필수 필드 검증
  if (
    !user_id ||
    !email ||
    !real_name ||
    !gender ||
    !pen_name ||
    !introduction
  ) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      "Missing required fields: user_id, email, real_name, gender, pen_name, introduction"
    );
  }

  // age 검증
  const ageValue = age && !isNaN(parseInt(age, 10)) ? parseInt(age, 10) : null;

  // payload 구성
  const creatorPayload = {
    id: randomUUID(),
    firebase_uid: firebaseUid,
    user_id: user_id,
    email: email || `${user_id}@mumu.app`,
    real_name: real_name || "",
    age: ageValue,
    gender: gender || "",
    pen_name: pen_name || "",
    introduction: introduction || "",
    portfolio_files: portfolio_files || null,
    activity_links: activity_links || null,
    contact_email: contact_email || null,
    status: "pending",
  };

  try {
    // Supabase Admin Client 초기화 (런타임에만 실행)
    const supabaseAdmin = getSupabaseAdmin();

    // Supabase Admin Client로 INSERT (RLS 우회)
    const { data: insertedData, error: insertError } = await supabaseAdmin
      .from("creators")
      .insert(creatorPayload)
      .select()
      .single();

    if (insertError) {
      console.error("Supabase creators insert error:", insertError);
      throw new functions.https.HttpsError(
        "internal",
        "Failed to create creator profile in Supabase",
        { supabaseError: insertError }
      );
    }

    console.log("Creator profile created successfully:", {
      firebase_uid: firebaseUid,
      pen_name,
      status: "pending",
    });

    return {
      success: true,
      creator: insertedData,
    };
  } catch (error) {
    console.error("createCreatorProfile error:", error);

    // 이미 HttpsError인 경우 그대로 throw
    if (error instanceof functions.https.HttpsError) {
      throw error;
    }

    // 기타 에러는 internal error로 변환
    throw new functions.https.HttpsError(
      "internal",
      "An unexpected error occurred",
      { originalError: error.message }
    );
  }
});

/**
 * Creator 상태 확인 (HTTPS Callable)
 *
 * Firebase 인증된 사용자의 creators 레코드를 조회하여 상태를 반환합니다.
 * service_role 키를 사용해 RLS를 우회합니다.
 */
exports.checkCreatorStatus = functions.https.onCall(async (data, context) => {
  if (!context.auth?.uid) {
    throw new functions.https.HttpsError("unauthenticated", "No Firebase auth");
  }

  const firebaseUid = context.auth.uid;
  console.log("checkCreatorStatus called by uid:", firebaseUid);

  try {
    const supabaseAdmin = getSupabaseAdmin();
    const { data: creator, error } = await supabaseAdmin
      .from("creators")
      .select("id, status")
      .eq("firebase_uid", firebaseUid)
      .maybeSingle();

    if (error) {
      console.error("Supabase creators fetch error:", error);
      throw new functions.https.HttpsError(
        "internal",
        "Failed to fetch creator status",
        { supabaseError: error }
      );
    }

    if (!creator) {
      return { exists: false };
    }

    const { id, status } = creator;
    return {
      exists: true,
      status,
      creator_id: id,
    };
  } catch (error) {
    console.error("checkCreatorStatus error:", error);

    if (error instanceof functions.https.HttpsError) {
      throw error;
    }

    throw new functions.https.HttpsError(
      "internal",
      "An unexpected error occurred",
      { originalError: error.message }
    );
  }
});
