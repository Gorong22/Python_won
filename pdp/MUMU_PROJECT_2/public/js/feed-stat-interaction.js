// ✅ Firebase Firestore 전역 참조 (ES module import 절대 사용 금지)
// Firebase SDK가 로드될 때까지 대기하여 참조 가져오기
async function getFirestoreRefs() {
  // Firebase SDK v8 방식 (window.firebase.firestore())
  if (window.firebase?.firestore) {
    const firestore = window.firebase.firestore();
    // v8 방식: firestore.collection().doc() 사용
    return {
      db: firestore,
      getDoc: async (docRef) => {
        const doc = await docRef.get();
        return {
          exists: doc.exists,
          data: () => doc.data(),
        };
      },
      doc: (db, collection, docId) => db.collection(collection).doc(docId),
    };
  }

  // Firebase SDK v9 방식 - 전역 변수 사용 (firebase_init.js에서 노출)
  if (window.firebaseDb) {
    try {
      console.log("[DEBUG] window.firebaseDb 발견, Firestore 함수 로드 시도");
      // v9 방식: getDoc, doc는 동적 import로 로드
      const firestoreModule = await import(
        "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js"
      );
      const { getDoc, doc } = firestoreModule;
      console.log("[DEBUG] Firestore 함수 로드 성공:", {
        getDoc: typeof getDoc,
        doc: typeof doc,
      });
      return {
        db: window.firebaseDb,
        getDoc: getDoc,
        doc: doc,
      };
    } catch (err) {
      console.warn(
        "[Firestore] Firebase Firestore 함수 로드 실패:",
        err.message,
        err
      );
    }
  } else {
    console.log("[DEBUG] window.firebaseDb 없음");
  }

  // 동적 import fallback (일반 스크립트에서도 시도)
  try {
    const firebaseModule = await import("/js/firebase_init.js");
    if (firebaseModule?.db) {
      const { getDoc, doc } = await import(
        "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js"
      );
      return {
        db: firebaseModule.db,
        getDoc: getDoc,
        doc: doc,
      };
    }
  } catch (err) {
    // 동적 import 실패 시 무시하고 계속 진행
    console.warn(
      "[Firestore] 동적 import 실패 (일반 스크립트 환경):",
      err.message
    );
  }

  // Firebase SDK v9 전역 방식 (window.firebase?.firestore?.getFirestore)
  if (window.firebase?.firestore?.getFirestore) {
    const db = window.firebase.firestore.getFirestore();
    return {
      db: db,
      getDoc: window.firebase.firestore.getDoc,
      doc: window.firebase.firestore.doc,
    };
  }

  return null;
}

// Supabase client 대기 함수 (타임아웃 추가)
let waitForSupabaseTimeout = null;
function waitForSupabase(cb, maxAttempts = 100) {
  let attempts = 0;

  function check() {
    attempts++;
    if (window.supabase) {
      cb(window.supabase);
      return;
    }

    if (attempts >= maxAttempts) {
      console.warn(
        "[waitForSupabase] 타임아웃: window.supabase를 찾을 수 없습니다."
      );
      return;
    }

    waitForSupabaseTimeout = setTimeout(check, 50);
  }

  check();
}

// 전역 함수 확인 로그
console.log("[전역함수 확인]", {
  likeTarget: typeof window.likeTarget,
  unlikeTarget: typeof window.unlikeTarget,
  loadComments: typeof window.loadComments,
  createComment: typeof window.createComment,
  deleteComment: typeof window.deleteComment,
  loadReplies: typeof window.loadReplies,
  updateSingleFeedStats: typeof window.updateSingleFeedStats,
});

document.addEventListener("DOMContentLoaded", () => {
  // 좋아요/댓글 버튼 클릭 이벤트 (이벤트 위임 - data-action 기반)
  document.addEventListener("click", async (e) => {
    const button = e.target.closest("[data-action]");
    if (!button) return;

    const action = button.getAttribute("data-action");

    // 댓글 좋아요는 별도 처리
    if (action === "comment-like") {
      e.preventDefault();
      e.stopPropagation();
      handleCommentLike(button);
      return;
    }

    if (action !== "like" && action !== "comment") return;

    e.preventDefault();
    e.stopPropagation();

    // feedId 가져오기 (버튼 또는 부모 feed-item에서)
    let feedId = button.getAttribute("data-feed-id");
    if (!feedId) {
      const feedItem = button.closest(".feed-item");
      if (feedItem) {
        feedId = feedItem.getAttribute("data-feed-id");
      }
    }

    if (!feedId) {
      console.error(`[${action}] feedId 없음`);
      return;
    }

    if (action === "like") {
      // 초기 상태 저장 (토글 전)
      const countEl = button.querySelector(".stat-count");
      const initialIsLiked = button.classList.contains("active");
      const initialCount = parseInt(countEl?.textContent || "0", 10);

      // Optimistic UI: 즉시 UI 업데이트
      if (initialIsLiked) {
        // 좋아요 취소
        button.classList.remove("active");
        if (countEl) {
          countEl.textContent = Math.max(0, initialCount - 1);
        }
      } else {
        // 좋아요 추가
        button.classList.add("active");
        if (countEl) {
          countEl.textContent = initialCount + 1;
        }
      }

      // Supabase client 대기 후 DB 작업 (비동기, 실패해도 UI는 유지)
      waitForSupabase(async () => {
        // Firebase Auth 확인 (전역 참조 사용)
        const firebaseUid = await getCurrentFirebaseUid();
        if (!firebaseUid) {
          alert("로그인이 필요합니다.");
          // UI 롤백
          if (initialIsLiked) {
            button.classList.remove("active");
          } else {
            button.classList.add("active");
          }
          if (countEl) {
            countEl.textContent = initialCount;
          }
          return;
        }

        try {
          if (initialIsLiked) {
            // 좋아요 취소
            const { error } = await window.unlikeTarget(
              "cut",
              feedId,
              firebaseUid
            );
            if (error) {
              console.error("[좋아요] 취소 실패:", error);
              if (error.code === "42501") {
                console.warn(
                  "[좋아요] RLS 정책 위반: likes 테이블의 RLS 정책을 확인해주세요."
                );
              }
              // 에러 발생 시 UI 롤백
              button.classList.add("active");
              if (countEl) {
                countEl.textContent = initialCount;
              }
              return;
            }
          } else {
            // 좋아요 추가
            const { error } = await window.likeTarget(
              "cut",
              feedId,
              firebaseUid
            );
            if (error) {
              console.error("[좋아요] 추가 실패:", error);
              // 409 에러(중복) 또는 23505(unique constraint violation)는 무시하고 성공으로 처리
              if (
                error.code === "409" ||
                error.code === "23505" ||
                error.message?.includes("duplicate") ||
                error.message?.includes("already exists")
              ) {
                console.log("[좋아요] 이미 좋아요가 있습니다. (409 에러 무시)");
                // UI는 그대로 유지 (이미 optimistic UI로 추가된 상태)
                return;
              }
              if (error.code === "42501") {
                console.warn(
                  "[좋아요] RLS 정책 위반: likes 테이블의 RLS 정책을 확인해주세요."
                );
              }
              // 에러 발생 시 UI 롤백
              button.classList.remove("active");
              if (countEl) {
                countEl.textContent = initialCount;
              }
              return;
            }
          }

          // 통계 업데이트 제거: updateSingleFeedStats가 서버 상태로 덮어쓰기 때문에
          // optimistic UI가 즉시 원복되는 문제 발생
          // 카운트는 이미 optimistic UI에서 업데이트했으므로 추가 업데이트 불필요
        } catch (err) {
          console.error("[좋아요] 처리 실패:", err);
          // 에러 발생 시 UI 롤백
          if (initialIsLiked) {
            button.classList.add("active");
          } else {
            button.classList.remove("active");
          }
          if (countEl) {
            countEl.textContent = initialCount;
          }
        }
      });
    } else if (action === "comment") {
      // 모달은 즉시 열기 (댓글 로드는 loadCommentsForModal 내부에서 waitForSupabase 사용)
      openCommentModalWithFeedId(feedId).catch((err) => {
        console.error("[댓글] 모달 열기 실패:", err);
      });
    }
  });

  // 댓글 좋아요 처리 함수
  async function handleCommentLike(button) {
    console.log("[DEBUG] 댓글 좋아요 버튼 클릭됨:", button);
    const commentId = button.getAttribute("data-comment-id");
    const replyId = button.getAttribute("data-reply-id");
    const targetId = commentId || replyId;
    const targetType = commentId ? "comment" : "reply";

    console.log("[DEBUG] 댓글 좋아요 정보:", {
      commentId,
      replyId,
      targetId,
      targetType,
    });

    if (!targetId) {
      console.warn("[DEBUG] 댓글 좋아요: targetId가 없습니다");
      return;
    }

    const countEl = button.querySelector(".comment-like-count");
    const svgPath = button.querySelector(".comment-action-icon path");
    const isLiked = button.classList.contains("active");
    const currentCount = parseInt(countEl?.textContent || "0", 10);

    // Optimistic UI
    if (isLiked) {
      button.classList.remove("active");
      if (svgPath) {
        svgPath.setAttribute("stroke", "#A0A0A0");
      }
      if (countEl) {
        countEl.textContent = Math.max(0, currentCount - 1);
      }
    } else {
      button.classList.add("active");
      if (svgPath) {
        svgPath.setAttribute("stroke", "#FF5E00");
      }
      if (countEl) {
        countEl.textContent = currentCount + 1;
      }
    }

    // Firebase Auth 확인
    const firebaseUid = await getCurrentFirebaseUid();
    if (!firebaseUid) {
      alert("로그인이 필요합니다.");
      // 롤백
      if (isLiked) {
        button.classList.add("active");
        if (svgPath) svgPath.setAttribute("stroke", "#FF5E00");
      } else {
        button.classList.remove("active");
        if (svgPath) svgPath.setAttribute("stroke", "#A0A0A0");
      }
      if (countEl) countEl.textContent = currentCount;
      return;
    }

    // DB 작업
    waitForSupabase(async () => {
      try {
        const modal = document.getElementById("comment-modal");
        const feedId = modal?.getAttribute("data-current-feed-id");

        if (isLiked) {
          const { error } = await window.unlikeTarget(
            targetType,
            targetId,
            firebaseUid
          );
          if (error) {
            console.error("[댓글 좋아요] 취소 실패:", error);
            // 롤백
            button.classList.add("active");
            if (svgPath) svgPath.setAttribute("stroke", "#FF5E00");
            if (countEl) countEl.textContent = currentCount;
            return;
          }
        } else {
          const { error } = await window.likeTarget(
            targetType,
            targetId,
            firebaseUid
          );
          if (error) {
            console.error("[댓글 좋아요] 추가 실패:", error);
            // 롤백
            button.classList.remove("active");
            if (svgPath) svgPath.setAttribute("stroke", "#A0A0A0");
            if (countEl) countEl.textContent = currentCount;
            return;
          }
        }

        // 좋아요 성공 후 해당 댓글/대댓글의 좋아요 수만 업데이트 (전체 재로드 제거)
        // countEl은 이미 optimistic UI에서 업데이트되었으므로 추가 작업 불필요
        console.log("[DEBUG] 댓글 좋아요 성공 - UI는 이미 업데이트됨");
      } catch (err) {
        console.error("[댓글 좋아요] 처리 실패:", err);
        // 롤백
        if (isLiked) {
          button.classList.add("active");
          if (svgPath) svgPath.setAttribute("stroke", "#FF5E00");
        } else {
          button.classList.remove("active");
          if (svgPath) svgPath.setAttribute("stroke", "#A0A0A0");
        }
        if (countEl) countEl.textContent = currentCount;
      }
    });
  }

  // 저장 버튼 클릭 이벤트 제거 (깃발 버튼 제거됨)
  // 기능은 컷 이미지 롱프레스로 이전됨
});

// 댓글 모달 열기 (feedId 전달)
async function openCommentModalWithFeedId(feedId) {
  const modal = document.getElementById("comment-modal");
  if (!modal) {
    console.error("[댓글 모달] 모달 요소 없음");
    return;
  }

  // feedId를 모달에 저장
  modal.setAttribute("data-current-feed-id", feedId);

  // 모달 먼저 열기 (댓글 로드는 비동기로 진행)
  modal.style.display = "flex";
  // body 스크롤은 막지 않음 (모달 내부만 스크롤 가능하도록)

  // 댓글 로드 (내부에서 waitForSupabase 사용)
  loadCommentsForModal(feedId).catch((err) => {
    console.error("[댓글 모달] 댓글 로드 실패:", err);
  });
}

// 댓글 모달 열기 (기존 호환성)
function openCommentModal() {
  const modal = document.getElementById("comment-modal");
  if (modal) {
    modal.style.display = "flex";
    // body 스크롤은 막지 않음 (모달 내부만 스크롤 가능하도록)
  }
}

// 댓글 모달에서 댓글 로드
async function loadCommentsForModal(feedId) {
  const modal = document.getElementById("comment-modal");
  if (!modal) return;

  const contentArea = modal.querySelector(".comment-modal-content");
  if (!contentArea) return;

  // 로딩 표시
  contentArea.innerHTML =
    '<div class="comment-list-wrapper" style="display: flex; flex-direction: column; width: 100%; gap: 0;"><div class="comment-empty">댓글을 불러오는 중...</div></div>';

  // window 전역 함수 검증
  if (typeof window.loadComments !== "function") {
    console.error("[댓글 모달] window.loadComments 함수가 없습니다.");
    contentArea.innerHTML =
      '<div class="comment-empty">댓글을 불러올 수 없습니다.</div>';
    return;
  }

  // Supabase client 대기
  waitForSupabase(async () => {
    try {
      const { data: comments, error } = await window.loadComments(
        "feed",
        feedId
      );

      if (error) {
        console.error("[댓글 모달] 댓글 로드 실패:", error);
        contentArea.innerHTML =
          '<div class="comment-list-wrapper" style="display: flex; flex-direction: column; width: 100%; gap: 0;"><div class="comment-empty">댓글을 불러오는데 실패했습니다.</div></div>';
        // 에러가 나도 입력창은 표시
        try {
          await addCommentInputArea(feedId, contentArea);
        } catch (inputErr) {
          console.error("[댓글 모달] 입력창 추가 실패:", inputErr);
        }
        return;
      }

      if (!comments || comments.length === 0) {
        contentArea.innerHTML =
          '<div class="comment-list-wrapper" style="display: flex; flex-direction: column; width: 100%; gap: 0;"><div class="comment-empty">댓글이 없습니다.</div></div>';
        // 댓글 입력창 추가
        try {
          await addCommentInputArea(feedId, contentArea);
        } catch (inputErr) {
          console.error("[댓글 모달] 입력창 추가 실패:", inputErr);
        }
        return;
      }

      // 댓글 렌더링
      let commentsHTML = "";
      try {
        commentsHTML = await renderComments(comments, feedId);
        // 댓글 목록을 wrapper로 감싸서 세로 배치 보장
        contentArea.innerHTML = `<div class="comment-list-wrapper" style="display: flex; flex-direction: column; width: 100%; gap: 0;">${commentsHTML}</div>`;
      } catch (renderErr) {
        console.error("[댓글 모달] 렌더링 실패:", renderErr);
        contentArea.innerHTML =
          '<div class="comment-list-wrapper" style="display: flex; flex-direction: column; width: 100%; gap: 0;"><div class="comment-empty">댓글을 표시하는데 실패했습니다.</div></div>';
      }

      // 댓글 입력창 추가 (에러와 관계없이 시도)
      try {
        await addCommentInputArea(feedId, contentArea);
      } catch (inputErr) {
        console.error("[댓글 모달] 입력창 추가 실패:", inputErr);
      }

      // 댓글 수 업데이트
      const titleEl = modal.querySelector(".comment-modal-title");
      if (titleEl) {
        titleEl.textContent = `${comments.length}개의 댓글`;
      }
    } catch (err) {
      console.error("[댓글 모달] 댓글 로드 예외:", err);
      contentArea.innerHTML =
        '<div class="comment-list-wrapper" style="display: flex; flex-direction: column; width: 100%; gap: 0;"><div class="comment-empty">댓글을 불러오는데 실패했습니다.</div></div>';
    }
  });
}

// 댓글 렌더링
async function renderComments(comments, feedId) {
  const firebaseUid = await getCurrentFirebaseUid();

  // 모든 댓글 ID와 대댓글 ID 수집
  const commentIds = comments.map((c) => c.id);
  const allReplyIds = [];

  // 댓글별 좋아요 수와 사용자 좋아요 상태 로드
  let commentLikesMap = {};
  let userLikedComments = new Set();
  let replyLikesMap = {};
  let userLikedReplies = new Set();

  if (window.supabase && commentIds.length > 0) {
    try {
      // 댓글 좋아요 수 조회
      const { data: commentLikes } = await window.supabase
        .from("likes")
        .select("target_id")
        .eq("target_type", "comment")
        .in("target_id", commentIds);

      if (commentLikes) {
        commentLikes.forEach((like) => {
          commentLikesMap[like.target_id] =
            (commentLikesMap[like.target_id] || 0) + 1;
        });
      }

      // 현재 사용자의 댓글 좋아요 상태
      if (firebaseUid) {
        const { data: userCommentLikes } = await window.supabase
          .from("likes")
          .select("target_id")
          .eq("target_type", "comment")
          .eq("user_id", firebaseUid)
          .in("target_id", commentIds);

        if (userCommentLikes) {
          userCommentLikes.forEach((like) => {
            userLikedComments.add(like.target_id);
          });
        }
      }
    } catch (err) {
      console.error("[댓글 렌더링] 좋아요 로드 실패:", err);
    }
  }

  // 먼저 모든 대댓글 로드하여 ID 수집
  const commentsWithReplies = [];
  for (const comment of comments) {
    let replies = null;
    try {
      const result = await window.loadReplies(comment.id);
      if (result && !result.error && result.data) {
        replies = result.data;
        replies.forEach((reply) => allReplyIds.push(reply.id));
      }
    } catch (err) {
      console.error("[댓글 렌더링] 대댓글 로드 실패:", err);
      replies = null;
    }
    commentsWithReplies.push({ comment, replies });
  }

  // 표시명 맵 생성: 작가는 Supabase creators.pen_name, 독자는 Firestore users.nickname
  const userIds = new Set();
  comments.forEach((c) => {
    if (c.user_id) userIds.add(c.user_id);
  });
  commentsWithReplies.forEach(({ replies }) => {
    if (replies) {
      replies.forEach((r) => {
        if (r.user_id) userIds.add(r.user_id);
      });
    }
  });

  const creatorNameMap = {}; // 작가명 맵 (Supabase creators.pen_name)
  const nicknameMap = {}; // 독자 닉네임 맵 (Firestore users.nickname)
  const displayNameMap = {}; // 최종 표시명 맵

  console.log("[DEBUG] ========== 표시명 맵 생성 시작 ==========");
  console.log("[DEBUG] userIds.size:", userIds.size);
  console.log("[DEBUG] userIds:", Array.from(userIds));

  if (userIds.size > 0) {
    try {
      const userIdsArray = Array.from(userIds);
      console.log("[DEBUG] userIdsArray for Firestore", userIdsArray);
      console.log("[DEBUG] userIdsArray 길이:", userIdsArray.length);

      // 1. Supabase creators 테이블에서 pen_name 조회 (작가명)
      // 크리에이터는 Supabase에만 있고 Firestore에는 없을 수 있음
      console.log("[DEBUG] ========== 크리에이터 조회 시작 ==========");
      console.log("[DEBUG] window.supabase 존재 여부:", !!window.supabase);
      console.log("[DEBUG] window.supabase 타입:", typeof window.supabase);
      if (window.supabase) {
        console.log(
          "[DEBUG] window.supabase.from 함수 존재:",
          typeof window.supabase.from === "function"
        );
      }
      console.log("[DEBUG] 조회할 userIdsArray:", userIdsArray);
      console.log("[DEBUG] 조회할 userIdsArray 길이:", userIdsArray.length);

      if (window.supabase) {
        try {
          console.log("[DEBUG] Supabase creators 테이블 조회 시작...");
          console.log(
            "[DEBUG] 쿼리: from('creators').select('firebase_uid, pen_name').in('firebase_uid', [...])"
          );

          // Supabase 쿼리 실행 (RLS 정책 확인을 위해 더 자세한 로그 추가)
          console.log(
            "[DEBUG] Supabase 쿼리 실행 전 - userIdsArray:",
            userIdsArray
          );

          // 디버깅: 전체 creators 테이블에서 몇 개의 레코드가 있는지 확인
          try {
            const { data: allCreators, error: allError } = await window.supabase
              .from("creators")
              .select("firebase_uid, pen_name")
              .limit(10);

            console.log("[DEBUG] 전체 creators 테이블 샘플 조회:", {
              data: allCreators,
              error: allError,
              dataLength: allCreators?.length || 0,
            });

            if (allCreators && allCreators.length > 0) {
              console.log(
                "[DEBUG] creators 테이블에 데이터 존재:",
                allCreators.map((c) => ({
                  firebase_uid: c.firebase_uid,
                  pen_name: c.pen_name,
                }))
              );
            }
          } catch (err) {
            console.error("[DEBUG] 전체 creators 조회 예외:", err);
          }

          // 각 firebase_uid별로 개별 조회도 시도 (디버깅용)
          for (const uid of userIdsArray) {
            try {
              const { data: singleCreator, error: singleError } =
                await window.supabase
                  .from("creators")
                  .select("firebase_uid, pen_name")
                  .eq("firebase_uid", uid)
                  .limit(1);

              console.log(`[DEBUG] 개별 조회 [${uid}]:`, {
                data: singleCreator,
                error: singleError,
                dataLength: singleCreator?.length || 0,
              });

              if (singleCreator && singleCreator.length > 0) {
                console.log(
                  `[DEBUG] ✅ 크리에이터 발견 [${uid}]:`,
                  singleCreator[0]
                );
              } else if (singleError) {
                console.error(
                  `[DEBUG] ❌ 개별 조회 에러 [${uid}]:`,
                  singleError
                );
              }
            } catch (err) {
              console.error(`[DEBUG] 개별 조회 [${uid}] 예외:`, err);
            }
          }

          const { data: creators, error: creatorsError } = await window.supabase
            .from("creators")
            .select("firebase_uid, pen_name")
            .in("firebase_uid", userIdsArray);

          console.log(
            "[DEBUG] ========== Supabase creators 조회 결과 =========="
          );
          console.log("[DEBUG] data:", creators);
          console.log(
            "[DEBUG] data 타입:",
            Array.isArray(creators) ? "배열" : typeof creators
          );
          console.log("[DEBUG] data 길이:", creators?.length || 0);
          console.log("[DEBUG] error:", creatorsError);

          if (creatorsError) {
            console.error("[DEBUG] ❌ Supabase creators 조회 오류:");
            console.error("  - 코드:", creatorsError.code);
            console.error("  - 메시지:", creatorsError.message);
            console.error("  - 상세:", creatorsError);
            console.error(
              "  - 전체 에러 객체:",
              JSON.stringify(creatorsError, null, 2)
            );
          }

          if (!creatorsError && creators) {
            if (creators.length > 0) {
              console.log(`[DEBUG] ✅ 크리에이터 ${creators.length}명 발견`);
              creators.forEach((creator, index) => {
                console.log(`[DEBUG] 크리에이터 [${index}]:`, {
                  firebase_uid: creator.firebase_uid,
                  pen_name: creator.pen_name,
                  전체데이터: creator,
                });

                if (creator.firebase_uid && creator.pen_name) {
                  creatorNameMap[creator.firebase_uid] = creator.pen_name;
                  console.log(
                    `[DEBUG] ✅ 크리에이터 맵에 추가: ${creator.firebase_uid} = ${creator.pen_name}`
                  );
                } else {
                  console.warn(`[DEBUG] ⚠️ 크리에이터 데이터 불완전:`, creator);
                }
              });
            } else {
              console.log(
                "[DEBUG] ⚠️ Supabase에서 크리에이터를 찾지 못함 (결과 배열이 비어있음)"
              );
              console.log(
                "[DEBUG]   - 조회한 firebase_uid 목록:",
                userIdsArray
              );
              console.log(
                "[DEBUG]   - Supabase creators 테이블에 해당 firebase_uid가 없을 수 있음"
              );
            }
            console.log("[DEBUG] 최종 creatorNameMap:", creatorNameMap);
          } else if (!creatorsError && (!creators || creators.length === 0)) {
            console.log(
              "[DEBUG] ⚠️ Supabase에서 크리에이터를 찾지 못함 (정상 - 독자일 수 있음)"
            );
            console.log("[DEBUG]   - 조회한 firebase_uid 목록:", userIdsArray);
          }
          console.log("[DEBUG] ==========================================");
        } catch (err) {
          console.error("[DEBUG] ❌ 크리에이터 조회 예외 발생:");
          console.error("  - 에러:", err);
          console.error("  - 메시지:", err.message);
          console.error("  - 스택:", err.stack);
        }
      } else {
        console.warn(
          "[DEBUG] ⚠️ window.supabase가 없습니다 - 크리에이터 조회 불가"
        );
        console.warn(
          "[DEBUG]   - Supabase 클라이언트가 초기화되지 않았을 수 있습니다"
        );
        console.warn(
          "[DEBUG]   - HTML에서 Supabase 스크립트가 로드되었는지 확인하세요"
        );
      }

      // 2. Firestore readers 컬렉션에서 nickname 조회 (독자만)
      // 크리에이터는 이미 Supabase에서 조회했으므로 Firestore 조회 건너뜀
      const readerIds = userIdsArray.filter((uid) => !creatorNameMap[uid]);

      if (readerIds.length > 0) {
        console.log("[DEBUG] Firestore 독자 조회 시작, readerIds:", readerIds);
        const firestoreRefs = await getFirestoreRefs();
        console.log(
          "[DEBUG] firestoreRefs:",
          firestoreRefs ? "로드됨" : "null"
        );

        if (firestoreRefs) {
          try {
            const { db, getDoc, doc } = firestoreRefs;
            console.log("[DEBUG] Firestore 함수 확인:", {
              db: !!db,
              getDoc: typeof getDoc,
              doc: typeof doc,
            });

            // Firestore readers 컬렉션에서 각 uid별로 nickname 조회
            // 참고: 프로젝트에서는 독자 정보를 'readers' 컬렉션에 저장함
            const userPromises = readerIds.map(async (uid) => {
              try {
                // 먼저 readers 컬렉션에서 조회 시도
                const readerDocRef = doc(db, "readers", uid);
                const readerDocSnap = await getDoc(readerDocRef);
                if (readerDocSnap.exists()) {
                  const readerData = readerDocSnap.data();
                  console.log(
                    `[DEBUG] Firestore readers/${uid} 조회 성공:`,
                    readerData
                  );
                  if (readerData.nickname) {
                    nicknameMap[uid] = readerData.nickname;
                    console.log(
                      `[DEBUG] nicknameMap 업데이트 (readers): ${uid} = ${readerData.nickname}`
                    );
                    return; // readers에서 찾았으면 종료
                  }
                }

                // readers에 없으면 users 컬렉션도 확인 (fallback)
                const userDocRef = doc(db, "users", uid);
                const userDocSnap = await getDoc(userDocRef);
                if (userDocSnap.exists()) {
                  const userData = userDocSnap.data();
                  console.log(
                    `[DEBUG] Firestore users/${uid} 조회 성공:`,
                    userData
                  );
                  if (userData.nickname) {
                    nicknameMap[uid] = userData.nickname;
                    console.log(
                      `[DEBUG] nicknameMap 업데이트 (users): ${uid} = ${userData.nickname}`
                    );
                  }
                } else {
                  // 독자 정보가 Firestore에 없는 경우 (정상적인 경우일 수 있음)
                  console.log(
                    `[DEBUG] 독자 Firestore readers/${uid} 및 users/${uid} 문서 없음 (Supabase에서도 확인 필요)`
                  );
                }
              } catch (err) {
                // 개별 조회 실패는 무시하고 계속 진행
                console.warn(
                  `[댓글 렌더링] Firestore readers/${uid} 조회 실패:`,
                  err
                );
              }
            });

            await Promise.all(userPromises);
            console.log("[DEBUG] 최종 nicknameMap:", nicknameMap);
          } catch (err) {
            console.error("[댓글 렌더링] Firestore 독자명 로드 실패:", err);
          }
        } else {
          console.warn(
            "[Firestore] Firestore SDK not ready - 표시명은 기본값(사용자)으로 표시됩니다"
          );
        }
      } else {
        console.log(
          "[DEBUG] 모든 사용자가 크리에이터이므로 Firestore 조회 건너뜀"
        );
      }

      // 3. 최종 표시명 결정: 작가 → 독자 → 사용자
      console.log("[DEBUG] 최종 표시명 결정 시작");
      console.log("[DEBUG] creatorNameMap:", creatorNameMap);
      console.log("[DEBUG] nicknameMap:", nicknameMap);

      userIdsArray.forEach((uid) => {
        let name = "사용자";
        let source = "기본값";

        if (creatorNameMap[uid]) {
          name = creatorNameMap[uid]; // 작가 pen_name
          source = "크리에이터 (Supabase pen_name)";
        } else if (nicknameMap[uid]) {
          name = nicknameMap[uid]; // 독자 nickname
          source = "독자 (Firestore nickname)";
        }

        displayNameMap[uid] = name;
        console.log(`[DEBUG] 표시명 결정 [${uid}]: "${name}" (${source})`);
      });

      console.log("[DEBUG] 최종 displayNameMap:", displayNameMap);
    } catch (err) {
      console.error("[댓글 렌더링] 표시명 로드 예외:", err);
    }
  }

  // 대댓글 좋아요 수 로드 (한 번에)
  if (window.supabase && allReplyIds.length > 0) {
    try {
      const { data: replyLikes } = await window.supabase
        .from("likes")
        .select("target_id")
        .eq("target_type", "reply")
        .in("target_id", allReplyIds);

      if (replyLikes) {
        replyLikes.forEach((like) => {
          replyLikesMap[like.target_id] =
            (replyLikesMap[like.target_id] || 0) + 1;
        });
      }

      // 현재 사용자의 대댓글 좋아요 상태
      if (firebaseUid) {
        const { data: userReplyLikes } = await window.supabase
          .from("likes")
          .select("target_id")
          .eq("target_type", "reply")
          .eq("user_id", firebaseUid)
          .in("target_id", allReplyIds);

        if (userReplyLikes) {
          userReplyLikes.forEach((like) => {
            userLikedReplies.add(like.target_id);
          });
        }
      }
    } catch (err) {
      console.error("[댓글 렌더링] 대댓글 좋아요 로드 실패:", err);
    }
  }

  let html = "";
  for (const { comment, replies } of commentsWithReplies) {
    const isOwner = firebaseUid && comment.user_id === firebaseUid;
    let dateStr = "";
    if (comment.created_at) {
      const date = new Date(comment.created_at);
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const day = String(date.getDate()).padStart(2, "0");
      dateStr = `${year}. ${month}. ${day}.`;
    }

    // 댓글 좋아요 수와 상태
    const commentLikeCount = commentLikesMap[comment.id] || 0;
    const isCommentLiked = userLikedComments.has(comment.id);

    const replyCount = replies?.length || 0;

    // 크리에이터 배지 표시 디버그
    const isCreator = !!creatorNameMap[comment.user_id];
    const displayName = displayNameMap[comment.user_id] || "사용자";
    console.log(`[DEBUG] 댓글 렌더링 [${comment.id}]:`, {
      user_id: comment.user_id,
      displayName: displayName,
      isCreator: isCreator,
      creatorNameMap_has: creatorNameMap.hasOwnProperty(comment.user_id),
      creatorNameMap_value: creatorNameMap[comment.user_id],
    });

    html += `
      <div class="comment-item" data-comment-id="${comment.id}">
        <div class="comment-main-row">
          <div class="comment-avatar"></div>
          <div class="comment-body">
            <div class="comment-header">
              <span class="comment-author">
              ${displayName}
              ${
                isCreator
                  ? '<span class="m-creator-badge">M.creator</span>'
                  : ""
              }
              </span>
              <span class="comment-date">${dateStr}</span>
              <div class="comment-menu-btn-wrapper">
                <button class="comment-menu-btn" data-comment-id="${
                  comment.id
                }" data-feed-id="${feedId}" onclick="toggleCommentMenu(event, '${
      comment.id
    }', '${feedId}', ${isOwner})" aria-label="메뉴">
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20" fill="none">
                    <circle cx="10" cy="5" r="1.5" fill="#1A1A1A" />
                    <circle cx="10" cy="10" r="1.5" fill="#1A1A1A" />
                    <circle cx="10" cy="15" r="1.5" fill="#1A1A1A" />
                  </svg>
                </button>
                <div class="comment-menu-dropdown" id="comment-menu-${
                  comment.id
                }">
                  ${
                    isOwner
                      ? `<button class="comment-menu-item" onclick="editCommentHandler('${comment.id}', '${feedId}')">수정</button>
                         <button class="comment-menu-item danger" onclick="deleteCommentHandler('${comment.id}', '${feedId}')">삭제</button>
                         <button class="comment-menu-item" onclick="reportCommentHandler('${comment.id}')">댓글 신고</button>`
                      : `<button class="comment-menu-item" onclick="reportCommentHandler('${comment.id}')">댓글 신고</button>`
                  }
                </div>
              </div>
            </div>
            <p class="comment-text">${escapeHtml(comment.content)}</p>
            <div class="comment-actions">
              <button class="comment-action-btn comment-like-btn ${
                isCommentLiked ? "active" : ""
              }" data-comment-id="${comment.id}" data-action="comment-like">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 18 18" fill="none" class="comment-action-icon">
                  <path d="M15.8434 4.05117C15.4768 3.68448 15.0417 3.3936 14.5627 3.19514C14.0837 2.99668 13.5704 2.89453 13.0519 2.89453C12.5335 2.89453 12.0201 2.99668 11.5411 3.19514C11.0621 3.3936 10.627 3.68448 10.2605 4.05117L9.49981 4.81182L8.73916 4.05117C7.99882 3.31083 6.9947 2.89491 5.94771 2.89492C4.90071 2.89492 3.89659 3.31083 3.15626 4.05117C2.41592 4.79151 2 5.79562 2 6.84262C2 7.88962 2.41592 8.89373 3.15626 9.63407L3.91691 10.3947L9.49981 15.9776L15.0827 10.3947L15.8434 9.63407C16.21 9.26756 16.5009 8.83238 16.6994 8.35342C16.8979 7.87445 17 7.36108 17 6.84262C17 6.32417 16.8979 5.81079 16.6994 5.33183C16.5009 4.85286 16.21 4.41769 15.8434 4.05117Z" stroke="${
                    isCommentLiked ? "#FF5E00" : "#A0A0A0"
                  }" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"${
      isCommentLiked ? ' fill="#FF5E00"' : ""
    }/>
                </svg>
                <span class="comment-like-count">${commentLikeCount}</span>
              </button>
              <button class="comment-action-btn" onclick="toggleReplyInput('${
                comment.id
              }')">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 18 18" fill="none" class="comment-action-icon">
                  <path d="M16 8.61112C16.0027 9.63769 15.7628 10.6504 15.3 11.5667C14.7512 12.6647 13.9076 13.5882 12.8636 14.2339C11.8195 14.8795 10.6164 15.2217 9.38888 15.2222C8.36231 15.2249 7.34964 14.9851 6.43333 14.5222L2 16L3.47778 11.5667C3.01494 10.6504 2.7751 9.63769 2.77778 8.61112C2.77825 7.3836 3.12047 6.18046 3.76611 5.13644C4.41175 4.09243 5.3353 3.24879 6.43333 2.70002C7.34964 2.23719 8.36231 1.99735 9.38888 2.00002H9.77777C11.3989 2.08946 12.9301 2.77372 14.0782 3.9218C15.2263 5.06987 15.9105 6.60108 16 8.22223V8.61112Z" stroke="#A0A0A0" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
                <span>${replyCount}</span>
              </button>
            </div>
            ${
              replyCount > 0
                ? `<button class="reply-toggle" onclick="toggleReplies('${comment.id}')" data-parent-id="${comment.id}">댓글 ${replyCount}개 보기</button>`
                : ""
            }
          </div>
        </div>
        <div class="comment-replies" data-parent-id="${comment.id}">
    `;

    // 대댓글 렌더링
    if (replies && replies.length > 0) {
      for (const reply of replies) {
        const isReplyOwner = firebaseUid && reply.user_id === firebaseUid;
        let replyDateStr = "";
        if (reply.created_at) {
          const date = new Date(reply.created_at);
          const year = date.getFullYear();
          const month = String(date.getMonth() + 1).padStart(2, "0");
          const day = String(date.getDate()).padStart(2, "0");
          replyDateStr = `${year}. ${month}. ${day}.`;
        }

        // 대댓글 좋아요 수와 상태
        const replyLikeCount = replyLikesMap[reply.id] || 0;
        const isReplyLiked = userLikedReplies.has(reply.id);

        // 대댓글 크리에이터 배지 표시 디버그
        const isReplyCreator = !!creatorNameMap[reply.user_id];
        const replyDisplayName = displayNameMap[reply.user_id] || "사용자";
        console.log(`[DEBUG] 대댓글 렌더링 [${reply.id}]:`, {
          user_id: reply.user_id,
          displayName: replyDisplayName,
          isCreator: isReplyCreator,
          creatorNameMap_has: creatorNameMap.hasOwnProperty(reply.user_id),
          creatorNameMap_value: creatorNameMap[reply.user_id],
        });

        html += `
          <div class="comment-reply-item" data-reply-id="${reply.id}">
            <div class="comment-reply-line"></div>
            <div class="comment-main-row">
              <div class="comment-avatar"></div>
              <div class="comment-body">
                <div class="comment-header">
                  <span class="comment-author">${replyDisplayName}${
          isReplyCreator ? '<span class="m-creator-badge">M.creator</span>' : ""
        }</span>
                  <span class="comment-date">${replyDateStr}</span>
                  <div class="comment-menu-btn-wrapper">
                    <button class="comment-menu-btn" data-reply-id="${
                      reply.id
                    }" data-feed-id="${feedId}" onclick="toggleReplyMenu(event, '${
          reply.id
        }', '${feedId}', ${isReplyOwner})" aria-label="메뉴">
                      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20" fill="none">
                        <circle cx="10" cy="5" r="1.5" fill="#1A1A1A" />
                        <circle cx="10" cy="10" r="1.5" fill="#1A1A1A" />
                        <circle cx="10" cy="15" r="1.5" fill="#1A1A1A" />
                      </svg>
                    </button>
                    <div class="comment-menu-dropdown" id="reply-menu-${
                      reply.id
                    }">
                      ${
                        isReplyOwner
                          ? `<button class="comment-menu-item" onclick="editReplyHandler('${reply.id}', '${feedId}')">수정</button>
                             <button class="comment-menu-item danger" onclick="deleteReplyHandler('${reply.id}', '${feedId}')">삭제</button>
                             <button class="comment-menu-item" onclick="reportReplyHandler('${reply.id}')">댓글 신고</button>`
                          : `<button class="comment-menu-item" onclick="reportReplyHandler('${reply.id}')">댓글 신고</button>`
                      }
                    </div>
                  </div>
                </div>
                <p class="comment-text">${escapeHtml(reply.content)}</p>
                <div class="comment-actions">
                  <button class="comment-action-btn comment-like-btn ${
                    isReplyLiked ? "active" : ""
                  }" data-reply-id="${reply.id}" data-action="comment-like">
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 18 18" fill="none" class="comment-action-icon">
                      <path d="M15.8434 4.05117C15.4768 3.68448 15.0417 3.3936 14.5627 3.19514C14.0837 2.99668 13.5704 2.89453 13.0519 2.89453C12.5335 2.89453 12.0201 2.99668 11.5411 3.19514C11.0621 3.3936 10.627 3.68448 10.2605 4.05117L9.49981 4.81182L8.73916 4.05117C7.99882 3.31083 6.9947 2.89491 5.94771 2.89492C4.90071 2.89492 3.89659 3.31083 3.15626 4.05117C2.41592 4.79151 2 5.79562 2 6.84262C2 7.88962 2.41592 8.89373 3.15626 9.63407L3.91691 10.3947L9.49981 15.9776L15.0827 10.3947L15.8434 9.63407C16.21 9.26756 16.5009 8.83238 16.6994 8.35342C16.8979 7.87445 17 7.36108 17 6.84262C17 6.32417 16.8979 5.81079 16.6994 5.33183C16.5009 4.85286 16.21 4.41769 15.8434 4.05117Z" stroke="${
                        isReplyLiked ? "#FF5E00" : "#A0A0A0"
                      }" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"${
          isReplyLiked ? ' fill="#FF5E00"' : ""
        }/>
                    </svg>
                    <span class="comment-like-count">${replyLikeCount}</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        `;
      }
    }
    html += `</div>`; // comment-replies 닫기
  }

  return html;
}

// 댓글 입력창 추가
async function addCommentInputArea(feedId, contentArea) {
  // 입력창이 이미 있으면 제거 후 재생성
  const existingInput = contentArea.querySelector(".comment-input-area");
  if (existingInput) {
    existingInput.remove();
  }

  const inputArea = document.createElement("div");
  inputArea.className = "comment-input-area";
  inputArea.style.display = "block"; // 항상 표시 (로그인 상태와 관계없이)
  inputArea.innerHTML = `
    <div class="comment-input-wrapper">
      <input type="text" class="comment-input" placeholder="댓글을 입력하세요..." />
      <button class="comment-submit-btn" onclick="submitComment('${feedId}')">게시</button>
    </div>
  `;

  contentArea.appendChild(inputArea);

  // 로그인하지 않은 경우 입력창 비활성화 (표시는 하지만 클릭 시 로그인 요청)
  const checkAuthAndUpdateInput = async () => {
    const uid = await getCurrentFirebaseUid();
    const commentInput = inputArea.querySelector(".comment-input");
    const submitBtn = inputArea.querySelector(".comment-submit-btn");

    if (uid) {
      // 로그인된 경우: 입력창 활성화
      if (commentInput) {
        commentInput.disabled = false;
        commentInput.placeholder = "댓글을 입력하세요...";
      }
      if (submitBtn) {
        submitBtn.disabled = false;
      }
    } else {
      // 로그인하지 않은 경우: 입력창 비활성화 (하지만 표시는 유지)
      if (commentInput) {
        commentInput.disabled = true;
        commentInput.placeholder = "로그인이 필요합니다...";
      }
      if (submitBtn) {
        submitBtn.disabled = true;
      }
    }
  };

  // 초기 체크
  checkAuthAndUpdateInput();

  // 주기적으로 체크 (Firebase Auth가 나중에 로드될 수 있음)
  const authCheckInterval = setInterval(() => {
    checkAuthAndUpdateInput();
  }, 500);

  // 5초 후 체크 중단
  setTimeout(() => {
    clearInterval(authCheckInterval);
  }, 5000);

  // 입력창 클릭 시 로그인 안내
  const commentInput = inputArea.querySelector(".comment-input");
  if (commentInput) {
    commentInput.addEventListener("click", async () => {
      const uid = await getCurrentFirebaseUid();
      if (!uid) {
        alert("댓글을 작성하려면 로그인이 필요합니다.");
      }
    });
  }

  // Ctrl+Enter 또는 Cmd+Enter로 댓글 작성
  if (commentInput) {
    commentInput.addEventListener("keydown", (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
        e.preventDefault();
        submitComment(feedId);
      }
    });
  }
}

// 댓글 작성
window.submitComment = async function (feedId) {
  const modal = document.getElementById("comment-modal");
  if (!modal) return;

  const input = modal.querySelector(".comment-input");
  if (!input) return;

  const content = input.value.trim();
  if (!content) {
    alert("댓글 내용을 입력해주세요.");
    return;
  }

  const firebaseUid = await getCurrentFirebaseUid();
  if (!firebaseUid) {
    alert("로그인이 필요합니다.");
    return;
  }

  // window 전역 함수 검증
  if (typeof window.createComment !== "function") {
    console.error("[댓글] window.createComment 함수가 없습니다.");
    alert("댓글 작성 기능을 사용할 수 없습니다.");
    return;
  }

  // Optimistic UI: 피드 카드의 댓글 수 즉시 +1
  const feedItem = document.querySelector(
    `.feed-item[data-feed-id="${feedId}"]`
  );
  const commentButton = feedItem?.querySelector(
    '.feed-card-stat[aria-label="댓글"]'
  );
  const commentCountEl = commentButton?.querySelector(".stat-count");
  const previousCount = commentCountEl
    ? parseInt(commentCountEl.textContent || "0")
    : 0;

  if (commentCountEl) {
    commentCountEl.textContent = previousCount + 1;
  }

  // Supabase client 대기
  waitForSupabase(async () => {
    try {
      const { error } = await window.createComment(
        "feed",
        feedId,
        content,
        firebaseUid
      );
      if (error) {
        console.error("[댓글] 작성 실패:", error);
        if (error.code === "42501") {
          alert(
            "댓글 작성 권한이 없습니다.\n\nDB 관리자에게 다음을 확인해주세요:\n- comments 테이블의 RLS INSERT 정책\n- user_id 컬럼에 대한 권한 설정"
          );
        } else {
          alert("댓글 작성에 실패했습니다.");
        }
        // 에러 발생 시 댓글 수 롤백
        if (commentCountEl) {
          commentCountEl.textContent = previousCount;
        }
        // 에러가 나도 입력창은 초기화
        input.value = "";
        return;
      }

      // 입력창 초기화
      input.value = "";

      // 댓글 다시 로드 (에러와 관계없이 시도)
      try {
        await loadCommentsForModal(feedId);
      } catch (reloadErr) {
        console.error("[댓글] 재로드 실패:", reloadErr);
      }

      // 피드 카드의 댓글 수 업데이트 (서버 데이터로 동기화)
      if (typeof window.updateSingleFeedStats === "function") {
        try {
          await window.updateSingleFeedStats(feedId);
        } catch (statErr) {
          console.error("[댓글] 통계 업데이트 실패:", statErr);
        }
      }
    } catch (err) {
      console.error("[댓글] 작성 예외:", err);
      alert("댓글 작성에 실패했습니다.");
      // 에러 발생 시 댓글 수 롤백
      if (commentCountEl) {
        commentCountEl.textContent = previousCount;
      }
    }
  });
};

// 댓글 삭제
window.deleteCommentHandler = async function (commentId, feedId) {
  if (!confirm("댓글을 삭제하시겠습니까?")) return;

  // window 전역 함수 검증
  if (typeof window.deleteComment !== "function") {
    console.error("[댓글] window.deleteComment 함수가 없습니다.");
    alert("댓글 삭제 기능을 사용할 수 없습니다.");
    return;
  }

  const firebaseUid = await getCurrentFirebaseUid();
  if (!firebaseUid) {
    alert("로그인이 필요합니다.");
    return;
  }

  // Optimistic UI: 피드 카드의 댓글 수 즉시 -1
  const feedItem = document.querySelector(
    `.feed-item[data-feed-id="${feedId}"]`
  );
  const commentButton = feedItem?.querySelector(
    '.feed-card-stat[aria-label="댓글"]'
  );
  const commentCountEl = commentButton?.querySelector(".stat-count");
  const previousCount = commentCountEl
    ? parseInt(commentCountEl.textContent || "0")
    : 0;

  if (commentCountEl) {
    commentCountEl.textContent = Math.max(0, previousCount - 1);
  }

  // Supabase client 대기
  waitForSupabase(async () => {
    try {
      const { error } = await window.deleteComment(commentId, firebaseUid);
      if (error) {
        console.error("[댓글] 삭제 실패:", error);
        alert("댓글 삭제에 실패했습니다.");
        // 에러 발생 시 댓글 수 롤백
        if (commentCountEl) {
          commentCountEl.textContent = previousCount;
        }
        return;
      }

      // 댓글 다시 로드 (에러와 관계없이 시도)
      try {
        await loadCommentsForModal(feedId);
      } catch (reloadErr) {
        console.error("[댓글] 재로드 실패:", reloadErr);
      }

      // 피드 카드의 댓글 수 업데이트 (서버 데이터로 동기화)
      if (typeof window.updateSingleFeedStats === "function") {
        try {
          await window.updateSingleFeedStats(feedId);
        } catch (statErr) {
          console.error("[댓글] 통계 업데이트 실패:", statErr);
        }
      }
    } catch (err) {
      console.error("[댓글] 삭제 예외:", err);
      alert("댓글 삭제에 실패했습니다.");
      // 에러 발생 시 댓글 수 롤백
      if (commentCountEl) {
        commentCountEl.textContent = previousCount;
      }
    }
  });
};

// 대댓글 삭제
window.deleteReplyHandler = async function (replyId, feedId) {
  if (!confirm("대댓글을 삭제하시겠습니까?")) return;

  // window 전역 함수 검증
  if (typeof window.deleteReply !== "function") {
    console.error("[대댓글] window.deleteReply 함수가 없습니다.");
    alert("대댓글 삭제 기능을 사용할 수 없습니다.");
    return;
  }

  const firebaseUid = await getCurrentFirebaseUid();
  if (!firebaseUid) {
    alert("로그인이 필요합니다.");
    return;
  }

  // Supabase client 대기
  waitForSupabase(async () => {
    try {
      const { error } = await window.deleteReply(replyId, firebaseUid);
      if (error) {
        console.error("[대댓글] 삭제 실패:", error);
        alert("대댓글 삭제에 실패했습니다.");
        return;
      }

      // 댓글 다시 로드 (에러와 관계없이 시도)
      try {
        await loadCommentsForModal(feedId);
      } catch (reloadErr) {
        console.error("[대댓글] 재로드 실패:", reloadErr);
      }
    } catch (err) {
      console.error("[대댓글] 삭제 예외:", err);
      alert("대댓글 삭제에 실패했습니다.");
    }
  });
};

// 대댓글 입력 토글
window.toggleReplyInput = function (commentId) {
  const replyInputId = `reply-input-${commentId}`;
  let replyInputArea = document.getElementById(replyInputId);

  if (replyInputArea) {
    // 이미 있으면 토글
    replyInputArea.remove();
    return;
  }

  // 대댓글 입력창 생성
  const commentItem = document.querySelector(
    `[data-comment-id="${commentId}"]`
  );
  if (!commentItem) return;

  replyInputArea = document.createElement("div");
  replyInputArea.id = replyInputId;
  replyInputArea.className = "comment-reply-input-area";
  replyInputArea.innerHTML = `
    <div class="comment-reply-input-wrapper">
      <textarea class="comment-reply-input" placeholder="대댓글을 입력하세요..." rows="2"></textarea>
      <button class="comment-reply-submit-btn" onclick="submitReply('${commentId}')">게시</button>
    </div>
  `;

  // 댓글 항목 뒤에 추가
  // comment-body 안에 comment-actions 다음에 추가 (항상 보이도록)
  const commentBody = commentItem.querySelector(".comment-body");
  const commentActions = commentItem.querySelector(".comment-actions");

  if (commentBody) {
    if (commentActions) {
      // comment-actions 다음에 추가
      if (commentActions.nextSibling) {
        commentBody.insertBefore(replyInputArea, commentActions.nextSibling);
      } else {
        // comment-actions가 마지막 요소면 그 뒤에 추가
        commentBody.appendChild(replyInputArea);
      }
    } else {
      // comment-actions가 없으면 comment-body 끝에 추가
      commentBody.appendChild(replyInputArea);
    }
  } else {
    // comment-body가 없으면 comment-item에 직접 추가
    commentItem.appendChild(replyInputArea);
  }

  // 입력창에 포커스
  const input = replyInputArea.querySelector(".comment-reply-input");
  if (input) {
    input.focus();
    input.addEventListener("keydown", (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
        e.preventDefault();
        submitReply(commentId);
      }
    });
  }
};

// 대댓글 작성
window.submitReply = async function (commentId) {
  const replyInputId = `reply-input-${commentId}`;
  const replyInputArea = document.getElementById(replyInputId);
  if (!replyInputArea) return;

  const input = replyInputArea.querySelector(".comment-reply-input");
  if (!input) return;

  const content = input.value.trim();
  if (!content) {
    alert("대댓글 내용을 입력해주세요.");
    return;
  }

  const firebaseUid = await getCurrentFirebaseUid();
  if (!firebaseUid) {
    alert("로그인이 필요합니다.");
    return;
  }

  // window 전역 함수 검증
  if (typeof window.createReply !== "function") {
    console.error("[대댓글] window.createReply 함수가 없습니다.");
    alert("대댓글 작성 기능을 사용할 수 없습니다.");
    return;
  }

  // 모달에서 feedId 가져오기
  const modal = document.getElementById("comment-modal");
  const feedId = modal?.getAttribute("data-current-feed-id");
  if (!feedId) {
    console.error("[대댓글] feedId 없음");
    return;
  }

  // Supabase client 대기
  waitForSupabase(async () => {
    try {
      const { error } = await window.createReply(
        commentId,
        content,
        firebaseUid
      );
      if (error) {
        console.error("[대댓글] 작성 실패:", error);
        alert("대댓글 작성에 실패했습니다.");
        return;
      }

      // 입력창 초기화 및 제거
      input.value = "";
      replyInputArea.remove();

      // 댓글 다시 로드
      try {
        await loadCommentsForModal(feedId);
      } catch (reloadErr) {
        console.error("[대댓글] 재로드 실패:", reloadErr);
      }
    } catch (err) {
      console.error("[대댓글] 작성 예외:", err);
      alert("대댓글 작성에 실패했습니다.");
    }
  });
};

// HTML 이스케이프
function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

// Firebase UID 가져오기 (전역 참조 사용)
async function getCurrentFirebaseUid() {
  try {
    // window.firebase.auth가 로드될 때까지 대기
    let attempts = 0;
    const maxAttempts = 50;

    while (attempts < maxAttempts) {
      // Firebase SDK v8 방식
      if (window.firebase?.auth) {
        const auth = window.firebase.auth();
        if (auth && auth.currentUser) {
          return auth.currentUser.uid;
        }
        // onAuthStateChanged를 사용하여 현재 사용자 확인
        return new Promise((resolve) => {
          const unsubscribe = auth.onAuthStateChanged((user) => {
            unsubscribe();
            resolve(user?.uid || null);
          });
        });
      }
      // Firebase SDK v9 방식 (onAuthStateChanged는 별도 import 필요하지만,
      // 일반 스크립트에서는 사용 불가하므로 v8 방식만 지원)
      await new Promise((resolve) => setTimeout(resolve, 100));
      attempts++;
    }

    console.warn("[Firebase] Auth가 로드되지 않았습니다.");
    return null;
  } catch (error) {
    console.error("[Firebase] UID 가져오기 실패:", error);
    return null;
  }
}

// 댓글 모달 닫기 (전역 함수)
window.closeCommentModal = function () {
  const modal = document.getElementById("comment-modal");
  if (modal) {
    modal.style.display = "none";
    // body 스크롤 복원 불필요 (원래 막지 않았으므로)
    modal.removeAttribute("data-current-feed-id");
  }
};

// 저장 확인 모달 열기
function openSaveModal() {
  const modal = document.getElementById("save-modal");
  if (modal) {
    modal.style.display = "flex";
    document.body.style.overflow = "hidden";
  }
}

// 저장 확인 모달 닫기 (전역 함수)
window.closeSaveModal = function () {
  const modal = document.getElementById("save-modal");
  if (modal) {
    modal.style.display = "none";
    document.body.style.overflow = "";
  }
};

// 저장 모달 확인 (무드보드 바로가기 버튼)
window.confirmSaveModal = function () {
  window.closeSaveModal();
  // 마이페이지로 이동
  window.location.href = "mypage_reader.html";
};

// 댓글 메뉴 토글 (전역 함수)
window.toggleCommentMenu = function (event, commentId, feedId, isOwner) {
  event.stopPropagation();
  const menuId = `comment-menu-${commentId}`;
  const menu = document.getElementById(menuId);
  if (!menu) return;

  // 다른 모든 메뉴 닫기
  document.querySelectorAll(".comment-menu-dropdown.show").forEach((m) => {
    if (m.id !== menuId) {
      m.classList.remove("show");
    }
  });

  // 현재 메뉴 토글
  menu.classList.toggle("show");
};

// 대댓글 토글 (전역 함수)
window.toggleReplies = function (commentId) {
  const replies = document.querySelector(
    `.comment-replies[data-parent-id="${commentId}"]`
  );
  const toggleBtn = document.querySelector(
    `.reply-toggle[data-parent-id="${commentId}"]`
  );

  if (!replies || !toggleBtn) return;

  const isOpen = replies.classList.contains("open");

  if (isOpen) {
    replies.classList.remove("open");
    const replyCount = replies.querySelectorAll(".comment-reply-item").length;
    toggleBtn.textContent = `댓글 ${replyCount}개 보기`;
  } else {
    replies.classList.add("open");
    toggleBtn.textContent = "숨기기";
  }
};

// 대댓글 메뉴 토글 (전역 함수)
window.toggleReplyMenu = function (event, replyId, feedId, isOwner) {
  event.stopPropagation();
  const menuId = `reply-menu-${replyId}`;
  const menu = document.getElementById(menuId);
  if (!menu) return;

  // 다른 모든 메뉴 닫기
  document.querySelectorAll(".comment-menu-dropdown.show").forEach((m) => {
    if (m.id !== menuId) {
      m.classList.remove("show");
    }
  });

  // 현재 메뉴 토글
  menu.classList.toggle("show");
};

// 댓글 수정 핸들러 (전역 함수)
window.editCommentHandler = async function (commentId, feedId) {
  const commentItem = document.querySelector(
    `[data-comment-id="${commentId}"]`
  );
  if (!commentItem) return;

  const commentText = commentItem.querySelector(".comment-text");
  const currentText = commentText.textContent.trim();

  // 기존 텍스트를 입력창으로 변경
  const editInput = document.createElement("textarea");
  editInput.className = "comment-edit-input";
  editInput.value = currentText;
  editInput.style.width = "100%";
  editInput.style.minHeight = "60px";
  editInput.style.padding = "8px";
  editInput.style.border = "1px solid #e5e5e5";
  editInput.style.borderRadius = "4px";
  editInput.style.fontSize = "14px";
  editInput.style.fontFamily = "inherit";

  const editActions = document.createElement("div");
  editActions.style.display = "flex";
  editActions.style.gap = "8px";
  editActions.style.marginTop = "8px";

  const saveBtn = document.createElement("button");
  saveBtn.textContent = "저장";
  saveBtn.className = "comment-submit-btn";
  saveBtn.style.padding = "6px 16px";
  saveBtn.style.fontSize = "13px";

  const cancelBtn = document.createElement("button");
  cancelBtn.textContent = "취소";
  cancelBtn.style.padding = "6px 16px";
  cancelBtn.style.fontSize = "13px";
  cancelBtn.style.background = "#f5f5f5";
  cancelBtn.style.border = "1px solid #e5e5e5";
  cancelBtn.style.borderRadius = "4px";
  cancelBtn.style.cursor = "pointer";

  const originalText = commentText.textContent;
  const originalParent = commentText.parentElement;

  commentText.replaceWith(editInput);
  originalParent.appendChild(editActions);
  editActions.appendChild(saveBtn);
  editActions.appendChild(cancelBtn);

  saveBtn.onclick = async () => {
    const newText = editInput.value.trim();
    if (!newText) {
      alert("댓글 내용을 입력해주세요.");
      return;
    }

    // 수정 API 호출
    const firebaseUid = await getCurrentFirebaseUid();
    if (!firebaseUid) {
      alert("로그인이 필요합니다.");
      return;
    }

    waitForSupabase(async () => {
      try {
        // 직접 Supabase 업데이트
        const { error } = await window.supabase
          .from("comments")
          .update({ content: newText })
          .eq("id", commentId)
          .eq("user_id", firebaseUid);

        if (error) {
          console.error("[댓글] 수정 실패:", error);
          if (error.code === "42501") {
            alert("댓글 수정 권한이 없습니다.");
          } else {
            alert("댓글 수정에 실패했습니다.");
          }
          return;
        }

        // 성공 시 댓글 다시 로드
        const modal = document.getElementById("comment-modal");
        const currentFeedId =
          modal?.getAttribute("data-current-feed-id") || feedId;
        await loadCommentsForModal(currentFeedId);
      } catch (err) {
        console.error("[댓글] 수정 예외:", err);
        alert("댓글 수정에 실패했습니다.");
      }
    });
  };

  cancelBtn.onclick = () => {
    // 원래 텍스트로 복원
    const restoredText = document.createElement("p");
    restoredText.className = "comment-text";
    restoredText.textContent = originalText;
    editInput.replaceWith(restoredText);
    editActions.remove();
  };

  // 메뉴 닫기
  document.querySelectorAll(".comment-menu-dropdown.show").forEach((m) => {
    m.classList.remove("show");
  });
};

// 대댓글 수정 핸들러 (전역 함수)
window.editReplyHandler = async function (replyId, feedId) {
  const replyItem = document.querySelector(`[data-reply-id="${replyId}"]`);
  if (!replyItem) return;

  const replyText = replyItem.querySelector(".comment-text");
  const currentText = replyText.textContent.trim();

  // 기존 텍스트를 입력창으로 변경
  const editInput = document.createElement("textarea");
  editInput.className = "comment-edit-input";
  editInput.value = currentText;
  editInput.style.width = "100%";
  editInput.style.minHeight = "60px";
  editInput.style.padding = "8px";
  editInput.style.border = "1px solid #e5e5e5";
  editInput.style.borderRadius = "4px";
  editInput.style.fontSize = "14px";
  editInput.style.fontFamily = "inherit";

  const editActions = document.createElement("div");
  editActions.style.display = "flex";
  editActions.style.gap = "8px";
  editActions.style.marginTop = "8px";

  const saveBtn = document.createElement("button");
  saveBtn.textContent = "저장";
  saveBtn.className = "comment-submit-btn";
  saveBtn.style.padding = "6px 16px";
  saveBtn.style.fontSize = "13px";

  const cancelBtn = document.createElement("button");
  cancelBtn.textContent = "취소";
  cancelBtn.style.padding = "6px 16px";
  cancelBtn.style.fontSize = "13px";
  cancelBtn.style.background = "#f5f5f5";
  cancelBtn.style.border = "1px solid #e5e5e5";
  cancelBtn.style.borderRadius = "4px";
  cancelBtn.style.cursor = "pointer";

  const originalText = replyText.textContent;
  const originalParent = replyText.parentElement;

  replyText.replaceWith(editInput);
  originalParent.appendChild(editActions);
  editActions.appendChild(saveBtn);
  editActions.appendChild(cancelBtn);

  saveBtn.onclick = async () => {
    const newText = editInput.value.trim();
    if (!newText) {
      alert("대댓글 내용을 입력해주세요.");
      return;
    }

    const firebaseUid = await getCurrentFirebaseUid();
    if (!firebaseUid) {
      alert("로그인이 필요합니다.");
      return;
    }

    waitForSupabase(async () => {
      try {
        // 직접 Supabase 업데이트
        const { error } = await window.supabase
          .from("comment_replies")
          .update({ content: newText })
          .eq("id", replyId)
          .eq("user_id", firebaseUid);

        if (error) {
          console.error("[대댓글] 수정 실패:", error);
          alert("대댓글 수정에 실패했습니다.");
          return;
        }

        // 성공 시 댓글 다시 로드
        const modal = document.getElementById("comment-modal");
        const currentFeedId =
          modal?.getAttribute("data-current-feed-id") || feedId;
        await loadCommentsForModal(currentFeedId);
      } catch (err) {
        console.error("[대댓글] 수정 예외:", err);
        alert("대댓글 수정에 실패했습니다.");
      }
    });
  };

  cancelBtn.onclick = () => {
    // 원래 텍스트로 복원
    const restoredText = document.createElement("p");
    restoredText.className = "comment-text";
    restoredText.textContent = originalText;
    editInput.replaceWith(restoredText);
    editActions.remove();
  };

  // 메뉴 닫기
  document.querySelectorAll(".comment-menu-dropdown.show").forEach((m) => {
    m.classList.remove("show");
  });
};

// 댓글 신고 핸들러 (전역 함수)
window.reportCommentHandler = function (commentId) {
  if (confirm("이 댓글을 신고하시겠습니까?")) {
    // 신고 로직 구현 (필요시)
    alert("댓글이 신고되었습니다.");
    document.querySelectorAll(".comment-menu-dropdown.show").forEach((m) => {
      m.classList.remove("show");
    });
  }
};

// 대댓글 신고 핸들러 (전역 함수)
window.reportReplyHandler = function (replyId) {
  if (confirm("이 대댓글을 신고하시겠습니까?")) {
    // 신고 로직 구현 (필요시)
    alert("대댓글이 신고되었습니다.");
    document.querySelectorAll(".comment-menu-dropdown.show").forEach((m) => {
      m.classList.remove("show");
    });
  }
};

// 댓글 신고 모달 열기 (전역 함수)
window.openReportModal = function () {
  const modal = document.getElementById("report-modal");
  if (modal) {
    modal.style.display = "flex";
    document.body.style.overflow = "hidden";
  }
};

// 댓글 신고 모달 닫기 (전역 함수)
window.closeReportModal = function () {
  const modal = document.getElementById("report-modal");
  if (modal) {
    modal.style.display = "none";
    document.body.style.overflow = "";
  }
};

// 팔로우 모달 열기
function openFollowModal() {
  const modal = document.getElementById("follow-modal");
  if (modal) {
    modal.style.display = "flex";
    document.body.style.overflow = "hidden";
  }
}

// 팔로우 모달 닫기 (전역 함수)
window.closeFollowModal = function () {
  const modal = document.getElementById("follow-modal");
  if (modal) {
    modal.style.display = "none";
    document.body.style.overflow = "";
  }
};

// UUID 판별 함수
function isUUID(str) {
  if (!str || typeof str !== "string") return false;
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str);
}

// 작가 미리보기 모달 열기
let currentCreatorId = null;
async function openCreatorPreviewModal(creatorId) {
  // ⚠️ UUID 차단
  if (creatorId && isUUID(creatorId)) {
    console.error(
      "[CREATOR_TRACE][ERROR] openCreatorPreviewModal에 UUID 유입:",
      creatorId
    );
    showToast("작가 정보를 찾을 수 없습니다.");
    return;
  }

  console.debug("[CREATOR][MODAL] 모달 열기", { creatorId });
  currentCreatorId = creatorId;
  const modal = document.getElementById("creator-preview-modal");
  if (!modal) {
    console.warn(
      "[CREATOR][MODAL] 모달 요소를 찾을 수 없습니다 (id: creator-preview-modal)"
    );
    return;
  }

  // 모달 표시
  modal.style.display = "flex";
  document.body.style.overflow = "hidden";

  // 작가 정보 로드
  await loadCreatorInfo(creatorId);
}

// 작가 정보 로드
async function loadCreatorInfo(creatorId) {
  if (!creatorId) {
    console.warn("[CREATOR][MODAL] creatorId(firebase_uid)가 없습니다");
    updateCreatorPreviewUI({
      pen_name: "사용자",
      introduction: "작가 소개글이 없습니다.",
      profile_image_url: null,
    });
    return;
  }

  // ⚠️ UUID 차단
  if (isUUID(creatorId)) {
    console.error(
      "[CREATOR_TRACE][ERROR] loadCreatorInfo에 UUID 유입:",
      creatorId
    );
    updateCreatorPreviewUI({
      pen_name: "작가 정보 없음",
      introduction: "작가 정보를 찾을 수 없습니다.",
      profile_image_url: null,
    });
    return;
  }

  console.debug("[CREATOR][DEBUG] creatorId(firebase_uid):", creatorId);
  console.debug("[CREATOR][DATA] 작가 정보 로드 시작");

  // 🔍 추적 로그
  console.log("[CREATOR_TRACE][SOURCE=MODAL_LOAD]");
  console.log("creatorId value:", creatorId);
  console.log("creatorId typeof:", typeof creatorId);
  console.log("isUUID:", isUUID(creatorId));
  console.log("isFirebaseUID:", !isUUID(creatorId));

  if (!window.supabase) {
    console.debug("[CREATOR][MODAL] Supabase 클라이언트 대기 중...");
    waitForSupabase(async () => {
      await loadCreatorInfo(creatorId);
    });
    return;
  }

  try {
    console.debug("[CREATOR][DATA] creators 조회 쿼리 실행 전");
    // Supabase creators 테이블에서 작가 정보 조회 (firebase_uid 기준)
    const { data: creators, error } = await window.supabase
      .from("creators")
      .select("firebase_uid, pen_name, introduction, profile_image_url")
      .eq("firebase_uid", creatorId)
      .limit(1);

    console.debug("[CREATOR][DATA] creators 조회 결과:", {
      data: creators,
      error,
      dataLength: creators?.length || 0,
      firebase_uid: creatorId,
    });

    if (error) {
      console.error("[CREATOR][MODAL] 작가 정보 로드 실패:", error);
      // 기본값 표시
      updateCreatorPreviewUI({
        pen_name: "사용자",
        introduction: "작가 소개글이 없습니다.",
        profile_image_url: null,
      });
      return;
    }

    const creator = creators && creators.length > 0 ? creators[0] : null;

    if (creator) {
      console.debug("[CREATOR][DATA] 작가 정보 발견:", creator);
      updateCreatorPreviewUI(creator);

      // 팔로우 상태 확인
      const firebaseUid = await getCurrentFirebaseUid();
      console.debug("[CREATOR][MODAL] 현재 사용자 UID:", firebaseUid);
      if (firebaseUid) {
        await checkFollowStatus(creatorId, firebaseUid);
      } else {
        console.warn(
          "[CREATOR][MODAL] 로그인하지 않은 사용자 - 팔로우 상태 확인 건너뜀"
        );
      }
    } else {
      console.warn(
        "[CREATOR][DATA] 작가 정보를 찾을 수 없음 - creatorId:",
        creatorId
      );
      updateCreatorPreviewUI({
        pen_name: "사용자",
        introduction: "작가 소개글이 없습니다.",
        profile_image_url: null,
      });
    }
  } catch (err) {
    console.error("[CREATOR][MODAL] 작가 정보 로드 예외:", err);
    updateCreatorPreviewUI({
      pen_name: "사용자",
      introduction: "작가 소개글이 없습니다.",
      profile_image_url: null,
    });
  }
}

// 작가 미리보기 UI 업데이트
function updateCreatorPreviewUI(creator) {
  const nameEl = document.getElementById("creator-preview-name");
  const introEl = document.getElementById("creator-preview-intro");
  const avatarEl = document.getElementById("creator-preview-avatar");

  if (nameEl) {
    const displayName = creator.pen_name || "사용자";
    nameEl.textContent = displayName;
    console.debug("[CREATOR][DATA] 작가 이름 업데이트:", displayName);
  } else {
    console.warn(
      "[CREATOR][MODAL] 작가 이름 요소를 찾을 수 없습니다 (id: creator-preview-name)"
    );
  }

  if (introEl) {
    const displayIntro = creator.introduction || "작가 소개글이 없습니다.";
    introEl.textContent = displayIntro;
    console.debug("[CREATOR][DATA] 작가 소개 업데이트:", displayIntro);
  } else {
    console.warn(
      "[CREATOR][MODAL] 작가 소개 요소를 찾을 수 없습니다 (id: creator-preview-intro)"
    );
  }

  if (avatarEl) {
    if (creator.profile_image_url) {
      avatarEl.innerHTML = `<img src="${creator.profile_image_url}" alt="${
        creator.pen_name || "사용자"
      }" />`;
      console.debug(
        "[CREATOR][DATA] 프로필 이미지 업데이트:",
        creator.profile_image_url
      );
    } else {
      console.debug("[CREATOR][DATA] 프로필 이미지 없음 - 기본 아이콘 유지");
    }
  } else {
    console.warn(
      "[CREATOR][MODAL] 프로필 이미지 요소를 찾을 수 없습니다 (id: creator-preview-avatar)"
    );
  }
}

// 팔로우 상태 확인
async function checkFollowStatus(creatorId, userId) {
  // ⚠️ UUID 차단
  if (creatorId && isUUID(creatorId)) {
    console.error(
      "[CREATOR_TRACE][ERROR] checkFollowStatus에 UUID 유입:",
      creatorId
    );
    return;
  }

  if (!window.supabase) {
    console.warn("[FOLLOW] Supabase 클라이언트 없음");
    return;
  }

  if (!userId) {
    console.warn("[FOLLOW] userId 없음");
    return;
  }

  console.debug("[FOLLOW] 팔로우 상태 확인 시작", { creatorId, userId });

  try {
    // creator_follows 테이블의 creator_id는 firebase_uid를 사용해야 함
    const { data, error } = await window.supabase
      .from("creator_follows")
      .select("id")
      .eq("reader_id", userId)
      .eq("creator_id", creatorId)
      .limit(1);

    console.debug("[FOLLOW] creator_follows 조회 결과:", {
      data,
      error,
      dataLength: data?.length || 0,
    });

    const followBtn = document.getElementById("creator-preview-follow-btn");
    if (followBtn) {
      const isFollowing = data && data.length > 0 && !error;
      if (isFollowing) {
        followBtn.textContent = "팔로잉";
        followBtn.classList.add("following");
        console.debug("[FOLLOW] 팔로우 상태: 팔로잉 중");
      } else {
        followBtn.textContent = "팔로우";
        followBtn.classList.remove("following");
        console.debug("[FOLLOW] 팔로우 상태: 팔로우 안 함");
      }
    } else {
      console.warn(
        "[FOLLOW] 팔로우 버튼 요소를 찾을 수 없습니다 (id: creator-preview-follow-btn)"
      );
    }
  } catch (err) {
    console.error("[FOLLOW] 팔로우 상태 확인 실패:", err);
  }
}

// 작가 피드로 이동
window.goToCreatorFeed = function () {
  // ⚠️ UUID 차단
  if (currentCreatorId && isUUID(currentCreatorId)) {
    console.error(
      "[CREATOR_TRACE][ERROR] goToCreatorFeed에 UUID 유입:",
      currentCreatorId
    );
    showToast("작가 정보를 찾을 수 없습니다.");
    return;
  }

  console.debug("[CREATOR][MODAL] 작가 피드 보러가기 클릭", {
    currentCreatorId,
  });
  if (!currentCreatorId) {
    console.warn("[CREATOR][MODAL] currentCreatorId 없음 - 이동 불가");
    return;
  }

  // 작가 마이페이지로 이동 (query string으로 creator_id 전달)
  window.location.href = `mypage_creator.html?creator_id=${currentCreatorId}`;
};

// 작가 팔로우 토글
window.toggleCreatorFollow = async function () {
  // ⚠️ UUID 차단
  if (currentCreatorId && isUUID(currentCreatorId)) {
    console.error(
      "[CREATOR_TRACE][ERROR] toggleCreatorFollow에 UUID 유입:",
      currentCreatorId
    );
    showToast("작가 정보를 찾을 수 없습니다.");
    return;
  }

  console.debug("[FOLLOW][DEBUG] 팔로우 버튼 클릭", {
    currentCreatorId,
    currentCreatorId_type: typeof currentCreatorId,
  });

  if (!currentCreatorId) {
    console.warn("[FOLLOW] currentCreatorId(firebase_uid) 없음");
    showToast("작가 정보를 찾을 수 없습니다.");
    return;
  }

  const firebaseUid = await getCurrentFirebaseUid();
  console.debug("[FOLLOW][DEBUG] 현재 사용자 UID:", firebaseUid);

  if (!firebaseUid) {
    console.warn("[FOLLOW] 로그인하지 않은 사용자");
    showToast("로그인이 필요합니다.");
    return;
  }

  if (!window.supabase) {
    console.debug("[FOLLOW] Supabase 클라이언트 대기 중...");
    waitForSupabase(async () => {
      await window.toggleCreatorFollow();
    });
    return;
  }

  const followBtn = document.getElementById("creator-preview-follow-btn");
  if (!followBtn) {
    console.warn("[FOLLOW] 팔로우 버튼 요소를 찾을 수 없습니다");
    return;
  }

  const isFollowing = followBtn.classList.contains("following");
  console.debug(
    "[FOLLOW][DEBUG] 현재 팔로우 상태:",
    isFollowing ? "팔로잉 중" : "팔로우 안 함"
  );

  try {
    if (isFollowing) {
      // 팔로우 취소
      const deletePayload = {
        reader_id: firebaseUid,
        creator_id: currentCreatorId,
      };
      console.debug("[FOLLOW][DEBUG] DELETE payload:", deletePayload);

      const { error } = await window.supabase
        .from("creator_follows")
        .delete()
        .eq("reader_id", firebaseUid)
        .eq("creator_id", currentCreatorId);

      console.debug("[FOLLOW][DEBUG] DELETE result:", { error });

      if (error) {
        console.error("[FOLLOW] DELETE 실패:", error);
        showToast("팔로우 취소에 실패했습니다.");
        return;
      }

      followBtn.textContent = "팔로우";
      followBtn.classList.remove("following");
      showToast("팔로우를 취소했습니다");
      console.debug("[FOLLOW] DELETE 성공");
    } else {
      // 팔로우 추가
      const insertPayload = {
        reader_id: firebaseUid,
        creator_id: currentCreatorId,
      };
      console.debug("[FOLLOW][DEBUG] INSERT payload:", insertPayload);

      const { error } = await window.supabase
        .from("creator_follows")
        .insert(insertPayload);

      console.debug("[FOLLOW][DEBUG] INSERT result:", { error });

      if (error) {
        console.error("[FOLLOW] INSERT 실패:", error);
        if (error.code === "23505" || error.code === "409") {
          // 이미 팔로우 중인 경우
          followBtn.textContent = "팔로잉";
          followBtn.classList.add("following");
          showToast("이미 팔로우 중입니다.");
        } else {
          showToast("팔로우에 실패했습니다.");
        }
        return;
      }

      followBtn.textContent = "팔로잉";
      followBtn.classList.add("following");
      showToast("팔로우 되었습니다!");
      console.debug("[FOLLOW] INSERT 성공");
    }
  } catch (err) {
    console.error("[FOLLOW] 팔로우 토글 예외:", err);
    showToast("오류가 발생했습니다.");
  }
};

// 작가 미리보기 모달 닫기
window.closeCreatorPreviewModal = function () {
  console.debug("[CREATOR][MODAL] 모달 닫기");
  const modal = document.getElementById("creator-preview-modal");
  if (modal) {
    modal.style.display = "none";
    document.body.style.overflow = "";
  }
  currentCreatorId = null;
};

// 토스트 알림 표시
function showToast(message) {
  // 기존 토스트 제거
  const existingToast = document.querySelector(".toast-notification");
  if (existingToast) {
    existingToast.remove();
  }

  // 토스트 요소 생성
  const toast = document.createElement("div");
  toast.className = "toast-notification";
  toast.textContent = message;
  document.body.appendChild(toast);

  // 애니메이션을 위해 약간의 지연 후 표시
  setTimeout(() => {
    toast.classList.add("show");
  }, 10);

  // 2초 후 제거
  setTimeout(() => {
    toast.classList.remove("show");
    setTimeout(() => {
      if (toast.parentNode) {
        toast.remove();
      }
    }, 300);
  }, 2000);
}

// 모달 배경 클릭 시 닫기
document.addEventListener("DOMContentLoaded", () => {
  // 댓글 모달
  const commentModal = document.getElementById("comment-modal");
  if (commentModal) {
    commentModal.addEventListener("click", (e) => {
      if (e.target === commentModal) {
        window.closeCommentModal();
      }
    });
  }

  // 저장 모달
  const saveModal = document.getElementById("save-modal");
  if (saveModal) {
    saveModal.addEventListener("click", (e) => {
      if (e.target === saveModal) {
        window.closeSaveModal();
      }
    });
  }

  // 신고 모달
  const reportModal = document.getElementById("report-modal");
  if (reportModal) {
    reportModal.addEventListener("click", (e) => {
      if (e.target === reportModal) {
        window.closeReportModal();
      }
    });
  }

  // 댓글 모달 내 하트 아이콘 버튼 클릭 이벤트 (이벤트 위임)
  document.addEventListener("click", (e) => {
    const button = e.target.closest(".comment-action-btn");
    if (button) {
      const icon = button.querySelector(".comment-action-icon");
      if (icon) {
        const path = icon.querySelector("path");
        // 하트 아이콘인지 확인 (path의 d 속성으로 판단)
        if (
          path &&
          path.getAttribute("d") &&
          path.getAttribute("d").includes("15.8434")
        ) {
          e.preventDefault();
          e.stopPropagation();
          // active 클래스 토글
          button.classList.toggle("active");
        }
      }
    }
  });

  // 팔로우 모달
  const followModal = document.getElementById("follow-modal");
  if (followModal) {
    followModal.addEventListener("click", (e) => {
      if (e.target === followModal) {
        window.closeFollowModal();
      }
    });
  }

  // 작가 미리보기 모달 배경 클릭 시 닫기
  const creatorPreviewModal = document.getElementById("creator-preview-modal");
  if (creatorPreviewModal) {
    creatorPreviewModal.addEventListener("click", (e) => {
      if (e.target === creatorPreviewModal) {
        window.closeCreatorPreviewModal();
      }
    });
  }

  // avatar-circle 클릭 이벤트 (작가 미리보기 모달 열기)
  document.addEventListener("click", (e) => {
    const avatarCircle = e.target.closest(".avatar-circle");
    if (!avatarCircle) return;

    // avatar-plus 버튼 클릭은 제외
    if (e.target.closest(".avatar-plus")) return;

    e.preventDefault();
    e.stopPropagation();

    // 작가 정보 가져오기
    const feedItem = avatarCircle.closest(".feed-item");
    if (!feedItem) {
      console.warn("[CREATOR][MODAL] feed-item을 찾을 수 없습니다");
      return;
    }

    const creatorId = feedItem.getAttribute("data-creator-id");

    // 🔍 UUID 추적 로그
    console.log("[CREATOR_TRACE][SOURCE=FEED_CLICK]");
    console.log("creatorId value:", creatorId);
    console.log("creatorId typeof:", typeof creatorId);
    const isUUID =
      creatorId &&
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        creatorId
      );
    console.log("isUUID:", isUUID);
    console.log("isFirebaseUID:", creatorId && !isUUID);

    console.debug("[CREATOR][MODAL] avatar-circle 클릭", { creatorId });

    if (!creatorId) {
      console.warn(
        "[CREATOR][MODAL] data-creator-id 속성이 없습니다 - 모달 열기 불가"
      );
      showToast("작가 정보를 찾을 수 없습니다.");
      return;
    }

    // ⚠️ UUID 차단
    if (isUUID) {
      console.error(
        "[CREATOR_TRACE][ERROR] 피드 클릭에서 UUID 유입:",
        creatorId
      );
      showToast("작가 정보를 찾을 수 없습니다.");
      return;
    }

    // 작가 미리보기 모달 열기 (creatorId는 firebase_uid)
    openCreatorPreviewModal(creatorId);
  });

  // avatar-plus 버튼 클릭 이벤트
  const avatarPlusButtons = document.querySelectorAll(".avatar-plus");
  avatarPlusButtons.forEach((button) => {
    button.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();

      // 팔로우 모달 표시
      openFollowModal();

      // avatar-plus 숨기기
      button.style.display = "none";

      // 부모 요소에 팔로우 완료 상태 표시
      const avatarCircle =
        button.parentElement?.querySelector(".avatar-circle");
      if (avatarCircle) {
        avatarCircle.classList.add("followed");
        // SVG 아이콘 추가
        avatarCircle.innerHTML = `
                    <svg xmlns="http://www.w3.org/2000/svg" width="23" height="23" viewBox="0 0 23 23" fill="none">
                        <path d="M11.498 0C13.0228 0 14.4851 0.605699 15.5632 1.68385C16.6414 2.762 17.2471 4.22429 17.2471 5.74902C17.2471 7.27376 16.6414 8.73605 15.5632 9.8142C14.4851 10.8923 13.0228 11.498 11.498 11.498C9.97331 11.498 8.51102 10.8923 7.43287 9.8142C6.35472 8.73605 5.74902 7.27376 5.74902 5.74902C5.74902 4.22429 6.35472 2.762 7.43287 1.68385C8.51102 0.605699 9.97331 0 11.498 0ZM11.498 22.9961C11.498 22.9961 22.9961 22.9961 22.9961 20.1216C22.9961 16.6722 17.3908 12.9353 11.498 12.9353C5.6053 12.9353 0 16.6722 0 20.1216C0 22.9961 11.498 22.9961 11.498 22.9961Z" fill="#FF5E00"/>
                    </svg>
                `;
      }
    });
  });

  // 메뉴 외부 클릭 시 메뉴 닫기
  document.addEventListener("click", (e) => {
    if (!e.target.closest(".comment-menu-btn-wrapper")) {
      document
        .querySelectorAll(".comment-menu-dropdown.show")
        .forEach((menu) => {
          menu.classList.remove("show");
        });
    }
  });
});
