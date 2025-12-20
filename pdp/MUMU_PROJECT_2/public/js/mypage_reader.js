// =========================
// STATE MANAGEMENT
// =========================

// Firebase Auth user ID (readers only)
let currentUserId = null;

// Supabase client (lazy loaded)
let supabaseClient = null;

// Data storage
let folders = [];
let moodboards = [];
let savedCuts = []; // 저장된 컷 목록
let currentFolderId = null;
let currentMoodboardId = null;
let currentTemplate = null;
let isEditMode = false;

// =========================
// SUPABASE CLIENT LOADING
// =========================

/**
 * Load Supabase client dynamically (only when needed)
 * @returns {Promise<Object|null>} Supabase client or null
 */
async function loadSupabaseClient() {
  if (supabaseClient) return supabaseClient;

  if (!window.supabase) {
    console.warn("[Supabase] window.supabase 없음");
    return null;
  }

  // SUPABASE_URL과 SUPABASE_ANON_KEY 확인
  if (
    typeof SUPABASE_URL === "undefined" ||
    typeof SUPABASE_ANON_KEY === "undefined"
  ) {
    console.warn(
      "[Supabase] SUPABASE_URL 또는 SUPABASE_ANON_KEY가 정의되지 않았습니다"
    );
    return null;
  }

  supabaseClient = window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_ANON_KEY
  );

  console.log("[Supabase] 클라이언트 초기화 완료");
  return supabaseClient;
}

// =========================
// AUTHENTICATION HELPERS
// =========================

/**
 * Get Firebase user before Supabase operations
 * @returns {Promise<Object|null>} Firebase user or null
 */
async function ensureFirebaseUser() {
  try {
    // window.getCurrentFirebaseUser 사용 (reader_auth.js에서 전역으로 노출)
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

// =========================
// AUTHENTICATION HELPERS
// =========================

/**
 * 현재 사용자가 로그인되어 있는지 확인하고 currentUserId 업데이트
 * @returns {Promise<boolean>} 로그인되어 있으면 true
 */
async function ensureAuthenticated() {
  // 이미 currentUserId가 있으면 true 반환
  if (currentUserId) {
    return true;
  }

  // Firebase Auth에서 다시 확인
  try {
    // window.getCurrentFirebaseUser가 있으면 사용, 없으면 직접 확인
    let firebaseUser = null;

    if (typeof window.getCurrentFirebaseUser === "function") {
      firebaseUser = await window.getCurrentFirebaseUser();
    } else {
      // 직접 Firebase Auth 확인
      const { auth } = await import("/js/firebase_init.js");
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
  // Update tab buttons
  document.querySelectorAll(".tab").forEach((tab) => {
    tab.classList.remove("active");
    if (tab.dataset.tab === tabName) {
      tab.classList.add("active");
    }
  });

  // Update tab content
  document.querySelectorAll(".tab-content").forEach((content) => {
    content.classList.remove("active");
  });

  if (tabName === "mood") {
    document.getElementById("tab-mood").classList.add("active");
    // MY MOOD 탭은 전시용 - 스크롤 차단하여 하나의 완성된 장면으로
    document.body.classList.add("my-mood-view");
    // MY MOOD 탭은 전시용 - 무드보드 리스트 로드하지 않음
  } else if (tabName === "my") {
    document.getElementById("tab-my").classList.add("active");
    // MY 탭은 관리용 - 스크롤 활성화
    document.body.classList.remove("my-mood-view");
    // MY 탭은 관리용 - 무드보드 리스트 로드
    await loadMoodboards();
    // Reset folder view and load saved cuts
    await showFolderList();
    // 저장된 컷 불러오기 및 표시
    await loadSavedCuts();
    displaySavedCutsInFolders(); // 폴더 섹션에 저장된 컷 표시
  }
}

// Legacy function names for compatibility
function goMyFeed() {
  switchTab("mood");
}

function goMy() {
  switchTab("my");
}

// =========================
// FOLDER MANAGEMENT
// =========================

async function showFolderList() {
  document.getElementById("folder-list-view").style.display = "block";
  document.getElementById("folder-content-view").style.display = "none";
  await loadFolders();
  await loadSavedCuts(); // 저장된 컷도 불러오기
  displaySavedCutsInFolders(); // 저장된 컷 표시
}

function showFolderContent(folderId) {
  currentFolderId = folderId;
  const folder = folders.find((f) => f.id === folderId);
  if (!folder) return;

  document.getElementById("folder-list-view").style.display = "none";
  document.getElementById("folder-content-view").style.display = "block";
  document.getElementById("folder-content-title").textContent = folder.name;

  loadFolderCuts(folderId);
}

// =========================
// SAVE CUT TO FEED
// =========================

/**
 * 컷을 feeds 테이블에 저장
 * @param {string} cutId - 저장할 컷의 ID
 * @param {string} imageUrl - 컷의 이미지 URL
 * @param {string} creatorId - 컷의 원래 creator ID (선택사항)
 * @returns {Promise<boolean>} 저장 성공 여부
 */
async function saveCutToFeed(cutId, imageUrl, creatorId = null) {
  const firebaseUser = await ensureFirebaseUser();
  if (!firebaseUser) {
    console.error("[컷 저장] 로그인이 필요합니다");
    return false;
  }

  try {
    // cuts 테이블에서 컷 정보 가져오기
    const { data: cutData, error: cutError } = await supabaseClient
      .from("cuts")
      .select("id, image_url, work_id")
      .eq("id", cutId)
      .single();

    if (cutError || !cutData) {
      console.error("[컷 저장] 컷 정보를 찾을 수 없습니다:", cutError);
      return false;
    }

    // work에서 creator_id 가져오기 (feeds 테이블용)
    let finalCreatorId = creatorId;
    if (!finalCreatorId && cutData.work_id) {
      const { data: workData, error: workError } = await supabaseClient
        .from("works")
        .select("creator_id")
        .eq("id", cutData.work_id)
        .single();

      if (!workError && workData) {
        finalCreatorId = workData.creator_id;
      }
    }

    // 독자가 저장한 컷은 feeds 테이블에 저장하지 않음
    // feeds 테이블은 creator 전용이고, 독자는 user_feed_events에만 저장
    // feed_id는 항상 null로 설정하여 foreign key 제약 위반 방지
    const savedFeedId = null;

    console.log(
      "[컷 저장] 독자용 저장 - feeds 테이블에 저장하지 않고 user_feed_events에만 저장"
    );

    // user_feed_events에 이벤트 기록 (feed_id는 null일 수 있음)
    const { data: eventData, error: eventError } = await supabaseClient
      .from("user_feed_events")
      .insert({
        user_id: firebaseUser.uid,
        feed_id: savedFeedId, // null이면 feed 없이 이벤트만 저장
        event_type: "cut_saved",
        metadata: {
          cut_id: cutId,
          image_url: imageUrl || cutData.image_url,
        },
      })
      .select()
      .single();

    if (eventError) {
      console.error("[컷 저장] user_feed_events 저장 오류:", eventError);
      // feeds는 성공했지만 events 실패한 경우에도 true 반환 (feeds에 저장되었으므로)
      if (savedFeedId) {
        console.log("[컷 저장] feeds에는 저장되었지만 events 저장 실패");
        return true;
      }
      return false;
    }

    if (savedFeedId) {
      console.log("[컷 저장] feeds와 user_feed_events 모두 저장됨");
    } else {
      console.log(
        "[컷 저장] user_feed_events에만 저장됨 (feeds 저장 실패):",
        eventData
      );
    }

    return true;
  } catch (error) {
    console.error("[컷 저장] 저장 중 오류:", error);
    return false;
  }
}

// =========================
// SAVED CUTS LOADING
// =========================

/**
 * Supabase에서 저장된 컷 불러오기
 * feed 테이블에서 사용자가 저장한 컷 조회 (user_id로 필터링)
 */
async function loadSavedCuts() {
  // 인증 상태 확인
  const isAuthenticated = await ensureAuthenticated();
  if (!isAuthenticated) {
    console.log("[저장된 컷] 사용자가 로그인하지 않았습니다");
    savedCuts = [];
    return;
  }

  console.log("[저장된 컷] 로드 시작, currentUserId:", currentUserId);

  try {
    const firebaseUser = await ensureFirebaseUser();
    if (!firebaseUser) {
      console.warn("[저장된 컷] 로그인이 필요합니다");
      savedCuts = [];
      return;
    }

    // feeds 테이블에서 사용자가 저장한 컷 조회
    // feeds 테이블 구조: creator_id, type, ref_id, thumbnail_url
    // user_feed_events를 통해 사용자가 저장한 컷 찾기

    const supabaseClient = await loadSupabaseClient();
    if (typeof supabaseClient === "undefined" || !supabaseClient) {
      console.warn("[저장된 컷] Supabase 클라이언트를 사용할 수 없습니다");
      return;
    }

    const { data: events, error: eventsError } = await supabaseClient
      .from("user_feed_events")
      .select(
        `
        id,
        feed_id,
        metadata,
        created_at
      `
      )
      .eq("user_id", currentUserId)
      .eq("event_type", "cut_saved")
      .order("created_at", { ascending: false });

    if (eventsError) {
      console.error("[저장된 컷] user_feed_events 조회 오류:", eventsError);
      savedCuts = [];
      return;
    }

    if (!events || events.length === 0) {
      console.log("[저장된 컷] 저장된 컷이 없습니다");
      savedCuts = [];
      return;
    }

    // feed_id가 있으면 feeds 테이블에서 조회, 없으면 metadata에서 cut_id 사용
    const feedIds = events
      .map((event) => event.feed_id)
      .filter((id) => id !== null && id !== undefined);

    let feedItems = [];
    if (feedIds.length > 0) {
      const { data: feedsData, error: feedsError } = await supabaseClient
        .from("feeds")
        .select("id, type, ref_id, thumbnail_url, created_at")
        .in("id", feedIds)
        .eq("type", "cut");

      if (!feedsError && feedsData) {
        feedItems = feedsData;
      }
    }

    // feed_id가 없는 이벤트는 metadata에서 cut_id 사용
    const eventsWithoutFeed = events.filter((event) => !event.feed_id);
    const cutIdsFromMetadata = eventsWithoutFeed
      .map((event) => event.metadata?.cut_id)
      .filter((id) => id !== null && id !== undefined);

    // cuts 테이블에서 직접 조회
    let cutsFromMetadata = [];
    if (cutIdsFromMetadata.length > 0) {
      const { data: cutsData, error: cutsError } = await supabaseClient
        .from("cuts")
        .select("id, image_url, order_index")
        .in("id", cutIdsFromMetadata);

      if (!cutsError && cutsData) {
        cutsFromMetadata = cutsData;
      }
    }

    // feeds 테이블에서 가져온 데이터 처리
    const feedCutMap = new Map();
    feedItems.forEach((feed) => {
      if (feed.ref_id) {
        feedCutMap.set(feed.ref_id, {
          id: feed.id,
          thumbnailUrl: feed.thumbnail_url,
          createdAt: feed.created_at,
        });
      }
    });

    // 이벤트와 매칭하여 savedCuts 구성
    savedCuts = events
      .map((event) => {
        let cutId = null;
        let imageUrl = null;

        // feed_id가 있으면 feeds 테이블에서 정보 가져오기
        if (event.feed_id) {
          const feed = feedItems.find((f) => f.id === event.feed_id);
          if (feed) {
            cutId = feed.ref_id;
            imageUrl = feed.thumbnail_url;
          }
        }

        // feed_id가 없으면 metadata에서 가져오기
        if (!cutId && event.metadata?.cut_id) {
          cutId = event.metadata.cut_id;
          imageUrl = event.metadata.image_url;
        }

        // imageUrl이 없으면 cuts 테이블에서 조회
        if (cutId && !imageUrl) {
          const cut = cutsFromMetadata.find((c) => c.id === cutId);
          if (cut) {
            imageUrl = cut.image_url;
          }
        }

        if (!cutId || !imageUrl) {
          return null;
        }

        return {
          id: cutId,
          imageUrl: imageUrl,
          orderIndex: 0,
          feedId: event.feed_id,
          eventId: event.id,
          savedAt: event.created_at,
          metadata: event.metadata || {},
        };
      })
      .filter((cut) => cut !== null);

    console.log(
      `[저장된 컷] ${savedCuts.length}개의 컷을 불러왔습니다 (feeds: ${feedItems.length}, metadata: ${cutsFromMetadata.length})`
    );
    console.log("[저장된 컷] 컷 목록:", savedCuts);
  } catch (error) {
    console.error("[저장된 컷] 로드 중 오류:", error);
    savedCuts = [];
  }
}

/**
 * 저장된 컷 전체 그리드 렌더링 (항상 표시)
 * 폴더에 속한 컷은 제외하고 표시
 */
async function renderSavedCutsGrid() {
  const savedCutsGrid = document.getElementById("saved-cuts-grid");
  const savedCutsEmpty = document.getElementById("saved-cuts-empty");

  if (!savedCutsGrid || !savedCutsEmpty) return;

  // 폴더에 속한 컷 ID 목록 가져오기
  let folderCutIds = new Set();
  try {
    const firebaseUser = await ensureFirebaseUser();
    if (firebaseUser) {
      const supabaseClient = await loadSupabaseClient();
      if (typeof supabaseClient !== "undefined" && supabaseClient) {
        const { data: folderCuts } = await supabaseClient
          .from("reader_folder_cuts")
          .select("cut_id")
          .eq("reader_id", firebaseUser.uid);

        if (folderCuts) {
          folderCutIds = new Set(folderCuts.map((fc) => fc.cut_id));
        }
      }
    }
  } catch (error) {
    console.warn("[저장된 컷] 폴더 컷 조회 실패:", error);
  }

  // 폴더에 속하지 않은 컷만 필터링
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
    <div class="saved-cut-item" 
         draggable="true"
         data-cut-id="${cut.id}"
         ondragstart="handleCutDragStart(event, '${cut.id}')"
         ondragend="handleCutDragEnd(event)">
      <img src="${cut.imageUrl}" alt="Saved cut" loading="lazy" />
    </div>
  `
    )
    .join("");
}

/**
 * 저장된 컷 전체에서 특정 컷 숨김 처리
 */
function hideCutFromSavedList(cutId) {
  // 저장된 컷 전체 그리드에서 제거
  const savedCutsGrid = document.getElementById("saved-cuts-grid");
  if (savedCutsGrid) {
    const cutElement = savedCutsGrid.querySelector(`[data-cut-id="${cutId}"]`);
    if (cutElement) {
      cutElement.remove();
    }

    // 빈 상태 체크
    const remainingCuts = savedCutsGrid.querySelectorAll(".saved-cut-item");
    const savedCutsEmpty = document.getElementById("saved-cuts-empty");
    if (remainingCuts.length === 0 && savedCutsEmpty) {
      savedCutsEmpty.style.display = "flex";
    }
  }

  // 편집기 컷 그리드에서도 제거
  const editorCutsGrid = document.getElementById("editor-cuts-grid");
  if (editorCutsGrid) {
    const editorCutElement = editorCutsGrid.querySelector(
      `[data-cut-id="${cutId}"]`
    );
    if (editorCutElement) {
      editorCutElement.remove();
    }

    // 빈 상태 체크
    const remainingEditorCuts =
      editorCutsGrid.querySelectorAll(".editor-cut-item");
    const editorCutsEmpty = document.getElementById("editor-cuts-empty");
    if (remainingEditorCuts.length === 0 && editorCutsEmpty) {
      editorCutsEmpty.style.display = "block";
      editorCutsEmpty.innerHTML = "<p>폴더를 선택하세요</p>";
    }
  }

  // savedCuts 배열에서도 제거
  const cutIndex = savedCuts.findIndex((c) => c.id === cutId);
  if (cutIndex >= 0) {
    savedCuts.splice(cutIndex, 1);
  }
}

/**
 * MY 탭의 폴더 섹션에 저장된 컷 표시
 * 폴더가 없을 때 저장된 컷을 직접 표시
 */
function displaySavedCutsInFolders() {
  // 저장된 컷 전체 그리드는 항상 렌더링
  renderSavedCutsGrid();

  const foldersGrid = document.getElementById("folders-grid");
  const foldersEmpty = document.getElementById("folders-empty");

  if (!foldersGrid || !foldersEmpty) return;

  // 폴더가 없으면 빈 상태 표시
  if (folders.length === 0) {
    foldersEmpty.style.display = "flex";
    foldersGrid.innerHTML = "";
    return;
  }

  foldersEmpty.style.display = "none";
  // 폴더 그리드는 loadFolders에서 렌더링됨
}

function backToFolderList() {
  showFolderList();
}

/**
 * 폴더 카드의 썸네일 미리보기 업데이트
 */
async function updateFolderCardPreview(folderId) {
  const folder = folders.find((f) => f.id === folderId);
  if (!folder) return;

  try {
    const firebaseUser = await ensureFirebaseUser();
    if (!firebaseUser) return;

    const supabaseClient = await loadSupabaseClient();
    if (typeof supabaseClient === "undefined" || !supabaseClient) return;

    // 컷 개수 업데이트
    const { count } = await supabaseClient
      .from("reader_folder_cuts")
      .select("*", { count: "exact", head: true })
      .eq("folder_id", folderId);
    folder.cutCount = count || 0;

    // 폴더의 컷 ID 목록 가져오기
    const { data: folderCuts, error: cutsError } = await supabaseClient
      .from("reader_folder_cuts")
      .select("cut_id")
      .eq("folder_id", folderId)
      .order("created_at", { ascending: false })
      .limit(3);

    if (cutsError) {
      console.warn("[폴더] 컷 조회 오류:", cutsError);
      // 에러가 있어도 개수는 업데이트했으므로 계속 진행
    }

    // 썸네일 이미지 URL 추출 (최대 3개)
    const thumbnails = [];
    if (folderCuts && folderCuts.length > 0) {
      const cutIds = folderCuts.map((fc) => fc.cut_id).filter((id) => id);

      if (cutIds.length > 0) {
        // cuts 테이블에서 직접 조회
        const { data: cutsData, error: cutsDataError } = await supabaseClient
          .from("cuts")
          .select("id, image_url")
          .in("id", cutIds);

        if (!cutsDataError && cutsData) {
          // 순서 유지하면서 썸네일 추출
          cutIds.forEach((cutId) => {
            const cut = cutsData.find((c) => c.id === cutId);
            if (cut && cut.image_url) {
              thumbnails.push(cut.image_url);
            }
          });
        }
      }
    }

    // 폴더 카드 DOM 업데이트
    const foldersGrid = document.getElementById("folders-grid");
    if (!foldersGrid) return;

    const folderEl = foldersGrid.querySelector(
      `[data-folder-id="${folderId}"]`
    );
    if (!folderEl) return;

    // 썸네일 영역 업데이트
    const thumbnailEl = folderEl.querySelector(".folder-thumbnail");
    if (thumbnailEl) {
      if (thumbnails.length > 0) {
        // 썸네일 그리드 표시
        thumbnailEl.innerHTML = `
          <div class="folder-thumbnail-grid">
            ${thumbnails
              .map(
                (url) => `
              <img src="${url}" alt="" loading="lazy" />
            `
              )
              .join("")}
          </div>
        `;
      } else {
        // 썸네일이 없으면 이모티콘 표시
        thumbnailEl.innerHTML = `
          <div class="folder-thumbnail-empty">${folder.emoji || "📁"}</div>
        `;
      }
    }

    // 컷 개수 업데이트
    const metaEl = folderEl.querySelector(".folder-meta");
    if (metaEl) {
      const countSpan = metaEl.querySelector("span");
      if (countSpan) {
        countSpan.textContent = `${folder.cutCount || 0}개`;
      }
    }
  } catch (error) {
    console.error("[폴더] 썸네일 업데이트 오류:", error);
  }
}

async function loadFolders() {
  // Check if user is authenticated before loading
  const isAuthenticated = await ensureAuthenticated();
  if (!isAuthenticated) {
    // User not logged in - show empty state
    const foldersGrid = document.getElementById("folders-grid");
    const foldersEmpty = document.getElementById("folders-empty");
    if (foldersGrid && foldersEmpty) {
      foldersEmpty.style.display = "flex";
      foldersGrid.innerHTML = "";
    }
    return;
  }

  const foldersGrid = document.getElementById("folders-grid");
  const foldersEmpty = document.getElementById("folders-empty");

  try {
    const firebaseUser = await ensureFirebaseUser();
    if (!firebaseUser) {
      console.warn("[폴더] 로그인이 필요합니다");
      if (folders.length === 0) {
        foldersEmpty.style.display = "flex";
        foldersGrid.innerHTML = "";
        return;
      }
    } else {
      // Supabase에서 폴더 불러오기
      // reader_folders 테이블이 없을 수 있으므로 에러 처리
      const { data, error } = await supabaseClient
        .from("reader_folders")
        .select("*")
        .eq("reader_id", firebaseUser.uid)
        .order("created_at", { ascending: false });

      if (error) {
        // 테이블이 없으면 정상적인 상황 (아직 생성되지 않음) - 조용하게 처리
        if (error.code === "PGRST205") {
          // 테이블이 없으면 조용하게 처리 (로그 제거)
        } else {
          console.error("[폴더] 폴더 로드 오류:", error);
        }
        // 에러가 있어도 빈 배열로 초기화
        folders = [];
      } else if (data) {
        // 폴더별 컷 개수 및 썸네일 동적으로 계산
        const foldersWithCounts = await Promise.all(
          data.map(async (folder) => {
            let cutCount = 0;
            let thumbnails = [];
            try {
              const { count } = await supabaseClient
                .from("reader_folder_cuts")
                .select("*", { count: "exact", head: true })
                .eq("folder_id", folder.id);
              cutCount = count || 0;

              // 썸네일 가져오기 (최대 3개)
              const { data: folderCuts } = await supabaseClient
                .from("reader_folder_cuts")
                .select("cut_id")
                .eq("folder_id", folder.id)
                .order("created_at", { ascending: false })
                .limit(3);

              if (folderCuts && folderCuts.length > 0) {
                const cutIds = folderCuts
                  .map((fc) => fc.cut_id)
                  .filter((id) => id);

                if (cutIds.length > 0) {
                  // cuts 테이블에서 직접 조회
                  const { data: cutsData } = await supabaseClient
                    .from("cuts")
                    .select("id, image_url")
                    .in("id", cutIds);

                  if (cutsData) {
                    // 순서 유지하면서 썸네일 추출
                    cutIds.forEach((cutId) => {
                      const cut = cutsData.find((c) => c.id === cutId);
                      if (cut && cut.image_url) {
                        thumbnails.push(cut.image_url);
                      }
                    });
                  }
                }
              }
            } catch (e) {
              // 테이블이 없으면 0으로 설정 (에러 무시)
              cutCount = 0;
            }

            return {
              id: folder.id,
              name: folder.name,
              emoji: folder.emoji || "📁",
              readerId: folder.reader_id,
              cuts: [],
              cutCount: cutCount,
              thumbnails: thumbnails,
              isPublic: folder.is_public !== false,
              coverImage: folder.cover_image,
              createdAt: folder.created_at,
            };
          })
        );
        folders = foldersWithCounts;
      } else {
        folders = [];
      }
    }
  } catch (error) {
    console.error("폴더 로드 중 오류:", error);
    folders = [];
  }

  // Display folders (저장된 컷 표시는 displaySavedCutsInFolders에서 처리)
  if (folders.length === 0) {
    // 폴더가 없으면 displaySavedCutsInFolders에서 처리
    return;
  }

  foldersEmpty.style.display = "none";
  foldersGrid.innerHTML = folders
    .map(
      (folder) => `
    <div class="folder-item" 
         data-folder-id="${folder.id}"
         onclick="showFolderContent('${folder.id}')">
      <div class="folder-thumbnail">
        ${
          folder.thumbnails && folder.thumbnails.length > 0
            ? `<div class="folder-thumbnail-grid">
                ${folder.thumbnails
                  .map(
                    (url) => `
                  <img src="${url}" alt="" loading="lazy" />
                `
                  )
                  .join("")}
              </div>`
            : `<div class="folder-thumbnail-empty">${
                folder.emoji || "📁"
              }</div>`
        }
      </div>
      <div class="folder-info">
        <div class="folder-name">${folder.name}</div>
        <div class="folder-meta">
          <span>${folder.cutCount || 0}개</span>
          ${folder.isPublic ? "<span>공개</span>" : "<span>비공개</span>"}
        </div>
      </div>
    </div>
  `
    )
    .join("");

  // 폴더 카드에 drop 이벤트 추가
  foldersGrid.querySelectorAll(".folder-item").forEach((folderEl, index) => {
    const folder = folders[index];
    if (folder) {
      folderEl.addEventListener("dragover", (e) => {
        e.preventDefault();
        e.stopPropagation();
        folderEl.classList.add("drag-over");
      });

      folderEl.addEventListener("dragleave", (e) => {
        e.preventDefault();
        e.stopPropagation();
        folderEl.classList.remove("drag-over");
      });

      folderEl.addEventListener("drop", async (e) => {
        e.preventDefault();
        e.stopPropagation();
        folderEl.classList.remove("drag-over");

        const cutId = e.dataTransfer.getData("cutId");
        if (!cutId) return;

        try {
          const supabaseClient = await loadSupabaseClient();
          if (typeof supabaseClient === "undefined" || !supabaseClient) {
            return;
          }

          const firebaseUser = await ensureFirebaseUser();
          if (!firebaseUser) {
            return;
          }

          // reader_folder_cuts에 INSERT (중복 무시)
          const { error } = await supabaseClient
            .from("reader_folder_cuts")
            .insert({
              folder_id: folder.id,
              cut_id: cutId,
              reader_id: firebaseUser.uid,
              order_index: 0,
            });

          if (error) {
            // 중복 오류는 무시 (이미 폴더에 있는 경우)
            if (error.code !== "23505") {
              console.error("[폴더] 컷 추가 오류:", error);
            }
          }

          // 폴더 카드 UI 업데이트
          await updateFolderCardPreview(folder.id);
        } catch (error) {
          console.error("[폴더] 드롭 처리 오류:", error);
        }
      });
    }
  });
}

async function loadFolderCuts(folderId) {
  const cutsGrid = document.getElementById("folder-cuts-grid");
  const cutsEmpty = document.getElementById("folder-cuts-empty");
  const folder = folders.find((f) => f.id === folderId);

  if (!folder) {
    cutsEmpty.style.display = "flex";
    cutsGrid.innerHTML = "";
    return;
  }

  try {
    const firebaseUser = await ensureFirebaseUser();
    if (firebaseUser) {
      const supabaseClient = await loadSupabaseClient();
      if (typeof supabaseClient === "undefined" || !supabaseClient) {
        console.warn("[폴더 컷] Supabase 클라이언트를 사용할 수 없습니다");
        return;
      }

      // Supabase에서 폴더 내 컷 불러오기
      // reader_folder_cuts 테이블이 없을 수 있으므로 에러 처리
      const { data, error } = await supabaseClient
        .from("reader_folder_cuts")
        .select("*, cuts(image_url)")
        .eq("folder_id", folderId)
        .eq("reader_id", firebaseUser.uid)
        .order("created_at", { ascending: false });

      if (error) {
        // 테이블이 없으면 정상적인 상황
        if (error.code === "PGRST205") {
          console.log(
            "[폴더 컷] reader_folder_cuts 테이블이 아직 생성되지 않았습니다"
          );
        } else {
          console.error("[폴더 컷] 폴더 컷 로드 오류:", error);
        }
      } else if (data && data.length > 0) {
        folder.cuts = data.map((item) => ({
          id: item.cut_id,
          imageUrl: item.cuts?.image_url || item.image_url,
          folderId: item.folder_id,
          createdAt: item.created_at,
        }));
      } else {
        folder.cuts = [];
      }
    }
  } catch (error) {
    console.error("폴더 컷 로드 중 오류:", error);
  }

  if (!folder.cuts || folder.cuts.length === 0) {
    cutsEmpty.style.display = "flex";
    cutsGrid.innerHTML = "";
    return;
  }

  cutsEmpty.style.display = "none";
  cutsGrid.innerHTML = folder.cuts
    .map(
      (cut) => `
    <div class="folder-cut-item">
      <img src="${cut.imageUrl}" alt="Saved cut" loading="lazy" />
    </div>
  `
    )
    .join("");
}

function createNewFolder() {
  openFolderNameModal("create");
}

let selectedFolderEmoji = "📁"; // 기본 이모티콘

function selectFolderEmoji(emoji) {
  selectedFolderEmoji = emoji;
  const display = document.getElementById("selectedFolderEmoji");
  if (display) {
    display.textContent = emoji;
  }
  // 선택된 이모티콘 강조
  document.querySelectorAll(".emoji-option").forEach((btn) => {
    btn.classList.remove("selected");
    if (btn.dataset.emoji === emoji) {
      btn.classList.add("selected");
    }
  });
}

function openFolderNameModal(mode, folderId = null) {
  const modal = document.getElementById("folderNameModal");
  const title = document.getElementById("folder-name-title");
  const input = document.getElementById("folderNameInput");
  const emojiSelector = document.querySelector(".folder-emoji-selector");

  if (mode === "create") {
    title.textContent = "새 폴더 만들기";
    input.value = "";
    selectedFolderEmoji = "📁"; // 기본값으로 리셋
    selectFolderEmoji("📁");
    // 이모티콘 선택 UI 표시
    if (emojiSelector) {
      emojiSelector.style.display = "block";
    }
  } else {
    const folder = folders.find((f) => f.id === folderId);
    title.textContent = "폴더 이름 변경";
    input.value = folder ? folder.name : "";
    selectedFolderEmoji = folder?.emoji || "📁";
    selectFolderEmoji(selectedFolderEmoji);
    // 이모티콘 선택 UI 표시
    if (emojiSelector) {
      emojiSelector.style.display = "block";
    }
  }

  modal.classList.add("active");
  input.focus();
}

window.selectFolderEmoji = selectFolderEmoji;

function closeFolderNameModal() {
  document.getElementById("folderNameModal").classList.remove("active");
}

async function saveFolderName() {
  // Check if user is authenticated (더 강력한 체크)
  let isAuthenticated = await ensureAuthenticated();

  // ensureAuthenticated가 실패하면 직접 Firebase Auth 확인
  if (!isAuthenticated) {
    try {
      const { auth } = await import("/js/firebase_init.js");
      const { onAuthStateChanged } = await import(
        "https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js"
      );

      const user = await new Promise((resolve) => {
        const unsubscribe = onAuthStateChanged(auth, (user) => {
          unsubscribe();
          resolve(user);
        });
      });

      if (user && user.uid) {
        currentUserId = user.uid;
        isAuthenticated = true;
      }
    } catch (error) {
      console.error("[폴더] 인증 확인 오류:", error);
    }
  }

  if (!isAuthenticated) {
    alert("로그인이 필요합니다");
    closeFolderNameModal();
    return;
  }

  const input = document.getElementById("folderNameInput");
  const name = input.value.trim();

  if (!name) {
    alert("폴더 이름을 입력하세요");
    return;
  }

  try {
    const firebaseUser = await ensureFirebaseUser();
    if (!firebaseUser) {
      alert("로그인이 필요합니다");
      closeFolderNameModal();
      return;
    }

    const supabaseClient = await loadSupabaseClient();
    if (typeof supabaseClient === "undefined" || !supabaseClient) {
      alert("저장 기능을 사용할 수 없습니다.");
      closeFolderNameModal();
      return;
    }

    // 선택된 이모티콘 가져오기
    const emoji = selectedFolderEmoji || "📁";

    // Supabase에 폴더 저장
    // reader_folders 테이블이 없을 수 있으므로 에러 처리
    // ALWAYS include reader_id from Firebase user
    const { data, error } = await supabaseClient
      .from("reader_folders")
      .insert({
        reader_id: firebaseUser.uid,
        name: name,
        emoji: emoji,
        is_public: true,
      })
      .select()
      .single();

    if (error) {
      // 테이블이 없으면 조용하게 처리하고 로컬에만 저장
      if (error.code === "PGRST205") {
        console.log("[폴더] reader_folders 테이블이 없어 로컬에만 저장합니다.");
        // 로컬에만 저장
        const newFolder = {
          id: `folder_${Date.now()}`,
          name: name,
          emoji: emoji,
          readerId: currentUserId,
          cuts: [],
          cutCount: 0,
          isPublic: true,
          createdAt: new Date().toISOString(),
        };
        folders.push(newFolder);
        loadFolders();
        closeFolderNameModal();
        return;
      } else {
        console.error("[폴더] 폴더 저장 오류:", error);
        alert(
          "폴더 저장에 실패했습니다: " + (error.message || "알 수 없는 오류")
        );
      }
      return;
    }

    // 폴더 내 컷 개수 동적으로 계산 (초기값은 0)
    let cutCount = 0;
    try {
      const supabaseClient = await loadSupabaseClient();
      if (typeof supabaseClient !== "undefined" && supabaseClient) {
        const { count } = await supabaseClient
          .from("reader_folder_cuts")
          .select("*", { count: "exact", head: true })
          .eq("folder_id", data.id);
        cutCount = count || 0;
      }
    } catch (e) {
      // 테이블이 없으면 0으로 설정
      cutCount = 0;
    }

    const newFolder = {
      id: data.id,
      name: data.name,
      emoji: data.emoji || emoji,
      readerId: data.reader_id,
      cuts: [],
      cutCount: cutCount,
      isPublic: data.is_public !== false,
      coverImage: data.cover_image,
      createdAt: data.created_at,
    };

    folders.push(newFolder);
    closeFolderNameModal();
    loadFolders();
  } catch (error) {
    console.error("폴더 저장 중 오류:", error);
    alert("폴더 저장에 실패했습니다.");
  }
}

function openFolderMenu() {
  document.getElementById("folderMenuModal").classList.add("active");
}

function closeFolderMenu() {
  document.getElementById("folderMenuModal").classList.remove("active");
}

function renameCurrentFolder() {
  if (!currentFolderId) return;
  closeFolderMenu();
  openFolderNameModal("edit", currentFolderId);
}

function toggleFolderPrivacy() {
  // TODO: Implement
  closeFolderMenu();
  alert("공개/비공개 전환 기능은 준비 중입니다");
}

function deleteCurrentFolder() {
  if (!currentFolderId) return;
  if (!confirm("이 폴더를 삭제하시겠습니까?")) return;

  // TODO: Replace with Supabase delete
  folders = folders.filter((f) => f.id !== currentFolderId);
  closeFolderMenu();
  showFolderList();
}

// =========================
// MOODBOARD MANAGEMENT
// =========================

async function loadMoodboards() {
  // Check if user is authenticated before loading
  const isAuthenticated = await ensureAuthenticated();
  if (!isAuthenticated) {
    // User not logged in - show empty state
    const moodboardsGrid = document.getElementById("moodboards-grid");
    const moodboardsEmpty = document.getElementById("moodboards-empty");
    if (moodboardsGrid && moodboardsEmpty) {
      moodboardsEmpty.style.display = "flex";
      moodboardsGrid.innerHTML = "";
    }
    return;
  }

  // localStorage에서 캐시된 무드보드 로드 (빠른 표시를 위해)
  try {
    const cachedMoodboards = localStorage.getItem("moodboards_cache");
    const cacheTimestamp = localStorage.getItem("moodboards_cache_timestamp");
    if (cachedMoodboards && cacheTimestamp) {
      const cacheAge = Date.now() - parseInt(cacheTimestamp);
      // 5분 이내의 캐시만 사용
      if (cacheAge < 5 * 60 * 1000) {
        const parsed = JSON.parse(cachedMoodboards);
        if (parsed && parsed.length > 0) {
          moodboards = parsed;
          console.log("[무드보드] 캐시에서 로드:", moodboards.length);
        }
      }
    }
  } catch (e) {
    console.warn("[무드보드] 캐시 로드 실패:", e);
  }

  const moodboardsGrid = document.getElementById("moodboards-grid");
  const moodboardsEmpty = document.getElementById("moodboards-empty");

  try {
    const firebaseUser = await ensureFirebaseUser();
    if (!firebaseUser) {
      console.warn("[무드보드] 로그인이 필요합니다");
      if (moodboardsGrid && moodboardsEmpty) {
        moodboardsEmpty.style.display = "flex";
        moodboardsGrid.innerHTML = "";
      }
      return;
    }

    const supabaseClient = await loadSupabaseClient();
    if (typeof supabaseClient === "undefined" || !supabaseClient) {
      console.warn("[무드보드] Supabase 클라이언트를 사용할 수 없습니다");
      if (moodboardsGrid && moodboardsEmpty) {
        moodboardsEmpty.style.display = "flex";
        moodboardsGrid.innerHTML = "";
      }
      return;
    }

    // 독자는 user_feed_events에서만 조회
    // updated_at 컬럼이 없으므로 created_at만 선택
    let query = supabaseClient
      .from("user_feed_events")
      .select("id, metadata, created_at")
      .eq("user_id", firebaseUser.uid)
      .eq("event_type", "moodboard_created");

    // order를 적용 (에러 발생 시 제거)
    try {
      query = query.order("created_at", { ascending: false });
    } catch (orderError) {
      console.warn("[무드보드] order 적용 실패, 정렬 없이 진행:", orderError);
    }

    const { data: eventsData, error: eventsError } = await query.limit(1000);

    if (eventsError) {
      console.error("[무드보드] 로드 오류:", eventsError);
      console.error(
        "[무드보드] 에러 상세:",
        JSON.stringify(eventsError, null, 2)
      );
      console.error("[무드보드] 쿼리 파라미터:", {
        user_id: firebaseUser.uid,
        event_type: "moodboard_created",
      });
      // 에러가 있어도 로컬 데이터는 유지
      if (moodboards.length === 0) {
        moodboards = [];
      }
      return; // 에러 발생 시 조기 반환하여 로컬 데이터 보존
    }

    // 데이터를 정렬 (order가 실패한 경우를 대비)
    if (eventsData && eventsData.length > 0) {
      eventsData.sort((a, b) => {
        const dateA = new Date(a.created_at || 0);
        const dateB = new Date(b.created_at || 0);
        return dateB - dateA; // 내림차순
      });
    }

    if (!eventsError && eventsData && eventsData.length > 0) {
      const loadedMoodboards = eventsData.map((event) => {
        const metadata = event.metadata || {};
        const moodboardData = metadata.moodboard_data || metadata || {};

        return {
          id: metadata.moodboard_id || event.id,
          name: moodboardData.name || metadata.name || "무드보드",
          creatorId: currentUserId,
          template: moodboardData.template || metadata.template || "freeform",
          blocks: moodboardData.blocks || metadata.blocks || [],
          thumbnail: moodboardData.thumbnail || metadata.thumbnail,
          backgroundColor:
            moodboardData.backgroundColor ||
            metadata.backgroundColor ||
            "#fafafa",
          isRepresentative:
            moodboardData.isRepresentative === true ||
            moodboardData.isRepresentative === "true" ||
            metadata.isRepresentative === true ||
            metadata.isRepresentative === "true" ||
            (eventsData.length > 0 && event === eventsData[0]), // 첫 번째 무드보드는 자동으로 대표
          isPublic: moodboardData.isPublic !== false,
          createdAt: event.created_at,
        };
      });

      // 로컬에 저장된 무드보드와 병합 (로컬 데이터 우선)
      const localMoodboardIds = new Set(moodboards.map((m) => m.id));
      const newMoodboards = loadedMoodboards.filter(
        (m) => !localMoodboardIds.has(m.id)
      );
      moodboards = [...moodboards, ...newMoodboards];

      // localStorage에 저장
      try {
        localStorage.setItem("moodboards_cache", JSON.stringify(moodboards));
        localStorage.setItem(
          "moodboards_cache_timestamp",
          Date.now().toString()
        );
      } catch (e) {
        console.warn("[무드보드] localStorage 저장 실패:", e);
      }
    } else if (eventsError) {
      // 에러가 있어도 로컬 데이터는 유지
      console.warn(
        "[무드보드] DB 로드 실패, 로컬 데이터 유지:",
        moodboards.length
      );
    } else {
      // 데이터가 없어도 로컬 데이터는 유지
      console.log(
        "[무드보드] DB에 데이터 없음, 로컬 데이터 유지:",
        moodboards.length
      );
    }
  } catch (error) {
    console.error("[무드보드] 로드 오류:", error);
    // 에러가 있어도 로컬 데이터는 유지
    if (moodboards.length === 0) {
      moodboards = [];
    }
  }

  // 무드보드 리스트 렌더링
  renderMoodboards(moodboards);
}

/**
 * 무드보드 리스트 렌더링 (단일 함수로 통일)
 */
function renderMoodboards(moodboardsList) {
  const moodboardsGrid = document.getElementById("moodboards-grid");
  const moodboardsEmpty = document.getElementById("moodboards-empty");

  if (!moodboardsGrid || !moodboardsEmpty) return;

  if (!moodboardsList || moodboardsList.length === 0) {
    moodboardsEmpty.style.display = "flex";
    moodboardsGrid.innerHTML = "";
    return;
  }

  moodboardsEmpty.style.display = "none";
  moodboardsGrid.innerHTML = moodboardsList
    .map(
      (moodboard) => `
    <div class="moodboard-item" data-moodboard-id="${moodboard.id}">
      <div class="moodboard-thumbnail">
        ${
          moodboard.thumbnail
            ? `<img src="${moodboard.thumbnail}" alt="${moodboard.name}" loading="lazy" />`
            : `<div class="moodboard-placeholder">🎨</div>`
        }
      </div>
      <div class="moodboard-info">
        <div class="moodboard-name">${moodboard.name}</div>
        <div class="moodboard-meta">
          ${moodboard.isPublic ? "<span>공개</span>" : "<span>비공개</span>"}
        </div>
      </div>
      <button class="moodboard-menu-btn" data-action="menu" data-moodboard-id="${
        moodboard.id
      }">⋯</button>
    </div>
  `
    )
    .join("");

  // 이벤트 위임으로 클릭 이벤트 처리
  if (moodboardsGrid) {
    // 기존 이벤트 리스너 제거 후 재등록
    moodboardsGrid.replaceWith(moodboardsGrid.cloneNode(true));
    const newGrid = document.getElementById("moodboards-grid");

    newGrid.addEventListener("click", (e) => {
      const menuBtn = e.target.closest(".moodboard-menu-btn");
      if (menuBtn) {
        e.stopPropagation();
        const moodboardId = menuBtn.dataset.moodboardId;
        if (moodboardId) {
          openMoodboardMenu(moodboardId);
        }
        return;
      }

      const moodboardItem = e.target.closest(".moodboard-item");
      if (moodboardItem) {
        const moodboardId = moodboardItem.dataset.moodboardId;
        if (moodboardId) {
          openMoodboardEditor(moodboardId);
        }
      }
    });
  }
}

async function loadFeaturedMoodboard() {
  const featuredContent = document.getElementById("featured-content");
  const featuredEmpty = document.getElementById("featured-empty");
  const moodboardsSection = document.querySelector(".moodboards-section");
  const moodboardsGrid = document.getElementById("moodboards-grid");

  console.log("[대표 무드보드] 로드 시작, 무드보드 개수:", moodboards.length);

  // DB에서 대표 무드보드 ID 가져오기
  let dbFeaturedMoodboardId = null;
  try {
    const firebaseUser = await ensureFirebaseUser();
    if (firebaseUser) {
      const supabaseClient = await loadSupabaseClient();
      if (typeof supabaseClient !== "undefined" && supabaseClient) {
        try {
          const { data } = await supabaseClient
            .from("reader_profiles")
            .select("featured_moodboard_id")
            .eq("reader_id", firebaseUser.uid)
            .single();
          if (data && data.featured_moodboard_id) {
            dbFeaturedMoodboardId = data.featured_moodboard_id;
            console.log(
              "[대표 무드보드] DB에서 가져온 ID:",
              dbFeaturedMoodboardId
            );
          }
        } catch (e) {
          console.warn("[대표 무드보드] DB에서 ID 로드 실패:", e);
          // localStorage에서 가져오기
          dbFeaturedMoodboardId = localStorage.getItem(
            `featured_moodboard_id_${firebaseUser.uid}`
          );
        }
      } else {
        // Supabase를 사용할 수 없으면 localStorage에서 가져오기
        dbFeaturedMoodboardId = localStorage.getItem(
          `featured_moodboard_id_${firebaseUser.uid}`
        );
      }
    }
  } catch (e) {
    console.warn("[대표 무드보드] 대표 ID 로드 실패:", e);
  }

  // DB에서 가져온 ID로 대표 무드보드 플래그 설정
  if (dbFeaturedMoodboardId) {
    moodboards.forEach((m) => {
      m.isRepresentative = m.id === dbFeaturedMoodboardId;
    });
  }

  // 대표 무드보드 찾기 (isRepresentative가 true인 것 또는 첫 번째 무드보드)
  let featured = moodboards.find((m) => {
    // 여러 방법으로 확인
    return (
      m.isRepresentative === true ||
      m.isRepresentative === "true" ||
      (typeof m.isRepresentative === "string" &&
        m.isRepresentative.toLowerCase() === "true")
    );
  });

  console.log(
    "[대표 무드보드] 무드보드 목록:",
    moodboards.map((m) => ({
      id: m.id,
      name: m.name,
      isRepresentative: m.isRepresentative,
      isRepresentativeType: typeof m.isRepresentative,
    }))
  );

  // 대표 무드보드가 없으면 첫 번째 무드보드를 대표로 설정
  if (!featured && moodboards.length > 0) {
    featured = moodboards[0];
    featured.isRepresentative = true;
    console.log("[대표 무드보드] 첫 번째 무드보드를 대표로 설정:", featured.id);
  }

  if (!featured || moodboards.length === 0) {
    console.log("[대표 무드보드] 대표 무드보드 없음");
    if (featuredContent) featuredContent.style.display = "none";
    if (featuredEmpty) featuredEmpty.style.display = "flex";
    // "대표 변경" 버튼 숨기기
    const changeBtn = document.getElementById("featured-change-btn");
    if (changeBtn) changeBtn.style.display = "none";
    // 편집 버튼 숨기기
    const editBtn = document.getElementById("featured-edit-btn");
    if (editBtn) editBtn.style.display = "none";
    // 다른 무드보드 프리뷰 숨기기
    const otherSection = document.getElementById("other-moodboards-section");
    if (otherSection) otherSection.style.display = "none";
    // 무드보드 섹션은 항상 표시
    if (moodboardsSection) moodboardsSection.style.display = "block";
    if (moodboardsGrid) moodboardsGrid.style.display = "grid";
    return;
  }

  console.log(
    "[대표 무드보드] 대표 무드보드 찾음:",
    featured.name,
    featured.id
  );

  if (featuredEmpty) featuredEmpty.style.display = "none";

  // "대표 변경" 버튼 표시 (무드보드가 2개 이상일 때만)
  const changeBtn = document.getElementById("featured-change-btn");
  if (changeBtn) {
    if (moodboards.length > 1) {
      changeBtn.style.display = "block";
    } else {
      changeBtn.style.display = "none";
    }
  }

  if (featuredContent) {
    featuredContent.style.display = "block";

    // 대표 무드 문구 표시
    const featuredMoodText = document.getElementById("featured-mood-text");
    const moodText = await getFeaturedMoodText(); // 로컬 스토리지 또는 Supabase에서 가져오기
    if (moodText && featuredMoodText) {
      featuredMoodText.textContent = moodText;
      featuredMoodText.style.display = "block";
    } else if (featuredMoodText) {
      featuredMoodText.style.display = "none";
    }

    // 배경색 설정
    const bgColor = featured.backgroundColor || "#fafafa";
    featuredContent.style.backgroundColor = bgColor;

    // 감상용 무드보드 렌더링 (의미 기반 재배치)
    if (featured.blocks && featured.blocks.length > 0) {
      // 블록을 visual_weight와 is_primary 기반으로 분류
      const primaryBlocks = [];
      const mediumBlocks = [];
      const smallBlocks = [];

      featured.blocks.forEach((blockData) => {
        const isPrimary =
          blockData.is_primary === true || blockData.is_primary === "true";
        const visualWeight = blockData.visual_weight || "medium";

        if (isPrimary || visualWeight === "large") {
          primaryBlocks.push(blockData);
        } else if (visualWeight === "small") {
          smallBlocks.push(blockData);
        } else {
          mediumBlocks.push(blockData);
        }
      });

      // 감상용 레이아웃 구조 생성
      featuredContent.innerHTML = "";
      featuredContent.className = "featured-content moodboard-view";

      // Primary 영역 (상단 크게 1개만)
      if (primaryBlocks.length > 0) {
        const primarySection = document.createElement("div");
        primarySection.className = "moodboard-primary";
        const primaryBlock = createMoodboardBlockElement(
          primaryBlocks[0],
          "primary"
        );
        primarySection.appendChild(primaryBlock);
        featuredContent.appendChild(primarySection);
      }

      // Medium 영역 (중단 2개)
      if (mediumBlocks.length > 0) {
        const mediumSection = document.createElement("div");
        mediumSection.className = "moodboard-secondary";
        mediumBlocks.slice(0, 2).forEach((blockData) => {
          const blockEl = createMoodboardBlockElement(blockData, "medium");
          mediumSection.appendChild(blockEl);
        });
        featuredContent.appendChild(mediumSection);
      }

      // Small 영역 (하단 2~3개)
      if (smallBlocks.length > 0) {
        const smallSection = document.createElement("div");
        smallSection.className = "moodboard-tertiary";
        smallBlocks.slice(0, 3).forEach((blockData) => {
          const blockEl = createMoodboardBlockElement(blockData, "small");
          smallSection.appendChild(blockEl);
        });
        featuredContent.appendChild(smallSection);
      }

      // 블록이 없으면 기본 레이아웃 사용 (하위 호환성)
      if (
        primaryBlocks.length === 0 &&
        mediumBlocks.length === 0 &&
        smallBlocks.length === 0
      ) {
        featured.blocks.forEach((blockData) => {
          const blockEl = createMoodboardBlockElement(blockData, "medium");
          featuredContent.appendChild(blockEl);
        });
      }
    } else {
      // 블록이 없으면 텍스트만 표시
      featuredContent.className = "featured-content has-text-only";
      featuredContent.innerHTML = `
        <div style="font-size: 24px; font-weight: 600; color: #000;">
          ${featured.name || "대표 무드보드"}
        </div>
      `;
    }

    // 편집 버튼 표시 (내 계정일 때만)
    const editBtn = document.getElementById("featured-edit-btn");
    if (editBtn) {
      editBtn.style.display = "block";
    }

    // 설정 버튼 표시 (내 계정일 때만)
    const settingBtn = document.getElementById("profile-setting-btn");
    if (settingBtn) {
      settingBtn.style.display = "block";
    }
  }

  // 다른 무드보드 프리뷰 표시 (대표 무드보드 제외)
  await loadOtherMoodboardsPreview(featured?.id);

  // 무드보드 그리드는 MY 탭에서만 표시 (MY MOOD 탭에서는 제거됨)
  // loadMoodboards()는 MY 탭에서만 호출됨
}

/**
 * 다른 무드보드 프리뷰 3개 표시
 */
async function loadOtherMoodboardsPreview(excludeMoodboardId) {
  const otherSection = document.getElementById("other-moodboards-section");
  const otherGrid = document.getElementById("other-moodboards-grid");

  if (!otherSection || !otherGrid) return;

  // 대표 무드보드를 제외한 무드보드 3개 (공개 여부 무관)
  const otherMoodboards = moodboards
    .filter((m) => m.id !== excludeMoodboardId)
    .slice(0, 3);

  if (otherMoodboards.length === 0) {
    otherSection.style.display = "none";
    return;
  }

  otherSection.style.display = "block";
  otherGrid.innerHTML = otherMoodboards
    .map((moodboard) => {
      // 썸네일 찾기: thumbnail 속성 또는 첫 번째 이미지 블록
      let thumbnail = moodboard.thumbnail;
      if (!thumbnail && moodboard.blocks && moodboard.blocks.length > 0) {
        const firstImageBlock = moodboard.blocks.find(
          (b) => b.type === "image" && b.imageUrl
        );
        if (firstImageBlock) {
          thumbnail = firstImageBlock.imageUrl;
        }
      }
      if (!thumbnail) {
        thumbnail =
          "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='100'%3E%3Crect width='100' height='100' fill='%23f5f5f5'/%3E%3C/svg%3E";
      }

      return `
      <div class="other-moodboard-item" onclick="openMoodboardEditor('${
        moodboard.id
      }')">
        <img src="${thumbnail}" alt="${
        moodboard.name || "무드보드"
      }" loading="lazy" />
      </div>
    `;
    })
    .join("");
}

/**
 * 감상용 무드보드 블록 요소 생성
 */
function createMoodboardBlockElement(blockData, size = "medium") {
  const blockEl = document.createElement("div");
  blockEl.className = `moodboard-block moodboard-block-${size}`;

  // 크기별 스타일 적용
  if (size === "primary") {
    blockEl.style.width = "100%";
    blockEl.style.minHeight = "300px";
    blockEl.style.marginBottom = "24px";
  } else if (size === "medium") {
    blockEl.style.width = "100%";
    blockEl.style.minHeight = "200px";
    blockEl.style.marginBottom = "16px";
  } else {
    blockEl.style.width = "100%";
    blockEl.style.minHeight = "150px";
    blockEl.style.marginBottom = "12px";
  }

  blockEl.style.overflow = "hidden";
  blockEl.style.borderRadius = "8px";

  if (blockData.type === "image" && blockData.imageUrl) {
    const img = document.createElement("img");
    img.src = blockData.imageUrl;
    img.style.width = "100%";
    img.style.height = "100%";
    img.style.objectFit = "cover";
    img.style.display = "block";
    blockEl.appendChild(img);

    // 필터 적용
    if (blockData.filter && blockData.filter !== "none") {
      img.style.filter = blockData.filter;
    }
  } else if (blockData.type === "text" && blockData.text) {
    blockEl.style.display = "flex";
    blockEl.style.alignItems = "center";
    blockEl.style.justifyContent = "center";
    blockEl.style.padding =
      size === "primary" ? "24px" : size === "medium" ? "16px" : "12px";

    const fontSize = size === "primary" ? 24 : size === "medium" ? 18 : 14;
    blockEl.style.fontSize = `${blockData.fontSize || fontSize}px`;
    blockEl.style.fontWeight = blockData.fontWeight || "600";
    blockEl.style.color = blockData.color || "#333";
    blockEl.style.fontFamily = blockData.fontFamily || "Pretendard, sans-serif";
    blockEl.style.wordWrap = "break-word";
    blockEl.style.overflowWrap = "break-word";
    blockEl.style.textAlign = "center";
    blockEl.style.whiteSpace = "pre-wrap";
    blockEl.textContent = blockData.text;
  }

  return blockEl;
}

function createNewMoodboard() {
  document.getElementById("moodboardCreateModal").classList.add("active");
}

function closeMoodboardCreateModal() {
  document.getElementById("moodboardCreateModal").classList.remove("active");
}

function backToCreateOptions() {
  document.getElementById("templateSelectModal").classList.remove("active");
  document.getElementById("moodboardCreateModal").classList.add("active");
}

function startFreeformMoodboard() {
  currentTemplate = null;
  closeMoodboardCreateModal();
  openMoodboardEditor(null, "freeform");
}

function showTemplates() {
  document.getElementById("moodboardCreateModal").classList.remove("active");
  document.getElementById("templateSelectModal").classList.add("active");
}

function closeTemplateSelectModal() {
  document.getElementById("templateSelectModal").classList.remove("active");
}

function selectTemplate(templateName) {
  currentTemplate = templateName;
  closeTemplateSelectModal();
  openMoodboardEditor(null, templateName);
}

/**
 * 캔버스 비율 가이드 적용
 */
const CANVAS_RATIOS = {
  free: null,
  square: { w: 1, h: 1 },
  portrait: { w: 4, h: 5 },
  landscape: { w: 16, h: 9 },
};

function applyCanvasRatio(ratioKey) {
  const canvas = document.getElementById("editor-moodboard-canvas");
  if (!canvas) return;

  const ratio = CANVAS_RATIOS[ratioKey];
  if (!ratio) {
    // 자유 비율: aspect-ratio 제거
    canvas.style.aspectRatio = "";
    canvas.style.maxWidth = "100%";
    canvas.style.maxHeight = "none";
    canvas.classList.remove("canvas-ratio-guide");
  } else {
    // 비율 가이드 적용 (시각적 프레임만)
    canvas.style.aspectRatio = `${ratio.w} / ${ratio.h}`;
    canvas.style.maxWidth = "100%";
    canvas.style.maxHeight = "80vh";
    canvas.classList.add("canvas-ratio-guide");
  }

  // 선택된 값 저장
  if (canvas.dataset) {
    canvas.dataset.ratio = ratioKey;
  }
}

async function openMoodboardEditor(moodboardId, template = null) {
  currentMoodboardId = moodboardId;
  isEditMode = !!moodboardId;

  const modal = document.getElementById("moodboardEditorModal");
  if (!modal) {
    console.error("[무드보드 편집기] 모달을 찾을 수 없습니다");
    return;
  }

  const title = document.getElementById("editor-title");
  const canvas = document.getElementById("editor-moodboard-canvas");
  if (!canvas) {
    console.error("[무드보드 편집기] 캔버스를 찾을 수 없습니다");
    return;
  }

  // 저장된 컷이 없으면 먼저 불러오기 (항상 최신 데이터 로드)
  console.log("[무드보드 편집기] 저장된 컷 로드 시작");
  await loadSavedCuts();
  console.log("[무드보드 편집기] 저장된 컷 로드 완료:", savedCuts.length);

  // 제목 입력 필드 설정
  const titleInput = document.getElementById("editor-title-input");
  if (titleInput) {
    if (isEditMode) {
      const moodboard = moodboards.find((m) => m.id === moodboardId);
      titleInput.value = moodboard ? moodboard.name : "새 무드보드";
    } else {
      titleInput.value = "새 무드보드";
    }
  }

  // 기존 title 요소는 숨기기 (하위 호환성)
  if (title) {
    title.style.display = "none";
  }

  // 무드보드 변수 선언 (블록 밖에서 사용하기 위해)
  let moodboard = null;
  if (isEditMode) {
    moodboard = moodboards.find((m) => m.id === moodboardId);

    // 기존 무드보드 데이터 로드
    if (moodboard && moodboard.blocks && moodboard.blocks.length > 0) {
      // 기존 블록 로드
      canvas.innerHTML = "";
      moodboard.blocks.forEach((blockData) => {
        if (blockData.type === "image") {
          createImageBlock(
            blockData.imageUrl,
            blockData.x,
            blockData.y,
            blockData.width,
            blockData.height,
            blockData.rotation || 0
          );
        } else if (blockData.type === "text") {
          const textBlock = createTextBlock(
            blockData.text || "텍스트",
            blockData.x,
            blockData.y,
            blockData.width,
            blockData.height,
            blockData.rotation || 0
          );
          // 텍스트 스타일 적용
          if (textBlock && blockData.fontSize) {
            const textContent = textBlock.querySelector(".text-content");
            if (textContent) {
              textContent.style.fontSize = blockData.fontSize + "px";
              textContent.style.fontWeight = blockData.fontWeight || "600";
              textContent.style.color = blockData.color || "#333";
              textContent.style.fontFamily =
                blockData.fontFamily || "Pretendard, sans-serif";
            }
          }
        }
      });
    } else {
      // 기존 데이터가 없으면 빈 캔버스
      initializeFreeformCanvas(canvas);
    }
  } else {
    title.textContent = "새 무드보드";
    // Initialize with template or freeform (완전히 빈 상태)
    if (template) {
      initializeCanvasWithTemplate(canvas, template);
    } else {
      initializeFreeformCanvas(canvas);
    }
  }

  // 기존 무드보드의 배경색 복원
  if (isEditMode && moodboard && moodboard.backgroundColor) {
    console.log("[무드보드 편집기] 배경색 복원:", moodboard.backgroundColor);
    const bgColor = moodboard.backgroundColor;
    // CSS 직접 조작으로 강제 적용
    canvas.style.setProperty("background-color", bgColor, "important");
    canvas.style.setProperty("background-image", "none", "important");
    canvas.style.setProperty("background-size", "auto", "important");
    // data 속성에도 저장
    canvas.setAttribute("data-bg-color", bgColor);
    // 클래스 추가로 강제 적용
    canvas.classList.add("custom-bg-color");
    canvas.setAttribute("data-bg-color-value", bgColor);
    // CSS 변수로도 설정
    canvas.style.setProperty("--bg-color-value", bgColor);
    console.log(
      "[무드보드 편집기] 배경색 복원 완료:",
      canvas.style.backgroundColor
    );
  } else {
    // 캔버스 배경색 명시적으로 설정
    canvas.style.backgroundColor = "#fafafa";
    canvas.style.backgroundImage = `repeating-linear-gradient(
      0deg,
      transparent,
      transparent 24px,
      rgba(0, 0, 0, 0.03) 24px,
      rgba(0, 0, 0, 0.03) 25px
    )`;
    canvas.style.backgroundSize = "100% 25px";
  }

  await loadEditorFolders();

  // 되돌리기 기능 초기화
  initUndoSystem();

  // 드롭 이벤트 설정 (약간의 지연 후 실행하여 DOM이 완전히 렌더링된 후 설정)
  setTimeout(() => {
    setupCanvasDropEvents();

    // 캔버스 클릭 시 스타일 패널 숨기기
    if (canvas) {
      canvas.addEventListener("click", (e) => {
        // 블록을 클릭한 경우가 아니면 스타일 패널 숨기기
        if (!e.target.closest(".canvas-block")) {
          hideBlockStylePanel();
        }
      });
    }
  }, 100);

  // 저장된 컷이 있으면 "전체" 폴더 선택하여 표시
  if (savedCuts.length > 0) {
    await selectEditorFolder(null);
  }

  modal.classList.add("active");
}

function closeMoodboardEditor() {
  document.getElementById("moodboardEditorModal").classList.remove("active");
  currentMoodboardId = null;
  currentTemplate = null;
  isEditMode = false;
}

function initializeFreeformCanvas(canvas) {
  // 기존 클래스와 스타일 제거
  canvas.className = "editor-moodboard-canvas canvas-freeform";
  canvas.innerHTML = "";

  // 인라인 스타일로 명확하게 빈 캔버스 설정
  canvas.style.cssText = `
    position: relative;
    min-height: 600px;
    background: #fafafa;
    border: 1px dashed #ddd;
    border-radius: 8px;
    padding: 20px;
    width: 100%;
    box-sizing: border-box;
  `;

  // 기존 템플릿 스타일 제거를 위해 모든 클래스 제거 후 다시 추가
  canvas.removeAttribute("class");
  canvas.className = "editor-moodboard-canvas canvas-freeform";

  // Soft background, natural padding - feels like a diary page
  // 완전히 빈 상태로 시작
}

function initializeCanvasWithTemplate(canvas, templateName) {
  canvas.className = `editor-moodboard-canvas canvas-template-${templateName}`;
  canvas.innerHTML = "";

  // Template defines structure, user fills with images
  // Templates are wireframes, not example images
}

async function loadEditorFolders() {
  const folderList = document.getElementById("editor-folder-list");
  if (!folderList) return;

  // 저장된 컷이 없으면 다시 로드 시도
  if (savedCuts.length === 0) {
    await loadSavedCuts();
  }

  // "전체" 옵션 추가
  let folderHTML = `
    <div class="editor-folder-item active" onclick="selectEditorFolder(null)">
      전체
    </div>
  `;

  // 폴더 목록 추가
  folderHTML += folders
    .map(
      (folder) => `
    <div class="editor-folder-item" onclick="selectEditorFolder('${folder.id}')">
      ${folder.name}
    </div>
  `
    )
    .join("");

  folderList.innerHTML = folderHTML;

  // 기본적으로 "전체" 선택 (저장된 컷 표시)
  if (savedCuts.length > 0) {
    await selectEditorFolder(null);
  } else if (folders.length > 0) {
    await selectEditorFolder(folders[0].id);
  } else {
    // 폴더도 없고 저장된 컷도 없으면 빈 상태 표시
    const cutsGrid = document.getElementById("editor-cuts-grid");
    const cutsEmpty = document.getElementById("editor-cuts-empty");
    if (cutsEmpty) {
      cutsEmpty.style.display = "block";
      cutsEmpty.innerHTML = "<p>저장된 컷이 없습니다</p>";
    }
    if (cutsGrid) {
      cutsGrid.innerHTML = "";
    }
  }
}

function selectEditorFolder(folderId) {
  // Update active state
  document.querySelectorAll(".editor-folder-item").forEach((item) => {
    item.classList.remove("active");
    const onclickStr = item.getAttribute("onclick") || "";
    if (folderId === null && onclickStr.includes("null")) {
      item.classList.add("active");
    } else if (onclickStr.includes(folderId)) {
      item.classList.add("active");
    }
  });

  // Load cuts from folder
  loadEditorFolderCuts(folderId);
}

/**
 * 편집기에서 폴더의 컷 불러오기
 * 폴더가 없거나 비어있으면 전체 저장된 컷 표시
 */
async function loadEditorFolderCuts(folderId) {
  const cutsGrid = document.getElementById("editor-cuts-grid");
  const cutsEmpty = document.getElementById("editor-cuts-empty");

  if (!cutsGrid || !cutsEmpty) {
    console.warn("[편집기] 컷 그리드 요소를 찾을 수 없습니다");
    return;
  }

  console.log(
    "[편집기] 폴더 컷 로드 시작, folderId:",
    folderId,
    "savedCuts.length:",
    savedCuts.length
  );

  // 저장된 컷이 없으면 다시 로드 시도
  if (savedCuts.length === 0) {
    console.log("[편집기] 저장된 컷이 없어서 다시 로드 시도");
    await loadSavedCuts();
  }

  if (folderId) {
    const folder = folders.find((f) => f.id === folderId);
    if (folder && folder.cuts && folder.cuts.length > 0) {
      console.log("[편집기] 폴더에서 컷 표시:", folder.cuts.length);
      cutsEmpty.style.display = "none";
      cutsGrid.innerHTML = folder.cuts
        .map(
          (cut) => `
        <div class="editor-cut-item" draggable="true" ondragstart="dragCutStart(event, '${cut.imageUrl}')">
          <img src="${cut.imageUrl}" alt="Cut" loading="lazy" />
        </div>
      `
        )
        .join("");

      // 컷 카드에 drag 속성 추가
      cutsGrid.querySelectorAll(".editor-cut-item").forEach((cutEl, index) => {
        const cut = folder.cuts[index];
        if (cut) {
          cutEl.setAttribute("draggable", "true");
          cutEl.dataset.cutId = cut.id;
          cutEl.addEventListener("dragstart", (e) => {
            e.dataTransfer.setData("cutId", cut.id);
          });
        }
      });

      return;
    }
  }

  // 폴더가 없거나 비어있으면 전체 저장된 컷 표시
  if (savedCuts.length === 0) {
    console.log("[편집기] 저장된 컷이 없습니다");
    cutsEmpty.style.display = "block";
    cutsGrid.innerHTML = "";
    cutsEmpty.innerHTML = "<p>저장된 컷이 없습니다</p>";
    return;
  }

  console.log("[편집기] 저장된 컷 표시:", savedCuts.length);
  cutsEmpty.style.display = "none";
  cutsGrid.innerHTML = savedCuts
    .map(
      (cut) => `
    <div class="editor-cut-item" draggable="true" data-cut-id="${cut.id}" ondragstart="dragCutStart(event, '${cut.imageUrl}')">
      <img src="${cut.imageUrl}" alt="Saved cut" loading="lazy" />
    </div>
  `
    )
    .join("");

  // 컷 카드에 drag 속성 추가
  cutsGrid.querySelectorAll(".editor-cut-item").forEach((cutEl, index) => {
    const cut = savedCuts[index];
    if (cut) {
      cutEl.setAttribute("draggable", "true");
      cutEl.dataset.cutId = cut.id;
      cutEl.addEventListener("dragstart", (e) => {
        e.dataTransfer.setData("cutId", cut.id);
        e.dataTransfer.setData("imageUrl", cut.imageUrl);
      });
    }
  });
}

function dragCutStart(event, imageUrl) {
  console.log("[드래그] 시작:", imageUrl);
  event.dataTransfer.setData("imageUrl", imageUrl);
  event.dataTransfer.effectAllowed = "copy";
}

// 드롭 이벤트 처리 (동적으로 캔버스에 추가)
let canvasDropHandlers = null;

function setupCanvasDropEvents() {
  const canvas = document.getElementById("editor-moodboard-canvas");
  if (!canvas) {
    console.warn("[드롭] 캔버스를 찾을 수 없습니다");
    return;
  }

  console.log("[드롭] 캔버스 드롭 이벤트 설정 시작");

  // 기존 이벤트 리스너 제거
  if (canvasDropHandlers) {
    canvas.removeEventListener("dragover", canvasDropHandlers.dragover);
    canvas.removeEventListener("dragleave", canvasDropHandlers.dragleave);
    canvas.removeEventListener("drop", canvasDropHandlers.drop);
  }

  // 새 이벤트 핸들러 생성
  canvasDropHandlers = {
    dragover: (e) => {
      e.preventDefault();
      e.stopPropagation();
      e.dataTransfer.dropEffect = "copy";
      canvas.style.backgroundColor = "#f0f0f0";
      canvas.style.borderColor = "#ff5e00";
      console.log("[드롭] dragover 이벤트");
    },
    dragleave: (e) => {
      e.preventDefault();
      e.stopPropagation();
      canvas.style.backgroundColor = "#fafafa";
      canvas.style.borderColor = "#ddd";
      console.log("[드롭] dragleave 이벤트");
    },
    drop: (e) => {
      e.preventDefault();
      e.stopPropagation();
      canvas.style.backgroundColor = "#fafafa";
      canvas.style.borderColor = "#ddd";

      const imageUrl = e.dataTransfer.getData("imageUrl");
      console.log("[드롭] drop 이벤트, 이미지 URL:", imageUrl);
      if (imageUrl) {
        // 드롭 위치에 블록 추가
        const rect = canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        console.log("[드롭] 위치:", x, y);
        createImageBlock(imageUrl, x - 100, y - 100);
      } else {
        console.warn("[드롭] 이미지 URL이 없습니다");
      }
    },
  };

  // 새 이벤트 리스너 추가
  canvas.addEventListener("dragover", canvasDropHandlers.dragover);
  canvas.addEventListener("dragleave", canvasDropHandlers.dragleave);
  canvas.addEventListener("drop", canvasDropHandlers.drop);

  console.log("[드롭] 캔버스 드롭 이벤트 설정 완료");
}

function openAddBlockModal() {
  document.getElementById("addBlockModal").classList.add("active");
}

function closeAddBlockModal() {
  document.getElementById("addBlockModal").classList.remove("active");
}

function addImageBlock(imageUrl = null) {
  closeAddBlockModal();

  // 이미지 URL이 없으면 저장된 컷 선택 모달 표시
  if (!imageUrl) {
    // 저장된 컷에서 선택하도록 UI 표시
    // 일단 첫 번째 저장된 컷 사용 (나중에 선택 UI 추가 가능)
    if (savedCuts.length > 0) {
      imageUrl = savedCuts[0].imageUrl;
    } else {
      alert("저장된 컷이 없습니다. 먼저 피드에서 컷을 저장해주세요.");
      return;
    }
  }

  const canvas = document.getElementById("editor-moodboard-canvas");
  const rect = canvas.getBoundingClientRect();
  const centerX = rect.width / 2 - 100;
  const centerY = rect.height / 2 - 100;

  createImageBlock(imageUrl, centerX, centerY);
}

function addTextBlock() {
  closeAddBlockModal();

  const canvas = document.getElementById("editor-moodboard-canvas");
  const rect = canvas.getBoundingClientRect();
  const centerX = rect.width / 2 - 100;
  const centerY = rect.height / 2 - 50;

  createTextBlock("텍스트를 입력하세요", centerX, centerY);
}

/**
 * 이미지 블록 생성 (interact.js 사용)
 */
function createImageBlock(
  imageUrl,
  x = 50,
  y = 50,
  width = 200,
  height = 200,
  rotation = 0
) {
  const canvas = document.getElementById("editor-moodboard-canvas");
  if (!canvas) return;

  const block = document.createElement("div");
  block.className = "canvas-block canvas-block-image";
  block.dataset.type = "image";
  block.dataset.imageUrl = imageUrl;
  block.style.cssText = `
    position: absolute;
    width: ${width}px;
    height: ${height}px;
    left: ${x}px;
    top: ${y}px;
    transform: rotate(${rotation}deg);
    cursor: move;
    border: 2px solid transparent;
    border-radius: 4px;
    overflow: hidden;
    z-index: 1;
  `;

  block.innerHTML = `
    <div class="block-content" style="width: 100%; height: 100%; position: relative;">
      <img src="${imageUrl}" alt="Block" class="block-image" style="width: 100%; height: 100%; object-fit: cover; pointer-events: none; filter: none;" />
      <div class="block-controls" style="position: absolute; top: -10px; right: -10px; display: none; gap: 4px; z-index: 10; flex-wrap: wrap;">
        <button class="canvas-block-filter" style="width: 24px; height: 24px; background: rgba(0,0,0,0.7); color: white; border: none; border-radius: 50%; cursor: pointer; font-size: 12px; display: flex; align-items: center; justify-content: center;" title="필터">🎨</button>
        <button class="canvas-block-rotate" style="width: 24px; height: 24px; background: rgba(0,0,0,0.7); color: white; border: none; border-radius: 50%; cursor: pointer; font-size: 12px; display: flex; align-items: center; justify-content: center;" title="회전">↻</button>
        <button class="canvas-block-delete" style="width: 24px; height: 24px; background: #ff4444; color: white; border: none; border-radius: 50%; cursor: pointer; font-size: 14px; line-height: 1;" title="삭제">×</button>
      </div>
      <div class="canvas-block-resize-handle" style="position: absolute; bottom: 0; right: 0; width: 20px; height: 20px; background: rgba(0,0,0,0.7); cursor: nwse-resize; border-radius: 4px 0 4px 0; display: none;"></div>
    </div>
  `;

  // 삭제 버튼 이벤트
  const deleteBtn = block.querySelector(".canvas-block-delete");
  deleteBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    saveCanvasState(); // 삭제 전 상태 저장
    block.remove();
    saveCanvasState(); // 삭제 후 상태 저장
  });

  // 필터 버튼 이벤트 (이미지 블록만)
  const filterBtn = block.querySelector(".canvas-block-filter");
  if (filterBtn) {
    filterBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      openImageFilterPicker(block);
    });
  }

  // 회전 버튼 이벤트
  const rotateBtn = block.querySelector(".canvas-block-rotate");
  rotateBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    const currentRotation = parseFloat(
      block.style.transform.match(/rotate\(([^)]+)\)/)?.[1] || 0
    );
    const newRotation = currentRotation + 15;
    block.style.transform = `rotate(${newRotation}deg)`;
  });

  canvas.appendChild(block);
  setupInteractBlock(block);

  // 블록 클릭 시 사이드바에 스타일 패널 표시
  block.addEventListener("click", (e) => {
    e.stopPropagation();
    showBlockStylePanel(block);
  });

  // 호버 시 컨트롤 표시
  block.addEventListener("mouseenter", () => {
    const controls = block.querySelector(".block-controls");
    if (controls) controls.style.display = "flex";
    const resizeHandle = block.querySelector(".canvas-block-resize-handle");
    if (resizeHandle) resizeHandle.style.display = "block";
  });

  block.addEventListener("mouseleave", () => {
    // 드래그 중이 아니면 숨기기
    if (!block.matches(":active")) {
      const controls = block.querySelector(".block-controls");
      if (controls) controls.style.display = "none";
      const resizeHandle = block.querySelector(".canvas-block-resize-handle");
      if (resizeHandle) resizeHandle.style.display = "none";
    }
  });

  return block;
}

/**
 * 이모티콘만 있는 경우 블록 배경을 투명하게 처리
 */
function updateBlockBackgroundForEmoji(block) {
  if (!block || block.dataset.type !== "text") return;

  const textContent = block.querySelector(".text-content");
  if (!textContent) return;

  // 텍스트 내용에서 일반 텍스트(공백 제외)가 있는지 확인
  const text = textContent.textContent || "";
  // 이모티콘과 공백만 있는지 확인 (일반 문자 제거)
  const textWithoutEmoji = text.replace(
    /[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]|[\u{1F600}-\u{1F64F}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]|[\u{1F900}-\u{1F9FF}]|[\u{1FA00}-\u{1FA6F}]|[\u{1FA70}-\u{1FAFF}]|[\u{2190}-\u{21FF}]|[\u{2300}-\u{23FF}]|[\u{2B50}-\u{2B55}]|[\u{3030}-\u{303F}]|[\u{FE00}-\u{FE0F}]|[\u{FE20}-\u{FE2F}]|[\u{200D}]|[\u{FEFF}]|[\s]/gu,
    ""
  );

  // 이모티콘 전용 블록이거나 이모티콘만 있는 경우 배경 투명 처리
  if (
    block.dataset.emojiOnly === "true" ||
    (textWithoutEmoji.length === 0 && text.trim().length > 0)
  ) {
    block.style.background = "transparent";
    block.style.backgroundColor = "transparent";
    if (textContent) {
      textContent.style.background = "transparent";
      textContent.style.backgroundColor = "transparent";
    }
  }
}

/**
 * 이모티콘 전용 블록 생성 (배경 없음)
 */
function createEmojiOnlyBlock(
  emoji = "",
  x = 50,
  y = 50,
  width = 100,
  height = 100,
  rotation = 0
) {
  const canvas = document.getElementById("editor-moodboard-canvas");
  if (!canvas) return;

  const block = document.createElement("div");
  block.className = "canvas-block canvas-block-text canvas-block-emoji-only";
  block.dataset.type = "text";
  block.dataset.emojiOnly = "true";
  block.style.cssText = `
    position: absolute;
    width: ${width}px;
    height: ${height}px;
    left: ${x}px;
    top: ${y}px;
    transform: rotate(${rotation}deg);
    cursor: move;
    border: 2px solid transparent;
    border-radius: 4px;
    overflow: visible;
    z-index: 1;
    background: transparent;
    padding: 0;
    box-sizing: border-box;
  `;

  block.innerHTML = `
    <div class="block-content" style="width: 100%; height: 100%; position: relative;">
      <div class="text-content" contenteditable="true" style="width: 100%; height: 100%; font-size: 48px; font-weight: 400; color: #333; outline: none; word-wrap: break-word; overflow-wrap: break-word; font-family: 'Pretendard', sans-serif; display: flex; align-items: center; justify-content: center; background: transparent;">${emoji}</div>
      <div class="block-controls" style="position: absolute; top: -10px; right: -10px; display: none; gap: 4px; z-index: 10; flex-wrap: wrap; max-width: 150px;">
        <button class="canvas-block-color" style="width: 24px; height: 24px; background: rgba(0,0,0,0.7); color: white; border: none; border-radius: 50%; cursor: pointer; font-size: 12px; display: flex; align-items: center; justify-content: center;" title="색상 변경">🎨</button>
        <button class="canvas-block-font" style="width: 24px; height: 24px; background: rgba(0,0,0,0.7); color: white; border: none; border-radius: 50%; cursor: pointer; font-size: 12px; display: flex; align-items: center; justify-content: center;" title="폰트 변경">Aa</button>
        <button class="canvas-block-emoji" style="width: 24px; height: 24px; background: rgba(0,0,0,0.7); color: white; border: none; border-radius: 50%; cursor: pointer; font-size: 12px; display: flex; align-items: center; justify-content: center;" title="이모티콘 추가">😊</button>
        <button class="canvas-block-rotate" style="width: 24px; height: 24px; background: rgba(0,0,0,0.7); color: white; border: none; border-radius: 50%; cursor: pointer; font-size: 12px; display: flex; align-items: center; justify-content: center;" title="회전">↻</button>
        <button class="canvas-block-delete" style="width: 24px; height: 24px; background: #ff4444; color: white; border: none; border-radius: 50%; cursor: pointer; font-size: 14px; line-height: 1;" title="삭제">×</button>
      </div>
      <div class="canvas-block-resize-handle" style="position: absolute; bottom: 0; right: 0; width: 20px; height: 20px; background: rgba(0,0,0,0.7); cursor: nwse-resize; border-radius: 4px 0 4px 0; display: none;"></div>
    </div>
  `;

  // 삭제 버튼 이벤트
  const deleteBtn = block.querySelector(".canvas-block-delete");
  deleteBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    block.remove();
  });

  // 색상 변경 버튼 이벤트
  const colorBtn = block.querySelector(".canvas-block-color");
  if (colorBtn) {
    colorBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      e.preventDefault();
      if (window.openTextColorPicker) {
        openTextColorPicker(block);
      }
    });
  }

  // 폰트 변경 버튼 이벤트
  const fontBtn = block.querySelector(".canvas-block-font");
  if (fontBtn) {
    fontBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      e.preventDefault();
      if (window.openTextFontPicker) {
        openTextFontPicker(block);
      }
    });
  }

  // 이모티콘 버튼 이벤트
  const emojiBtn = block.querySelector(".canvas-block-emoji");
  if (emojiBtn) {
    emojiBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      e.preventDefault();
      if (window.openEmojiPicker) {
        openEmojiPicker(block);
      }
    });
  }

  // 회전 버튼 이벤트
  const rotateBtn = block.querySelector(".canvas-block-rotate");
  rotateBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    const currentRotation = parseFloat(
      block.style.transform.match(/rotate\(([^)]+)\)/)?.[1] || 0
    );
    const newRotation = currentRotation + 15;
    block.style.transform = `rotate(${newRotation}deg)`;
  });

  canvas.appendChild(block);
  setupInteractBlock(block);

  // 상태 저장 (블록 추가 후)
  saveCanvasState();

  // 블록 클릭 시 사이드바에 스타일 패널 표시
  block.addEventListener("click", (e) => {
    e.stopPropagation();
    showBlockStylePanel(block);
  });

  // 호버 시 컨트롤 표시
  block.addEventListener("mouseenter", () => {
    const controls = block.querySelector(".block-controls");
    if (controls) controls.style.display = "flex";
    const resizeHandle = block.querySelector(".canvas-block-resize-handle");
    if (resizeHandle) resizeHandle.style.display = "block";
  });

  block.addEventListener("mouseleave", () => {
    if (!block.matches(":active")) {
      const controls = block.querySelector(".block-controls");
      if (controls) controls.style.display = "none";
      const resizeHandle = block.querySelector(".canvas-block-resize-handle");
      if (resizeHandle) resizeHandle.style.display = "none";
    }
  });

  // 초기 텍스트가 이모티콘만 있으면 배경 투명 처리
  updateBlockBackgroundForEmoji(block);

  return block;
}

/**
 * 텍스트 블록 생성 (interact.js 사용)
 */
function createTextBlock(
  text = "텍스트",
  x = 50,
  y = 50,
  width = 200,
  height = 100,
  rotation = 0
) {
  const canvas = document.getElementById("editor-moodboard-canvas");
  if (!canvas) return;

  const block = document.createElement("div");
  block.className = "canvas-block canvas-block-text";
  block.dataset.type = "text";
  block.style.cssText = `
    position: absolute;
    width: ${width}px;
    height: ${height}px;
    left: ${x}px;
    top: ${y}px;
    transform: rotate(${rotation}deg);
    cursor: move;
    border: 2px solid transparent;
    border-radius: 4px;
    overflow: hidden;
    z-index: 1;
    background: rgba(255,255,255,0.9);
    padding: 8px;
    box-sizing: border-box;
  `;

  block.innerHTML = `
    <div class="block-content" style="width: 100%; height: 100%; position: relative;">
      <div class="text-content" contenteditable="true" style="width: 100%; height: 100%; font-size: 18px; font-weight: 600; color: #333; outline: none; word-wrap: break-word; overflow-wrap: break-word; font-family: 'Pretendard', sans-serif;">${text}</div>
      <div class="block-controls" style="position: absolute; top: -10px; right: -10px; display: none; gap: 4px; z-index: 10; flex-wrap: wrap; max-width: 150px;">
        <button class="canvas-block-color" style="width: 24px; height: 24px; background: rgba(0,0,0,0.7); color: white; border: none; border-radius: 50%; cursor: pointer; font-size: 12px; display: flex; align-items: center; justify-content: center;" title="색상 변경">🎨</button>
        <button class="canvas-block-font" style="width: 24px; height: 24px; background: rgba(0,0,0,0.7); color: white; border: none; border-radius: 50%; cursor: pointer; font-size: 12px; display: flex; align-items: center; justify-content: center;" title="폰트 변경">Aa</button>
        <button class="canvas-block-emoji" style="width: 24px; height: 24px; background: rgba(0,0,0,0.7); color: white; border: none; border-radius: 50%; cursor: pointer; font-size: 12px; display: flex; align-items: center; justify-content: center;" title="이모티콘 추가">😊</button>
        <button class="canvas-block-rotate" style="width: 24px; height: 24px; background: rgba(0,0,0,0.7); color: white; border: none; border-radius: 50%; cursor: pointer; font-size: 12px; display: flex; align-items: center; justify-content: center;" title="회전">↻</button>
        <button class="canvas-block-delete" style="width: 24px; height: 24px; background: #ff4444; color: white; border: none; border-radius: 50%; cursor: pointer; font-size: 14px; line-height: 1;" title="삭제">×</button>
      </div>
      <div class="canvas-block-resize-handle" style="position: absolute; bottom: 0; right: 0; width: 20px; height: 20px; background: rgba(0,0,0,0.7); cursor: nwse-resize; border-radius: 4px 0 4px 0; display: none;"></div>
    </div>
  `;

  // 삭제 버튼 이벤트
  const deleteBtn = block.querySelector(".canvas-block-delete");
  deleteBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    block.remove();
  });

  // 색상 변경 버튼 이벤트
  const colorBtn = block.querySelector(".canvas-block-color");
  if (colorBtn) {
    colorBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      e.preventDefault();
      console.log("[텍스트 블록] 색상 변경 버튼 클릭");
      if (window.openTextColorPicker) {
        openTextColorPicker(block);
      } else {
        console.error(
          "[텍스트 블록] openTextColorPicker 함수를 찾을 수 없습니다"
        );
      }
    });
  }

  // 폰트 변경 버튼 이벤트
  const fontBtn = block.querySelector(".canvas-block-font");
  if (fontBtn) {
    fontBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      e.preventDefault();
      console.log("[텍스트 블록] 폰트 변경 버튼 클릭");
      if (window.openTextFontPicker) {
        openTextFontPicker(block);
      } else {
        console.error(
          "[텍스트 블록] openTextFontPicker 함수를 찾을 수 없습니다"
        );
      }
    });
  }

  // 이모티콘 버튼 이벤트
  const emojiBtn = block.querySelector(".canvas-block-emoji");
  if (emojiBtn) {
    emojiBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      e.preventDefault();
      console.log("[텍스트 블록] 이모티콘 버튼 클릭");
      if (window.openEmojiPicker) {
        openEmojiPicker(block);
      } else {
        console.error("[텍스트 블록] openEmojiPicker 함수를 찾을 수 없습니다");
      }
    });
  }

  // 이모티콘 붙여넣기 지원
  const textContent = block.querySelector(".text-content");
  if (textContent) {
    textContent.addEventListener("paste", (e) => {
      e.preventDefault();
      const paste = (e.clipboardData || window.clipboardData).getData("text");
      document.execCommand("insertText", false, paste);
      // 붙여넣기 후 배경 업데이트
      setTimeout(() => updateBlockBackgroundForEmoji(block), 10);
    });

    // 텍스트 입력 시 배경 업데이트 및 상태 저장
    textContent.addEventListener("input", () => {
      updateBlockBackgroundForEmoji(block);
      // 디바운스로 상태 저장 (너무 자주 저장하지 않도록)
      clearTimeout(block._saveTimeout);
      block._saveTimeout = setTimeout(() => {
        saveCanvasState();
      }, 500);
    });
  }

  // 회전 버튼 이벤트
  const rotateBtn = block.querySelector(".canvas-block-rotate");
  rotateBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    const currentRotation = parseFloat(
      block.style.transform.match(/rotate\(([^)]+)\)/)?.[1] || 0
    );
    const newRotation = currentRotation + 15;
    block.style.transform = `rotate(${newRotation}deg)`;
  });

  canvas.appendChild(block);
  setupInteractBlock(block);

  // 블록 클릭 시 사이드바에 스타일 패널 표시
  block.addEventListener("click", (e) => {
    e.stopPropagation();
    showBlockStylePanel(block);
  });

  // 호버 시 컨트롤 표시
  block.addEventListener("mouseenter", () => {
    const controls = block.querySelector(".block-controls");
    if (controls) controls.style.display = "flex";
    const resizeHandle = block.querySelector(".canvas-block-resize-handle");
    if (resizeHandle) resizeHandle.style.display = "block";
  });

  block.addEventListener("mouseleave", () => {
    // 드래그 중이 아니면 숨기기
    if (!block.matches(":active")) {
      const controls = block.querySelector(".block-controls");
      if (controls) controls.style.display = "none";
      const resizeHandle = block.querySelector(".canvas-block-resize-handle");
      if (resizeHandle) resizeHandle.style.display = "none";
    }
  });

  return block;
}

/**
 * 블록 선택 시 사이드바에 스타일 패널 표시
 */
let currentSelectedBlock = null;

function showBlockStylePanel(block) {
  currentSelectedBlock = block;
  const stylePanel = document.getElementById("block-style-panel");
  const textControls = document.getElementById("text-style-controls");
  const imageControls = document.getElementById("image-style-controls");

  if (!stylePanel) {
    console.error("[스타일 패널] block-style-panel 요소를 찾을 수 없습니다");
    return;
  }

  console.log("[스타일 패널] 블록 선택:", block.dataset.type);

  // 스타일 패널을 사이드바 맨 위로 이동
  const sidebar = stylePanel.parentElement;
  if (sidebar && sidebar.firstChild !== stylePanel) {
    sidebar.insertBefore(stylePanel, sidebar.firstChild);
  }

  stylePanel.style.display = "block";
  stylePanel.style.visibility = "visible";
  stylePanel.style.opacity = "1";

  if (block.dataset.type === "text") {
    if (textControls) {
      textControls.style.display = "block";
      textControls.style.visibility = "visible";
    }
    if (imageControls) {
      imageControls.style.display = "none";
      imageControls.style.visibility = "hidden";
    }

    // 현재 스타일 적용
    const textContent = block.querySelector(".text-content");
    if (textContent) {
      const fontSelect = document.getElementById("text-font-select");
      const colorPicker = document.getElementById("text-color-picker");
      const sizeSlider = document.getElementById("text-size-slider");
      const sizeValue = document.getElementById("text-size-value");

      if (fontSelect) {
        const currentFont =
          textContent.style.fontFamily || "Pretendard, sans-serif";
        fontSelect.value = currentFont;
      }

      if (colorPicker) {
        const currentColor = textContent.style.color || "#333333";
        colorPicker.value = rgbToHex(currentColor);
      }

      if (sizeSlider && sizeValue) {
        const currentSize = parseInt(textContent.style.fontSize) || 18;
        sizeSlider.value = currentSize;
        sizeValue.textContent = currentSize + "px";
      }
    }
  } else if (block.dataset.type === "image") {
    if (textControls) {
      textControls.style.display = "none";
      textControls.style.visibility = "hidden";
    }
    if (imageControls) {
      imageControls.style.display = "block";
      imageControls.style.visibility = "visible";
    }

    // 현재 필터 적용
    const img = block.querySelector(".block-image");
    if (img) {
      const filterSelect = document.getElementById("image-filter-select");
      if (filterSelect) {
        const currentFilter = img.style.filter || "none";
        filterSelect.value = currentFilter;
      }
    }
  }

  // 이벤트 리스너 설정
  setupStylePanelListeners(block);
}

function setupStylePanelListeners(block) {
  // 텍스트 블록 스타일 리스너
  if (block.dataset.type === "text") {
    const fontSelect = document.getElementById("text-font-select");
    const colorPicker = document.getElementById("text-color-picker");
    const sizeSlider = document.getElementById("text-size-slider");
    const sizeValue = document.getElementById("text-size-value");
    const textContent = block.querySelector(".text-content");

    if (!textContent) return;

    if (fontSelect) {
      fontSelect.onchange = () => {
        textContent.style.fontFamily = fontSelect.value;
      };
    }

    if (colorPicker) {
      colorPicker.onchange = () => {
        textContent.style.color = colorPicker.value;
      };
    }

    if (sizeSlider && sizeValue) {
      sizeSlider.oninput = () => {
        const size = sizeSlider.value;
        textContent.style.fontSize = size + "px";
        sizeValue.textContent = size + "px";
      };
    }
  }

  // 이미지 블록 필터 리스너
  if (block.dataset.type === "image") {
    const filterSelect = document.getElementById("image-filter-select");
    const img = block.querySelector(".block-image");

    if (filterSelect && img) {
      filterSelect.onchange = () => {
        img.style.filter = filterSelect.value;
        block.dataset.filter = filterSelect.value;
      };
    }
  }
}

function rgbToHex(rgb) {
  if (rgb.startsWith("#")) return rgb;
  const match = rgb.match(/\d+/g);
  if (match && match.length >= 3) {
    return (
      "#" +
      match
        .map((x) => {
          const hex = parseInt(x).toString(16);
          return hex.length === 1 ? "0" + hex : hex;
        })
        .join("")
    );
  }
  return "#333333";
}

function hideBlockStylePanel() {
  const stylePanel = document.getElementById("block-style-panel");
  if (stylePanel) {
    stylePanel.style.display = "none";
  }
  currentSelectedBlock = null;
}

function openEmojiPickerForSelectedBlock() {
  if (currentSelectedBlock && currentSelectedBlock.dataset.type === "text") {
    if (window.openEmojiPicker) {
      openEmojiPicker(currentSelectedBlock);
    }
  }
}

/**
 * interact.js를 사용하여 블록에 드래그, 리사이즈, 회전 기능 추가
 */
function setupInteractBlock(block) {
  if (typeof interact === "undefined") {
    console.warn(
      "interact.js가 로드되지 않았습니다. 기본 드래그 기능을 사용합니다."
    );
    makeBlockDraggableAndResizable(block);
    return;
  }

  // 드래그 기능
  interact(block)
    .draggable({
      listeners: {
        start(event) {
          block.style.border = "2px solid #ff5e00";
          block.style.zIndex = "1000";
          // 컨트롤 버튼 표시
          const controls = block.querySelector(".block-controls");
          if (controls) controls.style.display = "flex";
          const resizeHandle = block.querySelector(
            ".canvas-block-resize-handle"
          );
          if (resizeHandle) resizeHandle.style.display = "block";
        },
        move(event) {
          const x = (parseFloat(block.style.left) || 0) + event.dx;
          const y = (parseFloat(block.style.top) || 0) + event.dy;
          block.style.left = Math.max(0, x) + "px";
          block.style.top = Math.max(0, y) + "px";
        },
        end(event) {
          block.style.border = "2px solid transparent";
          block.style.zIndex = "1";
          // 컨트롤 버튼 숨기기 (호버 시 다시 표시)
          setTimeout(() => {
            if (!block.matches(":hover")) {
              const controls = block.querySelector(".block-controls");
              if (controls) controls.style.display = "none";
              const resizeHandle = block.querySelector(
                ".canvas-block-resize-handle"
              );
              if (resizeHandle) resizeHandle.style.display = "none";
            }
          }, 100);
        },
      },
    })
    .resizable({
      edges: { bottom: true, right: true },
      listeners: {
        start(event) {
          block.style.border = "2px solid #ff5e00";
        },
        move(event) {
          const target = event.target;
          let x = parseFloat(target.style.left) || 0;
          let y = parseFloat(target.style.top) || 0;

          target.style.width = event.rect.width + "px";
          target.style.height = event.rect.height + "px";

          x += event.deltaRect.left;
          y += event.deltaRect.top;

          target.style.left = x + "px";
          target.style.top = y + "px";
        },
        end(event) {
          block.style.border = "2px solid transparent";
        },
      },
      modifiers: [
        interact.modifiers.restrictSize({
          min: { width: 50, height: 50 },
        }),
      ],
    })
    .on("resizemove", function (event) {
      // 리사이즈 핸들 표시
      const resizeHandle = block.querySelector(".canvas-block-resize-handle");
      if (resizeHandle) {
        resizeHandle.style.display = "block";
      }
    });
}

function makeBlockDraggableAndResizable(block) {
  let isDragging = false;
  let isResizing = false;
  let startX, startY, startLeft, startTop, startWidth, startHeight;

  // 드래그 시작
  block.addEventListener("mousedown", (e) => {
    if (e.target.classList.contains("canvas-block-resize")) {
      // 리사이즈 모드
      isResizing = true;
      startX = e.clientX;
      startY = e.clientY;
      startWidth = parseInt(block.style.width) || 200;
      startHeight = parseInt(block.style.height) || 200;
      e.preventDefault();
      return;
    }

    if (e.target.classList.contains("canvas-block-delete")) {
      return; // 삭제 버튼은 드래그 안 함
    }

    // 드래그 모드
    isDragging = true;
    block.style.border = "2px solid #ff5e00";
    block.style.zIndex = "1000";
    startX = e.clientX;
    startY = e.clientY;
    startLeft = parseInt(block.style.left) || 0;
    startTop = parseInt(block.style.top) || 0;
    e.preventDefault();
  });

  // 마우스 이동
  document.addEventListener("mousemove", (e) => {
    if (isDragging) {
      const deltaX = e.clientX - startX;
      const deltaY = e.clientY - startY;
      const canvas = block.parentElement;
      const maxLeft = canvas.offsetWidth - parseInt(block.style.width);
      const maxTop = canvas.offsetHeight - parseInt(block.style.height);

      block.style.left =
        Math.max(0, Math.min(startLeft + deltaX, maxLeft)) + "px";
      block.style.top = Math.max(0, Math.min(startTop + deltaY, maxTop)) + "px";
    } else if (isResizing) {
      const deltaX = e.clientX - startX;
      const deltaY = e.clientY - startY;
      const newWidth = Math.max(50, startWidth + deltaX);
      const newHeight = Math.max(50, startHeight + deltaY);

      block.style.width = newWidth + "px";
      block.style.height = newHeight + "px";
    }
  });

  // 마우스 업
  document.addEventListener("mouseup", () => {
    if (isDragging) {
      isDragging = false;
      block.style.border = "2px solid transparent";
      block.style.zIndex = "1";
    }
    if (isResizing) {
      isResizing = false;
    }
  });

  // 터치 이벤트 지원 (모바일)
  let touchStartX, touchStartY, touchStartLeft, touchStartTop;

  block.addEventListener("touchstart", (e) => {
    if (
      e.target.classList.contains("canvas-block-resize") ||
      e.target.classList.contains("canvas-block-delete")
    ) {
      return;
    }
    const touch = e.touches[0];
    touchStartX = touch.clientX;
    touchStartY = touch.clientY;
    touchStartLeft = parseInt(block.style.left) || 0;
    touchStartTop = parseInt(block.style.top) || 0;
    block.style.border = "2px solid #ff5e00";
    e.preventDefault();
  });

  block.addEventListener("touchmove", (e) => {
    if (!touchStartX) return;
    const touch = e.touches[0];
    const deltaX = touch.clientX - touchStartX;
    const deltaY = touch.clientY - touchStartY;
    const canvas = block.parentElement;
    const maxLeft = canvas.offsetWidth - parseInt(block.style.width);
    const maxTop = canvas.offsetHeight - parseInt(block.style.height);

    block.style.left =
      Math.max(0, Math.min(touchStartLeft + deltaX, maxLeft)) + "px";
    block.style.top =
      Math.max(0, Math.min(touchStartTop + deltaY, maxTop)) + "px";
    e.preventDefault();
  });

  block.addEventListener("touchend", () => {
    touchStartX = null;
    touchStartY = null;
    block.style.border = "2px solid transparent";
  });
}

async function saveMoodboardEditor() {
  // Check if user is authenticated
  const isAuthenticated = await ensureAuthenticated();
  if (!isAuthenticated) {
    alert("로그인이 필요합니다");
    closeMoodboardEditor();
    return;
  }

  const canvas = document.getElementById("editor-moodboard-canvas");
  if (!canvas) {
    alert("캔버스를 찾을 수 없습니다");
    return;
  }

  const blocks = canvas.querySelectorAll(".canvas-block");

  // 블록 데이터 추출
  const blocksData = Array.from(blocks).map((block) => {
    const rect = block.getBoundingClientRect();
    const canvasRect = canvas.getBoundingClientRect();

    // 회전 각도 추출
    const transform = block.style.transform || "";
    const rotationMatch = transform.match(/rotate\(([^)]+)\)/);
    const rotation = rotationMatch ? parseFloat(rotationMatch[1]) : 0;

    const blockData = {
      type: block.dataset.type || "image",
      x: parseFloat(block.style.left) || 0,
      y: parseFloat(block.style.top) || 0,
      width: parseFloat(block.style.width) || 200,
      height: parseFloat(block.style.height) || 200,
      rotation: rotation,
      zIndex: parseInt(block.style.zIndex) || 1,
      // 감상용 레이아웃을 위한 속성
      visual_weight: block.dataset.visualWeight || "medium",
      is_primary: block.dataset.isPrimary === "true" || false,
    };

    if (block.dataset.type === "image") {
      const img = block.querySelector("img");
      blockData.imageUrl = img ? img.src : block.dataset.imageUrl || "";
    } else if (block.dataset.type === "text") {
      const textContent = block.querySelector(".text-content");
      // textContent를 사용하여 이모티콘 포함 텍스트 저장
      blockData.text = textContent
        ? textContent.textContent || textContent.innerText
        : "";
      blockData.fontSize = parseInt(textContent?.style.fontSize) || 18;
      blockData.fontWeight = textContent?.style.fontWeight || "600";
      blockData.color = textContent?.style.color || "#333";
      blockData.fontFamily =
        textContent?.style.fontFamily || "Pretendard, sans-serif";
      console.log("[무드보드 저장] 텍스트 블록 저장:", {
        text: blockData.text,
        fontSize: blockData.fontSize,
        fontFamily: blockData.fontFamily,
        hasEmoji:
          /[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/u.test(
            blockData.text
          ),
      });
    }

    return blockData;
  });

  // 썸네일 생성 (첫 번째 이미지 블록)
  const firstImageBlock = blocksData.find((b) => b.type === "image");
  const thumbnailUrl = firstImageBlock?.imageUrl || null;

  try {
    const firebaseUser = await ensureFirebaseUser();
    if (!firebaseUser) {
      alert("로그인이 필요합니다");
      return;
    }

    // 캔버스 배경색 가져오기
    const canvas = document.getElementById("editor-moodboard-canvas");
    let backgroundColor = "#fafafa";
    if (canvas) {
      // 인라인 스타일에서 가져오기 (우선순위 높음)
      backgroundColor =
        canvas.style.backgroundColor || canvas.getAttribute("data-bg-color");

      // 인라인 스타일이 없으면 computed style에서 가져오기
      if (
        !backgroundColor ||
        backgroundColor === "rgba(0, 0, 0, 0)" ||
        backgroundColor === "transparent" ||
        backgroundColor === ""
      ) {
        const computedStyle = window.getComputedStyle(canvas);
        backgroundColor = computedStyle.backgroundColor;
        console.log(
          "[무드보드 저장] computed style에서 배경색 가져옴:",
          backgroundColor
        );
      }

      // RGB를 hex로 변환
      if (backgroundColor && backgroundColor.startsWith("rgb")) {
        const match = backgroundColor.match(/\d+/g);
        if (match && match.length >= 3) {
          backgroundColor =
            "#" +
            match
              .map((x) => {
                const hex = parseInt(x).toString(16);
                return hex.length === 1 ? "0" + hex : hex;
              })
              .join("");
          console.log("[무드보드 저장] RGB를 hex로 변환:", backgroundColor);
        }
      }

      // 여전히 없으면 기본값 사용
      if (
        !backgroundColor ||
        backgroundColor === "rgba(0, 0, 0, 0)" ||
        backgroundColor === "transparent" ||
        backgroundColor === ""
      ) {
        backgroundColor = "#fafafa";
        console.log("[무드보드 저장] 기본 배경색 사용:", backgroundColor);
      }

      console.log("[무드보드 저장] 최종 배경색:", backgroundColor);
    }

    // 무드보드 이름 가져오기 (편집기 입력 필드에서 가져오기)
    const titleInput = document.getElementById("editor-title-input");
    let moodboardName = titleInput
      ? titleInput.value.trim()
      : `무드보드 ${moodboards.length + 1}`;

    // 이름이 비어있으면 기본값 사용
    if (!moodboardName || moodboardName === "") {
      moodboardName = `무드보드 ${moodboards.length + 1}`;
    }

    // 기존 무드보드가 있으면 이름 유지 (입력 필드에 값이 없을 때만)
    if (
      isEditMode &&
      currentMoodboardId &&
      (!titleInput || !titleInput.value.trim())
    ) {
      const existingMoodboard = moodboards.find(
        (m) => m.id === currentMoodboardId
      );
      if (existingMoodboard && existingMoodboard.name) {
        moodboardName = existingMoodboard.name;
      }
    }

    // 대표 무드보드 설정 (첫 번째 무드보드이거나 기존에 대표였던 경우)
    const isRepresentative =
      moodboards.length === 0 ||
      (isEditMode &&
        currentMoodboardId &&
        moodboards.find((m) => m.id === currentMoodboardId)?.isRepresentative);

    // 무드보드 데이터를 JSON으로 저장
    const moodboardData = {
      name: moodboardName,
      template: currentTemplate || "freeform",
      blocks: blocksData,
      thumbnail: thumbnailUrl,
      backgroundColor: backgroundColor,
      isRepresentative: isRepresentative,
      isPublic: false,
    };

    // 독자는 항상 user_feed_events에 저장
    const savedMoodboardId = await createMoodboardFeed(moodboardData);

    // 저장된 무드보드 ID 저장
    const finalMoodboardId = currentMoodboardId || savedMoodboardId;

    console.log("[무드보드] 저장 완료, ID:", finalMoodboardId);

    // 저장 성공 후 즉시 로컬에 추가 (DB 반영 전에도 표시 가능하도록)
    const savedMoodboard = {
      id: finalMoodboardId,
      ...moodboardData,
      creatorId: currentUserId,
      createdAt: new Date().toISOString(),
    };

    // 기존 무드보드 업데이트 또는 새로 추가
    const existingIndex = moodboards.findIndex(
      (m) => m.id === finalMoodboardId
    );
    if (existingIndex >= 0) {
      moodboards[existingIndex] = savedMoodboard;
    } else {
      moodboards.unshift(savedMoodboard); // 맨 앞에 추가
    }

    // localStorage에 저장하여 페이지 이동 시에도 유지
    try {
      localStorage.setItem("moodboards_cache", JSON.stringify(moodboards));
      localStorage.setItem("moodboards_cache_timestamp", Date.now().toString());
    } catch (e) {
      console.warn("[무드보드] localStorage 저장 실패:", e);
    }

    console.log("[무드보드] 로컬에 추가됨, 현재 개수:", moodboards.length);

    // 저장된 무드보드 찾기 (로컬에서 먼저 확인)
    const foundMoodboard =
      moodboards.find((m) => m.id === finalMoodboardId) || savedMoodboard;

    console.log(
      "[무드보드] 저장 후 즉시 확인 - 무드보드 개수:",
      moodboards.length
    );
    console.log("[무드보드] 저장된 무드보드:", foundMoodboard);

    // 저장 후 바로 대표 무드보드 설정 모달 표시 (첫 번째 무드보드가 아니거나 이미 대표가 아닌 경우)
    if (!isRepresentative && foundMoodboard) {
      // 편집기는 닫지 않고 유지
      // 대표 무드보드 설정 모달 표시
      await showSetRepresentativeModal(foundMoodboard.id, false);
    } else {
      // 이미 대표 무드보드이면 저장 완료 알림만 표시
      alert("저장되었습니다!");
    }

    // 즉시 리스트 업데이트 (로컬 데이터로 먼저 표시)
    renderMoodboards(moodboards);

    // 무드보드 목록 다시 로드 (저장 후 약간의 지연을 두어 DB 반영 대기)
    // 백그라운드에서 로드하되, 실패해도 로컬 데이터는 유지됨
    setTimeout(async () => {
      try {
        // DB에서 다시 로드 시도
        await loadMoodboards();

        console.log("[무드보드] DB 로드 후 무드보드 개수:", moodboards.length);
        console.log("[무드보드] DB 로드 후 전체 무드보드:", moodboards);

        // 저장된 무드보드 찾기 (로컬 또는 DB에서)
        const reloadedMoodboard = moodboards.find(
          (m) => m.id === finalMoodboardId
        );
        if (reloadedMoodboard) {
          console.log(
            "[무드보드] DB에서 무드보드 확인됨:",
            reloadedMoodboard.id
          );
        }

        console.log(
          "[무드보드] DB 로드 후 대표 무드보드:",
          moodboards.find((m) => m.isRepresentative)
        );
      } catch (error) {
        console.error("[무드보드] DB 로드 중 오류 (로컬 데이터 유지):", error);
        // 에러가 있어도 로컬 데이터는 유지되므로 계속 진행
      }
    }, 1000); // 1초로 증가하여 DB 반영 대기
  } catch (error) {
    console.error("[무드보드] 저장 중 오류:", error);
    alert("무드보드 저장에 실패했습니다.");
  }
}

/**
 * 무드보드를 feeds 테이블에 저장
 */
async function createMoodboardFeed(moodboardData) {
  // 독자는 creator_id가 없으므로 feeds 테이블에 저장하지 않고 바로 user_feed_events에 저장
  const moodboardId = currentMoodboardId || `moodboard_${Date.now()}`;

  const firebaseUser = await ensureFirebaseUser();
  if (!firebaseUser) {
    alert("로그인이 필요합니다");
    return null;
  }

  const supabaseClient = await loadSupabaseClient();
  if (typeof supabaseClient === "undefined" || !supabaseClient) {
    alert("저장 기능을 사용할 수 없습니다.");
    return null;
  }

  // 기존 무드보드가 있는지 확인 (user_feed_events에서)
  const { data: existingEvents } = await supabaseClient
    .from("user_feed_events")
    .select("*")
    .eq("user_id", firebaseUser.uid)
    .eq("event_type", "moodboard_created")
    .order("created_at", { ascending: false });

  let existingEvent = null;
  if (existingEvents && existingEvents.length > 0) {
    // metadata에서 moodboard_id로 찾기
    existingEvent = existingEvents.find(
      (e) => e.metadata?.moodboard_id === moodboardId
    );
  }

  if (existingEvent && currentMoodboardId) {
    // 기존 무드보드 업데이트
    const supabaseClient = await loadSupabaseClient();
    if (typeof supabaseClient === "undefined" || !supabaseClient) {
      console.warn("[무드보드] Supabase 클라이언트를 사용할 수 없습니다");
      return null;
    }
    const { error: updateError } = await supabaseClient
      .from("user_feed_events")
      .update({
        metadata: {
          moodboard_id: moodboardId,
          moodboard_data: moodboardData,
          name: moodboardData.name,
          thumbnail: moodboardData.thumbnail,
          blocks: moodboardData.blocks,
          backgroundColor: moodboardData.backgroundColor || "#fafafa",
          isPublic: moodboardData.isPublic,
          isRepresentative: moodboardData.isRepresentative,
        },
      })
      .eq("id", existingEvent.id);

    if (updateError) {
      console.error("[무드보드] 업데이트 오류:", updateError);
      throw updateError;
    }
  } else {
    // 새 무드보드 생성
    // metadata를 JSON 문자열로 변환하여 저장 (Supabase JSONB 타입에 맞춤)
    const metadataToSave = {
      moodboard_id: moodboardId,
      moodboard_data: moodboardData,
      name: moodboardData.name || `무드보드 ${Date.now()}`,
      thumbnail: moodboardData.thumbnail || null,
      blocks: moodboardData.blocks || [],
      backgroundColor: moodboardData.backgroundColor || "#fafafa",
      isPublic:
        moodboardData.isPublic !== undefined ? moodboardData.isPublic : false,
      isRepresentative:
        moodboardData.isRepresentative !== undefined
          ? moodboardData.isRepresentative
          : false,
    };

    console.log("[무드보드] 저장할 데이터:", {
      user_id: firebaseUser.uid,
      event_type: "moodboard_created",
      metadata_keys: Object.keys(metadataToSave),
      moodboard_id: moodboardId,
    });

    const insertPayload = {
      user_id: firebaseUser.uid,
      feed_id: null,
      event_type: "moodboard_created",
      metadata: metadataToSave,
    };

    console.log(
      "[무드보드] 저장 페이로드:",
      JSON.stringify(insertPayload, null, 2)
    );

    const supabaseClient = await loadSupabaseClient();
    if (typeof supabaseClient === "undefined" || !supabaseClient) {
      console.warn("[무드보드] Supabase 클라이언트를 사용할 수 없습니다");
      return null;
    }

    const { data: insertData, error: eventError } = await supabaseClient
      .from("user_feed_events")
      .insert(insertPayload)
      .select();

    if (eventError) {
      console.error("[무드보드] user_feed_events 저장 오류:", eventError);
      console.error(
        "[무드보드] 에러 상세:",
        JSON.stringify(eventError, null, 2)
      );
      console.error(
        "[무드보드] 저장 시도한 데이터:",
        JSON.stringify(insertPayload, null, 2)
      );
      throw eventError;
    }

    console.log("[무드보드] 저장 성공:", insertData);

    // 저장된 ID 반환
    if (insertData && insertData.length > 0) {
      return insertData[0].metadata?.moodboard_id || moodboardId;
    }
  }

  // 로컬에 저장
  const newMoodboard = {
    id: moodboardId,
    ...moodboardData,
    creatorId: currentUserId,
    createdAt: new Date().toISOString(),
  };

  // 기존 무드보드 업데이트 또는 새로 추가
  const existingIndex = moodboards.findIndex((m) => m.id === moodboardId);
  if (existingIndex >= 0) {
    moodboards[existingIndex] = newMoodboard;
  } else {
    moodboards.push(newMoodboard);
  }

  // 무드보드 ID 반환
  return moodboardId;
}

// 대표 무드보드 설정 모달 관련 변수
let pendingMoodboardIdForRepresentative = null;

/**
 * 대표 무드보드 설정 모달 표시
 */
async function showSetRepresentativeModal(
  moodboardId,
  isAlreadyRepresentative
) {
  // 이미 대표 무드보드로 설정되어 있으면 모달 표시 안 함
  if (isAlreadyRepresentative) {
    return false;
  }

  // 무드보드가 없으면 모달 표시 안 함
  if (!moodboardId) {
    return false;
  }

  return new Promise((resolve) => {
    pendingMoodboardIdForRepresentative = moodboardId;
    const modal = document.getElementById("setRepresentativeModal");
    if (modal) {
      modal.style.display = "flex";

      // Promise resolve를 위한 핸들러 저장
      modal._resolvePromise = resolve;
    } else {
      resolve(false);
    }
  });
}

/**
 * 대표 무드보드 설정 확인
 */
async function confirmSetRepresentative() {
  if (!pendingMoodboardIdForRepresentative) return;

  const moodboardId = pendingMoodboardIdForRepresentative;
  await setMoodboardAsRepresentativeById(moodboardId);

  // 편집기 닫기
  closeMoodboardEditor();

  // 모달 닫기
  closeSetRepresentativeModal(true);

  // 마이페이지로 이동하여 대표 무드보드 확인
  window.location.href = "/mypage_reader.html";
}

/**
 * 대표 무드보드 설정 모달 닫기
 */
function closeSetRepresentativeModal(confirmed) {
  const modal = document.getElementById("setRepresentativeModal");
  if (modal) {
    modal.style.display = "none";

    // Promise resolve
    if (modal._resolvePromise) {
      modal._resolvePromise(confirmed === true);
      modal._resolvePromise = null;
    }
  }
  pendingMoodboardIdForRepresentative = null;

  // 확인을 눌렀으면 무드보드 목록 다시 로드
  if (confirmed) {
    setTimeout(async () => {
      await loadMoodboards();
      loadFeaturedMoodboard();
    }, 300);
  }
}

/**
 * ID로 대표 무드보드 설정
 */
async function setMoodboardAsRepresentativeById(moodboardId) {
  if (!moodboardId) {
    alert("무드보드 ID가 없습니다. 먼저 무드보드를 저장해주세요.");
    return;
  }

  try {
    const firebaseUser = await ensureFirebaseUser();
    if (!firebaseUser) {
      alert("로그인이 필요합니다");
      return;
    }

    const supabaseClient = await loadSupabaseClient();
    if (typeof supabaseClient === "undefined" || !supabaseClient) {
      alert("저장 기능을 사용할 수 없습니다.");
      return;
    }

    // 무드보드 목록이 비어있으면 먼저 로드
    if (moodboards.length === 0) {
      await loadMoodboards();
    }

    // 저장된 무드보드가 없으면 알림
    if (moodboards.length === 0) {
      alert("저장된 무드보드가 없습니다. 먼저 무드보드를 저장해주세요.");
      return;
    }

    // 모든 무드보드의 대표 플래그 초기화
    moodboards.forEach((m) => {
      m.isRepresentative = m.id === moodboardId;
    });

    // 데이터베이스 업데이트
    for (const moodboard of moodboards) {
      await updateMoodboardRepresentative(
        moodboard.id,
        moodboard.id === moodboardId
      );
    }

    // 무드보드 목록 다시 로드
    await loadMoodboards();

    // 대표 무드보드 표시
    loadFeaturedMoodboard();

    console.log("[대표 무드보드] 설정 완료:", moodboardId);
  } catch (error) {
    console.error("[대표 무드보드] 설정 오류:", error);
    alert(
      "대표 무드보드 설정에 실패했습니다: " +
        (error.message || "알 수 없는 오류")
    );
  }
}

function editFeaturedMoodboard() {
  // 대표 무드보드 설정 모달 열기
  openFeaturedMoodboardSettingsModal();
}

async function setAsRepresentativeFromEditor() {
  if (!currentMoodboardId) {
    alert("저장된 무드보드가 없습니다. 먼저 무드보드를 저장해주세요.");
    return;
  }

  try {
    const firebaseUser = await ensureFirebaseUser();
    if (!firebaseUser) {
      alert("로그인이 필요합니다");
      return;
    }

    // 모든 무드보드의 대표 플래그 초기화
    moodboards.forEach((m) => {
      m.isRepresentative = m.id === currentMoodboardId;
    });

    // 데이터베이스 업데이트
    for (const moodboard of moodboards) {
      await updateMoodboardRepresentative(
        moodboard.id,
        moodboard.id === currentMoodboardId
      );
    }

    alert("대표 보드로 설정되었습니다.");
    loadFeaturedMoodboard();
    loadMoodboards();
  } catch (error) {
    console.error("[대표 무드보드] 설정 오류:", error);
    alert("대표 보드 설정에 실패했습니다.");
  }
}

function openMoodboardMenu(moodboardId) {
  currentMoodboardId = moodboardId;
  const modal = document.getElementById("moodboardMenuModal");
  if (modal) {
    modal.classList.add("active");

    // 이벤트 위임으로 메뉴 아이템 클릭 처리
    const content = modal.querySelector(".moodboard-menu-content");
    if (content && !content.dataset.listenerAttached) {
      content.addEventListener("click", (e) => {
        const menuItem = e.target.closest(".moodboard-menu-item");
        if (!menuItem) return;

        const action = menuItem.dataset.action;
        if (!action) return;

        e.stopPropagation();

        switch (action) {
          case "edit":
            editMoodboardFromGrid();
            break;
          case "set-representative":
            setMoodboardAsRepresentative();
            break;
          case "toggle-privacy":
            toggleMoodboardPrivacy();
            break;
          case "hide":
            hideMoodboard();
            break;
          case "delete":
            deleteMoodboard();
            break;
          case "cancel":
            closeMoodboardMenu();
            break;
        }
      });
      content.dataset.listenerAttached = "true";
    }
  }
}

function closeMoodboardMenu() {
  document.getElementById("moodboardMenuModal").classList.remove("active");
}

function editMoodboardFromGrid() {
  closeMoodboardMenu();
  if (currentMoodboardId) {
    openMoodboardEditor(currentMoodboardId);
  }
}

async function updateMoodboardRepresentative(moodboardId, isRepresentative) {
  try {
    const firebaseUser = await ensureFirebaseUser();
    if (!firebaseUser) return;

    const supabaseClient = await loadSupabaseClient();
    if (typeof supabaseClient === "undefined" || !supabaseClient) {
      return;
    }

    // user_feed_events에서 해당 무드보드 찾기
    const { data: eventsData } = await supabaseClient
      .from("user_feed_events")
      .select("*")
      .eq("user_id", firebaseUser.uid)
      .eq("event_type", "moodboard_created")
      .order("created_at", { ascending: false });

    if (eventsData && eventsData.length > 0) {
      const targetEvent = eventsData.find(
        (e) => e.metadata?.moodboard_id === moodboardId
      );

      if (targetEvent) {
        const metadata = targetEvent.metadata || {};
        metadata.isRepresentative = isRepresentative;

        await supabaseClient
          .from("user_feed_events")
          .update({
            metadata: metadata,
          })
          .eq("id", targetEvent.id);
      }
    }
  } catch (error) {
    console.error("[대표 무드보드] 업데이트 오류:", error);
  }
}

function setMoodboardAsRepresentative() {
  if (!currentMoodboardId) return;

  // 모든 무드보드의 대표 플래그 초기화
  moodboards.forEach((m) => {
    m.isRepresentative = m.id === currentMoodboardId;
  });

  // 데이터베이스 업데이트
  moodboards.forEach(async (m) => {
    await updateMoodboardRepresentative(m.id, m.isRepresentative);
  });

  closeMoodboardMenu();
  loadFeaturedMoodboard();
  loadMoodboards();
}

function toggleMoodboardPrivacy() {
  // TODO: Implement
  closeMoodboardMenu();
  alert("공개/비공개 전환 기능은 준비 중입니다");
}

function hideMoodboard() {
  // TODO: Implement
  closeMoodboardMenu();
  alert("숨기기 기능은 준비 중입니다");
}

async function deleteMoodboard() {
  if (!currentMoodboardId) return;
  if (!confirm("이 무드보드를 삭제하시겠습니까?")) return;

  try {
    const firebaseUser = await ensureFirebaseUser();
    if (!firebaseUser) {
      alert("로그인이 필요합니다");
      return;
    }

    const supabaseClient = await loadSupabaseClient();
    if (typeof supabaseClient === "undefined" || !supabaseClient) {
      alert("삭제 기능을 사용할 수 없습니다");
      return;
    }

    // user_feed_events에서 해당 무드보드 찾아서 삭제
    const { data: eventsData } = await supabaseClient
      .from("user_feed_events")
      .select("*")
      .eq("user_id", firebaseUser.uid)
      .eq("event_type", "moodboard_created");

    if (eventsData && eventsData.length > 0) {
      const targetEvent = eventsData.find(
        (e) => e.metadata?.moodboard_id === currentMoodboardId
      );

      if (targetEvent) {
        const { error } = await supabaseClient
          .from("user_feed_events")
          .delete()
          .eq("id", targetEvent.id);

        if (error) {
          console.error("[무드보드] 삭제 오류:", error);
          alert("무드보드 삭제에 실패했습니다.");
          return;
        }
      }
    }

    // 로컬에서도 제거
    moodboards = moodboards.filter((m) => m.id !== currentMoodboardId);

    // localStorage 업데이트
    try {
      localStorage.setItem("moodboards_cache", JSON.stringify(moodboards));
      localStorage.setItem("moodboards_cache_timestamp", Date.now().toString());
    } catch (e) {
      console.warn("[무드보드] localStorage 업데이트 실패:", e);
    }

    closeMoodboardMenu();

    // 리스트 및 대표 무드보드 다시 로드
    await loadMoodboards();
    await loadFeaturedMoodboard();

    // 리스트 즉시 렌더링
    renderMoodboards(moodboards);
  } catch (error) {
    console.error("[무드보드] 삭제 중 오류:", error);
    alert("무드보드 삭제에 실패했습니다.");
  }
}

// =========================
// SETTINGS MODAL
// =========================

async function openSettingsModal() {
  // 설정 모달 열 때 현재 프로필 정보 로드
  const isAuthenticated = await ensureAuthenticated();
  if (isAuthenticated) {
    try {
      const { getFirestore, doc, getDoc } = await import(
        "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js"
      );
      const { db } = await import("/js/firebase_init.js");

      const readerDoc = await getDoc(doc(db, "readers", currentUserId));
      if (readerDoc.exists()) {
        const readerData = readerDoc.data();

        // 설정 모달의 입력 필드에 현재 값 설정
        const nameInput = document.getElementById("profileNameInput");
        const bioInput = document.getElementById("profileBioInput");

        if (nameInput) {
          nameInput.value = readerData.nickname || readerData.name || "";
        }
        if (bioInput) {
          const bio = readerData.bio || readerData.description || "";
          const links = readerData.links || readerData.social_links || "";
          bioInput.value = bio ? `${bio}${links ? `\n${links}` : ""}` : links;
        }
      }
    } catch (error) {
      console.error("[설정] 프로필 정보 로드 오류:", error);
    }
  }

  document.getElementById("settingsModal").classList.add("active");
}

function closeSettingsModal() {
  document.getElementById("settingsModal").classList.remove("active");
}

async function saveProfileSettings() {
  const isAuthenticated = await ensureAuthenticated();
  if (!isAuthenticated) {
    alert("로그인이 필요합니다");
    return;
  }

  const nameInput = document.getElementById("profileNameInput");
  const bioInput = document.getElementById("profileBioInput");

  if (!nameInput || !bioInput) {
    alert("프로필 정보를 불러올 수 없습니다");
    return;
  }

  const nickname = nameInput.value.trim();
  const bioText = bioInput.value.trim();

  if (!nickname) {
    alert("닉네임을 입력해주세요");
    return;
  }

  try {
    const { getFirestore, doc, setDoc } = await import(
      "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js"
    );
    const { db } = await import("/js/firebase_init.js");

    // bio와 links 분리 (줄바꿈 기준)
    const lines = bioText.split("\n");
    const bio = lines[0] || "";
    const links = lines.slice(1).join("\n") || "";

    // Firestore에 프로필 정보 저장/업데이트
    await setDoc(
      doc(db, "readers", currentUserId),
      {
        nickname: nickname,
        bio: bio,
        links: links,
        updated_at: new Date(),
      },
      { merge: true } // 기존 데이터 유지하면서 업데이트
    );

    console.log("[설정] 프로필 저장 완료");
    alert("프로필이 저장되었습니다");

    // 프로필 정보 다시 로드
    await loadReaderProfile();
    closeSettingsModal();
  } catch (error) {
    console.error("[설정] 프로필 저장 오류:", error);
    alert("프로필 저장에 실패했습니다");
  }
}

function setAsRepresentative() {
  // TODO: Implement
  alert("대표 보드 설정 기능은 준비 중입니다");
}

function resetMoodboard() {
  if (!confirm("무드보드를 초기화하시겠습니까?")) return;
  // TODO: Implement
  alert("초기화 기능은 준비 중입니다");
}

async function handleLogout() {
  if (!confirm("로그아웃 하시겠습니까?")) {
    return;
  }

  try {
    // Firebase 로그아웃
    const { signOut } = await import(
      "https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js"
    );
    const { auth } = await import("/js/firebase_init.js");

    await signOut(auth);

    // localStorage 정리
    localStorage.removeItem("mumu_logged_in");
    localStorage.removeItem("mumu_just_logged_in");

    console.log("[로그아웃] 로그아웃 성공");

    // 로그인 페이지로 리다이렉트
    window.location.href = "login.html";
  } catch (error) {
    console.error("[로그아웃] 로그아웃 오류:", error);
    alert("로그아웃 중 오류가 발생했습니다.");
  }
}

function handleDeleteAccount() {
  if (!confirm("정말 계정을 삭제하시겠습니까?")) return;
  // TODO: Implement
  alert("계정 삭제 기능은 준비 중입니다");
}

// =========================
// PROFILE LOADING
// =========================

/**
 * Firestore에서 리더 프로필 정보 불러오기
 */
async function loadReaderProfile() {
  // 인증 상태 확인 및 업데이트
  const isAuthenticated = await ensureAuthenticated();
  if (!isAuthenticated) {
    console.log("[프로필] 사용자가 로그인하지 않았습니다");
    return;
  }

  console.log("[프로필] 프로필 로드 시작, currentUserId:", currentUserId);

  try {
    const { getFirestore, doc, getDoc } = await import(
      "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js"
    );
    const { db } = await import("/js/firebase_init.js");

    // Firestore에서 리더 정보 가져오기
    const readerDoc = await getDoc(doc(db, "readers", currentUserId));
    console.log("[프로필] Firestore 문서 존재:", readerDoc.exists());

    if (readerDoc.exists()) {
      const readerData = readerDoc.data();
      console.log("[프로필] 리더 데이터:", readerData);

      // 프로필 정보 업데이트
      const profileNameEl = document.querySelector(".profile-name");
      const profileDescEl = document.querySelector(".profile-desc");
      const profileAvatarEl = document.querySelector(".profile-avatar");

      if (profileNameEl) {
        const displayName = readerData.nickname || readerData.name || "독자";
        profileNameEl.textContent = displayName;
        console.log("[프로필] 이름 업데이트:", displayName);
      }

      if (profileDescEl) {
        // 자기소개는 사용자가 직접 입력한 값이 있으면 표시, 없으면 숨기기
        const bio = readerData.bio || readerData.description || "";
        const links = readerData.links || readerData.social_links || "";

        // bio나 links가 있으면 표시, 없으면 숨기기 (닉네임만 표시)
        if (bio || links) {
          profileDescEl.innerHTML = bio
            ? `${bio}${links ? `<br />${links}` : ""}`
            : links;
          profileDescEl.style.display = "block";
        } else {
          // 사용자가 작성하지 않은 경우 자기소개 영역 숨기기
          profileDescEl.style.display = "none";
        }
      }

      // 프로필 아바타 이미지 (있으면 표시)
      if (profileAvatarEl && readerData.profile_image) {
        profileAvatarEl.style.backgroundImage = `url(${readerData.profile_image})`;
        profileAvatarEl.style.backgroundSize = "cover";
        profileAvatarEl.style.backgroundPosition = "center";
      }

      // 선호 장르 태그 표시
      const tagListEl = document.querySelector(".tag-list");
      if (tagListEl) {
        if (
          readerData.preferredGenres &&
          readerData.preferredGenres.length > 0
        ) {
          tagListEl.innerHTML = readerData.preferredGenres
            .slice(0, 3)
            .map((genre) => `<span class="tag">${genre}</span>`)
            .join("");
        } else {
          // 장르가 없으면 빈 상태
          tagListEl.innerHTML = "";
        }
      }
    } else {
      console.log(
        "[프로필] 리더 정보를 찾을 수 없습니다. Firestore에 문서가 없습니다."
      );
      console.log("[프로필] 문서 경로: readers/", currentUserId);
      // 문서가 없어도 기본값으로 설정 (나중에 사용자가 입력 가능)
      const profileNameEl = document.querySelector(".profile-name");
      if (profileNameEl) {
        profileNameEl.textContent = "독자";
      }
    }
  } catch (error) {
    console.error("[프로필] 프로필 로드 오류:", error);
  }

  // 팔로우/팔로워 수 불러오기
  await loadFollowStats();
  console.log("[프로필] 프로필 로드 완료");
}

/**
 * Supabase에서 팔로우/팔로워 통계 불러오기
 */
async function loadFollowStats() {
  // 인증 상태 확인
  const firebaseUser = await ensureFirebaseUser();
  if (!firebaseUser) return;

  try {
    const supabaseClient = await loadSupabaseClient();
    if (typeof supabaseClient === "undefined" || !supabaseClient) {
      console.warn("[팔로우] Supabase 클라이언트를 사용할 수 없습니다");
      return;
    }

    // 팔로워 수 (다른 사람이 나를 팔로우)
    // creator_follows: 작가로 팔로우받는 경우 (creator_id = currentUserId)
    // reader_follows: 독자로 팔로우받는 경우 (following_id = currentUserId)
    let followerCount = 0;

    try {
      // 작가로 팔로우받는 경우
      const { count: creatorFollowerCount, error: creatorFollowerError } =
        await supabaseClient
          .from("creator_follows")
          .select("*", { count: "exact", head: true })
          .eq("creator_id", currentUserId);

      if (!creatorFollowerError && creatorFollowerCount !== null) {
        followerCount += creatorFollowerCount;
      } else if (creatorFollowerError) {
        console.warn(
          "[팔로우] creator_follows 팔로워 수 조회 오류:",
          creatorFollowerError
        );
      }

      // 독자로 팔로우받는 경우
      const { count: readerFollowerCount, error: readerFollowerError } =
        await supabaseClient
          .from("reader_follows")
          .select("*", { count: "exact", head: true })
          .eq("following_id", currentUserId);

      if (!readerFollowerError && readerFollowerCount !== null) {
        followerCount += readerFollowerCount;
      } else if (readerFollowerError) {
        console.warn(
          "[팔로우] reader_follows 팔로워 수 조회 오류:",
          readerFollowerError
        );
      }
    } catch (error) {
      console.warn("[팔로우] 팔로워 수 조회 실패:", error);
    }

    // 팔로우 수 (내가 다른 사람을 팔로우)
    // creator_follows: 작가를 팔로우하는 경우 (reader_id = currentUserId)
    // reader_follows: 독자를 팔로우하는 경우 (follower_id = currentUserId)
    let followingCount = 0;

    try {
      // 작가를 팔로우하는 경우
      const { count: creatorFollowingCount, error: creatorFollowingError } =
        await supabaseClient
          .from("creator_follows")
          .select("*", { count: "exact", head: true })
          .eq("reader_id", currentUserId);

      if (!creatorFollowingError && creatorFollowingCount !== null) {
        followingCount += creatorFollowingCount;
      } else if (creatorFollowingError) {
        console.warn(
          "[팔로우] creator_follows 팔로우 수 조회 오류:",
          creatorFollowingError
        );
      }

      // 독자를 팔로우하는 경우
      const { count: readerFollowingCount, error: readerFollowingError } =
        await supabaseClient
          .from("reader_follows")
          .select("*", { count: "exact", head: true })
          .eq("follower_id", currentUserId);

      if (!readerFollowingError && readerFollowingCount !== null) {
        followingCount += readerFollowingCount;
      } else if (readerFollowingError) {
        console.warn(
          "[팔로우] reader_follows 팔로우 수 조회 오류:",
          readerFollowingError
        );
      }
    } catch (error) {
      console.warn("[팔로우] 팔로우 수 조회 실패:", error);
    }

    // UI 업데이트 (0이면 0으로 표시)
    const followNumEls = document.querySelectorAll(".follow-num");
    if (followNumEls.length >= 2) {
      // 첫 번째는 팔로우 수, 두 번째는 팔로워 수
      followNumEls[0].textContent =
        followingCount !== null && followingCount !== undefined
          ? followingCount
          : 0;
      followNumEls[1].textContent =
        followerCount !== null && followerCount !== undefined
          ? followerCount
          : 0;
    }
  } catch (error) {
    console.error("[팔로우] 통계 로드 오류:", error);
  }
}

// =========================
// FIREBASE AUTH INITIALIZATION (READERS ONLY)
// =========================

/**
 * Handle Firebase Auth state changes for readers
 * Readers use Firebase Auth ONLY - no Supabase
 */
async function setupFirebaseAuth() {
  try {
    const { auth } = await import("/js/firebase_init.js");
    const { onAuthStateChanged } = await import(
      "https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js"
    );

    // CRITICAL: Use onAuthStateChanged to wait for auth state
    onAuthStateChanged(
      auth,
      async (user) => {
        if (user) {
          // User is logged in - store user ID
          currentUserId = user.uid;
          console.log("[인증] 사용자 로그인됨:", currentUserId);

          // Load reader profile first (강제로 업데이트)
          await loadReaderProfile();

          // 프로필 정보가 여전히 목업 데이터면 다시 시도
          setTimeout(async () => {
            const profileName =
              document.querySelector(".profile-name")?.textContent;
            if (profileName === "박햇살") {
              console.log("[프로필] 목업 데이터 감지, 다시 로드 시도");
              await loadReaderProfile();
            }
          }, 500);

          // Load reader data (using Firebase uid)
          await loadSavedCuts(); // 저장된 컷 먼저 불러오기
          await loadMoodboards();
          await loadFolders();
          // 대표 무드보드 로드 (MY MOOD 탭용)
          loadFeaturedMoodboard();

          // 페이지 표시 (깜빡임 방지)
          const appFrame = document.querySelector(".app-frame");
          if (appFrame) {
            appFrame.classList.add("loaded");
          }
        } else {
          // User is not logged in
          currentUserId = null;
          console.log("[인증] 사용자 로그인 안 됨");
          // Don't crash - just don't load data
          // UI will show empty states naturally
        }
      },
      (error) => {
        console.error("[인증] Firebase Auth 오류:", error);
        // Don't crash on auth error
        currentUserId = null;
      }
    );
  } catch (error) {
    console.error("[인증] Firebase 초기화 오류:", error);
    // Silently handle - don't crash, just don't load data
    // UI will show empty states naturally
  }
}

// =========================
// INITIALIZATION
// =========================

// =========================
// EXPOSE FUNCTIONS TO GLOBAL SCOPE
// =========================
// HTML onclick에서 호출할 수 있도록 함수들을 window 객체에 할당
window.switchTab = switchTab;
window.editFeaturedMoodboard = editFeaturedMoodboard;
window.createNewMoodboard = createNewMoodboard;
window.applyCanvasRatio = applyCanvasRatio;
window.openSettingsModal = openSettingsModal;
window.closeSettingsModal = closeSettingsModal;
window.createNewFolder = createNewFolder;
window.showFolderContent = showFolderContent;
window.backToFolderList = backToFolderList;
window.openFolderMenu = openFolderMenu;
window.closeFolderMenu = closeFolderMenu;
window.renameCurrentFolder = renameCurrentFolder;
window.toggleFolderPrivacy = toggleFolderPrivacy;
window.deleteCurrentFolder = deleteCurrentFolder;
window.closeFolderNameModal = closeFolderNameModal;
window.saveFolderName = saveFolderName;
window.closeMoodboardCreateModal = closeMoodboardCreateModal;
window.backToCreateOptions = backToCreateOptions;
window.startFreeformMoodboard = startFreeformMoodboard;
window.showTemplates = showTemplates;
window.closeTemplateSelectModal = closeTemplateSelectModal;
window.selectTemplate = selectTemplate;
window.closeMoodboardEditor = closeMoodboardEditor;
window.saveMoodboardEditor = saveMoodboardEditor;
window.setAsRepresentativeFromEditor = setAsRepresentativeFromEditor;
window.openAddBlockModal = openAddBlockModal;
window.closeAddBlockModal = closeAddBlockModal;
window.addImageBlock = addImageBlock;
window.createEmojiOnlyBlock = createEmojiOnlyBlock;
window.updateBlockBackgroundForEmoji = updateBlockBackgroundForEmoji;
window.openMoodboardMenu = openMoodboardMenu;
window.closeMoodboardMenu = closeMoodboardMenu;
window.editMoodboardFromGrid = editMoodboardFromGrid;
window.setMoodboardAsRepresentative = setMoodboardAsRepresentative;
window.toggleMoodboardPrivacy = toggleMoodboardPrivacy;
window.hideMoodboard = hideMoodboard;
window.deleteMoodboard = deleteMoodboard;
window.setAsRepresentative = setAsRepresentative;
window.resetMoodboard = resetMoodboard;
window.handleLogout = handleLogout;
window.handleDeleteAccount = handleDeleteAccount;
window.selectEditorFolder = selectEditorFolder;
window.saveProfileSettings = saveProfileSettings;
window.saveCutToFeed = saveCutToFeed;
window.addTextBlock = addTextBlock;

// 드래그앤드롭 기능
let draggedCutId = null;
let draggedCutImageUrl = null;

function handleCutDragStart(event, cutId) {
  draggedCutId = cutId;
  const cut = savedCuts.find((c) => c.id === cutId);
  if (cut) {
    draggedCutImageUrl = cut.imageUrl;
  }
  event.dataTransfer.effectAllowed = "move";
  event.dataTransfer.setData("cutId", cutId);
  event.currentTarget.classList.add("dragging");
}

function handleCutDragEnd(event) {
  event.currentTarget.classList.remove("dragging");
  draggedCutId = null;
  draggedCutImageUrl = null;
}

function handleDragStart(event, cutId, imageUrl) {
  draggedCutId = cutId;
  draggedCutImageUrl = imageUrl;
  event.dataTransfer.effectAllowed = "move";
  event.dataTransfer.setData("text/plain", cutId);
  event.currentTarget.style.opacity = "0.5";
}

function handleDragOver(event) {
  event.preventDefault();
  event.dataTransfer.dropEffect = "move";
  event.currentTarget.classList.add("drag-over");
}

function handleDragEnter(event) {
  event.preventDefault();
  event.currentTarget.classList.add("drag-over");
}

function handleDragLeave(event) {
  event.currentTarget.classList.remove("drag-over");
}

async function handleDropOnFolder(event, folderId) {
  event.preventDefault();
  event.stopPropagation();
  event.currentTarget.classList.remove("drag-over");

  if (!draggedCutId) {
    const cutId = event.dataTransfer.getData("text/plain");
    if (!cutId) return;
    draggedCutId = cutId;
  }

  if (!draggedCutId || !folderId) return;

  try {
    const firebaseUser = await ensureFirebaseUser();
    if (firebaseUser) {
      const supabaseClient = await loadSupabaseClient();
      if (typeof supabaseClient === "undefined" || !supabaseClient) {
        console.warn("[폴더 컷 저장] Supabase 클라이언트를 사용할 수 없습니다");
        return;
      }

      // reader_folder_cuts 테이블에 저장
      const { error } = await supabaseClient.from("reader_folder_cuts").insert({
        folder_id: folderId,
        cut_id: draggedCutId,
        reader_id: firebaseUser.uid,
        order_index: 0,
      });

      if (error) {
        // 테이블이 없으면 로컬에만 저장
        if (error.code === "PGRST205" || error.code === "42P01") {
          console.log(
            "[폴더] reader_folder_cuts 테이블이 없어 로컬에만 저장합니다."
          );
          const folder = folders.find((f) => f.id === folderId);
          if (folder) {
            if (!folder.cuts) folder.cuts = [];
            const cut = savedCuts.find((c) => c.id === draggedCutId);
            if (cut && !folder.cuts.find((c) => c.id === draggedCutId)) {
              folder.cuts.push(cut);
              folder.cutCount = folder.cuts.length;
              loadFolders();
              // 저장된 컷 전체에서 해당 컷 숨김 처리
              hideCutFromSavedList(draggedCutId);
            }
          }
        } else {
          console.error("[폴더] 컷 저장 오류:", error);
          alert("폴더에 컷을 추가하는데 실패했습니다.");
        }
      } else {
        // 성공적으로 저장됨
        const folder = folders.find((f) => f.id === folderId);
        if (folder) {
          folder.cutCount = (folder.cutCount || 0) + 1;
          loadFolders();
        }
        // 저장된 컷 전체에서 해당 컷 숨김 처리
        hideCutFromSavedList(draggedCutId);
        alert("폴더에 컷이 추가되었습니다!");
      }
    } else {
      // Supabase가 없으면 로컬에만 저장
      const folder = folders.find((f) => f.id === folderId);
      if (folder) {
        if (!folder.cuts) folder.cuts = [];
        const cut = savedCuts.find((c) => c.id === draggedCutId);
        if (cut && !folder.cuts.find((c) => c.id === draggedCutId)) {
          folder.cuts.push(cut);
          folder.cutCount = folder.cuts.length;
          loadFolders();
          // 저장된 컷 전체에서 해당 컷 숨김 처리
          hideCutFromSavedList(draggedCutId);
        }
      }
    }
  } catch (error) {
    console.error("[폴더] 드롭 처리 오류:", error);
  }

  draggedCutId = null;
  draggedCutImageUrl = null;
}

window.handleCutDragStart = handleCutDragStart;
window.handleCutDragEnd = handleCutDragEnd;
window.handleDragStart = handleDragStart;
window.handleDragOver = handleDragOver;
window.handleDragEnter = handleDragEnter;
window.handleDragLeave = handleDragLeave;
window.handleDropOnFolder = handleDropOnFolder;
window.openTextColorPicker = openTextColorPicker;
window.closeTextColorModal = closeTextColorModal;
window.openTextFontPicker = openTextFontPicker;
window.closeTextFontModal = closeTextFontModal;
window.openBackgroundColorPicker = openBackgroundColorPicker;

/**
 * 폰트 선택 탭 열기
 */
function openFontPickerTab() {
  console.log("[폰트 탭] 클릭");

  // 탭 버튼 활성화 상태 토글
  const fontTabBtn = document.getElementById("fontTabBtn");
  const emojiTabBtn = document.getElementById("emojiTabBtn");

  if (fontTabBtn) {
    const isActive = fontTabBtn.classList.contains("active");

    // 모든 탭 버튼 비활성화
    if (fontTabBtn) fontTabBtn.classList.remove("active");
    if (emojiTabBtn) emojiTabBtn.classList.remove("active");

    if (!isActive) {
      // 폰트 탭 활성화
      fontTabBtn.classList.add("active");

      // 텍스트 블록이 선택되어 있으면 해당 블록에 폰트 선택 모달 열기
      if (
        currentSelectedBlock &&
        currentSelectedBlock.dataset.type === "text"
      ) {
        if (window.openTextFontPicker) {
          openTextFontPicker(currentSelectedBlock);
        }
      } else {
        // 텍스트 블록이 없으면 새 텍스트 블록 생성 후 폰트 선택
        const canvas = document.getElementById("editor-moodboard-canvas");
        if (canvas) {
          const newTextBlock = createTextBlock("텍스트", 100, 100, 200, 100, 0);
          if (newTextBlock && window.openTextFontPicker) {
            setTimeout(() => {
              showBlockStylePanel(newTextBlock);
              openTextFontPicker(newTextBlock);
            }, 100);
          }
        }
      }
    }
  }
}

/**
 * 이모티콘 선택 탭 열기
 */
function openEmojiPickerTab() {
  console.log("[이모티콘 탭] 클릭");

  // 탭 버튼 활성화 상태 토글
  const fontTabBtn = document.getElementById("fontTabBtn");
  const emojiTabBtn = document.getElementById("emojiTabBtn");

  if (emojiTabBtn) {
    const isActive = emojiTabBtn.classList.contains("active");

    // 모든 탭 버튼 비활성화
    if (fontTabBtn) fontTabBtn.classList.remove("active");
    if (emojiTabBtn) emojiTabBtn.classList.remove("active");

    if (!isActive) {
      // 이모티콘 탭 활성화
      emojiTabBtn.classList.add("active");

      // 텍스트 블록이 선택되어 있으면 해당 블록에 이모티콘 선택 모달 열기
      if (
        currentSelectedBlock &&
        currentSelectedBlock.dataset.type === "text"
      ) {
        if (window.openEmojiPicker) {
          openEmojiPicker(currentSelectedBlock);
        }
      } else {
        // 텍스트 블록이 없으면 배경 없는 이모티콘 전용 블록 생성
        const canvas = document.getElementById("editor-moodboard-canvas");
        if (canvas) {
          const newEmojiBlock = createEmojiOnlyBlock("", 100, 100, 100, 100, 0);
          if (newEmojiBlock && window.openEmojiPicker) {
            setTimeout(() => {
              showBlockStylePanel(newEmojiBlock);
              openEmojiPicker(newEmojiBlock);
            }, 100);
          }
        }
      }
    }
  }
}

window.openFontPickerTab = openFontPickerTab;
window.openEmojiPickerTab = openEmojiPickerTab;
window.closeBackgroundColorModal = closeBackgroundColorModal;
window.openImageFilterPicker = openImageFilterPicker;
window.closeImageFilterModal = closeImageFilterModal;
window.openEmojiPicker = openEmojiPicker;
window.closeEmojiPickerModal = closeEmojiPickerModal;
window.openEmojiPickerForSelectedBlock = openEmojiPickerForSelectedBlock;
window.showSetRepresentativeModal = showSetRepresentativeModal;
window.confirmSetRepresentative = confirmSetRepresentative;
window.closeSetRepresentativeModal = closeSetRepresentativeModal;
window.setMoodboardAsRepresentativeById = setMoodboardAsRepresentativeById;

// =========================
// UNDO/REDO SYSTEM
// =========================
let undoHistory = [];
let undoHistoryIndex = -1;
const MAX_HISTORY = 50;

/**
 * 되돌리기 시스템 초기화
 */
function initUndoSystem() {
  undoHistory = [];
  undoHistoryIndex = -1;
  updateUndoButton();

  // 캔버스 상태를 주기적으로 저장
  const canvas = document.getElementById("editor-moodboard-canvas");
  if (canvas) {
    // 초기 상태 저장
    saveCanvasState();

    // MutationObserver로 변경 감지
    const observer = new MutationObserver(() => {
      // 약간의 디바운스로 저장
      clearTimeout(window.undoSaveTimeout);
      window.undoSaveTimeout = setTimeout(() => {
        saveCanvasState();
      }, 500);
    });

    observer.observe(canvas, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeOldValue: true,
    });
  }
}

/**
 * 캔버스 상태 저장
 */
function saveCanvasState() {
  const canvas = document.getElementById("editor-moodboard-canvas");
  if (!canvas) return;

  // 현재 상태를 HTML로 저장
  const state = {
    html: canvas.innerHTML,
    timestamp: Date.now(),
  };

  // 현재 인덱스 이후의 히스토리 제거 (새로운 작업을 시작하는 경우)
  if (undoHistoryIndex < undoHistory.length - 1) {
    undoHistory = undoHistory.slice(0, undoHistoryIndex + 1);
  }

  // 새 상태 추가
  undoHistory.push(state);

  // 최대 히스토리 개수 제한
  if (undoHistory.length > MAX_HISTORY) {
    undoHistory.shift();
  } else {
    undoHistoryIndex++;
  }

  updateUndoButton();
}

/**
 * 되돌리기 버튼 상태 업데이트
 */
function updateUndoButton() {
  const undoBtn = document.getElementById("undoBtn");
  if (undoBtn) {
    undoBtn.disabled = undoHistoryIndex <= 0;
  }
}

/**
 * 되돌리기 실행
 */
function undoLastAction() {
  if (undoHistoryIndex <= 0) return;

  const canvas = document.getElementById("editor-moodboard-canvas");
  if (!canvas) return;

  // 이전 상태로 이동
  undoHistoryIndex--;
  const previousState = undoHistory[undoHistoryIndex];

  if (previousState) {
    canvas.innerHTML = previousState.html;

    // 블록 이벤트 리스너 다시 설정
    canvas.querySelectorAll(".canvas-block").forEach((block) => {
      setupInteractBlock(block);

      // 블록 클릭 이벤트 다시 설정
      const existingClickHandler = block.onclick;
      block.addEventListener("click", (e) => {
        e.stopPropagation();
        showBlockStylePanel(block);
      });

      // 텍스트 블록의 경우 입력 이벤트도 다시 설정
      const textContent = block.querySelector(".text-content");
      if (textContent) {
        textContent.addEventListener("input", () => {
          updateBlockBackgroundForEmoji(block);
          clearTimeout(block._saveTimeout);
          block._saveTimeout = setTimeout(() => {
            saveCanvasState();
          }, 500);
        });
      }

      // 삭제 버튼 이벤트 다시 설정
      const deleteBtn = block.querySelector(".canvas-block-delete");
      if (deleteBtn) {
        deleteBtn.addEventListener("click", (e) => {
          e.stopPropagation();
          saveCanvasState();
          block.remove();
          saveCanvasState();
        });
      }
    });

    updateUndoButton();
  }
}

window.undoLastAction = undoLastAction;

// 현재 편집 중인 이미지 블록
let currentEditingImageBlock = null;

/**
 * 배경 색상 선택 모달 열기
 */
function openBackgroundColorPicker() {
  console.log("[배경색] 모달 열기 시작");
  const modal = document.getElementById("backgroundColorModal");
  if (!modal) {
    console.error("[배경색] 모달을 찾을 수 없습니다");
    return;
  }

  const canvas = document.getElementById("editor-moodboard-canvas");
  if (!canvas) {
    console.error("[배경색] 캔버스를 찾을 수 없습니다");
    return;
  }

  modal.style.display = "flex";
  console.log("[배경색] 모달 표시 완료");

  // 현재 배경색 가져오기
  const computedStyle = window.getComputedStyle(canvas);
  const currentBgColor =
    canvas.style.backgroundColor || computedStyle.backgroundColor || "#fafafa";
  console.log("[배경색] 현재 배경색:", currentBgColor);

  const bgColorInput = document.getElementById("customBgColorInput");
  if (bgColorInput) {
    // RGB를 hex로 변환
    const rgbToHex = (rgb) => {
      if (rgb.startsWith("#")) return rgb;
      const match = rgb.match(/\d+/g);
      if (match && match.length >= 3) {
        return (
          "#" +
          match
            .map((x) => {
              const hex = parseInt(x).toString(16);
              return hex.length === 1 ? "0" + hex : hex;
            })
            .join("")
        );
      }
      return "#fafafa";
    };
    bgColorInput.value = rgbToHex(currentBgColor);
  }

  // 배경 색상 옵션 클릭 이벤트 (모든 옵션에 대해)
  const bgColorOptions = document.querySelectorAll(".bg-color-option");
  console.log("[배경색] 옵션 개수:", bgColorOptions.length);

  bgColorOptions.forEach((option, index) => {
    // 기존 이벤트 제거를 위해 새 요소로 교체
    const newOption = option.cloneNode(true);
    option.parentNode.replaceChild(newOption, option);

    newOption.addEventListener("click", function (e) {
      e.stopPropagation();
      e.preventDefault();
      const color = this.dataset.color;
      console.log("[배경색] 선택된 색상:", color);
      if (canvas) {
        canvas.style.backgroundColor = color;
        canvas.style.backgroundImage = "none";
        canvas.style.backgroundSize = "auto";
        // data 속성에도 저장 (백업)
        canvas.setAttribute("data-bg-color", color);
        // !important로 강제 적용
        const existingStyle = canvas.getAttribute("style") || "";
        const newStyle =
          existingStyle.replace(/background-color:[^;]+;?/g, "") +
          `background-color: ${color} !important; background-image: none !important; background-size: auto !important;`;
        canvas.setAttribute("style", newStyle);
        console.log(
          "[배경색] 적용 완료, 현재 배경색:",
          color,
          "실제 적용:",
          canvas.style.backgroundColor
        );
      }
      closeBackgroundColorModal();
    });
  });

  // 커스텀 배경 색상 입력 이벤트
  const customBgColorInput = document.getElementById("customBgColorInput");
  if (customBgColorInput) {
    // 기존 이벤트 제거
    const newCustomInput = customBgColorInput.cloneNode(true);
    customBgColorInput.parentNode.replaceChild(
      newCustomInput,
      customBgColorInput
    );

    newCustomInput.addEventListener("change", function () {
      const color = this.value;
      console.log("[배경색] 커스텀 색상:", color);
      if (canvas) {
        canvas.style.backgroundColor = color;
        canvas.style.backgroundImage = "none";
        canvas.style.backgroundSize = "auto";
        // data 속성에도 저장 (백업)
        canvas.setAttribute("data-bg-color", color);
        // !important로 강제 적용
        const existingStyle = canvas.getAttribute("style") || "";
        const newStyle =
          existingStyle.replace(/background-color:[^;]+;?/g, "") +
          `background-color: ${color} !important; background-image: none !important; background-size: auto !important;`;
        canvas.setAttribute("style", newStyle);
        console.log(
          "[배경색] 커스텀 색상 적용 완료:",
          color,
          "실제 적용:",
          canvas.style.backgroundColor
        );
      }
    });
  }
}

function closeBackgroundColorModal() {
  const modal = document.getElementById("backgroundColorModal");
  if (modal) {
    modal.style.display = "none";
  }
}

/**
 * 이미지 필터 선택 모달 열기
 */
function openImageFilterPicker(block) {
  currentEditingImageBlock = block;
  const modal = document.getElementById("imageFilterModal");
  if (!modal) return;

  modal.style.display = "flex";

  // 현재 필터 가져오기
  const img = block.querySelector(".block-image");
  const currentFilter = img ? img.style.filter || "none" : "none";

  // 필터 옵션 클릭 이벤트
  document.querySelectorAll(".filter-option").forEach((option) => {
    const newOption = option.cloneNode(true);
    option.parentNode.replaceChild(newOption, option);

    newOption.addEventListener("click", function () {
      const filter = this.dataset.filter || "none";
      if (img) {
        img.style.filter = filter;
        block.dataset.filter = filter;
      }
      closeImageFilterModal();
    });
  });
}

function closeImageFilterModal() {
  const modal = document.getElementById("imageFilterModal");
  if (modal) {
    modal.style.display = "none";
  }
  currentEditingImageBlock = null;
}

/**
 * 텍스트 색상 선택 모달 열기
 */
function openTextColorPicker(block) {
  console.log("[텍스트 색상] 모달 열기 시작");
  currentEditingTextBlock = block;
  const modal = document.getElementById("textColorModal");
  if (!modal) {
    console.error("[텍스트 색상] 모달을 찾을 수 없습니다");
    return;
  }

  modal.style.display = "flex";
  console.log("[텍스트 색상] 모달 표시 완료");

  // 현재 색상 가져오기
  const textContent = block.querySelector(".text-content");
  if (textContent) {
    const currentColor = textContent.style.color || "#333";
    const colorInput = document.getElementById("customColorInput");
    if (colorInput) {
      colorInput.value = currentColor;
    }
  }

  // 색상 옵션 클릭 이벤트 (기존 이벤트 제거 후 새로 추가)
  document.querySelectorAll(".color-option").forEach((option) => {
    // 기존 이벤트 제거
    const newOption = option.cloneNode(true);
    option.parentNode.replaceChild(newOption, option);

    newOption.addEventListener("click", function () {
      const color = this.dataset.color;
      const textContent = block.querySelector(".text-content");
      if (textContent) {
        textContent.style.color = color;
      }
      closeTextColorModal();
    });
  });

  // 커스텀 색상 입력 이벤트
  const colorInput = document.getElementById("customColorInput");
  if (colorInput) {
    // 기존 이벤트 제거 후 새로 추가
    const newColorInput = colorInput.cloneNode(true);
    colorInput.parentNode.replaceChild(newColorInput, colorInput);

    newColorInput.addEventListener("change", function () {
      const textContent = block.querySelector(".text-content");
      if (textContent) {
        textContent.style.color = this.value;
      }
    });
  }
}

function closeTextColorModal() {
  const modal = document.getElementById("textColorModal");
  if (modal) {
    modal.style.display = "none";
  }
  currentEditingTextBlock = null;
}

/**
 * 텍스트 폰트 선택 모달 열기
 */
function openTextFontPicker(block) {
  console.log("[텍스트 폰트] 모달 열기 시작");
  currentEditingTextBlock = block;
  const modal = document.getElementById("textFontModal");
  if (!modal) {
    console.error("[텍스트 폰트] 모달을 찾을 수 없습니다");
    return;
  }

  modal.style.display = "flex";
  console.log("[텍스트 폰트] 모달 표시 완료");
  // 폰트 탭 버튼 활성화
  const fontTabBtn = document.getElementById("fontTabBtn");
  if (fontTabBtn) {
    fontTabBtn.classList.add("active");
    const emojiTabBtn = document.getElementById("emojiTabBtn");
    if (emojiTabBtn) emojiTabBtn.classList.remove("active");
  }

  // 폰트 옵션 클릭 이벤트 (기존 이벤트 제거 후 새로 추가)
  document.querySelectorAll(".font-option").forEach((option) => {
    // 기존 이벤트 제거
    const newOption = option.cloneNode(true);
    option.parentNode.replaceChild(newOption, option);

    newOption.addEventListener("click", function () {
      const font = this.dataset.font;
      const textContent = block.querySelector(".text-content");
      if (textContent) {
        textContent.style.fontFamily = font;
      }
      closeTextFontModal();
    });
  });
}

function closeTextFontModal() {
  const modal = document.getElementById("textFontModal");
  if (modal) {
    modal.style.display = "none";
  }
  currentEditingTextBlock = null;
  // 폰트 탭 버튼 비활성화
  const fontTabBtn = document.getElementById("fontTabBtn");
  if (fontTabBtn) {
    fontTabBtn.classList.remove("active");
  }
}

/**
 * 이모티콘 선택 모달 열기
 */
function openEmojiPicker(block) {
  console.log("[이모티콘] 모달 열기 시작");
  currentEditingTextBlock = block;
  const modal = document.getElementById("emojiPickerModal");
  if (!modal) {
    console.error("[이모티콘] 모달을 찾을 수 없습니다");
    return;
  }

  modal.style.display = "flex";
  console.log("[이모티콘] 모달 표시 완료");
  // 이모티콘 탭 버튼 활성화
  const emojiTabBtn = document.getElementById("emojiTabBtn");
  if (emojiTabBtn) {
    emojiTabBtn.classList.add("active");
    const fontTabBtn = document.getElementById("fontTabBtn");
    if (fontTabBtn) fontTabBtn.classList.remove("active");
  }

  // 이모티콘 목록 생성
  const emojiGrid = modal.querySelector(".emoji-picker-grid");
  if (!emojiGrid) {
    console.error("[이모티콘] 이모티콘 그리드를 찾을 수 없습니다");
    return;
  }

  // 인기 이모티콘 목록
  const emojis = [
    "😀",
    "😃",
    "😄",
    "😁",
    "😆",
    "😅",
    "😂",
    "🤣",
    "😊",
    "😇",
    "🙂",
    "🙃",
    "😉",
    "😌",
    "😍",
    "🥰",
    "😘",
    "😗",
    "😙",
    "😚",
    "😋",
    "😛",
    "😝",
    "😜",
    "🤪",
    "🤨",
    "🧐",
    "🤓",
    "😎",
    "🤩",
    "🥳",
    "😏",
    "😒",
    "😞",
    "😔",
    "😟",
    "😕",
    "🙁",
    "☹️",
    "😣",
    "😖",
    "😫",
    "😩",
    "🥺",
    "😢",
    "😭",
    "😤",
    "😠",
    "😡",
    "🤬",
    "🤯",
    "😳",
    "🥵",
    "🥶",
    "😱",
    "😨",
    "😰",
    "😥",
    "😓",
    "🤗",
    "🤔",
    "🤭",
    "🤫",
    "🤥",
    "😶",
    "😐",
    "😑",
    "😬",
    "🙄",
    "😯",
    "😦",
    "😧",
    "😮",
    "😲",
    "🥱",
    "😴",
    "🤤",
    "😪",
    "😵",
    "🤐",
    "🥴",
    "🤢",
    "🤮",
    "🤧",
    "😷",
    "🤒",
    "🤕",
    "🤑",
    "❤️",
    "🧡",
    "💛",
    "💚",
    "💙",
    "💜",
    "🖤",
    "🤍",
    "💔",
    "❣️",
    "💕",
    "💞",
    "💓",
    "💗",
    "💖",
    "💘",
    "💝",
    "💟",
    "☮️",
    "✝️",
    "☪️",
    "🕉️",
    "☸️",
    "✡️",
    "🔯",
    "🕎",
    "☯️",
    "☦️",
    "🛐",
    "⛎",
    "♈",
    "♉",
    "♊",
    "♋",
    "♌",
    "♍",
    "♎",
    "♏",
    "♐",
    "♑",
    "♒",
    "♓",
    "🆔",
    "⚛️",
    "🉑",
    "☢️",
    "☣️",
    "📴",
    "📳",
    "🈶",
    "🈚",
    "🈸",
    "🈺",
    "🈷️",
    "✴️",
    "🆚",
    "💮",
    "🉐",
    "㊙️",
    "㊗️",
    "🈴",
    "🈵",
    "🈹",
    "🈲",
    "🅰️",
    "🅱️",
    "🆎",
    "🆑",
    "🅾️",
    "🆘",
    "❌",
    "⭕",
    "🛑",
    "⛔",
    "📛",
    "🚫",
    "💯",
    "💢",
    "♨️",
    "🚷",
    "🚯",
    "🚳",
    "🚱",
    "🔞",
    "📵",
    "🚭",
    "❗",
    "❓",
    "❕",
    "❔",
    "‼️",
    "⁉️",
    "🔅",
    "🔆",
    "〽️",
    "⚠️",
    "🚸",
    "🔱",
    "⚜️",
    "🔰",
    "♻️",
    "✅",
    "🈯",
    "💹",
    "❇️",
    "✳️",
    "❎",
    "🌐",
    "💠",
    "Ⓜ️",
    "🌀",
    "💤",
    "🏧",
    "🚾",
    "♿",
    "🅿️",
    "🈳",
    "🈂️",
    "🛂",
    "🛃",
    "🛄",
    "🛅",
    "🚹",
    "🚺",
    "🚼",
    "🚻",
    "🚮",
    "🎦",
    "📶",
    "🈁",
    "🔣",
    "ℹ️",
    "🔤",
    "🔡",
    "🔠",
    "🔢",
  ];

  // 기존 이모티콘 제거
  emojiGrid.innerHTML = "";

  // 이모티콘 버튼 생성
  emojis.forEach((emoji) => {
    const emojiBtn = document.createElement("button");
    emojiBtn.className = "emoji-option";
    emojiBtn.textContent = emoji;
    emojiBtn.style.cssText = `
      width: 40px;
      height: 40px;
      font-size: 24px;
      border: none;
      background: transparent;
      cursor: pointer;
      border-radius: 8px;
      transition: background 0.2s;
    `;
    emojiBtn.addEventListener("mouseenter", () => {
      emojiBtn.style.background = "#f0f0f0";
    });
    emojiBtn.addEventListener("mouseleave", () => {
      emojiBtn.style.background = "transparent";
    });
    emojiBtn.addEventListener("click", () => {
      const textContent = block.querySelector(".text-content");
      if (textContent) {
        // 포커스 설정
        textContent.focus();

        // 현재 커서 위치에 이모티콘 삽입
        try {
          const selection = window.getSelection();
          if (selection.rangeCount > 0) {
            const range = selection.getRangeAt(0);
            range.deleteContents();
            const textNode = document.createTextNode(emoji);
            range.insertNode(textNode);
            range.collapse(false);
            selection.removeAllRanges();
            selection.addRange(range);
          } else {
            // 범위가 없으면 끝에 추가
            textContent.textContent += emoji;
            // 커서를 끝으로 이동
            const range = document.createRange();
            range.selectNodeContents(textContent);
            range.collapse(false);
            const selection = window.getSelection();
            selection.removeAllRanges();
            selection.addRange(range);
          }
        } catch (error) {
          // 에러 발생 시 단순히 끝에 추가
          console.log("[이모티콘] 삽입 오류, 끝에 추가:", error);
          textContent.textContent += emoji;
        }

        // 이모티콘만 있는 경우 배경을 투명하게 처리
        updateBlockBackgroundForEmoji(block);
      }
      closeEmojiPickerModal();
    });
    emojiGrid.appendChild(emojiBtn);
  });
}

function closeEmojiPickerModal() {
  const modal = document.getElementById("emojiPickerModal");
  if (modal) {
    modal.style.display = "none";
  }
  currentEditingTextBlock = null;
  // 이모티콘 탭 버튼 비활성화
  const emojiTabBtn = document.getElementById("emojiTabBtn");
  if (emojiTabBtn) {
    emojiTabBtn.classList.remove("active");
  }
}
window.dragCutStart = dragCutStart;

// =========================
// FEATURED MOODBOARD SETTINGS
// =========================

/**
 * 대표 무드보드 설정 모달 열기
 */
function openFeaturedMoodboardSettingsModal() {
  const modal = document.getElementById("featuredMoodboardSettingsModal");
  if (!modal) return;

  // 무드보드 선택 목록 생성
  const selector = document.getElementById("featured-moodboard-selector");
  if (selector) {
    const currentFeatured = moodboards.find((m) => m.isRepresentative);
    selectedFeaturedMoodboardId = currentFeatured?.id || null;

    selector.innerHTML = moodboards
      .map(
        (moodboard) => `
      <div class="featured-moodboard-option ${
        moodboard.id === currentFeatured?.id ? "selected" : ""
      }" onclick="selectFeaturedMoodboard('${moodboard.id}')">
        <div class="featured-moodboard-option-thumbnail">
          ${
            moodboard.thumbnail
              ? `<img src="${moodboard.thumbnail}" alt="${moodboard.name}" />`
              : `<div style="width: 100%; height: 100%; background: #f5f5f5; display: flex; align-items: center; justify-content: center; font-size: 20px;">🎨</div>`
          }
        </div>
        <div class="featured-moodboard-option-name">${moodboard.name}</div>
      </div>
    `
      )
      .join("");

    if (moodboards.length === 0) {
      selector.innerHTML = `
        <div style="padding: 20px; text-align: center; color: #999;">
          무드보드가 없습니다. 먼저 무드보드를 만들어주세요.
        </div>
      `;
    }
  }

  // 현재 대표 무드 문구 로드
  const moodTextInput = document.getElementById("featured-mood-text-input");
  if (moodTextInput) {
    moodTextInput.value = getFeaturedMoodText() || "";
  }

  modal.classList.add("active");
}

/**
 * 대표 무드보드 설정 모달 닫기
 */
function closeFeaturedMoodboardSettingsModal() {
  const modal = document.getElementById("featuredMoodboardSettingsModal");
  if (modal) {
    modal.classList.remove("active");
  }
}

/**
 * 대표 무드보드 선택
 */
let selectedFeaturedMoodboardId = null;
function selectFeaturedMoodboard(moodboardId) {
  selectedFeaturedMoodboardId = moodboardId;

  // 선택 상태 업데이트
  const options = document.querySelectorAll(".featured-moodboard-option");
  options.forEach((option) => {
    if (option.getAttribute("onclick").includes(moodboardId)) {
      option.classList.add("selected");
    } else {
      option.classList.remove("selected");
    }
  });
}

/**
 * 대표 무드보드 설정 저장
 */
async function saveFeaturedMoodboardSettings() {
  try {
    const moodTextInput = document.getElementById("featured-mood-text-input");
    const moodText = moodTextInput ? moodTextInput.value.trim() : "";

    // 대표 무드보드 선택 확인
    if (!selectedFeaturedMoodboardId) {
      if (moodboards.length === 0) {
        alert("무드보드를 먼저 만들어주세요.");
        return;
      }
      // 선택하지 않았으면 현재 대표 무드보드 유지
      const currentFeatured = moodboards.find((m) => m.isRepresentative);
      selectedFeaturedMoodboardId = currentFeatured?.id || moodboards[0].id;
    }

    const firebaseUser = await ensureFirebaseUser();
    if (!firebaseUser) {
      alert("로그인이 필요합니다");
      return;
    }

    const supabaseClient = await loadSupabaseClient();
    if (typeof supabaseClient === "undefined" || !supabaseClient) {
      // Supabase를 사용할 수 없으면 localStorage에만 저장
      localStorage.setItem(
        `featured_mood_text_${firebaseUser.uid || "default"}`,
        moodText
      );
    } else {
      // 대표 무드 문구와 대표 무드보드 ID를 Supabase에 저장
      try {
        const { error } = await supabaseClient.from("reader_profiles").upsert(
          {
            reader_id: firebaseUser.uid,
            featured_mood_text: moodText,
            featured_moodboard_id: selectedFeaturedMoodboardId || null,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "reader_id" }
        );
        if (error) {
          console.error("[대표 무드보드] 저장 오류:", error);
          // 에러가 있어도 localStorage에 저장
          localStorage.setItem(
            `featured_mood_text_${firebaseUser.uid}`,
            moodText
          );
          if (selectedFeaturedMoodboardId) {
            localStorage.setItem(
              `featured_moodboard_id_${firebaseUser.uid}`,
              selectedFeaturedMoodboardId
            );
          }
        }
      } catch (e) {
        console.error("[대표 무드보드] 저장 실패:", e);
        localStorage.setItem(
          `featured_mood_text_${firebaseUser.uid}`,
          moodText
        );
        if (selectedFeaturedMoodboardId) {
          localStorage.setItem(
            `featured_moodboard_id_${firebaseUser.uid}`,
            selectedFeaturedMoodboardId
          );
        }
      }
    }

    // 대표 무드보드 설정
    if (selectedFeaturedMoodboardId) {
      // 모든 무드보드의 대표 플래그 초기화
      moodboards.forEach((m) => {
        m.isRepresentative = m.id === selectedFeaturedMoodboardId;
      });

      // Supabase에 대표 무드보드 상태 저장 (user_feed_events의 metadata 업데이트)
      if (typeof supabaseClient !== "undefined" && supabaseClient) {
        try {
          for (const moodboard of moodboards) {
            await updateMoodboardRepresentative(
              moodboard.id,
              moodboard.id === selectedFeaturedMoodboardId
            );
          }
        } catch (e) {
          console.error("[대표 무드보드] 대표 상태 저장 실패:", e);
        }
      }
    }

    alert("대표 무드보드 설정이 저장되었습니다.");
    closeFeaturedMoodboardSettingsModal();
    loadFeaturedMoodboard();
    loadMoodboards();
  } catch (error) {
    console.error("[대표 무드보드 설정] 저장 오류:", error);
    alert("설정 저장에 실패했습니다: " + (error.message || "알 수 없는 오류"));
  }
}

/**
 * 대표 무드 문구 가져오기
 */
async function getFeaturedMoodText() {
  try {
    const firebaseUser = await ensureFirebaseUser();
    if (!firebaseUser) {
      return localStorage.getItem(`featured_mood_text_default`) || "";
    }

    const supabaseClient = await loadSupabaseClient();
    if (typeof supabaseClient !== "undefined" && supabaseClient) {
      try {
        const { data } = await supabaseClient
          .from("reader_profiles")
          .select("featured_mood_text")
          .eq("reader_id", firebaseUser.uid)
          .single();
        if (data && data.featured_mood_text) {
          return data.featured_mood_text;
        }
      } catch (e) {
        console.warn("[대표 무드보드] 문구 로드 실패:", e);
      }
    }

    // Supabase에서 가져오지 못하면 localStorage에서 가져오기
    return localStorage.getItem(`featured_mood_text_${firebaseUser.uid}`) || "";
  } catch (error) {
    console.error("[대표 무드보드] 문구 가져오기 오류:", error);
    const firebaseUser = await ensureFirebaseUser();
    return (
      localStorage.getItem(
        `featured_mood_text_${firebaseUser?.uid || currentUserId || "default"}`
      ) || ""
    );
  }
}

// 전역 함수로 등록
window.openFeaturedMoodboardSettingsModal = openFeaturedMoodboardSettingsModal;
window.closeFeaturedMoodboardSettingsModal =
  closeFeaturedMoodboardSettingsModal;
window.selectFeaturedMoodboard = selectFeaturedMoodboard;
window.saveFeaturedMoodboardSettings = saveFeaturedMoodboardSettings;

document.addEventListener("DOMContentLoaded", () => {
  // 화면이 정상적으로 표시되도록 로딩 완료 처리 (supabase/firebase 상태와 무관)
  const appFrame = document.querySelector(".app-frame");
  if (appFrame) {
    appFrame.classList.add("loaded");
  }

  // 초기 로드 시 MY MOOD 탭이 활성화되어 있으면 스크롤 차단
  const tabMood = document.getElementById("tab-mood");
  if (tabMood && tabMood.classList.contains("active")) {
    document.body.classList.add("my-mood-view");
  }

  // Setup Firebase Auth listener FIRST
  // This will wait for auth state before initializing Supabase
  setupFirebaseAuth();

  // Close modals on outside click
  document
    .querySelectorAll(
      ".moodboard-create-modal, .template-select-modal, .moodboard-editor-modal, .block-modal, .folder-menu-modal, .folder-name-modal, .moodboard-menu-modal, .settings-modal, .text-style-modal, .featured-settings-modal"
    )
    .forEach((modal) => {
      modal.addEventListener("click", (e) => {
        if (e.target === modal) {
          if (modal.id === "textColorModal") {
            closeTextColorModal();
          } else if (modal.id === "textFontModal") {
            closeTextFontModal();
          } else if (modal.id === "featuredMoodboardSettingsModal") {
            closeFeaturedMoodboardSettingsModal();
          } else {
            modal.classList.remove("active");
          }
        }
      });
    });
});
