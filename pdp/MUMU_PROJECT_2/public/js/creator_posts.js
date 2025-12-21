/**
 * 작가 소식(creator_posts) 관리 기능
 * 
 * - 소식 CRUD
 * - 좋아요
 * - 댓글/대댓글
 */

import { auth } from "./firebase_init.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js";

// 전역 변수
let currentUserId = null;
let editingPostId = null;

// Storage 버킷 이름 상수
const STORAGE_BUCKET = "creator-images";

// Firebase Auth 상태 확인
function initAuth() {
  return new Promise((resolve) => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      unsubscribe();
      currentUserId = user?.uid || null;
      resolve(currentUserId);
    });
  });
}

// Supabase 클라이언트 대기
function waitForSupabase(cb, maxAttempts = 100) {
  let attempts = 0;
  function check() {
    attempts++;
    if (window.supabase) {
      cb(window.supabase);
      return;
    }
    if (attempts >= maxAttempts) {
      console.error("window.supabase를 찾을 수 없습니다.");
      return;
    }
    setTimeout(check, 50);
  }
  check();
}

// 이미지를 WEBP로 변환 (해상도 축소 + 압축)
function convertImageToWebP(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        
        // 해상도 축소 (최대 1200px, 비율 유지)
        const maxWidth = 1200;
        const maxHeight = 1200;
        let width = img.width;
        let height = img.height;
        
        if (width > maxWidth || height > maxHeight) {
          const ratio = Math.min(maxWidth / width, maxHeight / height);
          width = width * ratio;
          height = height * ratio;
        }
        
        canvas.width = width;
        canvas.height = height;
        ctx.drawImage(img, 0, 0, width, height);
        
        // WebP 변환 (quality: 0.6)
        canvas.toBlob(
          (blob) => {
            if (blob) {
              resolve(blob);
            } else {
              reject(new Error("WEBP 변환 실패"));
            }
          },
          "image/webp",
          0.6
        );
      };
      img.onerror = reject;
      img.src = e.target.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// Supabase Storage에 이미지 업로드
async function uploadImageToStorage(creatorId, postId, imageBlob) {
  const filePath = `posts/${creatorId}/${postId}.webp`;
  console.log("[UPLOAD][START] 이미지 업로드 시작", { creatorId, postId, filePath, bucket: STORAGE_BUCKET });
  
  const { data, error } = await window.supabase.storage
    .from(STORAGE_BUCKET)
    .upload(filePath, imageBlob, {
      contentType: "image/webp",
      upsert: true,
    });

  if (error) {
    console.error("[UPLOAD][FAIL] 이미지 업로드 실패:", error);
    alert(`이미지 업로드에 실패했습니다: ${error.message}`);
    throw error;
  }

  console.log("[UPLOAD][SUCCESS] 이미지 업로드 성공", { filePath, data });

  // Public URL 가져오기
  const { data: urlData } = window.supabase.storage
    .from(STORAGE_BUCKET)
    .getPublicUrl(filePath);

  console.log("[UPLOAD][URL] Public URL 생성 완료", { publicUrl: urlData.publicUrl });
  return urlData.publicUrl;
}

// 날짜 포맷팅
function formatDate(dateString) {
  const date = new Date(dateString);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}.${month}.${day}`;
}

// 토스트 알림
function showToast(message) {
  const existingToast = document.querySelector(".toast-notification");
  if (existingToast) {
    existingToast.remove();
  }

  const toast = document.createElement("div");
  toast.className = "toast-notification";
  toast.textContent = message;
  document.body.appendChild(toast);

  setTimeout(() => {
    toast.classList.add("show");
  }, 10);

  setTimeout(() => {
    toast.classList.remove("show");
    setTimeout(() => {
      if (toast.parentNode) {
        toast.remove();
      }
    }, 300);
  }, 2000);
}

// 소식 목록 렌더링
async function renderPosts(creatorFirebaseUid) {
  waitForSupabase(async () => {
    try {
      console.log("[LOAD][POSTS][START] 소식 조회 시작", { creator_id: creatorFirebaseUid });
      
      const { data: posts, error } = await window.supabase
        .from("creator_posts")
        .select("id, creator_id, title, content, has_image, image_url, image_fit, image_scale, like_count, comment_count, created_at, is_deleted, is_published")
        .eq("creator_id", creatorFirebaseUid)
        .eq("is_deleted", false)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("[LOAD][POSTS][FAIL] 소식 조회 실패:", error);
        const newsList = document.getElementById("news-list");
        if (newsList) {
          newsList.innerHTML = '<div style="padding: 20px; text-align: center; color: #999;">아직 작성한 소식이 없습니다</div>';
        }
        return;
      }

      if (!posts || posts.length === 0) {
        console.log("[LOAD][POSTS][EMPTY] 소식이 없습니다");
        const newsList = document.getElementById("news-list");
        if (newsList) {
          newsList.innerHTML = '<div style="padding: 20px; text-align: center; color: #999;">아직 작성한 소식이 없습니다</div>';
        }
        return;
      }

      console.log("[LOAD][POSTS][SUCCESS] 소식 조회 성공", { rowCount: posts.length });

      const newsList = document.getElementById("news-list");
      if (!newsList) {
        console.warn("[LOAD][POSTS][FAIL] news-list 요소 없음");
        return;
      }

      newsList.innerHTML = "";

      for (const post of posts) {
        const postElement = await createPostElement(post);
        newsList.appendChild(postElement);
      }
    } catch (error) {
      console.error("[POSTS][SELECT][ERROR] 소식 렌더링 실패:", error);
      const newsList = document.getElementById("news-list");
      if (newsList) {
        newsList.innerHTML = '<div style="padding: 20px; text-align: center; color: #999;">아직 작성한 소식이 없습니다</div>';
      }
    }
  });
}

// 소식 카드 요소 생성
async function createPostElement(post) {
  const postDiv = document.createElement("div");
  postDiv.className = "news-item";
  postDiv.setAttribute("data-post-id", post.id);

  const isOwner = currentUserId && currentUserId === post.creator_id;

  let imageHtml = "";
  if (post.has_image && post.image_url) {
    const imageFit = post.image_fit || "cover";
    const imageScale = post.image_scale || 1;
    imageHtml = `<div style="width: 100%; height: 200px; overflow: hidden; border-radius: 8px; border: 1px solid #d9d9d9; margin-top: 8px;"><img src="${post.image_url}" alt="소식 이미지" class="news-item-image" style="width: 100%; height: 200px; object-fit: ${imageFit}; transform: scale(${imageScale}); transform-origin: center center;" /></div>`;
  }

  const contentPreview = post.content
    ? post.content.length > 50
      ? post.content.substring(0, 50) + "..."
      : post.content
    : "";

  postDiv.innerHTML = `
    <div class="news-timeline">
      <div class="news-date-circle"></div>
      <div class="news-timeline-line"></div>
    </div>
    <div class="news-content">
      <div class="news-date">${formatDate(post.created_at)}</div>
      <div style="display: flex; justify-content: space-between; align-items: flex-start;">
        <div style="flex: 1;">
          <h3 class="news-item-title">${post.title || ""}</h3>
          <p class="news-item-text">${contentPreview}</p>
          ${imageHtml}
        </div>
        ${isOwner ? `
          <div class="news-item-menu">
            <button class="news-item-menu-btn" onclick="togglePostMenu('${post.id}')">⋮</button>
            <div class="news-item-menu-dropdown" id="menu-${post.id}">
              <button class="news-item-menu-item" onclick="editPost('${post.id}')">수정</button>
              <button class="news-item-menu-item delete" onclick="deletePost('${post.id}')">삭제</button>
            </div>
          </div>
        ` : ""}
      </div>
      <div class="news-item-interactions">
        <button class="news-item-like-btn" id="like-btn-${post.id}" onclick="toggleLike('${post.id}')">
          ♥ <span class="news-item-like-count" id="like-count-${post.id}">0</span>
        </button>
        <button class="news-item-comment-btn" onclick="toggleComments('${post.id}')">
          💬 <span class="news-item-comment-count" id="comment-count-${post.id}">0</span>
        </button>
      </div>
        <div class="news-item-comments" id="comments-${post.id}">
        <div class="news-comment-form">
          <input type="text" class="news-comment-input" id="comment-input-${post.id}" placeholder="댓글을 입력하세요..." />
          <button class="news-comment-submit" onclick="submitComment('${post.id}')">작성</button>
        </div>
        <div class="news-comments-list" id="comments-list-${post.id}"></div>
      </div>
    </div>
  `;

  // 좋아요 수 및 상태 로드
  await loadLikeCount(post.id);
  await loadComments(post.id);

  return postDiv;
}

// 좋아요 수 로드
async function loadLikeCount(postId) {
  waitForSupabase(async () => {
    try {
      const { count, error } = await window.supabase
        .from("likes")
        .select("*", { count: "exact", head: true })
        .eq("target_type", "post")
        .eq("target_id", postId);

      if (error) {
        console.error("좋아요 수 조회 실패:", error);
        return;
      }

      const countEl = document.getElementById(`like-count-${postId}`);
      if (countEl) {
        countEl.textContent = count || 0;
      }

      // 현재 사용자의 좋아요 상태 확인
      if (currentUserId) {
        const { data } = await window.supabase
          .from("likes")
          .select("id")
          .eq("target_type", "post")
          .eq("target_id", postId)
          .eq("user_id", currentUserId)
          .maybeSingle();

        const likeBtn = document.getElementById(`like-btn-${postId}`);
        if (likeBtn) {
          if (data) {
            likeBtn.classList.add("active");
          } else {
            likeBtn.classList.remove("active");
          }
        }
      }
    } catch (error) {
      console.error("좋아요 수 로드 실패:", error);
    }
  });
}

// 좋아요 토글
window.toggleLike = async function (postId) {
  if (!currentUserId) {
    showToast("로그인이 필요합니다.");
    return;
  }

  waitForSupabase(async () => {
    try {
      const { data: existing } = await window.supabase
        .from("likes")
        .select("id")
        .eq("target_type", "post")
        .eq("target_id", postId)
        .eq("user_id", currentUserId)
        .maybeSingle();

      if (existing) {
        // 좋아요 취소
        const { error } = await window.supabase
          .from("likes")
          .delete()
          .eq("id", existing.id);

        if (error) {
          console.error("좋아요 취소 실패:", error);
          return;
        }
      } else {
        // 좋아요 추가
        const { error } = await window.supabase.from("likes").insert({
          target_type: "post",
          target_id: postId,
          user_id: currentUserId,
        });

        if (error) {
          console.error("좋아요 추가 실패:", error);
          return;
        }
      }

      await loadLikeCount(postId);
    } catch (error) {
      console.error("좋아요 토글 실패:", error);
    }
  });
};

// Firestore 참조 가져오기
async function getFirestoreRefs() {
  if (window.firebase?.firestore) {
    const firestore = window.firebase.firestore();
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
  if (window.firebaseDb) {
    try {
      const firestoreModule = await import(
        "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js"
      );
      const { getDoc, doc } = firestoreModule;
      return {
        db: window.firebaseDb,
        getDoc: getDoc,
        doc: doc,
      };
    } catch (err) {
      console.warn("[Firestore] Firebase Firestore 함수 로드 실패:", err);
    }
  }
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
    console.warn("[Firestore] 동적 import 실패:", err.message);
  }
  return null;
}

// 댓글 로드
async function loadComments(postId) {
  waitForSupabase(async () => {
    try {
      const { data: comments, error } = await window.supabase
        .from("comments")
        .select("*")
        .eq("target_type", "post")
        .eq("target_id", postId)
        .eq("is_deleted", false)
        .order("created_at", { ascending: true });

      if (error) {
        console.error("댓글 조회 실패:", error);
        return;
      }

      const commentsList = document.getElementById(`comments-list-${postId}`);
      const commentCount = document.getElementById(`comment-count-${postId}`);
      if (!commentsList || !commentCount) return;

      commentCount.textContent = comments ? comments.length : 0;

      commentsList.innerHTML = "";

      if (comments && comments.length > 0) {
        const commentIds = comments.map(c => c.id);
        
        const { data: replies, error: repliesError } = await window.supabase
          .from("comment_replies")
          .select("*")
          .in("comment_id", commentIds)
          .order("created_at", { ascending: true });

        if (repliesError) {
          console.error("대댓글 조회 실패:", repliesError);
        }

        const repliesMap = {};
        if (replies) {
          replies.forEach(reply => {
            if (!repliesMap[reply.comment_id]) {
              repliesMap[reply.comment_id] = [];
            }
            repliesMap[reply.comment_id].push(reply);
          });
        }

        const userIds = new Set();
        comments.forEach((c) => {
          if (c.user_id) userIds.add(c.user_id);
        });
        if (replies) {
          replies.forEach((r) => {
            if (r.user_id) userIds.add(r.user_id);
          });
        }

        const creatorNameMap = {}; // 작가명 맵 (Supabase creators.pen_name)
        const nicknameMap = {}; // 독자 닉네임 맵 (Firestore users.nickname)
        const displayNameMap = {}; // 최종 표시명 맵

        if (userIds.size > 0) {
          try {
            const userIdsArray = Array.from(userIds);

            // 1. Supabase creators 테이블에서 pen_name 조회 (작가명)
            if (window.supabase) {
              const { data: creators } = await window.supabase
                .from("creators")
                .select("firebase_uid, pen_name")
                .in("firebase_uid", userIdsArray);

              if (creators) {
                creators.forEach((creator) => {
                  if (creator.firebase_uid && creator.pen_name) {
                    creatorNameMap[creator.firebase_uid] = creator.pen_name;
                  }
                });
              }
            }

            // 2. Firestore readers 컬렉션에서 nickname 조회 (독자만)
            // 크리에이터는 이미 Supabase에서 조회했으므로 Firestore 조회 건너뜀
            const readerIds = userIdsArray.filter((uid) => !creatorNameMap[uid]);

            if (readerIds.length > 0) {
              const firestoreRefs = await getFirestoreRefs();
              if (firestoreRefs) {
                const { db, getDoc, doc } = firestoreRefs;
                const userPromises = readerIds.map(async (uid) => {
                  try {
                    // 먼저 readers 컬렉션에서 조회 시도
                    const readerDocRef = doc(db, "readers", uid);
                    const readerDocSnap = await getDoc(readerDocRef);
                    if (readerDocSnap.exists()) {
                      const readerData = readerDocSnap.data();
                      if (readerData.nickname) {
                        nicknameMap[uid] = readerData.nickname;
                        return;
                      }
                    }
                    // readers에 없으면 users 컬렉션도 확인 (fallback)
                    const userDocRef = doc(db, "users", uid);
                    const userDocSnap = await getDoc(userDocRef);
                    if (userDocSnap.exists()) {
                      const userData = userDocSnap.data();
                      if (userData.nickname) {
                        nicknameMap[uid] = userData.nickname;
                      }
                    }
                  } catch (err) {
                    console.warn(`[댓글 렌더링] Firestore readers/${uid} 조회 실패:`, err);
                  }
                });
                await Promise.all(userPromises);
              }
            }

            // 3. 최종 표시명 결정: 작가 → 독자 → 사용자
            userIdsArray.forEach((uid) => {
              let name = "사용자";
              if (creatorNameMap[uid]) {
                name = creatorNameMap[uid]; // 작가 pen_name
              } else if (nicknameMap[uid]) {
                name = nicknameMap[uid]; // 독자 nickname
              }
              displayNameMap[uid] = name;
            });
          } catch (err) {
            console.error("[댓글 렌더링] 표시명 로드 예외:", err);
          }
        }

        for (const comment of comments) {
          const commentReplies = repliesMap[comment.id] || [];
          const commentEl = await createCommentElement(comment, commentReplies, postId, displayNameMap, creatorNameMap);
          commentsList.appendChild(commentEl);
        }
      }
    } catch (error) {
      console.error("댓글 로드 실패:", error);
    }
  });
}

// 댓글 요소 생성
async function createCommentElement(comment, replies, postId, displayNameMap, creatorNameMap) {
  const commentDiv = document.createElement("div");
  commentDiv.className = "news-comment-item";
  commentDiv.setAttribute("data-comment-id", comment.id);

  const isOwner = currentUserId && currentUserId === comment.user_id;
  const isCreator = !!creatorNameMap[comment.user_id];
  const displayName = displayNameMap[comment.user_id] || "사용자";

  let repliesHtml = "";
  if (replies && replies.length > 0) {
    repliesHtml = '<div class="news-comment-replies">';
    for (const reply of replies) {
      const replyEl = await createReplyElement(reply, postId, displayNameMap, creatorNameMap);
      repliesHtml += replyEl.outerHTML;
    }
    repliesHtml += "</div>";
  }

  const replyFormHtml = postId ? `
    <div class="news-comment-reply-form" id="reply-form-${comment.id}" style="display: none; margin-top: 8px;">
      <div class="news-comment-form">
        <input type="text" class="news-comment-input" id="reply-input-${comment.id}" placeholder="답글을 입력하세요..." />
        <button class="news-comment-submit" onclick="submitReply('${postId}', '${comment.id}')">작성</button>
      </div>
    </div>
  ` : "";

  commentDiv.innerHTML = `
    <div class="news-comment-header">
      <span class="news-comment-author">
        ${displayName}
        ${
          isCreator
            ? '<span class="m-creator-badge">M.creator</span>'
            : ""
        }
      </span>
      <span class="news-comment-date">${formatDate(comment.created_at)}</span>
    </div>
    <div class="news-comment-content" id="comment-content-${comment.id}">${comment.content}</div>
    <div class="news-comment-actions">
      <button class="news-comment-like-btn" id="comment-like-btn-${comment.id}" onclick="toggleCommentLike('${comment.id}')">
        좋아요 <span id="comment-like-count-${comment.id}">0</span>
      </button>
      <button class="news-comment-reply-btn" onclick="showReplyForm('${comment.id}')">답글</button>
      ${isOwner ? `
        <button class="news-comment-edit-btn" onclick="editComment('${comment.id}')">수정</button>
        <button class="news-comment-delete-btn" onclick="deleteComment('${comment.id}')">삭제</button>
      ` : ""}
    </div>
    ${replyFormHtml}
    ${repliesHtml}
  `;

  await loadCommentLikeCount(comment.id);

  return commentDiv;
}

// 대댓글 요소 생성
async function createReplyElement(reply, postId, displayNameMap, creatorNameMap) {
  const replyDiv = document.createElement("div");
  replyDiv.className = "news-comment-item";
  replyDiv.setAttribute("data-reply-id", reply.id);

  const isOwner = currentUserId && currentUserId === reply.user_id;
  const isCreator = !!creatorNameMap[reply.user_id];
  const displayName = displayNameMap[reply.user_id] || "사용자";

  replyDiv.innerHTML = `
    <div class="news-comment-header">
      <span class="news-comment-author">${displayName}${
    isCreator ? '<span class="m-creator-badge">M.creator</span>' : ""
  }</span>
      <span class="news-comment-date">${formatDate(reply.created_at)}</span>
    </div>
    <div class="news-comment-content" id="reply-content-${reply.id}">${reply.content}</div>
    <div class="news-comment-actions">
      ${isOwner ? `
        <button class="news-comment-edit-btn" onclick="editReply('${reply.id}')">수정</button>
        <button class="news-comment-delete-btn" onclick="deleteReply('${reply.id}', '${postId}')">삭제</button>
      ` : ""}
    </div>
  `;

  return replyDiv;
}

// 댓글 좋아요 수 로드
// ⚠️ comment_likes 테이블이 없으므로 요청 완전 차단 (404 에러 방지)
async function loadCommentLikeCount(commentId) {
  // comment_likes 조회를 완전히 차단하고 숫자만 0으로 표시
  const countEl = document.getElementById(`comment-like-count-${commentId}`);
  if (countEl) {
    countEl.textContent = 0;
  }
  
  // 좋아요 버튼 상태는 기본값(비활성)으로 유지
  const likeBtn = document.getElementById(`comment-like-btn-${commentId}`);
  if (likeBtn) {
    likeBtn.classList.remove("active");
  }
}

// 댓글 좋아요 토글
// ⚠️ comment_likes 테이블이 없으므로 요청 완전 차단 (404 에러 방지)
window.toggleCommentLike = async function (commentId) {
  // comment_likes 관련 요청을 완전히 차단
  // UI는 그대로 두되 네트워크 요청은 하지 않음
  const likeBtn = document.getElementById(`comment-like-btn-${commentId}`);
  if (likeBtn) {
    likeBtn.classList.toggle("active");
  }
};

// 댓글 작성
window.submitComment = async function (postId) {
  if (!currentUserId) {
    showToast("로그인이 필요합니다.");
    return;
  }

  const input = document.getElementById(`comment-input-${postId}`);
  if (!input) return;

  const content = input.value.trim();
  if (!content) {
    showToast("댓글 내용을 입력하세요.");
    return;
  }

  waitForSupabase(async () => {
    try {
      const { error } = await window.supabase.from("comments").insert({
        target_type: "post",
        target_id: postId,
        user_id: currentUserId,
        content: content,
        is_deleted: false,
      });

      if (error) {
        console.error("댓글 작성 실패:", error);
        showToast("댓글 작성에 실패했습니다.");
        return;
      }

      input.value = "";
      input.placeholder = "댓글을 입력하세요...";
      await loadComments(postId);
      showToast("댓글이 작성되었습니다.");
    } catch (error) {
      console.error("댓글 작성 실패:", error);
      showToast("댓글 작성에 실패했습니다.");
    }
  });
};

// 답글 폼 표시
window.showReplyForm = function (commentId) {
  const replyForm = document.getElementById(`reply-form-${commentId}`);
  if (replyForm) {
    replyForm.style.display = replyForm.style.display === "none" ? "block" : "none";
    if (replyForm.style.display === "block") {
      const input = document.getElementById(`reply-input-${commentId}`);
      if (input) {
        input.focus();
      }
    }
  }
};

// 답글 작성
window.submitReply = async function (postId, commentId) {
  if (!currentUserId) {
    showToast("로그인이 필요합니다.");
    return;
  }

  const input = document.getElementById(`reply-input-${commentId}`);
  if (!input) return;

  const content = input.value.trim();
  if (!content) {
    showToast("답글 내용을 입력하세요.");
    return;
  }

  waitForSupabase(async () => {
    try {
      const { error } = await window.supabase.from("comment_replies").insert({
        comment_id: commentId,
        user_id: currentUserId,
        content: content,
      });

      if (error) {
        console.error("답글 작성 실패:", error);
        showToast("답글 작성에 실패했습니다.");
        return;
      }

      input.value = "";
      const replyForm = document.getElementById(`reply-form-${commentId}`);
      if (replyForm) {
        replyForm.style.display = "none";
      }
      await loadComments(postId);
      showToast("답글이 작성되었습니다.");
    } catch (error) {
      console.error("답글 작성 실패:", error);
      showToast("답글 작성에 실패했습니다.");
    }
  });
};

// 댓글 수정
window.editComment = function (commentId) {
  const contentEl = document.getElementById(`comment-content-${commentId}`);
  if (!contentEl) return;

  const currentContent = contentEl.textContent;
  const input = document.createElement("input");
  input.type = "text";
  input.value = currentContent;
  input.className = "news-comment-input";
  input.style.width = "100%";

  contentEl.innerHTML = "";
  contentEl.appendChild(input);
  input.focus();

  const save = () => {
    const newContent = input.value.trim();
    if (!newContent) {
      showToast("댓글 내용을 입력하세요.");
      return;
    }

    waitForSupabase(async () => {
      try {
        const { error } = await window.supabase
          .from("comments")
          .update({ content: newContent })
          .eq("id", commentId);

        if (error) {
          console.error("댓글 수정 실패:", error);
          showToast("댓글 수정에 실패했습니다.");
          return;
        }

        contentEl.textContent = newContent;
        showToast("댓글이 수정되었습니다.");
      } catch (error) {
        console.error("댓글 수정 실패:", error);
        showToast("댓글 수정에 실패했습니다.");
      }
    });
  };

  input.addEventListener("blur", save);
  input.addEventListener("keypress", (e) => {
    if (e.key === "Enter") {
      save();
    }
  });
};

// 댓글 삭제
window.deleteComment = async function (commentId) {
  waitForSupabase(async () => {
    try {
      const { error } = await window.supabase
        .from("comments")
        .update({ is_deleted: true })
        .eq("id", commentId);

      if (error) {
        console.error("댓글 삭제 실패:", error);
        showToast("댓글 삭제에 실패했습니다.");
        return;
      }

      const commentEl = document.querySelector(`[data-comment-id="${commentId}"]`);
      if (commentEl) {
        const postId = commentEl.closest(".news-item")?.getAttribute("data-post-id");
        if (postId) {
          await loadComments(postId);
        }
      }

      showToast("댓글이 삭제되었습니다.");
    } catch (error) {
      console.error("댓글 삭제 실패:", error);
      showToast("댓글 삭제에 실패했습니다.");
    }
  });
};

// 대댓글 수정
window.editReply = function (replyId) {
  const contentEl = document.getElementById(`reply-content-${replyId}`);
  if (!contentEl) return;

  const currentContent = contentEl.textContent;
  const input = document.createElement("input");
  input.type = "text";
  input.value = currentContent;
  input.className = "news-comment-input";
  input.style.width = "100%";

  contentEl.innerHTML = "";
  contentEl.appendChild(input);
  input.focus();

  const save = () => {
    const newContent = input.value.trim();
    if (!newContent) {
      showToast("답글 내용을 입력하세요.");
      return;
    }

    waitForSupabase(async () => {
      try {
        const { error } = await window.supabase
          .from("comment_replies")
          .update({ content: newContent })
          .eq("id", replyId);

        if (error) {
          console.error("답글 수정 실패:", error);
          showToast("답글 수정에 실패했습니다.");
          return;
        }

        contentEl.textContent = newContent;
        showToast("답글이 수정되었습니다.");
      } catch (error) {
        console.error("답글 수정 실패:", error);
        showToast("답글 수정에 실패했습니다.");
      }
    });
  };

  input.addEventListener("blur", save);
  input.addEventListener("keypress", (e) => {
    if (e.key === "Enter") {
      save();
    }
  });
};

// 대댓글 삭제
window.deleteReply = async function (replyId, postId) {
  waitForSupabase(async () => {
    try {
      const { error } = await window.supabase
        .from("comment_replies")
        .delete()
        .eq("id", replyId);

      if (error) {
        console.error("답글 삭제 실패:", error);
        showToast("답글 삭제에 실패했습니다.");
        return;
      }

      if (postId) {
        await loadComments(postId);
      }

      showToast("답글이 삭제되었습니다.");
    } catch (error) {
      console.error("답글 삭제 실패:", error);
      showToast("답글 삭제에 실패했습니다.");
    }
  });
};

// 댓글 토글
window.toggleComments = function (postId) {
  const commentsEl = document.getElementById(`comments-${postId}`);
  if (commentsEl) {
    commentsEl.classList.toggle("show");
  }
};

// 소식 메뉴 토글
window.togglePostMenu = function (postId) {
  const menu = document.getElementById(`menu-${postId}`);
  if (menu) {
    menu.classList.toggle("show");
  }

  // 다른 메뉴 닫기
  document.querySelectorAll(".news-item-menu-dropdown").forEach((m) => {
    if (m.id !== `menu-${postId}`) {
      m.classList.remove("show");
    }
  });
};

// 소식 수정
window.editPost = function (postId) {
  editingPostId = postId;
  waitForSupabase(async () => {
    try {
      const { data: post, error } = await window.supabase
        .from("creator_posts")
        .select("id, creator_id, title, content, has_image, image_url, image_fit, image_scale, like_count, comment_count, created_at, is_deleted, is_published")
        .eq("id", postId)
        .single();

      if (error || !post) {
        console.error("소식 조회 실패:", error);
        return;
      }

      openPostModal(post);
    } catch (error) {
      console.error("소식 수정 실패:", error);
    }
  });
};

// 소식 삭제
window.deletePost = async function (postId) {
  waitForSupabase(async () => {
    try {
      const { error } = await window.supabase
        .from("creator_posts")
        .update({ is_deleted: true })
        .eq("id", postId);

      if (error) {
        console.error("소식 삭제 실패:", error);
        showToast("소식 삭제에 실패했습니다.");
        return;
      }

      const postEl = document.querySelector(`[data-post-id="${postId}"]`);
      if (postEl) {
        postEl.remove();
      }

      showToast("소식이 삭제되었습니다.");
    } catch (error) {
      console.error("소식 삭제 실패:", error);
      showToast("소식 삭제에 실패했습니다.");
    }
  });
};

// 소식 작성 모달 열기
function openPostModal(post = null) {
  const modal = document.getElementById("news-modal");
  if (!modal) {
    createPostModal();
    return openPostModal(post);
  }

  editingPostId = post ? post.id : null;

  // 이미지 옵션 초기화
  window.currentImageFit = "cover";
  window.currentImageScale = 1;

  const titleInput = document.getElementById("news-modal-title-input");
  const contentInput = document.getElementById("news-modal-content-input");
  const imagePreview = document.getElementById("news-modal-image-preview");
  const imageInput = document.getElementById("news-modal-image-input");

  if (titleInput) titleInput.value = post?.title || "";
  if (contentInput) contentInput.value = post?.content || "";
  const imageContainer = document.getElementById("news-modal-image-container");
  if (imagePreview) {
    if (post?.image_url) {
      if (imageContainer) imageContainer.style.display = "block";
      imagePreview.src = post.image_url;
      imagePreview.classList.add("show");
      const imageOptions = document.getElementById("news-modal-image-options");
      if (imageOptions) imageOptions.style.display = "block";
      
      // 이미지 옵션 복원
      const imageFit = post.image_fit || "cover";
      const imageScale = post.image_scale || 1;
      window.currentImageFit = imageFit;
      window.currentImageScale = imageScale;
      
      const imageFitCover = document.getElementById("image-fit-cover");
      const imageFitContain = document.getElementById("image-fit-contain");
      const imageScaleSlider = document.getElementById("image-scale-slider");
      const imageScaleValue = document.getElementById("image-scale-value");
      
      if (imageFitCover && imageFitContain) {
        if (imageFit === "cover") {
          imageFitCover.style.background = "#FF5E00";
          imageFitCover.style.color = "white";
          imageFitContain.style.background = "#e0e0e0";
          imageFitContain.style.color = "#333";
        } else {
          imageFitContain.style.background = "#FF5E00";
          imageFitContain.style.color = "white";
          imageFitCover.style.background = "#e0e0e0";
          imageFitCover.style.color = "#333";
        }
      }
      
      if (imageScaleSlider) imageScaleSlider.value = imageScale;
      if (imageScaleValue) imageScaleValue.textContent = Math.round(imageScale * 100) + "%";
      
      imagePreview.style.objectFit = imageFit;
      imagePreview.style.transform = `scale(${imageScale})`;
      imagePreview.style.transformOrigin = "center center";
    } else {
      imagePreview.classList.remove("show");
      if (imageContainer) imageContainer.style.display = "none";
      const imageOptions = document.getElementById("news-modal-image-options");
      if (imageOptions) imageOptions.style.display = "none";
    }
  }
  if (imageInput) imageInput.value = "";

  modal.classList.add("show");
}

// 소식 작성 모달 생성
function createPostModal() {
  const modal = document.createElement("div");
  modal.className = "news-modal-overlay";
  modal.id = "news-modal";
  modal.innerHTML = `
    <div class="news-modal">
      <div class="news-modal-header">
        <h3 class="news-modal-title">${editingPostId ? "소식 수정" : "새 소식 작성"}</h3>
        <button class="news-modal-close" onclick="closePostModal()">×</button>
      </div>
      <form class="news-modal-form" id="news-modal-form">
        <input type="text" class="news-modal-input" id="news-modal-title-input" placeholder="제목" required />
        <textarea class="news-modal-textarea" id="news-modal-content-input" placeholder="본문 내용을 입력하세요..." required></textarea>
        <label class="news-modal-image-label">
          이미지 첨부
          <input type="file" class="news-modal-image-input" id="news-modal-image-input" accept="image/*" />
        </label>
        <div id="news-modal-image-container" style="width: 100%; height: 300px; overflow: hidden; border-radius: 4px; border: 1px solid #ddd; margin-top: 8px; display: none;"><img class="news-modal-image-preview" id="news-modal-image-preview" alt="미리보기" style="width: 100%; height: 100%; object-fit: cover; transform-origin: center center;" /></div>
        <div id="news-modal-image-options" style="display: none; margin-top: 16px; padding: 16px; background: #f9f9f9; border-radius: 4px;">
          <div style="margin-bottom: 12px;">
            <label style="display: block; margin-bottom: 8px; font-size: 14px;">이미지 맞춤:</label>
            <div style="display: flex; gap: 8px;">
              <button type="button" id="image-fit-cover" class="image-fit-btn" style="flex: 1; padding: 8px; background: #FF5E00; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 14px;">Cover</button>
              <button type="button" id="image-fit-contain" class="image-fit-btn" style="flex: 1; padding: 8px; background: #e0e0e0; color: #333; border: none; border-radius: 4px; cursor: pointer; font-size: 14px;">Contain</button>
            </div>
          </div>
          <div>
            <label style="display: block; margin-bottom: 8px; font-size: 14px;">크기 조절: <span id="image-scale-value">100%</span></label>
            <input type="range" id="image-scale-slider" min="0.8" max="1.5" step="0.1" value="1" style="width: 100%;">
          </div>
        </div>
        <div class="news-modal-buttons">
          <button type="button" class="news-modal-btn news-modal-btn-secondary" onclick="closePostModal()">취소</button>
          <button type="submit" class="news-modal-btn news-modal-btn-primary">저장</button>
        </div>
      </form>
    </div>
  `;

  document.body.appendChild(modal);

  // 이미지 미리보기 및 제거 기능
  const imageInput = document.getElementById("news-modal-image-input");
  const imageContainer = document.getElementById("news-modal-image-container");
  const imagePreview = document.getElementById("news-modal-image-preview");
  const imageOptions = document.getElementById("news-modal-image-options");
  const imageFitCover = document.getElementById("image-fit-cover");
  const imageFitContain = document.getElementById("image-fit-contain");
  const imageScaleSlider = document.getElementById("image-scale-slider");
  const imageScaleValue = document.getElementById("image-scale-value");

  window.currentImageFit = "cover";
  window.currentImageScale = 1;

  if (imageInput && imagePreview) {
    imageInput.addEventListener("change", (e) => {
      const file = e.target.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
          imagePreview.src = e.target.result;
          if (imageContainer) imageContainer.style.display = "block";
          imagePreview.classList.add("show");
          if (imageOptions) imageOptions.style.display = "block";
          
          // 이미지 스타일 적용
          applyImageOptions();
          
          // 이미지 제거 버튼 추가
          let removeBtn = document.getElementById("news-modal-image-remove");
          if (!removeBtn) {
            removeBtn = document.createElement("button");
            removeBtn.id = "news-modal-image-remove";
            removeBtn.type = "button";
            removeBtn.className = "news-modal-image-remove";
            removeBtn.textContent = "이미지 제거";
            removeBtn.style.cssText = "margin-top: 8px; padding: 8px 16px; background: #f0f0f0; border: 1px solid #ddd; border-radius: 4px; cursor: pointer; font-size: 14px;";
            imagePreview.parentNode.insertBefore(removeBtn, imagePreview.nextSibling);
            
            removeBtn.addEventListener("click", () => {
              imageInput.value = "";
              imagePreview.src = "";
              imagePreview.classList.remove("show");
              if (imageContainer) imageContainer.style.display = "none";
              if (imageOptions) imageOptions.style.display = "none";
              removeBtn.remove();
              window.currentImageFit = "cover";
              window.currentImageScale = 1;
            });
          }
        };
        reader.readAsDataURL(file);
      }
    });
  }

  // 이미지 옵션 적용 함수
  function applyImageOptions() {
    if (!imagePreview) return;
    imagePreview.style.objectFit = window.currentImageFit || "cover";
    imagePreview.style.transform = `scale(${window.currentImageScale || 1})`;
    imagePreview.style.transformOrigin = "center center";
  }

  // Cover/Contain 토글
  if (imageFitCover && imageFitContain) {
    imageFitCover.addEventListener("click", () => {
      window.currentImageFit = "cover";
      imageFitCover.style.background = "#FF5E00";
      imageFitCover.style.color = "white";
      imageFitContain.style.background = "#e0e0e0";
      imageFitContain.style.color = "#333";
      applyImageOptions();
      console.log("[POST_IMAGE][OPTION][CHANGE] fit: cover");
    });

    imageFitContain.addEventListener("click", () => {
      window.currentImageFit = "contain";
      imageFitContain.style.background = "#FF5E00";
      imageFitContain.style.color = "white";
      imageFitCover.style.background = "#e0e0e0";
      imageFitCover.style.color = "#333";
      applyImageOptions();
      console.log("[POST_IMAGE][OPTION][CHANGE] fit: contain");
    });
  }

  // Scale 슬라이더
  if (imageScaleSlider && imageScaleValue) {
    imageScaleSlider.addEventListener("input", (e) => {
      window.currentImageScale = parseFloat(e.target.value);
      imageScaleValue.textContent = Math.round(window.currentImageScale * 100) + "%";
      applyImageOptions();
      console.log("[POST_IMAGE][OPTION][CHANGE] scale:", window.currentImageScale);
    });
  }

  // 폼 제출
  const form = document.getElementById("news-modal-form");
  if (form) {
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      await savePost();
    });
  }
}

// 소식 저장
async function savePost() {
  console.log("[SAVE][START] 소식 저장 시작");
  
  if (!currentUserId) {
    console.error("[SAVE][FAIL] 로그인 필요");
    showToast("로그인이 필요합니다.");
    return;
  }

  const titleInput = document.getElementById("news-modal-title-input");
  const contentInput = document.getElementById("news-modal-content-input");
  const imageInput = document.getElementById("news-modal-image-input");

  if (!titleInput || !contentInput) {
    console.error("[SAVE][FAIL] 입력 필드 없음");
    return;
  }

  const title = titleInput.value.trim();
  const content = contentInput.value.trim();

  if (!title || !content) {
    console.error("[SAVE][FAIL] 제목 또는 본문 없음");
    showToast("제목과 본문을 입력하세요.");
    return;
  }

  waitForSupabase(async () => {
    let imageUrl = null;
    let hasImage = false;

    try {
      // 이미지 파일이 존재할 때만 업로드 로직 실행
      if (imageInput && imageInput.files.length > 0 && imageInput.files[0]) {
        console.log("[SAVE][UPLOAD][START] 이미지 업로드 시작");
        const file = imageInput.files[0];
        const webpBlob = await convertImageToWebP(file);
        const postId = editingPostId || crypto.randomUUID();
        
        try {
          imageUrl = await uploadImageToStorage(currentUserId, postId, webpBlob);
          hasImage = true;
          console.log("[SAVE][UPLOAD][SUCCESS] 이미지 업로드 성공", { imageUrl });
        } catch (uploadError) {
          console.error("[SAVE][UPLOAD][FAIL] 이미지 업로드 실패 - 저장 중단", uploadError);
          alert("이미지 업로드에 실패했습니다. 저장이 취소되었습니다.");
          return; // 이미지 업로드 실패 시 즉시 중단 (DB INSERT 실행 안 함)
        }
      } else if (editingPostId) {
        // 수정 시 기존 이미지 유지
        const { data: existing } = await window.supabase
          .from("creator_posts")
          .select("image_url, has_image, image_fit, image_scale")
          .eq("id", editingPostId)
          .single();

        if (existing) {
          imageUrl = existing.image_url;
          hasImage = existing.has_image;
          if (existing.image_fit) {
            window.currentImageFit = existing.image_fit;
          }
          if (existing.image_scale) {
            window.currentImageScale = existing.image_scale;
          }
        }
      } else {
        // 글만 작성하는 경우
        hasImage = false;
        imageUrl = null;
      }

      if (editingPostId) {
        // 수정
        console.log("[SAVE][UPDATE][START] 소식 수정 시작", { postId: editingPostId });
        const updatePayload = {
          title,
          content,
          image_url: imageUrl,
          has_image: hasImage,
        };
        
        if (hasImage) {
          updatePayload.image_fit = window.currentImageFit || "cover";
          updatePayload.image_scale = window.currentImageScale || 1;
        }

        const { data: updateData, error } = await window.supabase
          .from("creator_posts")
          .update(updatePayload)
          .eq("id", editingPostId)
          .select()
          .single();

        if (error) {
          console.error("[SAVE][UPDATE][FAIL] 소식 수정 실패:", error);
          alert("소식 수정에 실패했습니다.");
          return; // 에러 시 UI 갱신하지 않음, 모달 닫지 않음
        }

        if (!updateData) {
          console.error("[SAVE][UPDATE][FAIL] 소식 수정 결과 없음");
          alert("소식 수정에 실패했습니다.");
          return; // 에러 시 UI 갱신하지 않음, 모달 닫지 않음
        }

        console.log("[SAVE][UPDATE][SUCCESS] 소식 수정 성공", { data: updateData });
        showToast("소식이 수정되었습니다.");
        closePostModal();
        if (window.currentCreatorFirebaseUid) {
          await renderPosts(window.currentCreatorFirebaseUid);
        }
      } else {
        // 작성
        console.log("[SAVE][INSERT][START] 소식 작성 시작", { creator_id: currentUserId, title, hasImage });
        
        const insertPayload = {
          creator_id: currentUserId,
          title,
          content,
          image_url: imageUrl,
          has_image: hasImage,
          is_deleted: false,
        };
        
        if (hasImage) {
          insertPayload.image_fit = window.currentImageFit || "cover";
          insertPayload.image_scale = window.currentImageScale || 1;
        }

        const { data: insertData, error } = await window.supabase
          .from("creator_posts")
          .insert(insertPayload)
          .select()
          .single();

        if (error) {
          console.error("[SAVE][INSERT][FAIL] 소식 작성 실패:", error);
          alert("소식 작성에 실패했습니다.");
          return; // 에러 시 UI 갱신하지 않음, 모달 닫지 않음
        }

        if (!insertData) {
          console.error("[SAVE][INSERT][FAIL] 소식 작성 결과 없음 - DB에 row가 생성되지 않았습니다");
          alert("소식 작성에 실패했습니다.");
          return; // 에러 시 UI 갱신하지 않음, 모달 닫지 않음
        }

        console.log("[SAVE][INSERT][SUCCESS] 소식 작성 성공 - DB에 row 생성됨", { data: insertData, rowId: insertData.id });
        showToast("소식이 작성되었습니다.");
        closePostModal();
        if (window.currentCreatorFirebaseUid) {
          await renderPosts(window.currentCreatorFirebaseUid);
        }
      }
    } catch (error) {
      console.error("[SAVE][ERROR] 소식 저장 중 예외 발생:", error);
      alert("소식 저장에 실패했습니다.");
      // catch 블록에서는 UI 갱신하지 않음, 모달 닫지 않음
      return;
    }
  });
}

// 소식 작성 모달 닫기
window.closePostModal = function () {
  const modal = document.getElementById("news-modal");
  if (modal) {
    modal.classList.remove("show");
    editingPostId = null;
    // 이미지 옵션 초기화
    window.currentImageFit = "cover";
    window.currentImageScale = 1;
    const imageOptions = document.getElementById("news-modal-image-options");
    if (imageOptions) imageOptions.style.display = "none";
  }
};

// 초기화
document.addEventListener("DOMContentLoaded", async () => {
  await initAuth();

  // 소식 작성 버튼 이벤트
  const createBtn = document.getElementById("news-create-btn");
  if (createBtn) {
    console.log("[INIT] 새 소식 작성 버튼 이벤트 바인딩 완료");
    createBtn.addEventListener("click", () => {
      if (!currentUserId) {
        showToast("로그인이 필요합니다.");
        return;
      }
      console.log("[UI] 새 소식 작성 버튼 클릭");
      editingPostId = null;
      openPostModal();
    });
  } else {
    console.warn("[INIT] news-create-btn 요소를 찾을 수 없습니다");
  }

  // 모달 외부 클릭 시 닫기
  document.addEventListener("click", (e) => {
    const modal = document.getElementById("news-modal");
    if (modal && e.target === modal) {
      closePostModal();
    }
  });
});

// 전역 함수로 노출
window.loadCreatorPosts = async function(creatorFirebaseUid) {
  await renderPosts(creatorFirebaseUid);
};

