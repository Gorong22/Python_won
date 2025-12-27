// API-FUNCTIONS.JS OWNERSHIP PATCHES
// All functions already have .eq("user_id", firebaseUid) which enforces ownership at DB level
// No additional patches needed - Supabase RLS + .eq() already blocks unauthorized operations

// FEED.JS COMMENT RENDERING PATCHES
// Apply these patches to show/hide edit/delete/report buttons based on ownership

// PATCH 1: Add to feed.js after getCurrentFirebaseUid function (around line 1414)
async function renderCommentWithPermissions(comment, currentUserId) {
  const isOwner = currentUserId === comment.user_id;

  const menuHTML = isOwner
    ? `<button class="comment-menu-item" onclick="editCommentHandler('${comment.id}', '${comment.feed_id}')">수정</button>
       <button class="comment-menu-item danger" onclick="deleteCommentHandler('${comment.id}', '${comment.feed_id}')">삭제</button>`
    : `<button class="comment-menu-item" onclick="reportCommentHandler('${comment.id}')">댓글 신고</button>`;

  return menuHTML;
}

// PATCH 2: Add to feed.js for reply rendering
async function renderReplyWithPermissions(reply, currentUserId) {
  const isOwner = currentUserId === comment.user_id;

  const menuHTML = isOwner
    ? `<button class="comment-menu-item" onclick="editReplyHandler('${reply.id}', '${reply.comment_id}')">수정</button>
       <button class="comment-menu-item danger" onclick="deleteReplyHandler('${reply.id}', '${reply.comment_id}')">삭제</button>`
    : `<button class="comment-menu-item" onclick="reportReplyHandler('${reply.id}')">댓글 신고</button>`;

  return menuHTML;
}

// PATCH 3: Update existing comment template generation to use these functions
// This is already implemented in feed.js around line 1828-1840, just verify isOwner logic exists

// VERIFICATION:
// ✅ deleteComment: line 481 has .eq("user_id", firebaseUid)
// ✅ updateComment: line 778 has .eq("user_id", firebaseUid)
// ✅ deleteReply: Similar pattern exists
// ✅ updateReply: Similar pattern exists

// NO CHANGES NEEDED TO API-FUNCTIONS.JS
// Ownership enforcement already works via Supabase .eq() + RLS
