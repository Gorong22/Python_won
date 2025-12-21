// =========================
// SUPABASE & AUTH SETUP
// =========================
import { getSupabase } from "./supabase-auth.js";

let supabaseClient = null;
let currentMoodboard = null;
let currentCreatorId = null;

async function loadSupabaseClient() {
  if (supabaseClient) return supabaseClient;
  try {
    supabaseClient = getSupabase();
    return supabaseClient;
  } catch (error) {
    console.error("[MoodboardDetail] Supabase 클라이언트 로드 실패:", error);
    return null;
  }
}

async function getCurrentFirebaseUser() {
  try {
    if (typeof window.getCurrentFirebaseUser === "function") {
      return await window.getCurrentFirebaseUser();
    }
    const { auth } = await import("/js/firebase_init.js");
    const { onAuthStateChanged } = await import(
      "https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js"
    );
    return await new Promise((resolve) => {
      const unsubscribe = onAuthStateChanged(auth, (user) => {
        unsubscribe();
        resolve(user);
      });
    });
  } catch (error) {
    console.error("[MoodboardDetail] Firebase 사용자 확인 오류:", error);
    return null;
  }
}

// =========================
// MOODBOARD LOADING
// =========================

/**
 * URL에서 무드보드 ID 가져오기
 */
function getMoodboardIdFromURL() {
  const params = new URLSearchParams(window.location.search);
  return params.get("id");
}

/**
 * 무드보드 상세 정보 로드
 */
async function loadMoodboardDetail() {
  const moodboardId = getMoodboardIdFromURL();
  if (!moodboardId) {
    alert("무드보드를 찾을 수 없습니다");
    history.back();
    return;
  }

  try {
    const supabase = await loadSupabaseClient();
    if (!supabase) {
      alert("서비스에 연결할 수 없습니다");
      return;
    }

    // user_feed_events에서 무드보드 찾기
    const { data: eventsData, error } = await supabase
      .from("user_feed_events")
      .select("id, user_id, metadata, created_at")
      .eq("event_type", "moodboard_created")
      .or(`id.eq.${moodboardId},metadata->moodboard_id.eq.${moodboardId}`)
      .limit(1)
      .single();

    if (error || !eventsData) {
      console.error("[MoodboardDetail] 무드보드 로드 오류:", error);
      alert("무드보드를 찾을 수 없습니다");
      history.back();
      return;
    }

    const metadata = eventsData.metadata || {};
    const moodboardData = metadata.moodboard_data || metadata || {};

    currentMoodboard = {
      id: metadata.moodboard_id || eventsData.id,
      name: moodboardData.name || metadata.name || "무드보드",
      creatorId: eventsData.user_id,
      backgroundColor: moodboardData.backgroundColor || metadata.backgroundColor || "#fafafa",
      blocks: moodboardData.blocks || metadata.blocks || [],
      createdAt: eventsData.created_at,
    };

    currentCreatorId = currentMoodboard.creatorId;

    // 무드보드 렌더링
    renderMoodboard();
    
    // 제작자 정보 로드
    await loadCreatorInfo();
    
    // 팔로우 상태 확인
    await checkFollowStatus();
  } catch (error) {
    console.error("[MoodboardDetail] 무드보드 로드 중 오류:", error);
    alert("무드보드를 불러오는 중 오류가 발생했습니다");
  }
}

/**
 * 무드보드 렌더링
 */
function renderMoodboard() {
  if (!currentMoodboard) return;

  // 제목 설정
  const titleEl = document.getElementById("moodboardTitle");
  if (titleEl) {
    titleEl.textContent = currentMoodboard.name;
  }

  // 캔버스 설정
  const canvasEl = document.getElementById("moodboardCanvas");
  if (!canvasEl) return;

  canvasEl.style.backgroundColor = currentMoodboard.backgroundColor || "#fafafa";

  // 블록 렌더링
  if (!currentMoodboard.blocks || currentMoodboard.blocks.length === 0) {
    canvasEl.innerHTML = '<div style="text-align: center; padding: 40px; color: #999;">무드보드가 비어있습니다</div>';
    return;
  }

  canvasEl.innerHTML = currentMoodboard.blocks
    .map((block, index) => {
      if (block.type === "image" && block.imageUrl) {
        // 컷 이미지 블록
        const cutId = block.cutId || null;
        return `
          <div class="moodboard-block image-block" 
               style="left: ${block.x || 0}px; top: ${block.y || 0}px; width: ${block.width || 200}px; z-index: ${block.zIndex || 1};"
               data-cut-id="${cutId || ''}"
               onclick="handleCutClick('${cutId}')">
            <img src="${block.imageUrl}" alt="컷" style="width: 100%; height: auto;" />
          </div>
        `;
      } else if (block.type === "text") {
        // 텍스트 블록
        return `
          <div class="moodboard-block text-block" 
               style="left: ${block.x || 0}px; top: ${block.y || 0}px; width: ${block.width || 200}px; z-index: ${block.zIndex || 1}; font-family: ${block.fontFamily || 'inherit'}; font-size: ${block.fontSize || 16}px; color: ${block.color || '#333'};">
            ${block.text || ''}
          </div>
        `;
      }
      return '';
    })
    .join('');
}

/**
 * 컷 클릭 핸들러 - 원작 작품으로 이동
 */
window.handleCutClick = async function (cutId) {
  if (!cutId) return;

  try {
    const supabase = await loadSupabaseClient();
    if (!supabase) {
      alert("서비스에 연결할 수 없습니다");
      return;
    }

    // cuts 테이블에서 컷 정보 가져오기
    const { data: cutData, error } = await supabase
      .from("cuts")
      .select("id, episode_id, work_id")
      .eq("id", cutId)
      .single();

    if (error || !cutData) {
      console.error("[MoodboardDetail] 컷 정보 조회 오류:", error);
      alert("컷 정보를 찾을 수 없습니다");
      return;
    }

    // episode_id 또는 work_id로 작품 상세 페이지로 이동
    // 작품 상세 페이지 URL 패턴 확인 필요
    // 임시로 work_id를 사용
    if (cutData.work_id) {
      window.location.href = `work-detail.html?id=${cutData.work_id}`;
    } else if (cutData.episode_id) {
      // episode_id가 있으면 episode 상세 페이지로 이동
      window.location.href = `episode-detail.html?id=${cutData.episode_id}`;
    } else {
      alert("원작 작품 정보를 찾을 수 없습니다");
    }
  } catch (error) {
    console.error("[MoodboardDetail] 컷 클릭 처리 오류:", error);
    alert("작품으로 이동하는 중 오류가 발생했습니다");
  }
};

/**
 * 제작자 정보 로드
 */
async function loadCreatorInfo() {
  if (!currentCreatorId) return;

  try {
    const supabase = await loadSupabaseClient();
    if (!supabase) return;

    // Supabase readers 테이블에서 조회
    const { data: readerData, error } = await supabase
      .from("readers")
      .select("id, nickname, avatar_url")
      .eq("id", currentCreatorId)
      .single();

    let creatorInfo = {
      nickname: "독자",
      avatar: null,
    };

    if (!error && readerData) {
      creatorInfo.nickname = readerData.nickname || "독자";
      creatorInfo.avatar = readerData.avatar_url || null;
    } else {
      // Firebase Firestore에서 조회 (fallback)
      try {
        const { getFirestore } = await import("/js/firebase/firestore.js");
        const firestore = getFirestore();
        const readerDoc = await firestore.collection("readers").doc(currentCreatorId).get();
        if (readerDoc.exists) {
          const readerData = readerDoc.data();
          creatorInfo.nickname = readerData.nickname || readerData.name || "독자";
          creatorInfo.avatar = readerData.avatar_url || readerData.avatar || null;
        }
      } catch (firestoreError) {
        console.warn("[MoodboardDetail] Firestore 프로필 조회 실패:", firestoreError);
      }
    }

    // 제작자 정보 렌더링
    const creatorInfoEl = document.getElementById("creatorInfo");
    if (creatorInfoEl) {
      creatorInfoEl.innerHTML = `
        ${creatorInfo.avatar 
          ? `<img src="${creatorInfo.avatar}" alt="${creatorInfo.nickname}" class="creator-avatar" />` 
          : `<div class="creator-avatar-placeholder">${creatorInfo.nickname.charAt(0) || "독"}</div>`}
        <span>${creatorInfo.nickname}</span>
      `;
    }
  } catch (error) {
    console.error("[MoodboardDetail] 제작자 정보 로드 오류:", error);
  }
}

/**
 * 팔로우 상태 확인
 */
async function checkFollowStatus() {
  const firebaseUser = await getCurrentFirebaseUser();
  if (!firebaseUser || !currentCreatorId) return;

  try {
    // localStorage에서 팔로우 상태 확인
    const followKey = `follow_${firebaseUser.uid}_${currentCreatorId}`;
    const isFollowing = localStorage.getItem(followKey) === "true";

    const followBtn = document.getElementById("followBtn");
    if (followBtn) {
      if (isFollowing) {
        followBtn.classList.add("following");
        followBtn.textContent = "팔로잉";
      } else {
        followBtn.classList.remove("following");
        followBtn.textContent = "팔로우";
      }
    }
  } catch (error) {
    console.error("[MoodboardDetail] 팔로우 상태 확인 오류:", error);
  }
}

/**
 * 팔로우 토글
 */
window.toggleFollow = async function () {
  const firebaseUser = await getCurrentFirebaseUser();
  if (!firebaseUser) {
    alert("로그인이 필요합니다");
    return;
  }

  if (!currentCreatorId) return;

  const followBtn = document.getElementById("followBtn");
  if (!followBtn) return;

  const isFollowing = followBtn.classList.contains("following");

  try {
    const followKey = `follow_${firebaseUser.uid}_${currentCreatorId}`;
    
    if (isFollowing) {
      // 언팔로우
      localStorage.removeItem(followKey);
      followBtn.classList.remove("following");
      followBtn.textContent = "팔로우";
    } else {
      // 팔로우
      localStorage.setItem(followKey, "true");
      followBtn.classList.add("following");
      followBtn.textContent = "팔로잉";
    }

    // TODO: Supabase reader_follows 테이블에 저장
    // 현재는 localStorage만 사용
  } catch (error) {
    console.error("[MoodboardDetail] 팔로우 오류:", error);
    alert("팔로우 처리 중 오류가 발생했습니다");
  }
};

// Tabbar 로드
fetch("components/tabbar.html")
  .then((r) => {
    if (!r.ok) throw new Error("tabbar load failed");
    return r.text();
  })
  .then((html) => {
    document.getElementById("tabbar").innerHTML = html;
    const script = document.createElement("script");
    script.src = "js/tabbar-init.js";
    document.body.appendChild(script);
  })
  .catch((error) => console.error("Error fetching tabbar.html:", error));

// 페이지 로드 시 무드보드 로드
document.addEventListener("DOMContentLoaded", () => {
  loadMoodboardDetail();
});

