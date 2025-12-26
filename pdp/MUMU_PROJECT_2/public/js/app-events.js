// =========================
// APP EVENTS - SINGLE CLICK GATEWAY (STEP 2)
// =========================
// 목표: 모든 클릭 이벤트를 단일 관문으로 통합
// 규칙: 기존 함수는 삭제하지 않고 재사용

(function () {
  // App 네임스페이스가 없으면 초기화 대기
  if (!window.App) {
    console.warn("[App.events] App 네임스페이스가 아직 초기화되지 않았습니다. 잠시 후 다시 시도합니다.");
    setTimeout(() => {
      if (window.App) {
        initAppEvents();
      }
    }, 500);
    return;
  }

  initAppEvents();

  function initAppEvents() {
    // App.events 초기화
    window.App.events = window.App.events || {};

    /**
     * 단일 클릭 이벤트 관문
     * 모든 클릭 이벤트는 이 함수를 통해 처리됨
     */
    window.App.events.handleClick = function (e) {
      const target = e.target;

      // 1. 좋아요 버튼 (data-action="like")
      const likeBtn = target.closest('[data-action="like"]');
      if (likeBtn) {
        // feed-stat-interaction.js의 기존 로직 재사용
        if (typeof window.handleFeedLikeAction === "function") {
          window.handleFeedLikeAction(likeBtn);
        }
        return;
      }

      // 2. 댓글 버튼 (data-action="comment")
      const commentBtn = target.closest('[data-action="comment"]');
      if (commentBtn) {
        // feed-stat-interaction.js의 기존 로직 재사용
        if (typeof window.handleFeedCommentAction === "function") {
          window.handleFeedCommentAction(commentBtn);
        }
        return;
      }

      // 3. 댓글 좋아요 버튼 (data-action="comment-like")
      const commentLikeBtn = target.closest('[data-action="comment-like"]');
      if (commentLikeBtn) {
        // feed-stat-interaction.js의 handleCommentLike 함수 재사용
        if (typeof window.handleCommentLike === "function") {
          window.handleCommentLike(commentLikeBtn);
        }
        return;
      }

      // 4. 작가 아바타 클릭 (작가 프로필 모달)
      const avatarCircle = target.closest(".avatar-circle");
      if (avatarCircle && !target.closest(".avatar-plus")) {
        const feedItem = avatarCircle.closest(".feed-item");
        if (feedItem) {
          const creatorId = feedItem.getAttribute("data-creator-id");
          if (creatorId && typeof window.openCreatorPreviewModal === "function") {
            window.openCreatorPreviewModal(creatorId);
            return;
          }
        }
      }

      // 5. 작가 피드로 이동 (data-action="creator")
      const creatorLink = target.closest('[data-action="creator"]');
      if (creatorLink) {
        const creatorUid = creatorLink.getAttribute("data-creator-uid") || 
                          creatorLink.getAttribute("data-creator-id");
        if (creatorUid) {
          // 작가 피드로 이동
          if (typeof window.safeRedirect === "function") {
            window.safeRedirect(`/creator.html?uid=${creatorUid}`);
          } else {
            window.location.href = `/creator.html?uid=${creatorUid}`;
          }
          return;
        }
      }
    };

    // 단일 관문 등록
    // capture phase에서 실행하여 다른 리스너보다 먼저 처리
    document.addEventListener("click", window.App.events.handleClick, true);

    console.log("[App.events] ✅ 단일 클릭 관문 등록 완료");
  }
})();

