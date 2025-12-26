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
    const { app } = await import("./firebase_init.js");
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
  if (!window.supabase) {
    return { error: new Error("Supabase client not initialized") };
  }

  if (!firebaseUid) {
    return { error: new Error("Firebase UID is required") };
  }

  // target_type 검증: creator는 허용하지 않음
  const allowedTypes = ["feed", "work", "cut", "comment", "reply"];
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
    const isUUID =
      window.App?.utils?.isUUID ||
      function (v) {
        if (!v || typeof v !== "string") return false;
        return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
          v
        );
      };

    if (!isUUID(targetId)) {
      console.error("[likeTarget] target_id가 UUID가 아닙니다:", targetId);
      return { error: new Error("target_id must be a valid UUID") };
    }

    // 🔍 4️⃣ INSERT 직전 payload 로그 및 코드 레벨 검증
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

    // 🔥 SUPABASE FINAL INSERT - 실제 전달되는 payload 확인
    console.log(
      "🔥 SUPABASE FINAL INSERT",
      "likes",
      JSON.stringify(payload),
      Object.keys(payload),
      Object.values(payload)
    );

    const { data, error } = await window.supabase.from("likes").insert(payload);

    // TASK B: Handle duplicate key (23505) by toggling off (unlike)
    if (
      error &&
      (error.code === "23505" ||
        error.code === "409" ||
        error.message?.includes("duplicate"))
    ) {
      console.warn("[LIKE] already exists (23505) -> toggling to unlike", {
        targetId,
      });
      // Proceed to unlike
      if (typeof window.unlikeTarget === "function") {
        return window.unlikeTarget(targetType, targetId, firebaseUid);
      } else {
        console.error("[LIKE] unlikeTarget not found for toggle fallback");
        return { error };
      }
    }

    // Log real errors
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
  if (!window.supabase) {
    return { error: new Error("Supabase client not initialized") };
  }

  if (!firebaseUid) {
    return { error: new Error("Firebase UID is required") };
  }

  // target_type 검증: creator는 허용하지 않음
  const allowedTypes = ["feed", "work", "cut", "comment", "reply"];
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
    const isUUID =
      window.App?.utils?.isUUID ||
      function (v) {
        if (!v || typeof v !== "string") return false;
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

    const { error } = await window.supabase
      .from("likes")
      .delete()
      .eq("target_type", targetType)
      .eq("target_id", targetId)
      .eq("user_id", firebaseUid); // Firebase UID 직접 사용
    return { error };
  } catch (err) {
    console.error("[unlikeTarget] 예외:", err);
    return { error: err };
  }
};

/**
 * 댓글 작성
 * @param {string} targetType - "feed" | "work" | "cut"
 * @param {string} targetId - UUID (콘텐츠 ID)
 * @param {string} content - 댓글 내용
 * @param {string} firebaseUid - Firebase UID (user_id로 직접 사용)
 * @returns {Promise<{error: Error|null}>}
 */
window.createComment = async function (
  targetType,
  targetId,
  content,
  firebaseUid
) {
  if (!window.supabase) {
    return { error: new Error("Supabase client not initialized") };
  }

  if (!firebaseUid) {
    return { error: new Error("Firebase UID is required") };
  }

  // target_type 검증: creator는 허용하지 않음
  const allowedTypes = ["feed", "work", "cut"];
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
      "[BLOCKED] createComment: creator는 절대 target이 될 수 없습니다."
    );
    console.log("[BLOCKED TARGET]", targetType, targetId);
    return { error: new Error("creator is not a valid target") };
  }

  try {
    // UUID 검증
    const isUUID =
      window.App?.utils?.isUUID ||
      function (v) {
        if (!v || typeof v !== "string") return false;
        return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
          v
        );
      };

    if (!isUUID(targetId)) {
      console.error("[createComment] target_id가 UUID가 아닙니다:", targetId);
      return { error: new Error("target_id must be a valid UUID") };
    }

    // 🔍 4️⃣ INSERT 직전 payload 로그 및 코드 레벨 검증
    const payload = {
      id: crypto.randomUUID(), // 명시적 UUID 생성 (22P02 에러 방지)
      target_type: targetType,
      target_id: targetId,
      content: content,
      user_id: firebaseUid, // Firebase UID 직접 사용
    };

    console.log("[FINAL INSERT PAYLOAD] createComment", {
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

    // 🔥 SUPABASE FINAL INSERT - 실제 전달되는 payload 확인
    console.log(
      "🔥 SUPABASE FINAL INSERT",
      "comments",
      JSON.stringify(payload),
      Object.keys(payload),
      Object.values(payload)
    );

    const { data, error } = await window.supabase
      .from("comments")
      .insert(payload);
    return { error };
  } catch (err) {
    console.error("[createComment] 예외:", err);
    return { error: err };
  }
};

/**
 * 댓글 목록 조회 (reader/creator 자동 구분)
 * @param {string} targetType - "feed" | "work" | "cut" | "moodboard"
 * @param {string} targetId - UUID (콘텐츠 ID)
 * @returns {Promise<{data: Array|null, error: Error|null}>}
 */
window.loadComments = async function (targetType, targetId) {
  if (!window.supabase) {
    return { data: null, error: new Error("Supabase client not initialized") };
  }

  try {
    // 댓글 조회
    const { data: comments, error } = await window.supabase
      .from("comments")
      .select("id, content, created_at, user_id")
      .eq("target_type", targetType)
      .eq("target_id", targetId)
      .order("created_at", { ascending: true });

    if (error) {
      return { data: null, error };
    }

    if (!comments || comments.length === 0) {
      return { data: [], error: null };
    }

    // 모든 user_id 수집
    const userIds = [
      ...new Set(comments.map((c) => c.user_id).filter(Boolean)),
    ];

    // creators 조회 (Supabase)
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
            `[loadComments] Firebase Firestore readers 조회 실패 (${uid}):`,
            err
          );
        }
      }
    }

    // 댓글 데이터에 표시명과 역할 추가
    const processedData = comments.map((comment) => {
      const userId = comment.user_id;
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
        id: comment.id,
        content: comment.content,
        created_at: comment.created_at,
        user_id: comment.user_id,
        display_name: displayName,
        user_role: userRole,
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
    const isUUID =
      window.App?.utils?.isUUID ||
      function (v) {
        if (!v || typeof v !== "string") return false;
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
    const isUUID =
      window.App?.utils?.isUUID ||
      function (v) {
        if (!v || typeof v !== "string") return false;
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
    const isUUID =
      window.App?.utils?.isUUID ||
      function (v) {
        if (!v || typeof v !== "string") return false;
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
    const isUUID =
      window.App?.utils?.isUUID ||
      function (v) {
        if (!v || typeof v !== "string") return false;
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
    const isUUID =
      window.App?.utils?.isUUID ||
      function (v) {
        if (!v || typeof v !== "string") return false;
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

function openCommentsModal(targetType, targetId) {
  console.log("[COMMENT MODAL] open", targetType, targetId);

  if (typeof loadComments === "function") {
    loadComments(targetType, targetId).then((result) => {
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
