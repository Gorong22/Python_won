/* ============================
   CREATOR PROFILE MODAL
============================ */

window.openCreatorPreviewModal = async function (creatorId) {
  console.log("[CREATOR MODAL] Opening for creatorId:", creatorId);

  if (!creatorId) {
    console.error("[CREATOR MODAL] Invalid creatorId");
    return;
  }

  const modal = document.getElementById("creator-preview-modal");
  if (!modal) {
    console.error("[CREATOR MODAL] Modal element not found");
    return;
  }

  // 모달 표시 및 creatorId 저장
  modal.style.display = "flex";
  modal.dataset.creatorId = creatorId;

  // Supabase에서 작가 정보 가져오기
  try {
    const supabase = await loadSupabaseClient();
    if (!supabase) {
      console.error("[CREATOR MODAL] Supabase not available");
      return;
    }

    const { data: creator, error } = await supabase
      .from("creators")
      .select("firebase_uid, pen_name, profile_image_url, introduction")
      .eq("firebase_uid", creatorId)
      .single();

    if (error || !creator) {
      console.error("[CREATOR MODAL] Failed to load creator:", error);
      alert("작가 정보를 불러올 수 없습니다.");
      modal.style.display = "none";
      return;
    }

    // 모달 콘텐츠 업데이트
    const nameEl = modal.querySelector("#creator-preview-name");
    const introEl = modal.querySelector("#creator-preview-intro");
    const avatarEl = modal.querySelector("#creator-preview-avatar");

    if (nameEl) nameEl.textContent = creator.pen_name || "작가";
    if (introEl)
      introEl.textContent = creator.introduction || "작가 소개글이 없습니다.";

    if (avatarEl) {
      if (creator.profile_image_url) {
        avatarEl.innerHTML = `<img src="${creator.profile_image_url}" alt="프로필" style="width: 100%; height: 100%; object-fit: cover; border-radius: 50%;">`;
      } else {
        // MU-MU Orange Styled Placeholder
        avatarEl.innerHTML = `
          <svg xmlns="http://www.w3.org/2000/svg" width="80" height="80" viewBox="0 0 80 80" fill="none">
            <circle cx="40" cy="40" r="40" fill="#FFF2EB" />
            <path d="M40 20C45.5228 20 50 24.4772 50 30C50 35.5228 45.5228 40 40 40C34.4772 40 30 35.5228 30 30C30 24.4772 34.4772 20 40 20ZM40 45C48.2843 45 55 51.7157 55 60H25C25 51.7157 31.7157 45 40 45Z" fill="#FF5E00" />
          </svg>
        `;
      }
    }

    // 팔로우 버튼 상태 확인
    await updateFollowButtonState(creatorId);
  } catch (err) {
    console.error("[CREATOR MODAL] Error:", err);
    alert("작가 정보를 불러오는 중 오류가 발생했습니다.");
    modal.style.display = "none";
  }
};

// 팔로우 버튼 상태 업데이트
async function updateFollowButtonState(creatorId) {
  try {
    const uid = await getCurrentFirebaseUid();
    if (!uid) return;

    const supabase = await loadSupabaseClient();
    if (!supabase) return;

    const { data } = await supabase
      .from("follows")
      .select("id")
      .eq("follower_id", uid)
      .eq("following_id", creatorId)
      .maybeSingle();

    const isFollowing = !!data;
    const followBtn = document.getElementById("creator-preview-follow-btn");

    if (followBtn) {
      followBtn.textContent = isFollowing ? "팔로잉" : "팔로우";
      followBtn.classList.toggle("following", isFollowing);

      // 데이터 속성 설정
      followBtn.dataset.action = "follow";
      followBtn.dataset.targetId = creatorId;
    }
  } catch (err) {
    console.error("[CREATOR MODAL] Failed to update follow button:", err);
  }
}

// 작가 피드로 이동
window.goToCreatorFeed = function () {
  const modal = document.getElementById("creator-preview-modal");
  const creatorId = modal?.dataset?.creatorId;

  if (creatorId) {
    window.location.href = `mypage_creator.html?creator_id=${creatorId}`;
  } else {
    console.error("[CREATOR MODAL] No creatorId found");
  }
};

// 모달 닫기
window.closeCreatorPreviewModal = function () {
  const modal = document.getElementById("creator-preview-modal");
  if (modal) {
    modal.style.display = "none";
    modal.removeAttribute("data-creator-id");
  }
};

console.log("[FEED.JS] ✅ Creator profile modal functions loaded");
