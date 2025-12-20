// Firebase UID 가져오기
async function getCurrentFirebaseUid() {
  try {
    if (typeof window.getCurrentFirebaseUser === "function") {
      const user = await window.getCurrentFirebaseUser();
      return user?.uid || null;
    }
    const { auth } = await import("/js/firebase_init.js");
    const { onAuthStateChanged } = await import(
      "https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js"
    );
    return new Promise((resolve) => {
      const unsubscribe = onAuthStateChanged(auth, (user) => {
        unsubscribe();
        resolve(user?.uid || null);
      });
    });
  } catch (error) {
    console.error("Firebase UID 가져오기 실패:", error);
    return null;
  }
}

// Supabase client 대기
function waitForSupabase(cb, maxAttempts = 100) {
  let attempts = 0;
  function check() {
    attempts++;
    if (window.supabase) {
      cb(window.supabase);
      return;
    }
    if (attempts >= maxAttempts) {
      console.warn("window.supabase를 찾을 수 없습니다.");
      return;
    }
    setTimeout(check, 50);
  }
  check();
}

// UUID 판별 함수
function isUUID(str) {
  if (!str || typeof str !== "string") return false;
  // UUID v4 형식: xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str);
}

document.addEventListener("DOMContentLoaded", async () => {
  console.debug("[CREATOR][PAGE] 페이지 로드 시작");

  // URL에서 creator_id 가져오기 (firebase_uid)
  const urlParams = new URLSearchParams(window.location.search);
  const creatorId = urlParams.get("creator_id");

  // 🔍 UUID 추적 로그
  console.log("[CREATOR_TRACE][SOURCE=URL_PARAM]");
  console.log("creatorId value:", creatorId);
  console.log("creatorId typeof:", typeof creatorId);
  console.log("isUUID:", isUUID(creatorId));
  console.log("isFirebaseUID:", creatorId && !isUUID(creatorId));

  // ⚠️ UUID 차단 로직
  if (creatorId && isUUID(creatorId)) {
    console.error(
      "[CREATOR_TRACE][ERROR] UUID가 URL 파라미터로 유입됨:",
      creatorId
    );
    const nameEl = document.querySelector(".profile-name");
    const introEl = document.querySelector(".profile-intro");
    if (nameEl) nameEl.textContent = "잘못된 작가 경로";
    if (introEl)
      introEl.textContent =
        "작가 정보를 찾을 수 없습니다. 올바른 경로로 접근해주세요.";
    return;
  }

  console.debug(
    "[CREATOR][DEBUG] URL 파라미터 creator_id(firebase_uid):",
    creatorId
  );

  // 로그인한 사용자 확인
  const currentUserId = await getCurrentFirebaseUid();
  console.debug("[CREATOR][DEBUG] 현재 사용자 UID:", currentUserId);

  const targetCreatorId = creatorId || currentUserId;
  console.debug(
    "[CREATOR][DEBUG] 대상 작가 UID(firebase_uid):",
    targetCreatorId
  );

  if (!targetCreatorId) {
    console.warn("[CREATOR][PAGE] 작가 UID가 없습니다 - 페이지 로드 불가");
    return;
  }

  // ⚠️ targetCreatorId도 UUID 체크
  if (isUUID(targetCreatorId)) {
    console.error(
      "[CREATOR_TRACE][ERROR] targetCreatorId가 UUID임:",
      targetCreatorId
    );
    const nameEl = document.querySelector(".profile-name");
    const introEl = document.querySelector(".profile-intro");
    if (nameEl) nameEl.textContent = "잘못된 작가 경로";
    if (introEl) introEl.textContent = "작가 정보를 찾을 수 없습니다.";
    return;
  }

  // 작가 정보 로드
  await loadCreatorProfile(targetCreatorId);

  // 작품 목록 로드
  await loadWorksList(targetCreatorId);

  // 팔로우/팔로워 숫자 로드
  await loadFollowStats(targetCreatorId);

  // work-card 클릭 이벤트 (이벤트 위임)
  document.addEventListener("click", (e) => {
    const workCard = e.target.closest(".work-card");
    if (!workCard) return;

    e.preventDefault();
    e.stopPropagation();

    const workId = workCard.getAttribute("data-work-id");
    if (workId) {
      window.location.href = `creator_work_detail.html?work_id=${workId}`;
    } else {
      window.location.href = "creator_work_detail.html";
    }
  });

  // profile-follow-btn 클릭 이벤트
  const followBtn = document.querySelector(".profile-follow-btn");
  if (followBtn) {
    // 본인 페이지면 팔로우 버튼 숨기기
    if (!creatorId || creatorId === currentUserId) {
      console.log("[CREATOR][PAGE] 본인 페이지 - 팔로우 버튼 숨김");
      followBtn.style.display = "none";
    } else {
      console.debug(
        "[CREATOR][PAGE] 팔로우 버튼 이벤트 연결 - creatorId:",
        creatorId,
        "currentUserId:",
        currentUserId
      );
      followBtn.addEventListener("click", async (e) => {
        e.preventDefault();
        e.stopPropagation();
        console.debug("[FOLLOW] 팔로우 버튼 클릭", {
          creatorId,
          currentUserId,
        });
        await toggleFollow(creatorId, currentUserId, followBtn);
      });

      // 팔로우 상태 확인
      if (currentUserId) {
        await checkFollowStatus(creatorId, currentUserId, followBtn);
      } else {
        console.warn(
          "[CREATOR][PAGE] 로그인하지 않은 사용자 - 팔로우 상태 확인 건너뜀"
        );
      }
    }
  } else {
    console.warn("[CREATOR][PAGE] 팔로우 버튼 요소를 찾을 수 없습니다");
  }

  // works-more-btn 클릭 이벤트
  const worksMoreBtn = document.querySelector(".works-more-btn");
  if (worksMoreBtn) {
    worksMoreBtn.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      const targetCreatorId = creatorId || currentUserId;
      if (targetCreatorId) {
        window.location.href = `creator_works_list.html?creator_id=${targetCreatorId}`;
      } else {
        window.location.href = "creator_works_list.html";
      }
    });
  }
});

// 작가 프로필 로드
async function loadCreatorProfile(creatorId) {
  if (!creatorId) {
    console.warn("[CREATOR][PAGE] creatorId 없음");
    return;
  }

  // ⚠️ UUID 차단
  if (isUUID(creatorId)) {
    console.error(
      "[CREATOR_TRACE][ERROR] loadCreatorProfile에 UUID 유입:",
      creatorId
    );
    const nameEl = document.querySelector(".profile-name");
    const introEl = document.querySelector(".profile-intro");
    if (nameEl) nameEl.textContent = "잘못된 작가 경로";
    if (introEl) introEl.textContent = "작가 정보를 찾을 수 없습니다.";
    return;
  }

  console.debug(
    "[CREATOR][DATA] 작가 프로필 로드 시작 - creatorId:",
    creatorId
  );

  waitForSupabase(async () => {
    try {
      console.debug("[CREATOR][DEBUG] creatorId(firebase_uid):", creatorId);
      console.debug("[CREATOR][DATA] creators 조회 쿼리 실행 전");

      // 🔍 추적 로그
      console.log("[CREATOR_TRACE][SOURCE=PROFILE_LOAD]");
      console.log("creatorId value:", creatorId);
      console.log("creatorId typeof:", typeof creatorId);
      console.log("isUUID:", isUUID(creatorId));
      console.log("isFirebaseUID:", !isUUID(creatorId));

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

      const creator = creators && creators.length > 0 ? creators[0] : null;

      if (error) {
        console.error("[CREATOR][PAGE] 작가 프로필 로드 실패:", error);
        // 기본값 표시
        const nameEl = document.querySelector(".profile-name");
        const introEl = document.querySelector(".profile-intro");
        if (nameEl) nameEl.textContent = "사용자";
        if (introEl) introEl.textContent = "작가 소개글이 없습니다.";
        return;
      }

      if (creator) {
        console.debug("[CREATOR][DATA] 작가 정보 발견:", creator);
        const nameEl = document.querySelector(".profile-name");
        const introEl = document.querySelector(".profile-intro");

        if (nameEl) {
          const displayName = creator.pen_name || "사용자";
          nameEl.textContent = displayName;
          console.debug("[CREATOR][DATA] 작가 이름 업데이트:", displayName);
        }

        if (introEl) {
          const displayIntro =
            creator.introduction || "작가 소개글이 없습니다.";
          introEl.textContent = displayIntro;
          console.debug("[CREATOR][DATA] 작가 소개 업데이트:", displayIntro);
        }
      } else {
        console.warn(
          "[CREATOR][DATA] 작가 정보를 찾을 수 없음 - creatorId:",
          creatorId
        );
        const nameEl = document.querySelector(".profile-name");
        const introEl = document.querySelector(".profile-intro");
        if (nameEl) nameEl.textContent = "사용자";
        if (introEl) introEl.textContent = "작가 소개글이 없습니다.";
      }
    } catch (err) {
      console.error("[CREATOR][PAGE] 작가 프로필 로드 예외:", err);
      const nameEl = document.querySelector(".profile-name");
      const introEl = document.querySelector(".profile-intro");
      if (nameEl) nameEl.textContent = "사용자";
      if (introEl) introEl.textContent = "작가 소개글이 없습니다.";
    }
  });
}

// 작품 목록 로드
async function loadWorksList(creatorId) {
  if (!creatorId) return;

  // ⚠️ UUID 차단
  if (isUUID(creatorId)) {
    console.error(
      "[CREATOR_TRACE][ERROR] loadWorksList에 UUID 유입:",
      creatorId
    );
    return;
  }

  waitForSupabase(async () => {
    try {
      // creatorId는 firebase_uid이므로, 먼저 creators 테이블에서 id (UUID)를 가져와야 함
      const { data: creator, error: creatorError } = await window.supabase
        .from("creators")
        .select("id")
        .eq("firebase_uid", creatorId)
        .limit(1)
        .single();

      if (creatorError || !creator) {
        console.error("[CREATOR][DATA] 작가 UUID 조회 실패:", creatorError);
        return;
      }

      const creatorUuid = creator.id;

      // works 테이블은 creator_id (UUID)로 조회
      const { data: works, error } = await window.supabase
        .from("works")
        .select("id, title, thumbnail_url, created_at")
        .eq("creator_id", creatorUuid)
        .order("created_at", { ascending: false })
        .limit(3);

      if (error) {
        console.error("작품 목록 로드 실패:", error);
        return;
      }

      const worksScroll = document.querySelector(".works-scroll");
      if (!worksScroll) return;

      // 기존 카드 제거
      worksScroll.innerHTML = "";

      if (!works || works.length === 0) {
        // 작품이 없을 때
        return;
      }

      // 작품 카드 생성
      works.forEach((work) => {
        const workCard = document.createElement("div");
        workCard.className = "work-card";
        workCard.setAttribute("data-work-id", work.id);

        const thumbnailUrl = work.thumbnail_url || "";
        workCard.style.backgroundImage = thumbnailUrl
          ? `url(${thumbnailUrl})`
          : "none";
        workCard.style.backgroundSize = "cover";
        workCard.style.backgroundPosition = "center";

        workCard.innerHTML = `
          <div class="work-card-arrow">
            <svg xmlns="http://www.w3.org/2000/svg" width="21" height="15" viewBox="0 0 21 15" fill="none">
              <path d="M1 6.36328C0.447715 6.36328 0 6.811 0 7.36328C0 7.91557 0.447715 8.36328 1 8.36328V7.36328V6.36328ZM20.421 8.07039C20.8115 7.67986 20.8115 7.0467 20.421 6.65617L14.057 0.292213C13.6665 -0.0983109 13.0333 -0.0983109 12.6428 0.292213C12.2523 0.682738 12.2523 1.3159 12.6428 1.70643L18.2997 7.36328L12.6428 13.0201C12.2523 13.4107 12.2523 14.0438 12.6428 14.4343C13.0333 14.8249 13.6665 14.8249 14.057 14.4343L20.421 8.07039ZM1 7.36328V8.36328H19.7139V7.36328V6.36328H1V7.36328Z" fill="#FF5E00"/>
            </svg>
          </div>
        `;

        worksScroll.appendChild(workCard);
      });
    } catch (err) {
      console.error("작품 목록 로드 예외:", err);
    }
  });
}

// 팔로우 토글
async function toggleFollow(creatorId, userId, followBtn) {
  // ⚠️ UUID 차단
  if (creatorId && isUUID(creatorId)) {
    console.error(
      "[CREATOR_TRACE][ERROR] toggleFollow에 UUID 유입:",
      creatorId
    );
    showToast("작가 정보를 찾을 수 없습니다.");
    return;
  }

  console.debug("[FOLLOW][DEBUG] 팔로우 토글 시작", {
    creatorId: creatorId,
    userId: userId,
    creatorId_type: typeof creatorId,
    userId_type: typeof userId,
  });

  if (!window.supabase || !userId) {
    console.warn("[FOLLOW] Supabase 클라이언트 없음 또는 userId 없음");
    showToast("로그인이 필요합니다.");
    return;
  }

  if (!creatorId) {
    console.warn("[FOLLOW] creatorId 없음");
    showToast("작가 정보를 찾을 수 없습니다.");
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
        reader_id: userId,
        creator_id: creatorId,
      };
      console.debug("[FOLLOW][DEBUG] DELETE payload:", deletePayload);

      const { error } = await window.supabase
        .from("creator_follows")
        .delete()
        .eq("reader_id", userId)
        .eq("creator_id", creatorId);

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

      // 팔로워 숫자 업데이트
      await updateFollowStats(creatorId);
    } else {
      // 팔로우 추가
      const insertPayload = {
        reader_id: userId,
        creator_id: creatorId,
      };
      console.debug("[FOLLOW][DEBUG] INSERT payload:", insertPayload);

      const { error } = await window.supabase
        .from("creator_follows")
        .insert(insertPayload);

      console.debug("[FOLLOW][DEBUG] INSERT result:", { error });

      if (error) {
        console.error("[FOLLOW] INSERT 실패:", error);
        if (error.code === "23505" || error.code === "409") {
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

      // 팔로워 숫자 업데이트
      await updateFollowStats(creatorId);
    }
  } catch (err) {
    console.error("[FOLLOW] 팔로우 토글 예외:", err);
    showToast("오류가 발생했습니다.");
  }
}

// 팔로우 상태 확인
async function checkFollowStatus(creatorId, userId, followBtn) {
  // ⚠️ UUID 차단
  if (creatorId && isUUID(creatorId)) {
    console.error(
      "[CREATOR_TRACE][ERROR] checkFollowStatus에 UUID 유입:",
      creatorId
    );
    return;
  }

  if (!window.supabase || !userId) {
    console.warn("[FOLLOW] Supabase 클라이언트 없음 또는 userId 없음");
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

    if (error && error.code !== "PGRST116") {
      console.error("[FOLLOW] 팔로우 상태 확인 실패:", error);
      return;
    }

    const isFollowing = data && data.length > 0;

    if (isFollowing) {
      followBtn.textContent = "팔로잉";
      followBtn.classList.add("following");
      console.debug("[FOLLOW] 팔로우 상태: 팔로잉 중");
    } else {
      followBtn.textContent = "팔로우";
      followBtn.classList.remove("following");
      console.debug("[FOLLOW] 팔로우 상태: 팔로우 안 함");
    }
  } catch (err) {
    console.error("[FOLLOW] 팔로우 상태 확인 예외:", err);
  }
}

// 팔로우/팔로워 통계 로드
async function loadFollowStats(creatorId) {
  if (!creatorId) {
    console.warn("[CREATOR][DATA] creatorId 없음 - 통계 로드 건너뜀");
    return;
  }

  // ⚠️ UUID 차단
  if (isUUID(creatorId)) {
    console.error(
      "[CREATOR_TRACE][ERROR] loadFollowStats에 UUID 유입:",
      creatorId
    );
    return;
  }

  console.debug("[CREATOR][DATA] 팔로우 통계 로드 시작", { creatorId });

  waitForSupabase(async () => {
    try {
      await updateFollowStats(creatorId);
    } catch (err) {
      console.error("[CREATOR][DATA] 팔로우 통계 로드 실패:", err);
    }
  });
}

// 팔로우/팔로워 통계 업데이트
async function updateFollowStats(creatorId) {
  if (!window.supabase || !creatorId) {
    console.warn(
      "[CREATOR][DATA] Supabase 클라이언트 없음 또는 creatorId 없음"
    );
    return;
  }

  console.debug("[CREATOR][DATA] 팔로우 통계 업데이트 시작", { creatorId });

  try {
    // 팔로워 수 조회 (creator_follows where creator_id = creatorId)
    console.debug("[CREATOR][DATA] 팔로워 수 조회 쿼리 실행 전");
    const { count: followerCount, error: followerError } = await window.supabase
      .from("creator_follows")
      .select("*", { count: "exact", head: true })
      .eq("creator_id", creatorId);

    console.debug("[CREATOR][DATA] 팔로워 수 조회 결과:", {
      count: followerCount,
      error: followerError,
    });

    if (followerError) {
      console.error("[CREATOR][DATA] 팔로워 수 조회 실패:", followerError);
    }

    // 작가가 팔로우하는 작가 수 조회 (creator_follows where reader_id = creatorId)
    console.debug("[CREATOR][DATA] 팔로우 수 조회 쿼리 실행 전");
    const { count: followingCount, error: followingError } =
      await window.supabase
        .from("creator_follows")
        .select("*", { count: "exact", head: true })
        .eq("reader_id", creatorId);

    console.debug("[CREATOR][DATA] 팔로우 수 조회 결과:", {
      count: followingCount,
      error: followingError,
    });

    if (followingError) {
      console.error("[CREATOR][DATA] 팔로우 수 조회 실패:", followingError);
    }

    // UI 업데이트
    const statItems = document.querySelectorAll(".profile-stat-item");
    console.debug("[CREATOR][DATA] 통계 항목 개수:", statItems.length);

    if (statItems.length >= 3) {
      // 첫 번째: 무드보드 (숨김 처리)
      const moodboardItem = statItems[0];
      if (moodboardItem) {
        moodboardItem.style.display = "none";
        console.debug("[CREATOR][DATA] 무드보드 항목 숨김");
      }

      // 두 번째: 팔로우 (작가가 팔로우하는 작가 수)
      const followingNumEl = statItems[1]?.querySelector(".profile-stat-num");
      if (followingNumEl) {
        followingNumEl.textContent = followingCount || 0;
        console.debug(
          "[CREATOR][DATA] 팔로우 수 업데이트:",
          followingCount || 0
        );
      }

      // 세 번째: 팔로워
      const followerNumEl = statItems[2]?.querySelector(".profile-stat-num");
      if (followerNumEl) {
        followerNumEl.textContent = followerCount || 0;
        console.debug(
          "[CREATOR][DATA] 팔로워 수 업데이트:",
          followerCount || 0
        );
      }
    } else {
      console.warn(
        "[CREATOR][DATA] 통계 항목이 3개 미만입니다:",
        statItems.length
      );
    }
  } catch (err) {
    console.error("[CREATOR][DATA] 팔로우 통계 업데이트 실패:", err);
  }
}

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
