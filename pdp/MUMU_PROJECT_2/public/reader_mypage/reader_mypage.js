// =========================
// STATE MANAGEMENT
// =========================

import { getSupabase } from "../js/supabase-auth.js";

let currentUserId = null;
let supabaseClient = null;
let folders = [];
let moodboards = [];
let savedCuts = [];
let currentFolderId = null;

// =========================
// SUPABASE CLIENT LOADING
// =========================

async function loadSupabaseClient() {
  if (supabaseClient) return supabaseClient;
  try {
    supabaseClient = getSupabase();
    return supabaseClient;
  } catch (error) {
    console.error("[Supabase] 클라이언트 로드 실패:", error);
    return null;
  }
}

// =========================
// AUTHENTICATION HELPERS
// =========================

async function ensureFirebaseUser() {
  try {
    if (typeof window.getCurrentFirebaseUser !== "function") {
      console.warn("[인증] getCurrentFirebaseUser 함수를 사용할 수 없습니다");
      return null;
    }
    const firebaseUser = await window.getCurrentFirebaseUser();
    if (!firebaseUser || !firebaseUser.uid) {
      return null;
    }
    currentUserId = firebaseUser.uid;
    return firebaseUser;
  } catch (error) {
    console.error("[인증] Firebase 사용자 확인 오류:", error);
    return null;
  }
}

async function ensureAuthenticated() {
  if (currentUserId) {
    return true;
  }
  try {
    let firebaseUser = null;
    if (typeof window.getCurrentFirebaseUser === "function") {
      firebaseUser = await window.getCurrentFirebaseUser();
    } else {
      const { auth } = await import("../js/firebase_init.js");
      const { onAuthStateChanged } = await import(
        "https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js"
      );
      firebaseUser = await new Promise((resolve) => {
        const unsubscribe = onAuthStateChanged(auth, (user) => {
          unsubscribe();
          resolve(user);
        });
      });
    }
    if (firebaseUser && firebaseUser.uid) {
      currentUserId = firebaseUser.uid;
      return true;
    }
  } catch (error) {
    console.error("[인증] 사용자 확인 오류:", error);
  }
  return false;
}

// =========================
// TAB SWITCHING
// =========================

async function switchTab(tabName) {
  document.querySelectorAll(".tab").forEach((tab) => {
    tab.classList.remove("active");
    if (tab.dataset.tab === tabName) {
      tab.classList.add("active");
    }
  });

  document.querySelectorAll(".tab-content").forEach((content) => {
    content.classList.remove("active");
  });

  if (tabName === "mood") {
    document.getElementById("tab-mood").classList.add("active");
    document.body.classList.add("my-mood-view");
    await loadFeaturedMoodboard();
    await loadMoodboardsGrid();
  } else if (tabName === "my") {
    document.getElementById("tab-my").classList.add("active");
    document.body.classList.remove("my-mood-view");
    await loadFolders();
    await loadSavedCuts();
    await loadLikedWorks();
  }
}

// =========================
// PROFILE LOADING
// =========================

async function loadProfile() {
  const firebaseUser = await ensureFirebaseUser();
  if (!firebaseUser) return;

  const profileNameEl = document.getElementById("profile-name");
  const profileAvatarEl = document.getElementById("profile-avatar");
  const followingCountEl = document.getElementById("following-count");
  const followersCountEl = document.getElementById("followers-count");

  if (profileNameEl) {
    profileNameEl.textContent = firebaseUser.displayName || "독자";
  }

  if (profileAvatarEl && firebaseUser.photoURL) {
    profileAvatarEl.style.backgroundImage = `url(${firebaseUser.photoURL})`;
  }

  try {
    const supabase = await loadSupabaseClient();
    if (supabase) {
      const { data: profile } = await supabase
        .from("reader_profiles")
        .select("following_count, followers_count")
        .eq("reader_id", firebaseUser.uid)
        .single();

      if (profile) {
        if (followingCountEl) {
          followingCountEl.textContent = profile.following_count || 0;
        }
        if (followersCountEl) {
          followersCountEl.textContent = profile.followers_count || 0;
        }
      }
    }
  } catch (error) {
    console.error("[프로필] 로드 오류:", error);
  }
}

// =========================
// MY MOOD - Featured Moodboard
// =========================

async function loadFeaturedMoodboard() {
  const firebaseUser = await ensureFirebaseUser();
  if (!firebaseUser) {
    showFeaturedEmpty();
    return;
  }

  try {
    const supabase = await loadSupabaseClient();
    if (!supabase) {
      showFeaturedEmpty();
      return;
    }

    const { data: events } = await supabase
      .from("user_feed_events")
      .select("id, metadata, created_at")
      .eq("user_id", firebaseUser.uid)
      .eq("event_type", "moodboard_created")
      .order("created_at", { ascending: false })
      .limit(1);

    if (events && events.length > 0) {
      const event = events[0];
      const metadata = event.metadata || {};
      const moodboardData = metadata.moodboard_data || metadata || {};

      const featuredMoodboard = {
        id: metadata.moodboard_id || event.id,
        name: moodboardData.name || metadata.name || "무드보드",
        blocks: moodboardData.blocks || metadata.blocks || [],
        thumbnail: moodboardData.thumbnail || metadata.thumbnail,
        backgroundColor: moodboardData.backgroundColor || metadata.backgroundColor || "#fafafa",
      };

      renderFeaturedMoodboard(featuredMoodboard);
    } else {
      showFeaturedEmpty();
    }
  } catch (error) {
    console.error("[대표 무드보드] 로드 오류:", error);
    showFeaturedEmpty();
  }
}

function renderFeaturedMoodboard(moodboard) {
  const featuredContent = document.getElementById("featured-content");
  const featuredEmpty = document.getElementById("featured-empty");
  const featuredMoodText = document.getElementById("featured-mood-text");

  if (!featuredContent || !featuredEmpty) return;

  featuredEmpty.style.display = "none";
  featuredContent.innerHTML = "";

  if (moodboard.thumbnail) {
    const img = document.createElement("img");
    img.src = moodboard.thumbnail;
    img.style.width = "100%";
    img.style.height = "100%";
    img.style.objectFit = "cover";
    img.onclick = () => openMoodboardDetail(moodboard);
    featuredContent.appendChild(img);
  } else if (moodboard.blocks && moodboard.blocks.length > 0) {
    const canvas = document.createElement("div");
    canvas.style.width = "100%";
    canvas.style.height = "100%";
    canvas.style.background = moodboard.backgroundColor || "#fafafa";
    canvas.style.position = "relative";
    canvas.style.overflow = "hidden";
    canvas.onclick = () => openMoodboardDetail(moodboard);

    moodboard.blocks.slice(0, 4).forEach((block) => {
      if (block.type === "image" && block.imageUrl) {
        const img = document.createElement("img");
        img.src = block.imageUrl;
        img.style.position = "absolute";
        img.style.width = "50%";
        img.style.height = "50%";
        img.style.objectFit = "cover";
        if (block.x !== undefined) img.style.left = `${block.x}%`;
        if (block.y !== undefined) img.style.top = `${block.y}%`;
        canvas.appendChild(img);
      }
    });

    featuredContent.appendChild(canvas);
  } else {
    showFeaturedEmpty();
  }
}

function showFeaturedEmpty() {
  const featuredContent = document.getElementById("featured-content");
  const featuredEmpty = document.getElementById("featured-empty");

  if (featuredContent && featuredEmpty) {
    featuredContent.innerHTML = "";
    featuredEmpty.style.display = "flex";
  }
}

// =========================
// MY MOOD - Moodboards Grid
// =========================

async function loadMoodboardsGrid() {
  const firebaseUser = await ensureFirebaseUser();
  if (!firebaseUser) {
    showMoodboardsEmpty();
    return;
  }

  try {
    const supabase = await loadSupabaseClient();
    if (!supabase) {
      showMoodboardsEmpty();
      return;
    }

    const { data: events } = await supabase
      .from("user_feed_events")
      .select("id, metadata, created_at")
      .eq("user_id", firebaseUser.uid)
      .eq("event_type", "moodboard_created")
      .order("created_at", { ascending: false })
      .limit(100);

    if (events && events.length > 0) {
      moodboards = events.map((event) => {
        const metadata = event.metadata || {};
        const moodboardData = metadata.moodboard_data || metadata || {};
        return {
          id: metadata.moodboard_id || event.id,
          name: moodboardData.name || metadata.name || "무드보드",
          thumbnail: moodboardData.thumbnail || metadata.thumbnail,
          backgroundColor: moodboardData.backgroundColor || metadata.backgroundColor || "#fafafa",
          blocks: moodboardData.blocks || metadata.blocks || [],
        };
      });

      renderMoodboardsGrid(moodboards);
    } else {
      showMoodboardsEmpty();
    }
  } catch (error) {
    console.error("[무드보드 그리드] 로드 오류:", error);
    showMoodboardsEmpty();
  }
}

function renderMoodboardsGrid(moodboardsList) {
  const moodboardsGrid = document.getElementById("moodboards-grid");
  const moodboardsEmpty = document.getElementById("moodboards-empty");

  if (!moodboardsGrid || !moodboardsEmpty) return;

  if (!moodboardsList || moodboardsList.length === 0) {
    showMoodboardsEmpty();
    return;
  }

  moodboardsEmpty.style.display = "none";
  moodboardsGrid.innerHTML = moodboardsList
    .slice(0, 9)
    .map(
      (moodboard) => `
    <div class="moodboard-card" onclick="openMoodboardDetail(${JSON.stringify(moodboard).replace(/"/g, "&quot;")})">
      ${
        moodboard.thumbnail
          ? `<img src="${moodboard.thumbnail}" alt="${moodboard.name}" loading="lazy" />`
          : `<div style="width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; font-size: 48px; background: ${moodboard.backgroundColor || "#f5f5f5"};">🎨</div>`
      }
      <div class="moodboard-card-overlay">
        <div class="moodboard-card-title">${moodboard.name}</div>
      </div>
    </div>
  `
    )
    .join("");
}

function showMoodboardsEmpty() {
  const moodboardsGrid = document.getElementById("moodboards-grid");
  const moodboardsEmpty = document.getElementById("moodboards-empty");

  if (moodboardsGrid && moodboardsEmpty) {
    moodboardsGrid.innerHTML = "";
    moodboardsEmpty.style.display = "flex";
  }
}

function openMoodboardDetail(moodboard) {
  const modal = document.getElementById("moodboardDetailModal");
  const title = document.getElementById("moodboard-detail-title");
  const body = document.getElementById("moodboard-detail-body");

  if (!modal || !title || !body) return;

  title.textContent = moodboard.name || "무드보드";
  body.innerHTML = "";

  if (moodboard.thumbnail) {
    const img = document.createElement("img");
    img.src = moodboard.thumbnail;
    img.style.width = "100%";
    img.style.height = "auto";
    img.style.borderRadius = "12px";
    body.appendChild(img);
  } else if (moodboard.blocks && moodboard.blocks.length > 0) {
    const canvas = document.createElement("div");
    canvas.style.width = "100%";
    canvas.style.minHeight = "400px";
    canvas.style.background = moodboard.backgroundColor || "#fafafa";
    canvas.style.borderRadius = "12px";
    canvas.style.position = "relative";
    canvas.style.padding = "20px";

    moodboard.blocks.forEach((block) => {
      if (block.type === "image" && block.imageUrl) {
        const img = document.createElement("img");
        img.src = block.imageUrl;
        img.style.maxWidth = "100%";
        img.style.height = "auto";
        img.style.borderRadius = "8px";
        img.style.marginBottom = "12px";
        canvas.appendChild(img);
      } else if (block.type === "text" && block.text) {
        const text = document.createElement("div");
        text.textContent = block.text;
        text.style.fontSize = block.fontSize || "16px";
        text.style.color = block.color || "#000";
        text.style.marginBottom = "12px";
        canvas.appendChild(text);
      }
    });

    body.appendChild(canvas);
  }

  modal.classList.add("active");
}

function closeMoodboardDetailModal() {
  const modal = document.getElementById("moodboardDetailModal");
  if (modal) {
    modal.classList.remove("active");
  }
}

// =========================
// MY - Folders
// =========================

async function loadFolders() {
  const firebaseUser = await ensureFirebaseUser();
  if (!firebaseUser) {
    showFoldersEmpty();
    return;
  }

  try {
    const supabase = await loadSupabaseClient();
    if (!supabase) {
      showFoldersEmpty();
      return;
    }

    const { data: foldersData } = await supabase
      .from("reader_folders")
      .select("id, name, emoji, created_at")
      .eq("reader_id", firebaseUser.uid)
      .order("created_at", { ascending: false });

    if (foldersData && foldersData.length > 0) {
      folders = foldersData;
      renderFolders(folders);
    } else {
      showFoldersEmpty();
    }
  } catch (error) {
    console.error("[폴더] 로드 오류:", error);
    showFoldersEmpty();
  }
}

function renderFolders(foldersList) {
  const foldersGrid = document.getElementById("folders-grid");
  const foldersEmpty = document.getElementById("folders-empty");

  if (!foldersGrid || !foldersEmpty) return;

  if (!foldersList || foldersList.length === 0) {
    showFoldersEmpty();
    return;
  }

  foldersEmpty.style.display = "none";
  foldersGrid.innerHTML = foldersList
    .map(
      (folder) => `
    <div class="folder-card" onclick="showFolderContent('${folder.id}')">
      <div class="folder-card-emoji">${folder.emoji || "📁"}</div>
      <div class="folder-card-name">${folder.name || "폴더"}</div>
      <div class="folder-card-count">0개</div>
    </div>
  `
    )
    .join("");

  foldersList.forEach((folder) => {
    updateFolderCount(folder.id);
  });
}

async function updateFolderCount(folderId) {
  const firebaseUser = await ensureFirebaseUser();
  if (!firebaseUser) return;

  try {
    const supabase = await loadSupabaseClient();
    if (!supabase) return;

    const { count } = await supabase
      .from("reader_folder_cuts")
      .select("id", { count: "exact", head: true })
      .eq("reader_id", firebaseUser.uid)
      .eq("folder_id", folderId);

    const folderCard = document.querySelector(`[onclick*="${folderId}"]`);
    if (folderCard) {
      const countEl = folderCard.querySelector(".folder-card-count");
      if (countEl) {
        countEl.textContent = `${count || 0}개`;
      }
    }
  } catch (error) {
    console.error("[폴더 카운트] 업데이트 오류:", error);
  }
}

function showFoldersEmpty() {
  const foldersGrid = document.getElementById("folders-grid");
  const foldersEmpty = document.getElementById("folders-empty");

  if (foldersGrid && foldersEmpty) {
    foldersGrid.innerHTML = "";
    foldersEmpty.style.display = "flex";
  }
}

async function showFolderContent(folderId) {
  currentFolderId = folderId;
  const folderListView = document.getElementById("folder-list-view");
  const folderContentView = document.getElementById("folder-content-view");
  const folderTitle = document.getElementById("folder-content-title");

  if (!folderListView || !folderContentView || !folderTitle) return;

  const folder = folders.find((f) => f.id === folderId);
  if (folder) {
    folderTitle.textContent = folder.name || "폴더";
  }

  folderListView.style.display = "none";
  folderContentView.style.display = "block";

  await loadFolderCuts(folderId);
}

async function loadFolderCuts(folderId) {
  const firebaseUser = await ensureFirebaseUser();
  if (!firebaseUser) return;

  const folderCutsGrid = document.getElementById("folder-cuts-grid");
  const folderCutsEmpty = document.getElementById("folder-cuts-empty");

  if (!folderCutsGrid || !folderCutsEmpty) return;

  try {
    const supabase = await loadSupabaseClient();
    if (!supabase) {
      folderCutsEmpty.style.display = "flex";
      folderCutsGrid.innerHTML = "";
      return;
    }

    const { data: folderCuts } = await supabase
      .from("reader_folder_cuts")
      .select("cut_id")
      .eq("reader_id", firebaseUser.uid)
      .eq("folder_id", folderId);

    if (!folderCuts || folderCuts.length === 0) {
      folderCutsEmpty.style.display = "flex";
      folderCutsGrid.innerHTML = "";
      return;
    }

    const cutIds = folderCuts.map((fc) => fc.cut_id);
    const { data: cuts } = await supabase
      .from("cuts")
      .select("id, image_url")
      .in("id", cutIds);

    if (cuts && cuts.length > 0) {
      folderCutsEmpty.style.display = "none";
      folderCutsGrid.innerHTML = cuts
        .map(
          (cut) => `
        <div class="saved-cut-card">
          <img src="${cut.image_url}" alt="컷" loading="lazy" />
        </div>
      `
        )
        .join("");
    } else {
      folderCutsEmpty.style.display = "flex";
      folderCutsGrid.innerHTML = "";
    }
  } catch (error) {
    console.error("[폴더 컷] 로드 오류:", error);
    folderCutsEmpty.style.display = "flex";
    folderCutsGrid.innerHTML = "";
  }
}

function backToFolderList() {
  const folderListView = document.getElementById("folder-list-view");
  const folderContentView = document.getElementById("folder-content-view");

  if (folderListView && folderContentView) {
    folderListView.style.display = "block";
    folderContentView.style.display = "none";
  }
  currentFolderId = null;
}

// =========================
// MY - Saved Cuts
// =========================

async function loadSavedCuts() {
  const firebaseUser = await ensureFirebaseUser();
  if (!firebaseUser) {
    savedCuts = [];
    renderSavedCuts();
    return;
  }

  try {
    const supabase = await loadSupabaseClient();
    if (!supabase) {
      savedCuts = [];
      renderSavedCuts();
      return;
    }

    const { data: events } = await supabase
      .from("user_feed_events")
      .select("id, feed_id, metadata, created_at")
      .eq("user_id", firebaseUser.uid)
      .eq("event_type", "cut_saved")
      .order("created_at", { ascending: false });

    if (events && events.length > 0) {
      const feedIds = events
        .map((event) => event.feed_id)
        .filter((id) => id !== null && id !== undefined);

      let feedItems = [];
      if (feedIds.length > 0) {
        const { data: feedsData } = await supabase
          .from("feeds")
          .select("id, type, ref_id, thumbnail_url")
          .in("id", feedIds)
          .eq("type", "cut");

        if (feedsData) {
          feedItems = feedsData;
        }
      }

      savedCuts = events
        .map((event) => {
          let cutId = null;
          let imageUrl = null;

          if (event.feed_id) {
            const feed = feedItems.find((f) => f.id === event.feed_id);
            if (feed) {
              cutId = feed.ref_id;
              imageUrl = feed.thumbnail_url;
            }
          }

          if (!cutId && event.metadata?.cut_id) {
            cutId = event.metadata.cut_id;
            imageUrl = event.metadata.image_url;
          }

          if (!cutId || !imageUrl) {
            return null;
          }

          return {
            id: cutId,
            imageUrl: imageUrl,
          };
        })
        .filter((cut) => cut !== null);
    } else {
      savedCuts = [];
    }
  } catch (error) {
    console.error("[저장된 컷] 로드 오류:", error);
    savedCuts = [];
  }

  renderSavedCuts();
}

async function renderSavedCuts() {
  const savedCutsGrid = document.getElementById("saved-cuts-grid");
  const savedCutsEmpty = document.getElementById("saved-cuts-empty");

  if (!savedCutsGrid || !savedCutsEmpty) return;

  const firebaseUser = await ensureFirebaseUser();
  if (!firebaseUser) {
    savedCutsEmpty.style.display = "flex";
    savedCutsGrid.innerHTML = "";
    return;
  }

  let folderCutIds = new Set();
  try {
    const supabase = await loadSupabaseClient();
    if (supabase) {
      const { data: folderCuts } = await supabase
        .from("reader_folder_cuts")
        .select("cut_id")
        .eq("reader_id", firebaseUser.uid);

      if (folderCuts) {
        folderCutIds = new Set(folderCuts.map((fc) => fc.cut_id));
      }
    }
  } catch (error) {
    console.warn("[저장된 컷] 폴더 컷 조회 실패:", error);
  }

  const availableCuts = savedCuts.filter((cut) => !folderCutIds.has(cut.id));

  if (availableCuts.length === 0) {
    savedCutsEmpty.style.display = "flex";
    savedCutsGrid.innerHTML = "";
    return;
  }

  savedCutsEmpty.style.display = "none";
  savedCutsGrid.innerHTML = availableCuts
    .map(
      (cut) => `
    <div class="saved-cut-card">
      <img src="${cut.imageUrl}" alt="저장된 컷" loading="lazy" />
    </div>
  `
    )
    .join("");
}

// =========================
// MY - Liked Works
// =========================

async function loadLikedWorks() {
  const firebaseUser = await ensureFirebaseUser();
  if (!firebaseUser) {
    showLikedWorksEmpty();
    return;
  }

  try {
    const supabase = await loadSupabaseClient();
    if (!supabase) {
      showLikedWorksEmpty();
      return;
    }

    const { data: events } = await supabase
      .from("user_feed_events")
      .select("feed_id, metadata")
      .eq("user_id", firebaseUser.uid)
      .eq("event_type", "work_liked")
      .limit(20);

    if (events && events.length > 0) {
      const feedIds = events
        .map((event) => event.feed_id)
        .filter((id) => id !== null && id !== undefined);

      if (feedIds.length > 0) {
        const { data: feeds } = await supabase
          .from("feeds")
          .select("id, thumbnail_url, metadata")
          .in("id", feedIds)
          .eq("type", "work");

        if (feeds && feeds.length > 0) {
          renderLikedWorks(feeds);
        } else {
          showLikedWorksEmpty();
        }
      } else {
        showLikedWorksEmpty();
      }
    } else {
      showLikedWorksEmpty();
    }
  } catch (error) {
    console.error("[좋아요한 작품] 로드 오류:", error);
    showLikedWorksEmpty();
  }
}

function renderLikedWorks(works) {
  const likedWorksGrid = document.getElementById("liked-works-grid");
  const likedWorksEmpty = document.getElementById("liked-works-empty");

  if (!likedWorksGrid || !likedWorksEmpty) return;

  if (!works || works.length === 0) {
    showLikedWorksEmpty();
    return;
  }

  likedWorksEmpty.style.display = "none";
  likedWorksGrid.innerHTML = works
    .map(
      (work) => `
    <div class="work-card-compact">
      <img src="${work.thumbnail_url || ""}" alt="작품" class="work-card-image" loading="lazy" />
      <div class="work-card-info">
        <div class="work-card-title">${work.metadata?.title || "작품"}</div>
        <div class="work-card-author">${work.metadata?.creator_name || ""}</div>
      </div>
    </div>
  `
    )
    .join("");
}

function showLikedWorksEmpty() {
  const likedWorksGrid = document.getElementById("liked-works-grid");
  const likedWorksEmpty = document.getElementById("liked-works-empty");

  if (likedWorksGrid && likedWorksEmpty) {
    likedWorksGrid.innerHTML = "";
    likedWorksEmpty.style.display = "flex";
  }
}

// =========================
// MODALS
// =========================

function openFollowListModal(type) {
  const modal = document.getElementById("followListModal");
  const title = document.getElementById("follow-list-title");
  const body = document.getElementById("follow-list-body");

  if (!modal || !title || !body) return;

  title.textContent = type === "following" ? "팔로우" : "팔로워";
  body.innerHTML = '<div style="padding: 20px; text-align: center; color: #666;">목록을 불러오는 중...</div>';

  modal.classList.add("active");

  loadFollowList(type);
}

async function loadFollowList(type) {
  const firebaseUser = await ensureFirebaseUser();
  const body = document.getElementById("follow-list-body");

  if (!firebaseUser || !body) {
    if (body) {
      body.innerHTML = '<div style="padding: 20px; text-align: center; color: #666;">데이터를 불러올 수 없습니다</div>';
    }
    return;
  }

  try {
    const supabase = await loadSupabaseClient();
    if (!supabase) {
      body.innerHTML = '<div style="padding: 20px; text-align: center; color: #666;">데이터를 불러올 수 없습니다</div>';
      return;
    }

    const table = type === "following" ? "reader_follows" : "reader_followers";
    const { data: list } = await supabase
      .from(table)
      .select("*")
      .eq("reader_id", firebaseUser.uid)
      .limit(100);

    if (list && list.length > 0) {
      body.innerHTML = list
        .map(
          (item) => `
        <div class="follow-list-item">
          <div class="follow-list-avatar"></div>
          <div class="follow-list-name">${item.name || "사용자"}</div>
        </div>
      `
        )
        .join("");
    } else {
      body.innerHTML = '<div style="padding: 20px; text-align: center; color: #666;">목록이 없습니다</div>';
    }
  } catch (error) {
    console.error("[팔로우 리스트] 로드 오류:", error);
    body.innerHTML = '<div style="padding: 20px; text-align: center; color: #666;">데이터를 불러올 수 없습니다</div>';
  }
}

function closeFollowListModal() {
  const modal = document.getElementById("followListModal");
  if (modal) {
    modal.classList.remove("active");
  }
}

function openSettingsModal() {
  const modal = document.getElementById("settingsModal");
  if (modal) {
    modal.classList.add("active");
  }
}

function closeSettingsModal() {
  const modal = document.getElementById("settingsModal");
  if (modal) {
    modal.classList.remove("active");
  }
}

// =========================
// INITIALIZATION
// =========================

document.addEventListener("DOMContentLoaded", async () => {
  await ensureAuthenticated();
  await loadProfile();
  await switchTab("mood");
});

window.switchTab = switchTab;
window.openFollowListModal = openFollowListModal;
window.closeFollowListModal = closeFollowListModal;
window.openSettingsModal = openSettingsModal;
window.closeSettingsModal = closeSettingsModal;
window.showFolderContent = showFolderContent;
window.backToFolderList = backToFolderList;
window.openMoodboardDetail = openMoodboardDetail;
window.closeMoodboardDetailModal = closeMoodboardDetailModal;

