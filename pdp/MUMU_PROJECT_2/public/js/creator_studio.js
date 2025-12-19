/**
 * MUMU Creator Studio
 *
 * 작품 업로드 및 관리 시스템
 * - React로 옮겨도 그대로 쓸 수 있는 구조 유지
 * - UI 기준으로 DB 구조 설계
 */

const existingState = window.__CREATOR_STUDIO_STATE__;
const uploadDraft = window.__UPLOAD_DRAFT__ || {
  genres: [],
  tags: [],
  cuts: [],
  thumbnail: null,
};

const ensureArray = (value) => (Array.isArray(value) ? value : []);

uploadDraft.genres =
  uploadDraft.genres.length > 0
    ? uploadDraft.genres
    : ensureArray(existingState?.selectedGenres);
uploadDraft.tags =
  uploadDraft.tags.length > 0
    ? uploadDraft.tags
    : ensureArray(existingState?.selectedTags);
uploadDraft.cuts =
  uploadDraft.cuts.length > 0
    ? uploadDraft.cuts
    : ensureArray(existingState?.uploadedImages);

if (!uploadDraft.thumbnail && existingState?.thumbnailUrl) {
  uploadDraft.thumbnail = existingState.thumbnailUrl;
}

uploadDraft.thumbnailSource =
  uploadDraft.thumbnailSource ?? existingState?.thumbnailSource ?? null;
uploadDraft.thumbnailCutIndex =
  typeof uploadDraft.thumbnailCutIndex === "number"
    ? uploadDraft.thumbnailCutIndex
    : typeof existingState?.thumbnailCutIndex === "number"
    ? existingState.thumbnailCutIndex
    : null;
uploadDraft.uploadStep =
  typeof uploadDraft.uploadStep === "number"
    ? uploadDraft.uploadStep
    : existingState?.uploadStep || 0;
uploadDraft.currentWorkId =
  uploadDraft.currentWorkId || existingState?.currentWorkId || null;
uploadDraft.works = uploadDraft.works || existingState?.works || [];
uploadDraft.title = uploadDraft.title || existingState?.title || "";
uploadDraft.description =
  uploadDraft.description || existingState?.description || "";
uploadDraft.profile = uploadDraft.profile ||
  existingState?.profile || {
    authorName: "",
    authorIntro: "",
    profilePicture: null,
    contactEmail: "",
    snsLinks: "",
  };
uploadDraft.dummyData = uploadDraft.dummyData ||
  existingState?.dummyData || {
    payout: {
      amount: 2310000,
      status: "aggregating",
      totalRevenue: 2500000,
      platformFee: 190000,
    },
    monthlyViews: 45678,
    monthlyLikes: 2345,
  };

window.__UPLOAD_DRAFT__ = uploadDraft;
window.__CREATOR_STUDIO_STATE__ = uploadDraft;
const state = uploadDraft;

const bindDraftProxy = (key, draftKey) => {
  Object.defineProperty(state, key, {
    get() {
      return state[draftKey];
    },
    set(val) {
      state[draftKey] = Array.isArray(val) ? val : [];
    },
    enumerable: true,
    configurable: true,
  });
};

bindDraftProxy("uploadedImages", "cuts");
bindDraftProxy("selectedGenres", "genres");
bindDraftProxy("selectedTags", "tags");

const thumbnailDescriptor = Object.getOwnPropertyDescriptor(
  state,
  "thumbnailUrl"
);
if (
  !thumbnailDescriptor ||
  (!thumbnailDescriptor.get && !thumbnailDescriptor.set)
) {
  Object.defineProperty(state, "thumbnailUrl", {
    get() {
      return state.thumbnail;
    },
    set(val) {
      state.thumbnail = val;
    },
    enumerable: true,
    configurable: true,
  });
}

function getUploadDraft() {
  return window.__UPLOAD_DRAFT__ || state;
}

// creator pen name cache
let cachedPenName = null;
async function getCreatorPenName() {
  if (cachedPenName) return cachedPenName;
  const currentCreatorId = getCreatorId();
  if (!currentCreatorId || !supabaseClient) {
    return (
      state.profile?.penName ||
      state.profile?.authorName ||
      state.profile?.author_name ||
      null
    );
  }
  try {
    const { data, error } = await supabaseClient
      .from("creators")
      .select("pen_name")
      .eq("id", currentCreatorId)
      .single();
    if (error) {
      return (
        state.profile?.penName ||
        state.profile?.authorName ||
        state.profile?.author_name ||
        null
      );
    }
    cachedPenName = data?.pen_name || null;
    state.profile = state.profile || {};
    state.profile.penName = cachedPenName;
    return cachedPenName;
  } catch {
    return (
      state.profile?.penName ||
      state.profile?.authorName ||
      state.profile?.author_name ||
      null
    );
  }
}

async function buildMemoString() {
  const penName = await getCreatorPenName();
  const fallback =
    state.profile?.penName ||
    state.profile?.authorName ||
    state.profile?.author_name ||
    null;
  const creatorId = getCreatorId();
  if (penName || fallback) {
    return `작성자:${penName || fallback}`;
  }
  if (creatorId) {
    return `작성자:${creatorId}`;
  }
  return "작성자:알 수 없음";
}

// Supabase 클라이언트는 전역 window.supabase 사용
let creatorId = null;
let supabaseClient = null;

function setCreatorIdOnce(id) {
  if (!id || typeof id !== "string") {
    throw new Error("Invalid creator_id");
  }
  if (!window.__CREATOR_ID__) {
    window.__CREATOR_ID__ = id;
  }
  creatorId = window.__CREATOR_ID__;
}

function getCreatorId() {
  return window.__CREATOR_ID__ || creatorId;
}

function loadCreatorNavScriptOnce() {
  if (
    window.__CREATOR_NAV_LOADED__ ||
    document.querySelector('script[src$="creator_nav.js"]')
  ) {
    return;
  }
  const script = document.createElement("script");
  script.src = "./js/creator_nav.js";
  script.defer = true;
  script.onload = () => {
    window.__CREATOR_NAV_LOADED__ = true;
  };
  document.head.appendChild(script);
}

// ============================================
// 2. 초기화
// ============================================

document.addEventListener("DOMContentLoaded", async () => {
  console.log("DOMContentLoaded - initializing navigation");
  window.__SINGLE_PAGE_UPLOAD__ = true;

  const step0El = document.getElementById("upload-step-0");
  if (step0El) {
    step0El.style.display = "none";
    step0El.setAttribute("aria-hidden", "true");
  }

  mergeCutUploadIntoStep2Once();

  loadCreatorNavScriptOnce();

  // 접근 가드: Firebase 로그인 확인 및 Creator 승인 상태 확인
  try {
    const accessGranted = await checkCreatorAccess();
    if (!accessGranted) {
      console.warn("[creator_studio] access not granted, staying for debug");
      return;
    }
  } catch (error) {
    console.error("Access check failed:", error);
    // 접근 거부 시에도 머물러서 로그 확인
    return;
  }

  // Supabase 초기화
  try {
    await initializeSupabase();
  } catch (error) {
    console.warn(
      "Supabase initialization failed, continuing with mock data:",
      error
    );
  }

  // 앱 초기화
  await initApp();
});

/**
 * Creator 접근 가드: Firebase 로그인 및 승인 상태 확인
 */
async function checkCreatorAccess() {
  // Firebase Auth 확인
  const { auth } = await import("./firebase_init.js");
  const { onAuthStateChanged } = await import(
    "https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js"
  );
  const { getFunctions, httpsCallable } = await import(
    "https://www.gstatic.com/firebasejs/9.23.0/firebase-functions.js"
  );

  return new Promise((resolve, reject) => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      unsubscribe();

      if (!user) {
        console.warn("[creator_studio] no user session");
        resolve(false);
        return;
      }

      try {
        const functions = getFunctions();
        const checkStatus = httpsCallable(functions, "checkCreatorStatus");
        const response = await checkStatus();
        const exists = response?.data?.exists;
        const status = response?.data?.status;
        const creator_id = response?.data?.creator_id;

        if (!exists) {
          console.warn("[creator_studio] creator record not found");
          resolve(false);
          return;
        }

        if (status === "pending") {
          console.warn("[creator_studio] status pending");
          resolve(false);
          return;
        }

        if (status === "rejected") {
          console.warn("[creator_studio] status rejected");
          resolve(false);
          return;
        }

        if (status === "approved") {
          try {
            setCreatorIdOnce(creator_id);
          } catch (idError) {
            reject(idError);
            return;
          }
          resolve(true);
          return;
        }

        console.warn("[creator_studio] unknown status", status);
        resolve(false);
      } catch (error) {
        console.error("Failed to verify creator via Cloud Function:", error);
        reject(error);
      }
    });
  });
}

async function initializeSupabase() {
  // 전역 주입된 supabase 확인
  if (!window.supabase) {
    throw new Error("supabase client not found on window");
  }
  supabase = window.supabase;
  supabaseClient = window.supabase;

  // 세션 사용자 → creatorId 설정
  try {
    const { data, error } = await supabaseClient.auth.getUser();
    if (error) {
      console.warn("supabase auth getUser error:", error);
    }
    if (data?.user?.id) {
      creatorId = data.user.id;
      window.__CREATOR_ID__ = creatorId;
      await ensureCreatorRecord(creatorId);
    }
  } catch (e) {
    console.warn("Failed to get supabase user:", e);
  }
}

/**
 * creators 테이블에 레코드가 없으면 생성
 */
async function ensureCreatorRecord(currentCreatorId) {
  if (!supabase || !currentCreatorId) return;
  // 존재 확인
  const { data, error } = await supabase
    .from("creators")
    .select("id, pen_name")
    .eq("id", currentCreatorId)
    .maybeSingle();

  if (data && data.id) return data;

  const penName =
    state.profile?.penName ||
    state.profile?.authorName ||
    state.profile?.author_name ||
    "작가";

  const insertPayload = {
    id: currentCreatorId,
    pen_name: penName,
    status: "approved",
    created_at: new Date().toISOString(),
  };

  const { data: inserted, error: insertError } = await supabase
    .from("creators")
    .insert(insertPayload)
    .select("id, pen_name")
    .maybeSingle();

  if (insertError) {
    console.warn("ensureCreatorRecord insert failed:", insertError);
    return null;
  }
  return inserted;
}

async function initApp() {
  if (window.__CREATOR_STUDIO_APP_INITED__) return;
  window.__CREATOR_STUDIO_APP_INITED__ = true;

  window.__SINGLE_PAGE_UPLOAD__ = true;

  // UI 컴포넌트 초기화
  initializeUpload();
  initializeGenres();
  initializeTags();
  initializeThumbnailSelection();
  initializeUploadSteps();
  initializeProfile();
  initializeWorkTabs();

  // 업로드 스텝 초기화 (메인 업로드 화면으로 바로 이동)
  setUploadStep(2);

  // 작품 목록 로드
  try {
    await loadWorks();
  } catch (error) {
    console.warn("Failed to load works, showing empty state:", error);
    renderWorks();
  }

  // 대시보드 렌더링
  try {
    renderDashboard();
  } catch (error) {
    console.warn("Failed to render dashboard:", error);
  }
}

// ============================================
// 4. 이미지/WebP 변환
// ============================================

/**
 * 이미지를 WebP로 변환하고 1:1 비율로 크롭
 * @param {File} file - 원본 이미지 파일
 * @returns {Promise<{file: File, width: number, height: number, originalSize: number, newSize: number}>}
 */
async function convertImageToWebP(file) {
  const MAX_INPUT_SIZE = 10 * 1024 * 1024; // 10MB
  const MAX_OUTPUT_SIZE = 3 * 1024 * 1024; // 3MB
  const MAX_SIZE = 1440; // 최대 크기
  const QUALITY = 0.8;

  // 파일 크기 검증
  if (file.size > MAX_INPUT_SIZE) {
    throw new Error("파일 용량이 너무 큽니다 (최대 10MB)");
  }

  // 이미지 파일 검증
  if (!file.type.startsWith("image/")) {
    throw new Error("지원하지 않는 이미지 형식입니다");
  }

  return new Promise((resolve, reject) => {
    const img = new Image();
    const reader = new FileReader();

    reader.onload = (e) => {
      img.onload = () => {
        try {
          // 1:1 비율 크롭 계산
          const originalWidth = img.width;
          const originalHeight = img.height;
          const size = Math.min(originalWidth, originalHeight);

          // 중앙 크롭 위치
          const sourceX = (originalWidth - size) / 2;
          const sourceY = (originalHeight - size) / 2;

          // 출력 크기 (최대 1440x1440)
          const outputSize = Math.min(size, MAX_SIZE);

          // Canvas 생성
          const canvas = document.createElement("canvas");
          canvas.width = outputSize;
          canvas.height = outputSize;

          const ctx = canvas.getContext("2d");

          // 이미지 그리기 (1:1 크롭)
          ctx.drawImage(
            img,
            sourceX,
            sourceY,
            size,
            size, // 소스: 중앙 정사각형
            0,
            0,
            outputSize,
            outputSize // 대상: 전체 캔버스
          );

          // WebP 변환
          canvas.toBlob(
            (blob) => {
              if (!blob) {
                reject(new Error("이미지 처리 중 오류가 발생했습니다"));
                return;
              }

              // 출력 크기 검증
              if (blob.size > MAX_OUTPUT_SIZE) {
                reject(new Error("파일 용량이 너무 큽니다"));
                return;
              }

              // File 객체 생성
              const fileName = file.name.replace(/\.[^/.]+$/, "");
              const compressedFile = new File([blob], `${fileName}.webp`, {
                type: "image/webp",
                lastModified: Date.now(),
              });

              resolve({
                file: compressedFile,
                width: outputSize,
                height: outputSize,
                originalSize: file.size,
                newSize: blob.size,
              });
            },
            "image/webp",
            QUALITY
          );
        } catch (error) {
          reject(new Error("이미지 처리 중 오류가 발생했습니다"));
        }
      };

      img.onerror = () => {
        reject(new Error("이미지를 불러올 수 없습니다"));
      };

      img.src = e.target.result;
    };

    reader.onerror = () => {
      reject(new Error("파일을 읽을 수 없습니다"));
    };

    reader.readAsDataURL(file);
  });
}

// ============================================
// 5. Preview 렌더링
// ============================================

/**
 * 컷 미리보기 렌더링 (가로 스와이프)
 */
function renderCutPreviews() {
  const previewList = document.getElementById("image-preview-list");
  if (!previewList) return;

  previewList.innerHTML = "";

  const draft = getUploadDraft();
  const hasThumbnail = !!(draft.thumbnail || draft.thumbnailUrl);

  // 썸네일이 비어 있고 컷이 존재하면 첫 컷을 대표 컷으로 지정
  if (!hasThumbnail && draft.cuts.length > 0) {
    const firstCutUrl = draft.cuts[0].url;
    draft.thumbnail = firstCutUrl;
    draft.thumbnailUrl = firstCutUrl;
    draft.thumbnailSource = "cut";
    draft.thumbnailCutIndex = 0;
    renderThumbnailPreview();
  }

  draft.cuts.forEach((imageData, index) => {
    const previewItem = document.createElement("div");
    previewItem.className = "cut-preview-swipe-item";
    previewItem.dataset.id = imageData.id;
    previewItem.draggable = true;

    const isThumbnail =
      draft.thumbnailSource !== "upload" &&
      typeof draft.thumbnailCutIndex === "number" &&
      draft.thumbnailCutIndex === index;

    // 컷 번호 배지
    const cutNumberBadge = document.createElement("div");
    cutNumberBadge.className = "cut-number-badge";
    cutNumberBadge.textContent = index + 1;

    if (isThumbnail) {
      const repBadge = document.createElement("div");
      repBadge.className = "cut-rep-badge";
      repBadge.textContent = "대표";
      cutNumberBadge.appendChild(repBadge);
    }

    // 이미지
    const img = document.createElement("img");
    img.src = imageData.url;
    img.alt = `컷 ${index + 1}`;

    // 삭제 버튼
    const removeBtn = document.createElement("button");
    removeBtn.className = "cut-remove-btn";
    removeBtn.innerHTML = "×";
    removeBtn.title = "삭제";
    removeBtn.addEventListener("click", () => {
      removeCut(imageData.id);
    });

    // 대표 컷 설정 버튼
    const setThumbnailBtn = document.createElement("button");
    setThumbnailBtn.className = "cut-set-thumbnail-btn";
    setThumbnailBtn.textContent = isThumbnail ? "대표" : "대표 설정";
    setThumbnailBtn.title = "대표 컷으로 설정";
    setThumbnailBtn.addEventListener("click", () => {
      setThumbnailFromCut(index);
    });

    previewItem.appendChild(cutNumberBadge);
    previewItem.appendChild(img);
    previewItem.appendChild(removeBtn);
    previewItem.appendChild(setThumbnailBtn);

    previewItem.addEventListener("dragstart", (e) => {
      e.dataTransfer.effectAllowed = "move";
      e.dataTransfer.setData("text/plain", String(imageData.id));
      previewItem.classList.add("dragging");
    });

    previewItem.addEventListener("dragend", () => {
      previewItem.classList.remove("dragging");
      previewItem.classList.remove("dragover");
    });

    previewItem.addEventListener("dragover", (e) => {
      e.preventDefault();
      previewItem.classList.add("dragover");
    });

    previewItem.addEventListener("dragleave", () => {
      previewItem.classList.remove("dragover");
    });

    previewItem.addEventListener("drop", (e) => {
      e.preventDefault();
      previewItem.classList.remove("dragover");
      const sourceId = e.dataTransfer.getData("text/plain");
      if (!sourceId) return;
      reorderCuts(sourceId, imageData.id);
    });

    previewList.appendChild(previewItem);
  });

  // 플레이스홀더 숨기기
  const placeholder = document.getElementById("upload-placeholder");
  if (placeholder && draft.cuts.length > 0) {
    placeholder.classList.add("hidden");
  }

  // 다음 버튼 활성화
  const btnNext = document.getElementById("btn-next-to-settings");
  if (btnNext) {
    btnNext.disabled = draft.cuts.length === 0;
  }

  // 전체 삭제 버튼 표시
  const btnResetAll = document.getElementById("btn-reset-all");
  if (btnResetAll) {
    btnResetAll.style.display = draft.cuts.length > 0 ? "block" : "none";
  }
}

function reorderCuts(sourceId, targetId) {
  const draft = getUploadDraft();
  const cuts = draft.cuts || [];
  if (!sourceId || !targetId) return;

  const fromIndex = cuts.findIndex(
    (img) => String(img.id) === String(sourceId)
  );
  const toIndex = cuts.findIndex((img) => String(img.id) === String(targetId));

  if (fromIndex === -1 || toIndex === -1 || fromIndex === toIndex) return;

  const [moved] = cuts.splice(fromIndex, 1);
  cuts.splice(toIndex, 0, moved);

  // 썸네일 인덱스 보정
  if (
    draft.thumbnailSource === "cut" &&
    typeof draft.thumbnailCutIndex === "number"
  ) {
    const newIndex = cuts.findIndex((img) => img.url === draft.thumbnail);
    draft.thumbnailCutIndex = newIndex >= 0 ? newIndex : null;
  }

  draft.cuts = [...cuts];
  renderCutPreviews();
  syncPreviewFromDraft();
}

/**
 * 컷 삭제
 */
function removeCut(id) {
  const draft = getUploadDraft();
  const currentCuts = draft.cuts;
  const removedIndex = currentCuts.findIndex((img) => img.id === id);
  const imageData = removedIndex >= 0 ? currentCuts[removedIndex] : null;
  if (imageData && imageData.url) {
    URL.revokeObjectURL(imageData.url);
  }

  if (removedIndex === -1) {
    return;
  }

  const nextCuts = currentCuts.filter((img) => img.id !== id);
  draft.cuts.length = 0;
  draft.cuts.push(...nextCuts);

  // 썸네일이 삭제된 컷이면 초기화
  if (draft.thumbnailSource === "cut" && draft.thumbnailCutIndex !== null) {
    if (
      removedIndex === draft.thumbnailCutIndex ||
      removedIndex < draft.thumbnailCutIndex
    ) {
      draft.thumbnail = null;
      draft.thumbnailUrl = null;
      draft.thumbnailSource = null;
      draft.thumbnailCutIndex = null;
    }
  }

  renderCutPreviews();
  syncPreviewFromDraft();
}

/**
 * 컷에서 대표 컷 설정
 */
function setThumbnailFromCut(index) {
  const draft = getUploadDraft();
  if (index < 0 || index >= draft.cuts.length) return;

  const imageData = draft.cuts[index];
  draft.thumbnail = imageData.url;
  draft.thumbnailUrl = imageData.url;
  draft.thumbnailSource = "cut";
  draft.thumbnailCutIndex = index;

  renderThumbnailPreview();
  syncPreviewFromDraft();
}

/**
 * 대표 컷 미리보기 렌더링
 */
function renderThumbnailPreview() {
  const draft = getUploadDraft();
  const thumbnailPreview = document.getElementById("thumbnail-preview");
  if (!thumbnailPreview) return;

  const thumbnailUrl = draft.thumbnail || draft.thumbnailUrl;

  if (thumbnailUrl) {
    thumbnailPreview.innerHTML = `
      <img src="${thumbnailUrl}" alt="대표 컷" />
      <button type="button" class="thumbnail-remove" id="btn-remove-thumbnail">×</button>
    `;

    const btnRemove = document.getElementById("btn-remove-thumbnail");
    if (btnRemove) {
      btnRemove.addEventListener("click", () => {
        draft.thumbnail = null;
        draft.thumbnailUrl = null;
        draft.thumbnailSource = null;
        draft.thumbnailCutIndex = null;
        renderThumbnailPreview();
        syncPreviewFromDraft();
      });
    }
  } else {
    thumbnailPreview.innerHTML = `
      <div class="thumbnail-placeholder">
        <span>대표 컷을 선택하세요</span>
      </div>
    `;
  }

  syncPreviewFromDraft();
}

// ============================================
// 6. 업로드 초기화
// ============================================

function initializeUpload() {
  const uploadArea = document.getElementById("upload-area");
  const fileInput = document.getElementById("file-input");
  const uploadPlaceholder = document.getElementById("upload-placeholder");

  if (!uploadArea || !fileInput) return;

  // 클릭으로 파일 선택
  uploadArea.addEventListener("click", () => {
    fileInput.click();
  });

  // 파일 선택 핸들러
  fileInput.addEventListener("change", handleFileSelect);

  // 드래그 앤 드롭
  uploadArea.addEventListener("dragover", (e) => {
    e.preventDefault();
    uploadArea.classList.add("dragover");
  });

  uploadArea.addEventListener("dragleave", () => {
    uploadArea.classList.remove("dragover");
  });

  uploadArea.addEventListener("drop", (e) => {
    e.preventDefault();
    uploadArea.classList.remove("dragover");
    const files = Array.from(e.dataTransfer.files).filter((file) =>
      file.type.startsWith("image/")
    );
    handleFiles(files);
  });

  renderCutPreviews();

  // Remove legacy extra image button in the cut editor (single-page flow)
  if (window.__SINGLE_PAGE_UPLOAD__ && uploadArea) {
    const legacyImageBtn = document.getElementById("btn-next-to-settings");
    if (legacyImageBtn && legacyImageBtn.parentElement) {
      legacyImageBtn.remove();
    }
  }
}

async function handleFileSelect(e) {
  const files = Array.from(e.target.files);
  handleFiles(files);
}

async function handleFiles(files) {
  const draft = getUploadDraft();
  let processed = false;

  // 이미지 파일만 필터링
  const imageFiles = files.filter((file) => {
    const validTypes = ["image/jpeg", "image/jpg", "image/png"];
    if (validTypes.includes(file.type)) {
      return true;
    }
    showUploadError("지원하지 않는 파일 형식입니다 (JPG, PNG만 가능)");
    return false;
  });

  // 각 파일 처리
  for (const file of imageFiles) {
    try {
      // WebP 변환
      const converted = await convertImageToWebP(file);

      // 미리보기 URL 생성
      const previewUrl = URL.createObjectURL(converted.file);

      // 상태에 추가
      const imageData = {
        id: Date.now() + Math.random(),
        file: converted.file,
        url: previewUrl,
        name: converted.file.name,
        size: converted.newSize,
        width: converted.width,
        height: converted.height,
        originalSize: converted.originalSize,
      };

      draft.cuts.push(imageData);

      // 첫 컷이 추가되고 썸네일이 없으면 자동 대표 컷 지정
      if (!(draft.thumbnail || draft.thumbnailUrl) && draft.cuts.length === 1) {
        draft.thumbnail = imageData.url;
        draft.thumbnailUrl = imageData.url;
        draft.thumbnailSource = "cut";
        draft.thumbnailCutIndex = 0;
        renderThumbnailPreview();
      }

      // 미리보기 렌더링
      renderCutPreviews();
      processed = true;
    } catch (error) {
      console.warn(`Failed to process ${file.name}:`, error);
      showUploadError(error.message || "이미지 처리 중 오류가 발생했습니다");
    }
  }

  // 파일 입력 초기화
  const fileInput = document.getElementById("file-input");
  if (fileInput) {
    fileInput.value = "";
  }

  if (processed) {
    syncPreviewFromDraft();
  }
}

// ============================================
// 7. 장르/태그 초기화
// ============================================

function syncGenreUI(container) {
  const draft = getUploadDraft();
  const selectedGenres = Array.isArray(draft.genres) ? draft.genres : [];
  const chips = container
    ? container.querySelectorAll(".genre-chip")
    : document.querySelectorAll(".genre-chip");
  const genreCount = document.getElementById("genre-count");

  chips.forEach((chip) => {
    const genre = chip.dataset.genre;
    chip.classList.toggle("active", !!genre && selectedGenres.includes(genre));
  });

  if (genreCount) {
    genreCount.textContent = selectedGenres.length.toString();
  }
}

function initializeGenres() {
  const genreChips = document.querySelectorAll(".genre-chip");
  if (!genreChips || genreChips.length === 0) return;

  genreChips.forEach((chip) => {
    chip.addEventListener("click", () => {
      const draft = getUploadDraft();
      const genre = chip.dataset.genre;
      if (!genre) return;

      const isSelected = draft.genres.includes(genre);

      if (isSelected) {
        draft.genres = draft.genres.filter((g) => g !== genre);
      } else {
        if (draft.genres.length >= 2) {
          showUploadError("장르는 최대 2개까지 선택할 수 있습니다");
          return;
        }
        draft.genres = [...draft.genres, genre];
      }

      syncGenreUI(chip.closest(".genre-chips") || undefined);
    });
  });

  syncGenreUI();
}

function initializeTags() {
  const tagsInput = document.getElementById("tags-input");
  const tagsList = document.getElementById("tags-list");
  const tagsCount = document.getElementById("tags-count");
  const presetChips = document.querySelectorAll(".tag-preset-chip");

  // 프리셋 태그
  presetChips.forEach((chip) => {
    chip.addEventListener("click", () => {
      const tag = chip.dataset.tag;
      addTag(tag);
    });
  });

  // 수동 입력
  if (tagsInput) {
    tagsInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        const value = tagsInput.value.trim();
        if (value) {
          addTag(value);
          tagsInput.value = "";
        }
      }
    });
  }

  function addTag(tag) {
    const normalized = (tag || "").trim();
    if (!normalized) return;

    const draft = getUploadDraft();

    // 최대 개수 확인
    if (draft.tags.length >= 10) {
      showUploadError("태그는 최대 10개까지 추가할 수 있습니다");
      return;
    }

    // 중복 확인
    const normalizedLower = normalized.toLowerCase();
    if (draft.tags.some((t) => t.toLowerCase() === normalizedLower)) {
      showUploadError("이미 추가된 태그입니다");
      return;
    }

    // 추가
    draft.tags = [...draft.tags, normalized];
    renderTags();
  }

  function renderTags() {
    const draft = getUploadDraft();
    const currentTags = Array.isArray(draft.tags) ? draft.tags : [];
    if (tagsList) {
      tagsList.innerHTML = "";
      currentTags.forEach((tag) => {
        const tagItem = document.createElement("div");
        tagItem.className = "tag-item";
        tagItem.innerHTML = `
          <span>${tag}</span>
          <button type="button" class="tag-remove" data-tag="${tag}">×</button>
        `;
        tagItem.querySelector(".tag-remove").addEventListener("click", () => {
          draft.tags = draft.tags.filter((t) => t !== tag);
          renderTags();
        });
        tagsList.appendChild(tagItem);
      });
    }

    if (tagsCount) {
      tagsCount.textContent = currentTags.length.toString();
    }

    syncPreviewFromDraft();
  }

  renderTags();
}

// ============================================
// 8. 대표 컷 선택 초기화
// ============================================

function initializeThumbnailSelection() {
  const btnSelectFromCuts = document.getElementById("btn-select-from-cuts");
  const btnUploadThumbnail = document.getElementById("btn-upload-thumbnail");
  const thumbnailInput = document.getElementById("thumbnail-input");
  const cutSelectionModal = document.getElementById("cut-selection-modal");
  const btnCloseCutSelection = document.getElementById(
    "btn-close-cut-selection"
  );
  const cutSelectionGrid = document.getElementById("cut-selection-grid");

  // 컷에서 선택
  if (btnSelectFromCuts) {
    btnSelectFromCuts.addEventListener("click", () => {
      const draft = getUploadDraft();
      if (!draft.cuts || draft.cuts.length === 0) {
        showUploadError("먼저 컷을 업로드해주세요");
        return;
      }
      renderCutSelectionModal();
      if (cutSelectionModal) {
        cutSelectionModal.style.display = "block";
      }
    });
  }

  // 별도 업로드
  if (btnUploadThumbnail && thumbnailInput) {
    btnUploadThumbnail.addEventListener("click", () => {
      thumbnailInput.click();
    });

    thumbnailInput.addEventListener("change", async (e) => {
      const file = e.target.files[0];
      if (!file) return;

      if (!file.type.startsWith("image/")) {
        showUploadError("이미지 파일만 업로드 가능합니다");
        return;
      }

      try {
        const converted = await convertImageToWebP(file);
        const previewUrl = URL.createObjectURL(converted.file);

        const draft = getUploadDraft();
        draft.thumbnail = previewUrl;
        draft.thumbnailUrl = previewUrl;
        draft.thumbnailSource = "upload";
        draft.thumbnailCutIndex = null;
        renderThumbnailPreview();
      } catch (error) {
        showUploadError("이미지 처리 중 오류가 발생했습니다");
        console.warn(error);
      }
    });
  }

  // 모달 닫기
  if (btnCloseCutSelection && cutSelectionModal) {
    btnCloseCutSelection.addEventListener("click", () => {
      cutSelectionModal.style.display = "none";
    });
  }

  // 컷 선택 모달 렌더링
  function renderCutSelectionModal() {
    if (!cutSelectionGrid) return;

    cutSelectionGrid.innerHTML = "";
    const draft = getUploadDraft();
    const cuts = Array.isArray(draft.cuts) ? draft.cuts : [];
    cuts.forEach((imageData, index) => {
      const cutItem = document.createElement("div");
      cutItem.className = "cut-selection-item";
      cutItem.dataset.index = index;

      const img = document.createElement("img");
      img.src = imageData.url;
      img.alt = `컷 ${index + 1}`;

      const label = document.createElement("div");
      label.className = "cut-selection-label";
      label.textContent = `컷 ${index + 1}`;

      cutItem.appendChild(img);
      cutItem.appendChild(label);

      cutItem.addEventListener("click", () => {
        draft.thumbnail = imageData.url;
        draft.thumbnailUrl = imageData.url;
        draft.thumbnailSource = "cut";
        draft.thumbnailCutIndex = index;
        renderThumbnailPreview();
        if (cutSelectionModal) {
          cutSelectionModal.style.display = "none";
        }
      });

      cutSelectionGrid.appendChild(cutItem);
    });
  }

  // 초기 렌더링
  renderThumbnailPreview();
}

// ============================================
// 9. 업로드 스텝 관리
// ============================================

function initializeUploadSteps() {
  // Step 0: Entry
  const btnNewWork = document.getElementById("btn-new-work");
  if (btnNewWork) {
    btnNewWork.addEventListener("click", () => {
      resetUploadForm();
      setUploadStep(2);
    });
  }

  // Step 1: 컷 업로드 - 다음
  const btnNextToSettings = document.getElementById("btn-next-to-settings");
  if (btnNextToSettings) {
    btnNextToSettings.addEventListener("click", () => {
      const draft = getUploadDraft();
      if (!draft.cuts || draft.cuts.length === 0) {
        showUploadError("최소 1개 이상의 컷을 업로드해주세요");
        return;
      }
      setUploadStep(2);
    });
  }

  // Step 1: 전체 삭제
  const btnResetAll = document.getElementById("btn-reset-all");
  if (btnResetAll) {
    btnResetAll.addEventListener("click", () => {
      if (
        confirm("모든 컷을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.")
      ) {
        state.uploadedImages.forEach((img) => {
          if (img.url) URL.revokeObjectURL(img.url);
        });
        state.uploadedImages = [];
        renderCutPreviews();
      }
    });
  }

  // Step 1: 뒤로
  const btnBackStep1 = document.getElementById("upload-back-step1");
  if (btnBackStep1) {
    btnBackStep1.addEventListener("click", () => {
      setUploadStep(2);
    });
  }

  // Step 2: 작품 설정 - 다음
  const btnNextToPublish = document.getElementById("btn-next-to-publish");
  if (btnNextToPublish) {
    btnNextToPublish.addEventListener("click", () => {
      const title = document.getElementById("work-title")?.value.trim();
      if (!title) {
        showUploadError("작품 제목을 입력해주세요");
        return;
      }

      const description = document
        .getElementById("work-description")
        ?.value.trim();
      if (!description) {
        showUploadError("작품 설명을 입력해주세요");
        return;
      }

      if (state.selectedGenres.length === 0) {
        showUploadError("최소 1개 이상의 장르를 선택해주세요");
        return;
      }

      if (!state.thumbnailUrl) {
        showUploadError("대표 컷을 선택해주세요");
        return;
      }

      setUploadStep(3);
    });
  }

  // Step 2: 뒤로
  const btnBackStep2 = document.getElementById("upload-back-step2");
  if (btnBackStep2) {
    btnBackStep2.addEventListener("click", () => {
      setUploadStep(2);
    });
  }

  // Step 3: 임시저장
  const btnSaveDraft = document.getElementById("btn-save-draft");
  if (btnSaveDraft) {
    btnSaveDraft.addEventListener("click", async () => {
      await handleSaveDraft();
    });
  }

  // Step 3: 게시하기
  const btnPublish = document.getElementById("btn-publish");
  if (btnPublish) {
    btnPublish.addEventListener("click", async () => {
      await handlePublish();
    });
  }

  // Step 3: 뒤로
  const btnBackStep3 = document.getElementById("upload-back-step3");
  if (btnBackStep3) {
    btnBackStep3.addEventListener("click", () => {
      setUploadStep(2);
    });
  }
}

function setUploadStep(step) {
  if (step < 0 || step > 4) return;

  const singlePageMode = window.__SINGLE_PAGE_UPLOAD__ === true;
  const nextStep = singlePageMode && (step === 0 || step === 1) ? 2 : step;
  state.uploadStep = nextStep;

  // 모든 스텝 숨기기
  for (let i = 0; i <= 4; i++) {
    const stepEl = document.getElementById(`upload-step-${i}`);
    if (stepEl) {
      const shouldShow =
        singlePageMode && nextStep === 2
          ? i === 2
          : i === nextStep || (nextStep === 2 && i === 1);
      stepEl.style.display = shouldShow ? "block" : "none";
    }
  }

  // 스텝별 처리
  if (nextStep === 2) {
    renderThumbnailPreview();
  } else if (nextStep === 4) {
    renderCompletionPreview();
  }
}

function resetUploadForm() {
  // 이미지 정리
  const draft = getUploadDraft();
  draft.cuts.forEach((img) => {
    if (img.url) URL.revokeObjectURL(img.url);
  });

  // 상태 초기화
  draft.cuts = [];
  draft.selectedGenres = [];
  draft.selectedTags = [];
  draft.thumbnail = null;
  draft.thumbnailUrl = null;
  draft.thumbnailSource = null;
  draft.thumbnailCutIndex = null;
  draft.title = "";
  draft.description = "";

  // 폼 필드 초기화
  const workTitle = document.getElementById("work-title");
  const workDescription = document.getElementById("work-description");
  if (workTitle) workTitle.value = "";
  if (workDescription) workDescription.value = "";

  // 장르 초기화
  document.querySelectorAll(".genre-chip").forEach((chip) => {
    chip.classList.remove("active");
  });
  const genreCount = document.getElementById("genre-count");
  if (genreCount) genreCount.textContent = "0";

  // 태그 초기화
  const tagsList = document.getElementById("tags-list");
  const tagsInput = document.getElementById("tags-input");
  const tagsCount = document.getElementById("tags-count");
  if (tagsList) tagsList.innerHTML = "";
  if (tagsInput) tagsInput.value = "";
  if (tagsCount) tagsCount.textContent = "0";

  // 썸네일 초기화
  renderThumbnailPreview();

  // 미리보기 초기화
  const previewList = document.getElementById("image-preview-list");
  if (previewList) previewList.innerHTML = "";

  const placeholder = document.getElementById("upload-placeholder");
  if (placeholder) placeholder.classList.remove("hidden");

  // 파일 입력 초기화
  const fileInput = document.getElementById("file-input");
  if (fileInput) fileInput.value = "";

  syncPreviewFromDraft();

  setUploadStep(2);
}

function renderCompletionPreview() {
  const container = document.getElementById("completion-preview");
  if (!container) return;

  const titleEl = document.getElementById("work-title");
  const title = titleEl ? titleEl.value.trim() : "작품";

  const thumbnailUrl =
    state.thumbnailUrl ||
    (state.uploadedImages.length > 0 ? state.uploadedImages[0].url : null);

  if (!thumbnailUrl) return;

  container.innerHTML = `
    <div class="completion-preview-card">
      <div class="completion-preview-image">
        <img src="${thumbnailUrl}" alt="${title}" />
      </div>
      <div class="completion-preview-title">${title}</div>
    </div>
  `;

  // 완료 액션 버튼
  const btnViewFeed = document.getElementById("btn-view-feed");
  const btnEditWork = document.getElementById("btn-edit-work");
  const btnUploadNext = document.getElementById("btn-upload-next");

  if (btnViewFeed) {
    btnViewFeed.addEventListener("click", () => {
      if (state.currentWorkId) {
        window.location.href = `reader_creator_feed.html?workId=${state.currentWorkId}`;
      }
    });
  }

  if (btnEditWork) {
    btnEditWork.addEventListener("click", () => {
      setUploadStep(2);
    });
  }

  if (btnUploadNext) {
    btnUploadNext.addEventListener("click", () => {
      resetUploadForm();
      setActiveView("work-list");
    });
  }
}

// ============================================
// 10. Supabase Upload
// ============================================

/**
 * 썸네일을 Supabase Storage에 업로드
 * @param {string} workId - 작품 ID
 * @param {string} thumbnailUrl - 썸네일 URL (blob URL일 수 있음)
 * @returns {Promise<string|null>} 업로드된 썸네일 URL 또는 null
 */
async function uploadThumbnailToSupabase(workId, thumbnailUrl) {
  const currentCreatorId = getCreatorId();
  if (!currentCreatorId || !workId || !supabase || !thumbnailUrl) {
    return null;
  }

  // blob URL이 아니면 그대로 반환
  if (!thumbnailUrl.startsWith("blob:")) {
    return thumbnailUrl;
  }

  try {
    // blob URL에서 File 객체 가져오기
    const response = await fetch(thumbnailUrl);
    const blob = await response.blob();
    const file = new File([blob], "thumbnail.webp", { type: "image/webp" });

    // Storage 경로: works/{creatorId}/{workId}/thumbnail.webp
    const filePath = `${currentCreatorId}/${workId}/thumbnail.webp`;

    // Storage 업로드
    const { error: uploadError } = await supabaseClient.storage
      .from("works")
      .upload(filePath, file, {
        cacheControl: "3600",
        upsert: true,
      });

    if (uploadError) {
      console.warn("Failed to upload thumbnail:", uploadError);
      return null;
    }

    // Public URL 가져오기
    const { data: urlData } = supabaseClient.storage
      .from("works")
      .getPublicUrl(filePath);

    return urlData.publicUrl;
  } catch (error) {
    console.warn("Error uploading thumbnail:", error);
    return null;
  }
}

/**
 * 이미지를 Supabase Storage에 업로드하고 cuts 테이블에 저장
 * @param {string} workId - 작품 ID
 * @returns {Promise<{success: number, total: number}>}
 */
async function uploadImagesToSupabase(workId) {
  const currentCreatorId = getCreatorId();
  if (!currentCreatorId || !workId || !supabase) {
    console.warn("uploadImagesToSupabase: Missing requirements");
    return { success: 0, total: state.uploadedImages.length };
  }

  // UUID 검증
  if (!isValidUUID(workId)) {
    console.warn("uploadImagesToSupabase: Invalid workId");
    return { success: 0, total: state.uploadedImages.length };
  }

  let successCount = 0;
  const memoValue = await buildMemoString();
  const hasFiles = state.uploadedImages.some(
    (img) => img && img.file instanceof File
  );

  // 파일이 없고 기존 컷만 있는 경우(재편집/재게시)에는 업로드를 건너뛰고 성공 처리
  if (!hasFiles && state.uploadedImages.length > 0) {
    // order_index 업데이트가 필요한 경우에 대비해 기존 cuts id 정보를 활용
    await Promise.all(
      state.uploadedImages.map((imageData, idx) => {
        if (!imageData || !imageData.existingCutId) return Promise.resolve();
        return supabase
          .from("cuts")
          .update({ order_index: idx })
          .eq("id", imageData.existingCutId);
      })
    );

    return {
      success: state.uploadedImages.length,
      total: state.uploadedImages.length,
    };
  }

  for (let i = 0; i < state.uploadedImages.length; i++) {
    const imageData = state.uploadedImages[i];

    try {
      if (!imageData || !(imageData.file instanceof File)) {
        if (imageData && imageData.existingCutId) {
          await supabase
            .from("cuts")
            .update({ order_index: i })
            .eq("id", imageData.existingCutId);
          successCount++;
        }
        continue;
      }

      // Storage 경로: works/{creatorId}/{workId}/{order_index}.webp
      const filePath = `${currentCreatorId}/${workId}/${i}.webp`;
      // Storage 업로드
      const { error: uploadError } = await supabaseClient.storage
        .from("works")
        .upload(filePath, imageData.file, {
          cacheControl: "3600",
          upsert: true,
        });

      if (uploadError) {
        console.warn(`Failed to upload image ${i}:`, uploadError);
        continue;
      }

      // Public URL 가져오기
      const { data: urlData } = supabaseClient.storage
        .from("works")
        .getPublicUrl(filePath);

      const imageUrl = urlData.publicUrl;

      // 이미지 크기 확인
      const img = new Image();
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
        img.src = imageUrl;
      });

      // cuts 테이블에 저장 (order_index 사용)
      const { error: cutError } = await supabaseClient.from("cuts").insert({
        work_id: workId,
        order_index: i, // ⚠️ index가 아닌 order_index 사용
        image_url: imageUrl,
        width: img.width,
        height: img.height,
        is_visible: true,
        memo: memoValue,
      });

      if (cutError) {
        console.warn(`Failed to create cut ${i}:`, cutError);
        continue;
      }

      successCount++;
    } catch (error) {
      console.warn(`Error uploading image ${i}:`, error);
    }
  }

  return {
    success: successCount,
    total: state.uploadedImages.length,
  };
}

/**
 * UUID 검증
 */
function isValidUUID(uuid) {
  if (!uuid || typeof uuid !== "string") return false;
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}

// ============================================
// 11. Submit (Draft / Publish)
// ============================================

/**
 * 임시저장
 */
async function handleSaveDraft() {
  const currentCreatorId = getCreatorId();
  if (!currentCreatorId || !supabase) {
    showUploadError("로그인이 필요합니다");
    return;
  }

  // creators 레코드 보장
  await ensureCreatorRecord(currentCreatorId);

  // 유효성 검사
  const title = document.getElementById("work-title")?.value.trim();
  if (!title) {
    showUploadError("작품 제목을 입력해주세요");
    return;
  }

  const description = document.getElementById("work-description")?.value.trim();
  if (!description) {
    showUploadError("작품 설명을 입력해주세요");
    return;
  }

  if (state.selectedGenres.length === 0) {
    showUploadError("최소 1개 이상의 장르를 선택해주세요");
    return;
  }

  if (state.uploadedImages.length === 0) {
    showUploadError("최소 1개 이상의 컷을 업로드해주세요");
    return;
  }

  if (!state.thumbnailUrl) {
    showUploadError("대표 컷을 선택해주세요");
    return;
  }

  // 썸네일 URL은 나중에 업로드 시 처리

  // 로딩 상태
  const btnSaveDraft = document.getElementById("btn-save-draft");
  const btnPublish = document.getElementById("btn-publish");
  if (btnSaveDraft) {
    btnSaveDraft.disabled = true;
    btnSaveDraft.textContent = "저장 중...";
  }
  if (btnPublish) {
    btnPublish.disabled = true;
  }

  let workId = state.currentWorkId || null;
  let createdNewWork = false;

  try {
    // 대표 썸네일 URL 결정 (게시 직전 정의)
    let thumbnailUrl;
    if (state.thumbnailUrl) {
      // 대표컷을 별도로 업로드하거나 선택한 경우
      thumbnailUrl = state.thumbnailUrl;
    } else if (state.uploadedImages && state.uploadedImages.length > 0) {
      // 별도 대표컷이 없으면 첫 번째 컷 사용
      const firstImage = state.uploadedImages[0];
      thumbnailUrl = firstImage?.url || null;
    } else {
      // 둘 다 없으면 게시 불가
      showUploadError("대표 컷을 선택해주세요");
      return;
    }

    const memoString = await buildMemoString();

    const basePayload = {
      creator_id: currentCreatorId,
      title: title,
      description: description,
      genre: state.selectedGenres, // 배열로 저장
      tags: state.selectedTags.length > 0 ? state.selectedTags : null,
      thumbnail_url: state.thumbnailUrl, // 임시 URL, 나중에 업데이트
      status: "draft",
      updated_at: new Date().toISOString(),
      memo: memoString,
    };

    const existingWork =
      workId &&
      state.works.find((w) => w.id === workId && w.status === "draft");

    if (existingWork) {
      const { error: updateError } = await supabase
        .from("works")
        .update(basePayload)
        .eq("id", workId);

      if (updateError) {
        console.warn("Work update failed:", updateError);
        showUploadError("작품 저장에 실패했습니다. 다시 시도해주세요.");
        return;
      }
    } else {
      const { data: work, error: workError } = await supabase
        .from("works")
        .insert({
          ...basePayload,
          created_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (workError || !work || !work.id) {
        console.warn("Work creation failed:", workError);
        showUploadError("작품 생성에 실패했습니다. 다시 시도해주세요.");
        return;
      }

      workId = work.id;
      state.currentWorkId = workId;
      createdNewWork = true;
    }

    // 2. 썸네일 업로드
    const uploadedThumbnailUrl = state.thumbnailUrl?.startsWith("blob:")
      ? await uploadThumbnailToSupabase(workId, state.thumbnailUrl)
      : state.thumbnailUrl;

    // 3. 이미지 업로드
    const uploadResult = await uploadImagesToSupabase(workId);

    if (uploadResult.success === 0) {
      // 업로드 실패 시 works 롤백
      try {
        await supabaseClient.from("works").delete().eq("id", workId);
      } catch (rollbackError) {
        console.warn("Failed to rollback work:", rollbackError);
      }
      showUploadError("이미지 업로드에 실패했습니다. 다시 시도해주세요");
      return;
    }

    // 썸네일 URL 업데이트 (업로드된 URL 사용)
    const finalThumbnailUrl = uploadedThumbnailUrl || state.thumbnailUrl;
    if (finalThumbnailUrl) {
      try {
        await supabase
          .from("works")
          .update({ thumbnail_url: finalThumbnailUrl })
          .eq("id", workId);
      } catch (error) {
        console.warn("Failed to update thumbnail URL:", error);
      }
    }

    // 성공
    const titleEl = document.getElementById("completion-title");
    if (titleEl) {
      titleEl.textContent = "작품이 임시저장되었습니다";
    }

    // 작품 목록에 추가
    const newWork = {
      id: workId,
      title: title,
      description: description,
      genre: state.selectedGenres,
      tags: state.selectedTags,
      status: "draft",
      thumbnail_url: finalThumbnailUrl,
      created_at: existingWork?.created_at || new Date().toISOString(),
      images: state.uploadedImages.map((img) => img.url),
      cuts: state.uploadedImages.map((img, idx) => ({
        id: img.existingCutId || null,
        image_url: img.url,
        order_index: idx,
      })),
    };

    if (existingWork) {
      state.works = state.works.map((w) =>
        w.id === workId ? { ...w, ...newWork } : w
      );
    } else {
      state.works.unshift(newWork);
    }

    setUploadStep(4);
    setActiveView("work-list");

    const draftTab = document.querySelector('.work-tab[data-tab="draft"]');
    if (draftTab) {
      document
        .querySelectorAll(".work-tab")
        .forEach((t) => t.classList.remove("active"));
      draftTab.classList.add("active");
      renderWorks("draft");
    } else {
      renderWorks();
    }
  } catch (error) {
    console.warn("Failed to save draft:", error);

    // 롤백
    if (workId && createdNewWork) {
      try {
        await supabaseClient.from("works").delete().eq("id", workId);
      } catch (rollbackError) {
        console.warn("Failed to rollback work:", rollbackError);
      }
    }

    showUploadError("임시저장에 실패했습니다. 다시 시도해주세요");
  } finally {
    if (btnSaveDraft) {
      btnSaveDraft.disabled = false;
      btnSaveDraft.textContent = "임시저장";
    }
    if (btnPublish) {
      btnPublish.disabled = false;
    }
  }
}

/**
 * 게시하기
 */
async function handlePublish() {
  const currentCreatorId = getCreatorId();
  if (!currentCreatorId || !supabase) {
    showUploadError("로그인이 필요합니다");
    return;
  }

  // creators 레코드 보장
  await ensureCreatorRecord(currentCreatorId);

  // 유효성 검사
  const title = document.getElementById("work-title")?.value.trim();
  if (!title) {
    showUploadError("작품 제목을 입력해주세요");
    return;
  }

  const description = document.getElementById("work-description")?.value.trim();
  if (!description) {
    showUploadError("작품 설명을 입력해주세요");
    return;
  }

  if (state.selectedGenres.length === 0) {
    showUploadError("최소 1개 이상의 장르를 선택해주세요");
    return;
  }

  if (state.uploadedImages.length === 0) {
    showUploadError("최소 1개 이상의 컷을 업로드해주세요");
    return;
  }

  if (!state.thumbnailUrl) {
    showUploadError("대표 컷을 선택해주세요");
    return;
  }

  // 썸네일 URL은 나중에 업로드 시 처리

  // 로딩 상태
  const btnPublish = document.getElementById("btn-publish");
  const btnSaveDraft = document.getElementById("btn-save-draft");
  if (btnPublish) {
    btnPublish.disabled = true;
    btnPublish.textContent = "게시 중...";
  }
  if (btnSaveDraft) {
    btnSaveDraft.disabled = true;
  }

  let workId = state.currentWorkId || null;
  let createdNewWork = false;
  const existingWork =
    workId && state.works.find((w) => w.id === workId && w.status === "draft");

  try {
    const memoString = await buildMemoString();
    // 1. works 테이블에 저장
    const basePayload = {
      creator_id: currentCreatorId,
      title: title,
      description: description,
      genre: state.selectedGenres, // 배열로 저장
      tags: state.selectedTags.length > 0 ? state.selectedTags : null,
      thumbnail_url: state.thumbnailUrl,
      // 상태는 approved로 두고 is_public 플래그로 공개 여부 관리
      status: "approved",
      is_public: true,
      updated_at: new Date().toISOString(),
      memo: memoString,
    };

    if (existingWork) {
      const { error: updateError } = await supabase
        .from("works")
        .update(basePayload)
        .eq("id", workId);

      if (updateError) {
        console.warn("Work update failed:", updateError);
        showUploadError("작품 생성에 실패했습니다. 다시 시도해주세요.");
        return;
      }
    } else {
      const { data: work, error: workError } = await supabase
        .from("works")
        .insert({
          ...basePayload,
          created_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (workError || !work || !work.id) {
        console.warn("Work creation failed:", workError);
        showUploadError("작품 생성에 실패했습니다. 다시 시도해주세요.");
        return;
      }

      workId = work.id;
      state.currentWorkId = workId;
      createdNewWork = true;
    }

    // 2. 썸네일 업로드
    const uploadedThumbnailUrl = state.thumbnailUrl?.startsWith("blob:")
      ? await uploadThumbnailToSupabase(workId, state.thumbnailUrl)
      : state.thumbnailUrl;
    if (!uploadedThumbnailUrl) {
      // 썸네일 업로드 실패 시 첫 번째 컷 사용
      const firstImageUrl = state.uploadedImages[0]?.url || state.thumbnailUrl;
      // works 업데이트는 나중에 (이미지 업로드 후)
    }

    // 3. 이미지 업로드
    const uploadResult = await uploadImagesToSupabase(workId);

    if (uploadResult.success === 0) {
      // 업로드 실패 시 works 롤백
      try {
        await supabaseClient.from("works").delete().eq("id", workId);
      } catch (rollbackError) {
        console.warn("Failed to rollback work:", rollbackError);
      }
      showUploadError("이미지 업로드에 실패했습니다. 다시 시도해주세요");
      return;
    }

    // 썸네일 URL 업데이트 (업로드된 URL 사용)
    const finalThumbnailUrl = uploadedThumbnailUrl || state.thumbnailUrl;
    if (uploadedThumbnailUrl) {
      try {
        await supabase
          .from("works")
          .update({ thumbnail_url: finalThumbnailUrl })
          .eq("id", workId);
      } catch (error) {
        console.warn("Failed to update thumbnail URL:", error);
      }
    }

    // 성공
    const titleEl = document.getElementById("completion-title");
    if (titleEl) {
      titleEl.textContent = "작품이 등록되었습니다";
    }

    // 작품 목록에 추가
    const newWork = {
      id: workId,
      title: title,
      description: description,
      genre: state.selectedGenres,
      tags: state.selectedTags,
      status: "under_review",
      thumbnail_url: finalThumbnailUrl,
      created_at: existingWork?.created_at || new Date().toISOString(),
      images: state.uploadedImages.map((img) => img.url),
      cuts: state.uploadedImages.map((img, idx) => ({
        id: img.existingCutId || null,
        image_url: img.url,
        order_index: idx,
      })),
    };

    if (existingWork) {
      state.works = state.works.map((w) =>
        w.id === workId ? { ...w, ...newWork } : w
      );
    } else {
      state.works.unshift(newWork);
    }

    setUploadStep(4);
    setActiveView("work-list");
    const reviewTab = document.querySelector('.work-tab[data-tab="review"]');
    if (reviewTab) {
      document
        .querySelectorAll(".work-tab")
        .forEach((t) => t.classList.remove("active"));
      reviewTab.classList.add("active");
      renderWorks("review");
    } else {
      renderWorks();
    }
  } catch (error) {
    console.warn("Failed to publish:", error);

    // 롤백
    if (workId && createdNewWork) {
      try {
        await supabaseClient.from("works").delete().eq("id", workId);
      } catch (rollbackError) {
        console.warn("Failed to rollback work:", rollbackError);
      }
    }

    showUploadError("게시에 실패했습니다. 다시 시도해주세요");
  } finally {
    if (btnPublish) {
      btnPublish.disabled = false;
      btnPublish.textContent = "게시하기";
    }
    if (btnSaveDraft) {
      btnSaveDraft.disabled = false;
    }
  }
}

// ============================================
// 12. 작품 목록 관리
// ============================================

function initializeWorkTabs() {
  document.querySelectorAll(".work-tab").forEach((tab) => {
    tab.addEventListener("click", () => {
      document.querySelectorAll(".work-tab").forEach((t) => {
        t.classList.remove("active");
      });
      tab.classList.add("active");
      const tabType = tab.dataset.tab;
      renderWorks(tabType);
    });
  });
}

async function loadWorks() {
  try {
    const currentCreatorId = getCreatorId();
    if (!currentCreatorId || !supabase) {
      console.warn("loadWorks: No creatorId or supabase");
      renderWorks();
      return;
    }

    const { data: works, error } = await supabase
      .from("works")
      .select(
        `
        *,
        cuts!inner(id, image_url, order_index, is_visible)
      `
      )
      .eq("creator_id", currentCreatorId)
      .order("created_at", { ascending: false });

    if (error) {
      console.warn("Failed to load works:", error);
      renderWorks();
      return;
    }

    state.works = (works || []).map((work) => {
      const cuts = Array.isArray(work.cuts) ? work.cuts : [];
      const sortedCuts = cuts
        .filter((c) => c.is_visible !== false)
        .sort((a, b) => (a.order_index || 0) - (b.order_index || 0));
      const cutDetails = sortedCuts.map((c, idx) => ({
        id: c.id || null,
        image_url: c.image_url,
        order_index: typeof c.order_index === "number" ? c.order_index : idx,
        is_visible: c.is_visible !== false,
      }));

      return {
        id: work.id,
        title: work.title,
        description: work.description,
        genre: Array.isArray(work.genre)
          ? work.genre
          : [work.genre].filter(Boolean),
        tags: work.tags || [],
        status: work.status,
        thumbnail_url: work.thumbnail_url,
        created_at: work.created_at,
        images: cutDetails.map((c) => c.image_url),
        cuts: cutDetails,
      };
    });

    renderWorks();
  } catch (error) {
    console.warn("Error loading works:", error);
    renderWorks();
  }
}

function renderWorks(filter = "all") {
  const workListContainer = document.getElementById("work-list-container");
  if (!workListContainer) return;

  workListContainer.innerHTML = "";

  let filteredWorks = [];
  if (filter === "all") {
    filteredWorks = state.works;
  } else if (filter === "review") {
    filteredWorks = state.works.filter((w) => w.status === "under_review");
  } else if (filter === "approved") {
    filteredWorks = state.works.filter(
      (w) => w.status === "approved" || w.status === "published"
    );
  } else if (filter === "rejected") {
    filteredWorks = state.works.filter((w) => w.status === "rejected");
  } else if (filter === "draft") {
    filteredWorks = state.works.filter((w) => w.status === "draft");
  }

  if (filteredWorks.length === 0) {
    workListContainer.innerHTML = "";
    return;
  }

  filteredWorks.forEach((work) => {
    const workItem = document.createElement("div");
    workItem.className = "work-item";

    // 썸네일 이미지
    const thumbnail = document.createElement("div");
    thumbnail.className = "work-item-thumbnail";
    const thumbnailUrl =
      work.thumbnail_url ||
      (work.images && work.images.length > 0 ? work.images[0] : null);
    if (thumbnailUrl) {
      const img = document.createElement("img");
      img.src = thumbnailUrl;
      img.alt = work.title || "작품 이미지";
      img.loading = "lazy";
      img.decoding = "async";
      img.style.width = "100%";
      img.style.height = "100%";
      img.style.objectFit = "cover";
      img.style.display = "block";

      // 이미지 로드 에러 처리
      img.onerror = function () {
        this.style.display = "none";
        thumbnail.style.backgroundColor = "#f0f0f0";
        thumbnail.style.display = "flex";
        thumbnail.style.alignItems = "center";
        thumbnail.style.justifyContent = "center";
        const placeholder = document.createElement("div");
        placeholder.textContent = "이미지 로드 실패";
        placeholder.style.color = "#999";
        placeholder.style.fontSize = "14px";
        if (!thumbnail.querySelector("div")) {
          thumbnail.appendChild(placeholder);
        }
      };

      thumbnail.appendChild(img);
    } else {
      // 이미지가 없을 때 플레이스홀더
      thumbnail.style.backgroundColor = "#f0f0f0";
      thumbnail.style.display = "flex";
      thumbnail.style.alignItems = "center";
      thumbnail.style.justifyContent = "center";
      const placeholder = document.createElement("div");
      placeholder.textContent = "이미지 없음";
      placeholder.style.color = "#999";
      placeholder.style.fontSize = "14px";
      thumbnail.appendChild(placeholder);
    }

    const content = document.createElement("div");
    content.className = "work-item-content";

    // 제목
    const title = document.createElement("h3");
    title.className = "work-item-title";
    title.textContent = work.title || "제목 없음";

    // 설명
    if (work.description) {
      const description = document.createElement("p");
      description.className = "work-item-description";
      description.textContent =
        work.description.length > 100
          ? work.description.substring(0, 100) + "..."
          : work.description;
      content.appendChild(description);
    }

    // 태그와 장르
    const tagsContainer = document.createElement("div");
    tagsContainer.className = "work-item-tags";
    if (work.tags && work.tags.length > 0) {
      work.tags.slice(0, 3).forEach((tag) => {
        const tagEl = document.createElement("span");
        tagEl.className = "work-item-tag";
        tagEl.textContent = tag;
        tagsContainer.appendChild(tagEl);
      });
      if (work.tags.length > 3) {
        const moreTag = document.createElement("span");
        moreTag.className = "work-item-tag work-item-tag-more";
        moreTag.textContent = `+${work.tags.length - 3}`;
        tagsContainer.appendChild(moreTag);
      }
    }
    if (work.genre && work.genre.length > 0) {
      work.genre.forEach((g) => {
        const genreEl = document.createElement("span");
        genreEl.className = "work-item-tag work-item-tag-genre";
        genreEl.textContent = g;
        tagsContainer.appendChild(genreEl);
      });
    }
    if (tagsContainer.children.length > 0) {
      content.appendChild(tagsContainer);
    }

    // 메타 정보 (날짜, 상태)
    const meta = document.createElement("div");
    meta.className = "work-item-meta";

    const date = document.createElement("span");
    date.className = "work-item-date";
    date.textContent = work.created_at
      ? new Date(work.created_at).toLocaleDateString("ko-KR", {
          year: "numeric",
          month: "long",
          day: "numeric",
        })
      : "";

    const status = document.createElement("span");
    status.className = "work-item-status";
    status.textContent = getStatusText(work.status);
    status.style.backgroundColor = getStatusColor(work.status);

    meta.appendChild(date);
    meta.appendChild(status);

    content.appendChild(title);
    content.appendChild(meta);

    workItem.appendChild(thumbnail);
    workItem.appendChild(content);

    workItem.addEventListener("click", () => {
      openWorkDetail(work);
    });

    workListContainer.appendChild(workItem);
  });
}

function getStatusText(status) {
  const statusMap = {
    pending: "심사 중",
    under_review: "심사 중",
    approved: "심사 완료 · 피드게시 대기 중",
    rejected: "반려됨",
    published: "피드게시 공개 중",
    draft: "임시저장",
  };
  return statusMap[status] || "알 수 없음";
}

function getStatusColor(status) {
  const colorMap = {
    pending: "#fff3cd",
    under_review: "#fff3cd",
    approved: "#d4edda",
    rejected: "#f8d7da",
    published: "#d1ecf1",
    draft: "#e0e0e0",
  };
  return colorMap[status] || "#e0e0e0";
}

function openWorkDetail(work) {
  if (!work) return;

  setActiveView("work-detail");

  const titleEl = document.getElementById("work-detail-title");
  if (titleEl) {
    titleEl.textContent = work.title || "작품 상세";
  }

  const statusBadge = document.getElementById("work-status-badge");
  if (statusBadge) {
    statusBadge.textContent = getStatusText(work.status);
    statusBadge.style.backgroundColor = getStatusColor(work.status);
  }

  const metaEl = document.getElementById("detail-work-meta");
  if (metaEl) {
    metaEl.textContent = work.description || "";
  }

  const imagesEl = document.getElementById("detail-work-images");
  if (imagesEl) {
    imagesEl.innerHTML = "";
    (work.images || []).forEach((url) => {
      if (!url) return;
      const img = document.createElement("img");
      img.src = url;
      img.alt = work.title || "work image";
      img.style.width = "100%";
      img.style.display = "block";
      imagesEl.appendChild(img);
    });
  }

  renderWorkDetailActions(work);
}

function renderWorkDetailActions(work) {
  const detailCard = document.querySelector(
    "#work-detail-view .detail-info-card"
  );
  if (!detailCard) return;

  let actions = detailCard.querySelector(".detail-actions");
  if (!actions) {
    actions = document.createElement("div");
    actions.className = "detail-actions";
    detailCard.appendChild(actions);
  }

  actions.innerHTML = "";

  const editBtn = document.createElement("button");
  editBtn.className = "btn-primary";
  editBtn.textContent = "수정하기";
  editBtn.addEventListener("click", () => {
    hydrateDraftFromWork(work, { goToStep: 2 });
  });

  const deleteBtn = document.createElement("button");
  deleteBtn.className = "btn-secondary";
  deleteBtn.textContent = "삭제하기";
  deleteBtn.addEventListener("click", async () => {
    const ok = window.confirm("작품을 삭제하시겠습니까? (이미지/컷 포함)");
    if (!ok) return;
    await deleteWork(work.id);
  });

  // 상태별 버튼 구성
  if (work.status === "draft") {
    const publishBtn = document.createElement("button");
    publishBtn.className = "btn-secondary";
    publishBtn.textContent = "게시하기";
    publishBtn.addEventListener("click", () => {
      hydrateDraftFromWork(work, { goToStep: 3, stayOnUpload: true });
    });

    actions.appendChild(editBtn);
    actions.appendChild(deleteBtn);
    actions.appendChild(publishBtn);
  } else if (work.status === "approved") {
    const publishBadge = document.createElement("button");
    publishBadge.className = "btn-secondary";
    publishBadge.textContent = "피드게시 대기 중";
    publishBadge.addEventListener("click", async () => {
      const ok = window.confirm("피드게시 하시겠습니까?");
      if (!ok) return;
      await updateWorkStatus(work.id, "published", true);
    });
    actions.appendChild(editBtn);
    actions.appendChild(deleteBtn);
    actions.appendChild(publishBadge);
  } else if (work.status === "published") {
    const unpublishBadge = document.createElement("button");
    unpublishBadge.className = "btn-secondary";
    unpublishBadge.textContent = "피드게시 공개 중";
    unpublishBadge.addEventListener("click", async () => {
      const ok = window.confirm("작품 공개를 중단하시겠습니까?");
      if (!ok) return;
      await updateWorkStatus(work.id, "approved", false);
    });
    actions.appendChild(editBtn);
    actions.appendChild(deleteBtn);
    actions.appendChild(unpublishBadge);
  } else if (work.status === "under_review") {
    // 수정 가능, 삭제 불가, 심사 취소(임시저장으로 롤백)
    const cancelReviewBtn = document.createElement("button");
    cancelReviewBtn.className = "btn-secondary";
    cancelReviewBtn.textContent = "심사 취소(임시저장으로)";
    cancelReviewBtn.addEventListener("click", async () => {
      const ok = window.confirm("심사를 취소하고 임시저장 상태로 돌릴까요?");
      if (!ok) return;
      await updateWorkStatus(work.id, "draft", false);
    });

    actions.appendChild(editBtn);
    actions.appendChild(cancelReviewBtn);
  }
}

async function updateWorkStatus(workId, nextStatus, makePublic = false) {
  if (!workId || !supabase) return;
  // works.status 체크 제약: allowed 값(draft/under_review/approved/rejected 등)만 사용
  // "published" 요청은 approved + is_public=true로 처리
  const payload = {
    status: nextStatus === "published" ? "approved" : nextStatus,
    is_public: makePublic || nextStatus === "published" ? true : false,
    updated_at: new Date().toISOString(),
  };

  const { error } = await supabase
    .from("works")
    .update(payload)
    .eq("id", workId);

  if (error) {
    console.warn("Failed to update work status:", error);
    showUploadError("상태 변경에 실패했습니다. 다시 시도해주세요.");
    return;
  }

  state.works = state.works.map((w) =>
    w.id === workId ? { ...w, status: nextStatus, is_public: makePublic } : w
  );

  renderWorks(document.querySelector(".work-tab.active")?.dataset.tab || "all");

  const updated = state.works.find((w) => w.id === workId);
  if (updated) {
    openWorkDetail(updated);
  }
}

async function deleteWork(workId) {
  if (!workId || !supabase) return;
  try {
    // 컷 먼저 정리 (스토리지 정리는 별도)
    const { error: cutsError } = await supabase
      .from("cuts")
      .delete()
      .eq("work_id", workId);
    if (cutsError) {
      console.warn("Failed to delete cuts:", cutsError);
    }

    const { error: workError } = await supabase
      .from("works")
      .delete()
      .eq("id", workId);
    if (workError) {
      console.warn("Failed to delete work:", workError);
      showUploadError("삭제에 실패했습니다. 다시 시도해주세요.");
      return;
    }

    state.works = state.works.filter((w) => w.id !== workId);
    setActiveView("work-list");
    renderWorks(
      document.querySelector(".work-tab.active")?.dataset.tab || "all"
    );
  } catch (err) {
    console.warn("Delete work error:", err);
    showUploadError("삭제에 실패했습니다. 다시 시도해주세요.");
  }
}

function renderTagsFromState() {
  const tagsList = document.getElementById("tags-list");
  const tagsCount = document.getElementById("tags-count");
  const draft = getUploadDraft();
  const currentTags = Array.isArray(draft.tags) ? draft.tags : [];

  if (tagsList) {
    tagsList.innerHTML = "";
    currentTags.forEach((tag) => {
      const tagItem = document.createElement("div");
      tagItem.className = "tag-item";
      tagItem.innerHTML = `
        <span>${tag}</span>
        <button type="button" class="tag-remove" data-tag="${tag}">×</button>
      `;
      const removeBtn = tagItem.querySelector(".tag-remove");
      if (removeBtn) {
        removeBtn.addEventListener("click", () => {
          draft.tags = draft.tags.filter((t) => t !== tag);
          renderTagsFromState();
        });
      }
      tagsList.appendChild(tagItem);
    });
  }

  if (tagsCount) {
    tagsCount.textContent = currentTags.length.toString();
  }

  syncPreviewFromDraft();
}

function hydrateDraftFromWork(work, options = {}) {
  if (!work) return;

  state.currentWorkId = work.id;
  state.title = work.title || "";
  state.description = work.description || "";
  state.genres = Array.isArray(work.genre)
    ? [...work.genre]
    : Array.isArray(work.genres)
    ? [...work.genres]
    : [];
  state.tags = Array.isArray(work.tags) ? [...work.tags] : [];

  const cutSource =
    Array.isArray(work.cuts) && work.cuts.length > 0
      ? work.cuts
      : Array.isArray(work.images)
      ? work.images.map((url, idx) => ({
          id: Date.now() + idx,
          image_url: url,
          order_index: idx,
        }))
      : [];

  state.cuts = cutSource.map((cut, idx) => ({
    id: cut.id || Date.now() + idx,
    url: cut.image_url || cut.url || cut,
    file: null,
    existingCutId: cut.id || null,
    order_index: typeof cut.order_index === "number" ? cut.order_index : idx,
  }));

  const primaryThumb =
    work.thumbnail_url ||
    (state.cuts && state.cuts.length > 0 ? state.cuts[0].url : null);

  state.thumbnail = primaryThumb;
  state.thumbnailUrl = primaryThumb;
  state.thumbnailSource = "cut";
  state.thumbnailCutIndex = state.cuts.findIndex((c) => c.url === primaryThumb);

  // form fields
  const titleInput = document.getElementById("work-title");
  if (titleInput) {
    titleInput.value = state.title;
  }

  const descInput = document.getElementById("work-description");
  if (descInput) {
    descInput.value = state.description;
  }

  syncGenreUI();
  renderTagsFromState();
  renderCutPreviews();
  renderThumbnailPreview();
  syncPreviewFromDraft();

  const targetStep = options.goToStep ?? 2;
  setUploadStep(targetStep);
  setActiveView("upload");
}

// ============================================
// 13. 대시보드 및 기타 뷰
// ============================================

async function renderDashboard() {
  try {
    let payout = state.dummyData.payout;
    const currentCreatorId = getCreatorId();

    // 실제 데이터 시도 (실패해도 UI는 유지)
    try {
      if (currentCreatorId && supabase) {
        // 실제 데이터 로드 시도
      }
    } catch (error) {
      console.warn("Supabase dashboard data failed, using dummy data:", error);
    }

    const payoutAmountEl = document.getElementById("payout-amount");
    if (payoutAmountEl) {
      payoutAmountEl.textContent = payout.amount.toLocaleString();
    }

    const totalRevenueEl = document.getElementById("total-revenue");
    if (totalRevenueEl) {
      totalRevenueEl.textContent = `₩${payout.totalRevenue.toLocaleString()}`;
    }

    const monthlyViewsEl = document.getElementById("monthly-views");
    if (monthlyViewsEl) {
      monthlyViewsEl.textContent =
        state.dummyData.monthlyViews.toLocaleString();
    }

    const monthlyLikesEl = document.getElementById("monthly-likes");
    if (monthlyLikesEl) {
      monthlyLikesEl.textContent =
        state.dummyData.monthlyLikes.toLocaleString();
    }
  } catch (error) {
    console.warn("Failed to render dashboard:", error);
  }
}

function renderRevenue() {
  // 수익 뷰 렌더링 - 기본적으로 HTML에 이미 있으므로 추가 작업 불필요
  // 필요시 데이터 로드 및 업데이트
  try {
    const currentCreatorId = getCreatorId();
    // 수익 데이터 로드 (선택적)
    if (currentCreatorId && supabase) {
      // 실제 데이터 로드 로직 추가 가능
    }
  } catch (error) {
    console.warn("Error rendering revenue view:", error);
  }
}

function renderStore() {
  // 스토어 뷰 렌더링 - 기본적으로 HTML에 이미 있으므로 추가 작업 불필요
  // 필요시 데이터 로드 및 업데이트
  try {
    const currentCreatorId = getCreatorId();
    // 스토어 데이터 로드 (선택적)
    if (currentCreatorId && supabase) {
      // 실제 데이터 로드 로직 추가 가능
    }
  } catch (error) {
    console.warn("Error rendering store view:", error);
  }
}

function renderAnalytics() {
  // 통계 뷰 렌더링 - 기본적으로 HTML에 이미 있으므로 추가 작업 불필요
  // 필요시 데이터 로드 및 업데이트
  try {
    const currentCreatorId = getCreatorId();
    // 통계 데이터 로드 (선택적)
    if (currentCreatorId && supabase) {
      // 실제 데이터 로드 로직 추가 가능
    }
  } catch (error) {
    console.warn("Error rendering analytics view:", error);
  }
}

// ============================================
// 14. 프로필 관리
// ============================================

function initializeProfile() {
  const profilePictureBtn = document.getElementById("profile-picture-btn");
  const profilePictureInput = document.getElementById("profile-picture-input");
  const profileForm = document.getElementById("profile-form");

  if (profilePictureBtn && profilePictureInput) {
    profilePictureBtn.addEventListener("click", () => {
      profilePictureInput.click();
    });
  }

  if (profilePictureInput) {
    profilePictureInput.addEventListener("change", (e) => {
      const file = e.target.files[0];
      if (file && file.type.startsWith("image/")) {
        const reader = new FileReader();
        reader.onload = (e) => {
          state.profile.profilePicture = e.target.result;
          const preview = document.getElementById("profile-picture-preview");
          if (preview) {
            preview.innerHTML = `<img src="${e.target.result}" alt="Profile" />`;
          }
        };
        reader.readAsDataURL(file);
      }
    });
  }

  if (profileForm) {
    profileForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const formData = new FormData(e.target);

      const currentCreatorId = getCreatorId();
      if (currentCreatorId && supabase) {
        try {
          await supabase
            .from("creators")
            .update({
              author_name: formData.get("author-name") || "",
              author_intro: formData.get("author-intro") || "",
              contact_email: formData.get("contact-email") || "",
              sns_links: formData.get("sns-links") || "",
            })
            .eq("id", currentCreatorId);
        } catch (error) {
          console.warn("Failed to save profile:", error);
        }
      }
    });
  }
}

// ============================================
// 16. 실시간 Work Preview (읽기 전용 미러)
// ============================================

function syncPreviewFromDraft(options = {}) {
  const draft = getUploadDraft();
  const textOnly = options.textOnly === true;

  const previewTitle = document.getElementById("preview-title");
  if (previewTitle) {
    const titleValue = (draft.title || "").trim();
    previewTitle.textContent = titleValue || "제목을 입력해주세요";
  }

  const previewDesc = document.getElementById("preview-description");
  if (previewDesc) {
    const descValue = (draft.description || "").trim();
    previewDesc.textContent = descValue || "작품 소개가 여기에 표시됩니다.";
  }

  if (textOnly) return;

  const cutUrls = (draft.cuts || [])
    .map((img) => (img && img.url ? img.url : null))
    .filter(Boolean);

  const thumbnailFromDraft = draft.thumbnail || draft.thumbnailUrl || null;

  const primaryThumbnail =
    thumbnailFromDraft ||
    (typeof draft.thumbnailCutIndex === "number"
      ? cutUrls[draft.thumbnailCutIndex] || null
      : null) ||
    cutUrls[0] ||
    null;

  const previewCutUrls = primaryThumbnail
    ? [
        primaryThumbnail,
        ...cutUrls.filter((url) => url && url !== primaryThumbnail),
      ]
    : cutUrls;

  renderPreviewCuts(previewCutUrls);
  renderPreviewTags(Array.isArray(draft.tags) ? draft.tags : []);
}

const previewState = {
  cuts: [],
  currentIndex: 0,
};

function initWorkPreview() {
  const titleInput = document.getElementById("work-title");
  const descriptionInput = document.getElementById("work-description");
  const tagsList = document.getElementById("tags-list");
  const cutsContainer = document.getElementById("image-preview-list");
  const dateEl = document.getElementById("preview-date");
  const draft = getUploadDraft();

  // 날짜 초기화
  if (dateEl) {
    try {
      const today = new Date();
      dateEl.textContent = today.toLocaleDateString("ko-KR");
    } catch (e) {
      // fallback 그대로 유지
    }
  }

  // 제목 / 설명 미러링
  if (titleInput) {
    if (typeof draft.title === "string") {
      titleInput.value = draft.title;
    }
    titleInput.addEventListener("input", (e) => {
      state.title = e.target.value || "";
      syncPreviewFromDraft({ textOnly: true });
    });
  }

  if (descriptionInput) {
    if (typeof draft.description === "string") {
      descriptionInput.value = draft.description;
    }
    descriptionInput.addEventListener("input", (e) => {
      state.description = e.target.value || "";
      syncPreviewFromDraft({ textOnly: true });
    });
  }

  // 컷 리스트 변화 감지 → Preview 슬라이더 반영
  if (cutsContainer) {
    const updateCutsFromState = () => {
      syncPreviewFromDraft();
    };

    const cutsObserver = new MutationObserver(updateCutsFromState);
    cutsObserver.observe(cutsContainer, {
      childList: true,
      subtree: true,
    });

    // 초기 한 번 반영
    updateCutsFromState();
  }

  // 태그 리스트 변화 감지 → Preview 태그 반영
  if (tagsList) {
    const updateTagsFromState = () => {
      syncPreviewFromDraft();
    };

    const tagsObserver = new MutationObserver(updateTagsFromState);
    tagsObserver.observe(tagsList, {
      childList: true,
      subtree: true,
    });

    // 초기 한 번 반영
    updateTagsFromState();
  }

  // 슬라이더 버튼 바인딩
  const slider = document.querySelector(".work-preview .feed-slider");
  const track = document.getElementById("preview-cuts");
  let prevBtn = document.querySelector(".work-preview .slide-prev");
  const nextBtn = document.querySelector(".work-preview .slide-next");

  if (!prevBtn && slider) {
    const newPrev = document.createElement("button");
    newPrev.className = "slide-prev";
    newPrev.type = "button";
    newPrev.textContent = "‹";
    if (track && slider.contains(track)) {
      slider.insertBefore(newPrev, track);
    } else {
      slider.insertBefore(newPrev, slider.firstChild || null);
    }
    prevBtn = newPrev;
  }

  if (prevBtn) {
    prevBtn.addEventListener("click", () => {
      if (previewState.cuts.length <= 1) return;
      previewState.currentIndex = Math.max(previewState.currentIndex - 1, 0);
      updatePreviewSlider();
      renderPreviewPagination();
    });
  }

  if (nextBtn) {
    nextBtn.addEventListener("click", () => {
      if (previewState.cuts.length <= 1) return;
      previewState.currentIndex = Math.min(
        previewState.currentIndex + 1,
        previewState.cuts.length - 1
      );
      updatePreviewSlider();
      renderPreviewPagination();
    });
  }

  syncPreviewFromDraft();
}

function renderPreviewCuts(cutUrls) {
  const track = document.getElementById("preview-cuts");
  if (!track) return;

  previewState.cuts = Array.isArray(cutUrls) ? cutUrls : [];
  previewState.currentIndex = 0;

  track.innerHTML = "";

  previewState.cuts.forEach((src) => {
    const img = document.createElement("img");
    img.src = src;
    img.className = "feed-cut";
    track.appendChild(img);
  });

  updatePreviewSlider();
  renderPreviewPagination();
}

function updatePreviewSlider() {
  const track = document.getElementById("preview-cuts");
  if (!track) return;

  const index = Math.max(
    0,
    Math.min(previewState.currentIndex, previewState.cuts.length - 1)
  );
  previewState.currentIndex = index;

  const offset = index * 100;
  track.style.transform = `translateX(-${offset}%)`;

  const slider = document.querySelector(".work-preview .feed-slider");
  if (slider) {
    slider.scrollTo({
      left: slider.clientWidth * index,
      behavior: "smooth",
    });
  }

  const prevBtn = document.querySelector(".work-preview .slide-prev");
  const nextBtn = document.querySelector(".work-preview .slide-next");
  if (prevBtn) {
    prevBtn.disabled = previewState.cuts.length <= 1 || index === 0;
  }
  if (nextBtn) {
    nextBtn.disabled =
      previewState.cuts.length <= 1 ||
      index >= Math.max(0, previewState.cuts.length - 1);
  }
}

function renderPreviewPagination() {
  const pagination = document.getElementById("preview-pagination");
  if (!pagination) return;

  const total = previewState.cuts.length;
  pagination.innerHTML = "";

  if (total <= 1) {
    return;
  }

  for (let i = 0; i < total; i++) {
    const dot = document.createElement("span");
    if (i === previewState.currentIndex) {
      dot.classList.add("active");
    }
    pagination.appendChild(dot);
  }
}

function renderPreviewTags(tags) {
  const wrap = document.getElementById("preview-tags");
  if (!wrap) return;

  wrap.innerHTML = "";

  (Array.isArray(tags) ? tags : []).forEach((tag) => {
    const el = document.createElement("span");
    el.className = "tag";
    el.textContent = tag;
    wrap.appendChild(el);
  });
}

// Preview 초기화는 DOM 준비 후 한 번만 수행
document.addEventListener("DOMContentLoaded", () => {
  initWorkPreview();
});

// ============================================
// 15. 유틸리티
// ============================================

function showUploadError(message) {
  const errorEl = document.getElementById("upload-error");
  if (errorEl) {
    errorEl.textContent = message;
    errorEl.style.display = "block";
    setTimeout(() => {
      errorEl.style.display = "none";
    }, 5000);
  }
}

// ============================================

// ============================================
// 17. 글로벌 인터랙션 초기화 (Global Interactions)
// ============================================

function initGlobalInteractions() {
  if (window.__CREATOR_GLOBAL_INTERACTIONS_INITED__) return;
  window.__CREATOR_GLOBAL_INTERACTIONS_INITED__ = true;
  console.log("Initializing Global Interactions...");

  // A. 사이드바 네비게이션
  const navItems = document.querySelectorAll(".nav-item");
  const openMainUpload = () => {
    showUploadEditorSinglePage();
  };

  navItems.forEach((item) => {
    item.addEventListener("click", () => {
      const viewId = item.dataset.view;
      if (!viewId) return;
      setActiveView(viewId);
    });
  });

  const initialView =
    document.querySelector(".nav-item.active")?.dataset.view ||
    navItems[0]?.dataset.view;
  if (initialView) {
    setActiveView(initialView);
  }

  // B. 작품 관리 화면 및 탭
  // 1. 작품 업로드 버튼 (작품 관리 → 업로드 메인 진입)
  const uploadBtn = document.getElementById("upload-btn");
  if (uploadBtn) {
    uploadBtn.addEventListener("click", () => {
      openMainUpload();
    });
  }

  // 2. 탭 버튼
  const tabs = document.querySelectorAll(".work-tab");
  tabs.forEach((tab) => {
    tab.addEventListener("click", function () {
      const siblings =
        (tab.parentElement &&
          tab.parentElement.querySelectorAll(".work-tab")) ||
        [];
      siblings.forEach((t) => t.classList.remove("active"));
      this.classList.add("active");
    });
  });

  // C. 작품 상세 화면 - 뒤로 가기
  const backToListBtn = document.getElementById("back-to-list-btn");
  if (backToListBtn) {
    backToListBtn.addEventListener("click", function () {
      setActiveView("work-list");
    });
  }

  // D. 업로드 플로우: 새 업로드를 바로 메인 화면으로 연결
  const btnNewWork = document.getElementById("btn-new-work");
  if (btnNewWork) {
    btnNewWork.addEventListener("click", () => {
      openMainUpload();
    });
  }
}

// Initialize on DOMContentLoaded (single entry)
document.addEventListener("DOMContentLoaded", initGlobalInteractions, {
  once: true,
});

// ============================================
// 18. Single-page Upload Shell Helpers
// ============================================

function setActiveView(viewId) {
  if (!viewId) return;

  const targetViewId = viewId.endsWith("-view") ? viewId : `${viewId}-view`;

  document.querySelectorAll(".nav-item").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.view === viewId);
  });

  document.querySelectorAll(".view").forEach((view) => {
    const shouldShow = view.id === targetViewId;
    view.style.display = shouldShow ? "block" : "none";
    view.classList.toggle("active", shouldShow);
  });
}

function showUploadEditorSinglePage() {
  window.__SINGLE_PAGE_UPLOAD__ = true;

  setActiveView("upload");

  const uploadView = document.getElementById("upload-view");
  if (uploadView) {
    uploadView.classList.add("active");
  }

  const step0 = document.getElementById("upload-step-0");
  if (step0) {
    step0.style.display = "none";
    step0.setAttribute("aria-hidden", "true");
  }

  const step1 = document.getElementById("upload-step-1");
  if (step1) {
    step1.style.display = "none";
    step1.setAttribute("aria-hidden", "true");
  }

  const backStep1 = document.getElementById("upload-back-step1");
  if (backStep1) {
    backStep1.style.display = "none";
  }

  const nextStepBtn = document.getElementById("btn-next-to-settings");
  if (nextStepBtn) {
    nextStepBtn.style.display = "none";
    nextStepBtn.disabled = true;
  }

  resetUploadForm();
  setUploadStep(2);
}

function mergeCutUploadIntoStep2Once() {
  if (window.__CUT_UPLOAD_MERGED__) {
    return;
  }

  const uploadStep1 = document.getElementById("upload-step-1");
  const uploadStep2 = document.getElementById("upload-step-2");
  if (!uploadStep1 || !uploadStep2) {
    window.__CUT_UPLOAD_MERGED__ = true;
    return;
  }

  const workForm =
    uploadStep2.querySelector(".work-form") ||
    uploadStep2.querySelector("form") ||
    uploadStep2;
  if (!workForm) return;

  const uploadArea = document.getElementById("upload-area");
  const imagePreviewList = document.getElementById("image-preview-list");
  const uploadPlaceholder = document.getElementById("upload-placeholder");
  const btnResetAll = document.getElementById("btn-reset-all");
  const nextStepBtn = document.getElementById("btn-next-to-settings");
  const fileInput = document.getElementById("file-input");

  const candidateContainer =
    uploadArea &&
    imagePreviewList &&
    uploadArea.parentElement &&
    uploadArea.parentElement.contains(imagePreviewList) &&
    uploadStep1.contains(uploadArea.parentElement)
      ? uploadArea.parentElement
      : null;

  const fragment = document.createDocumentFragment();

  if (candidateContainer) {
    fragment.appendChild(candidateContainer);
  } else {
    [
      uploadArea,
      uploadPlaceholder,
      imagePreviewList,
      btnResetAll,
      nextStepBtn,
      fileInput,
    ].forEach((node) => {
      if (node && !workForm.contains(node)) {
        fragment.appendChild(node);
      }
    });
  }

  const thumbnailPreview = document.getElementById("thumbnail-preview");
  const thumbnailSection =
    (thumbnailPreview && thumbnailPreview.closest("section")) ||
    (thumbnailPreview && thumbnailPreview.parentElement) ||
    null;

  const isDirectChild =
    thumbnailSection && thumbnailSection.parentElement === workForm;

  if (isDirectChild) {
    workForm.insertBefore(fragment, thumbnailSection);
  } else {
    workForm.insertBefore(fragment, workForm.firstChild || null);
  }

  if (nextStepBtn) {
    nextStepBtn.style.display = "none";
    nextStepBtn.disabled = true;
  }

  if (uploadStep1) {
    uploadStep1.style.display = "none";
    uploadStep1.setAttribute("aria-hidden", "true");
  }

  const step0 = document.getElementById("upload-step-0");
  if (step0) {
    step0.style.display = "none";
    step0.setAttribute("aria-hidden", "true");
  }

  window.__CUT_UPLOAD_MERGED__ = true;
  window.__SINGLE_PAGE_UPLOAD__ = true;
}

function reviveCutUploadUI() {
  const uploadArea = document.getElementById("upload-area");
  const imagePreviewList = document.getElementById("image-preview-list");
  const uploadPlaceholder = document.getElementById("upload-placeholder");

  [uploadArea, imagePreviewList, uploadPlaceholder].forEach((node) => {
    if (node) {
      node.style.removeProperty("display");
    }
  });

  if (typeof renderCutPreviews === "function") {
    renderCutPreviews();
  }

  if (typeof syncPreviewFromDraft === "function") {
    syncPreviewFromDraft();
  }
}

function forceSyncGenreTagCount() {
  if (typeof getUploadDraft !== "function") return;

  const draft = getUploadDraft();
  if (!draft) return;

  const genreCount = document.getElementById("genre-count");
  if (genreCount && Array.isArray(draft.genres)) {
    genreCount.textContent = (draft.genres.length || 0).toString();
  }

  const tagsCount = document.getElementById("tags-count");
  if (tagsCount && Array.isArray(draft.tags)) {
    tagsCount.textContent = (draft.tags.length || 0).toString();
  }
}

function forceUploadUIRefresh() {
  reviveCutUploadUI();
  forceSyncGenreTagCount();

  if (typeof renderThumbnailPreview === "function") {
    renderThumbnailPreview();
  }

  if (typeof syncPreviewFromDraft === "function") {
    syncPreviewFromDraft();
  }
}

window.addEventListener("DOMContentLoaded", () => {
  setTimeout(() => {
    if (typeof forceUploadUIRefresh === "function") {
      forceUploadUIRefresh();
    }
  }, 0);
});
