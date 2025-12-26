/**
 * syncReaderPublicProfile
 *
 * Firestore readers 컬렉션을
 * Supabase reader_public_profiles 테이블로 동기화하는
 * 관리자용 HTTP Function
 */

const functions = require("firebase-functions");
const admin = require("firebase-admin");
const { createClient } = require("@supabase/supabase-js");

// Firebase Admin 초기화
if (!admin.apps.length) {
  admin.initializeApp();
}

/**
 * Supabase Admin Client 생성
 * (Service Role Key 사용)
 */
function getSupabaseAdmin() {
  const supabaseUrl =
    functions.config().supabase?.url || process.env.SUPABASE_URL;

  const serviceRoleKey =
    functions.config().supabase?.service_role_key ||
    process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error(
      "Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables"
    );
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

/**
 * 🔄 Firestore → Supabase Sync
 */
exports.syncReaderPublicProfile = functions
  .region("asia-northeast3")
  .https.onRequest(async (req, res) => {
    console.log("[SYNC] syncReaderPublicProfile START");

    try {
      // 1️⃣ Firestore readers 조회
      const snapshot = await admin.firestore().collection("readers").get();

      console.log("[SYNC] readers count:", snapshot.size);

      // 2️⃣ Supabase Admin Client
      const supabase = getSupabaseAdmin();

      // 3️⃣ 변환
      const rows = snapshot.docs.map((doc) => {
        const d = doc.data();

        return {
          reader_id: doc.id,
          nickname: d.nickname ?? "익명",
          profile_image_url: d.profile_image_url ?? null,
          updated_at: new Date().toISOString(),
        };
      });

      // 4️⃣ Upsert
      const { error } = await supabase
        .from("reader_public_profiles")
        .upsert(rows, {
          onConflict: "reader_id",
        });

      if (error) {
        console.error("[SYNC] Supabase upsert error:", error);
        res.status(500).json({
          success: false,
          error: error.message,
        });
        return;
      }

      console.log("[SYNC] DONE:", rows.length);

      res.status(200).json({
        success: true,
        synced_count: rows.length,
      });
    } catch (err) {
      console.error("[SYNC] FAILED:", err);

      res.status(500).json({
        success: false,
        message: err.message,
      });
    }
  });
