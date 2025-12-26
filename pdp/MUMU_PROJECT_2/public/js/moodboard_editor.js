// =========================
// MOODBOARD EDITOR - 전면 재설계
// 모바일 전용 무드보드 에디터
// =========================

// =========================
// STEP 1: 공통 레이아웃 모델 정의 (EditorLayoutModel)
// 자유형 / 템플릿 공통 타입
// =========================
/**
 * @typedef {Object} EditorLayout
 * @property {"free"|"template"} type - 에디터 모드 타입
 * @property {string} [templateId] - 템플릿 모드일 때만 (템플릿 ID)
 * @property {Object} [grid] - 그리드 설정 (템플릿 모드용)
 * @property {number} grid.columns - 그리드 컬럼 수
 * @property {number} grid.rowHeight - 행 높이
 * @property {number} grid.gap - 간격
 * @property {Object} position - 블록 위치 정보
 * @property {number} position.x - X 좌표 (%)
 * @property {number} position.y - Y 좌표 (%)
 * @property {number} position.w - 너비 (%)
 * @property {number} position.h - 높이 (%)
 * @property {Object} [transform] - 변환 정보
 * @property {number} [transform.scale] - 스케일
 * @property {number} [transform.rotate] - 회전 각도
 */

/**
 * 레이어에서 EditorLayout 생성 (저장용)
 * @param {Object} layer - 레이어 객체
 * @param {string} editorMode - "free" | "template"
 * @param {string} [templateId] - 템플릿 ID (템플릿 모드일 때만)
 * @returns {EditorLayout|null}
 */
function createLayoutFromLayer(layer, editorMode, templateId = null) {
  if (!layer) return null;

  const layout = {
    type: editorMode,
    position: {
      x: layer.x || 50,
      y: layer.y || 50,
      w: layer.width || 80,
      h: layer.height || 80,
    },
  };

  // 템플릿 모드일 때
  if (editorMode === "template" && templateId) {
    layout.templateId = templateId;
    // 템플릿 모드에서는 slotId 기반 위치 정보도 포함
    if (layer.slotId) {
      layout.slotId = layer.slotId;
    }
  }

  // 변환 정보 (scale, rotate 등)
  if (layer.scale !== undefined || layer.rotate !== undefined) {
    layout.transform = {};
    if (layer.scale !== undefined) {
      layout.transform.scale = layer.scale;
    }
    if (layer.rotate !== undefined) {
      layout.transform.rotate = layer.rotate;
    }
  }

  // 템플릿 모드에서 offsetX, offsetY 정보
  if (
    editorMode === "template" &&
    (layer.offsetX !== undefined || layer.offsetY !== undefined)
  ) {
    layout.offset = {
      x: layer.offsetX || 0,
      y: layer.offsetY || 0,
    };
  }

  return layout;
}

// =========================
// STEP 4: 공통 Renderer 함수 (edit/view mode 지원)
// =========================
/**
 * 공통 무드보드 블록 렌더러
 * @param {Array} blocks - 무드보드 블록 배열
 * @param {Object} options - 렌더링 옵션
 * @param {"edit"|"view"} options.mode - 렌더링 모드
 * @param {HTMLElement} options.container - 컨테이너 요소
 * @param {string} [options.editorMode] - 에디터 모드 ("free" | "template")
 * @param {Object} [options.template] - 템플릿 정보 (템플릿 모드일 때만)
 * @param {Object} [options.cutMap] - cut_id → image_url 매핑
 */
function renderMoodboardBlocks(blocks, options) {
  const {
    mode = "view",
    container,
    editorMode = "free",
    template = null,
    cutMap = {},
  } = options;

  if (!container) {
    console.error("[Renderer] container가 필요합니다");
    return;
  }

  // 컨테이너 초기화
  container.innerHTML = "";

  // view mode일 때 전시용 CSS 클래스 추가
  if (mode === "view") {
    container.classList.add("moodboard-view-mode");
    container.style.pointerEvents = "none"; // 드래그/클릭 비활성화
  } else {
    container.classList.remove("moodboard-view-mode");
    container.style.pointerEvents = "auto";
  }

  // STEP 6: 템플릿 모드일 때 슬롯 렌더링
  // 템플릿 정보가 없어도 첫 번째 블록의 layout에서 templateId를 확인하여 처리 가능
  if (editorMode === "template") {
    // 템플릿 정보가 있으면 슬롯 렌더링
    if (template && template.slots) {
      template.slots.forEach((slot) => {
        const slotEl = document.createElement("div");
        slotEl.className = "template-slot";
        slotEl.dataset.slotId = slot.id;
        slotEl.style.cssText = `
          position: absolute;
          left: ${slot.x}%;
          top: ${slot.y}%;
          width: ${slot.w}%;
          height: ${slot.h}%;
        `;
        if (mode === "view") {
          slotEl.style.pointerEvents = "none";
        }
        container.appendChild(slotEl);
      });
    } else {
      // 템플릿 정보가 없으면 첫 번째 블록의 layout에서 slotId를 추출하여 슬롯 생성
      const firstBlockWithLayout = blocks.find(
        (b) => b.layout && b.layout.slotId
      );
      if (firstBlockWithLayout && firstBlockWithLayout.layout.slotId) {
        // 슬롯 정보가 없으므로 블록의 위치를 기반으로 슬롯 영역 추정
        // 실제로는 템플릿 정보를 로드해야 하지만, 일단 블록 위치를 사용
        console.warn(
          "[Renderer] 템플릿 정보가 없어 블록 위치 기반으로 렌더링합니다"
        );
      }
    }
  }

  // 블록 렌더링
  blocks.forEach((block) => {
    const meta = block.meta || {};
    let blockEl = null;

    // layout 기반 렌더링 (NEW 방식)
    if (block.layout) {
      const layout = block.layout;
      const position = layout.position || { x: 50, y: 50, w: 80, h: 80 };

      if (block.block_type === "cut" || block.block_type === "image") {
        // 이미지 블록
        const imageUrl = block.cut_id
          ? cutMap[block.cut_id] || meta.imageUrl
          : meta.imageUrl;

        if (imageUrl) {
          blockEl = document.createElement("img");
          blockEl.src = imageUrl;
          blockEl.className =
            editorMode === "template" ? "slot-image" : "free-image-layer";
          blockEl.style.cssText = `
            position: absolute;
            left: ${position.x}%;
            top: ${position.y}%;
            width: ${position.w}%;
            height: ${position.h}%;
            transform: translate(-50%, -50%) scale(${
              layout.transform?.scale || 1
            });
            object-fit: ${meta.fitMode || "cover"};
          `;

          // 템플릿 모드일 때 슬롯 내부에 배치
          if (editorMode === "template" && layout.slotId) {
            const slotEl = container.querySelector(
              `[data-slot-id="${layout.slotId}"]`
            );
            if (slotEl) {
              slotEl.appendChild(blockEl);
              // offset 적용
              if (layout.offset) {
                blockEl.style.transform = `translate(${layout.offset.x}%, ${
                  layout.offset.y
                }%) scale(${layout.transform?.scale || 1})`;
              }
            } else {
              container.appendChild(blockEl);
            }
          } else {
            container.appendChild(blockEl);
          }
        }
      } else if (block.block_type === "text") {
        blockEl = document.createElement("div");
        blockEl.className = "text-layer";
        blockEl.textContent = block.content || block.title || "";
        blockEl.style.cssText = `
          position: absolute;
          left: ${position.x}%;
          top: ${position.y}%;
          transform: translate(-50%, -50%);
          font-size: ${meta.fontSize || 16}px;
          color: ${meta.color || "#333"};
        `;
        container.appendChild(blockEl);
      } else if (block.block_type === "quote") {
        blockEl = document.createElement("div");
        blockEl.className = "sticker-layer";
        blockEl.textContent = block.emoji || "😀";
        blockEl.style.cssText = `
          position: absolute;
          left: ${position.x}%;
          top: ${position.y}%;
          transform: translate(-50%, -50%) scale(${
            layout.transform?.scale || 1
          });
          font-size: 48px;
        `;
        container.appendChild(blockEl);
      }
    } else {
      // LEGACY 방식: meta 기반 렌더링
      if (block.block_type === "cut" || block.block_type === "image") {
        const imageUrl = block.cut_id
          ? cutMap[block.cut_id] || meta.imageUrl
          : meta.imageUrl;

        if (imageUrl) {
          blockEl = document.createElement("img");
          blockEl.src = imageUrl;
          blockEl.className =
            editorMode === "template" ? "slot-image" : "free-image-layer";

          if (editorMode === "template" && meta.slotId) {
            const slotEl = container.querySelector(
              `[data-slot-id="${meta.slotId}"]`
            );
            if (slotEl) {
              blockEl.style.cssText = `
                width: 100%;
                height: 100%;
                object-fit: ${meta.fitMode || "cover"};
                transform: translate(${meta.slotOffsetX || 0}%, ${
                meta.slotOffsetY || 0
              }%) scale(${meta.slotScale || 1});
              `;
              slotEl.appendChild(blockEl);
            } else {
              blockEl.style.cssText = `
                position: absolute;
                left: ${meta.x || 50}%;
                top: ${meta.y || 50}%;
                width: ${meta.width || 80}%;
                height: ${meta.height || 80}%;
                transform: translate(-50%, -50%);
                object-fit: ${meta.fitMode || "cover"};
              `;
              container.appendChild(blockEl);
            }
          } else {
            blockEl.style.cssText = `
              position: absolute;
              left: ${meta.x || 50}%;
              top: ${meta.y || 50}%;
              width: ${meta.width || 80}%;
              height: ${meta.height || 80}%;
              transform: translate(-50%, -50%);
              object-fit: ${meta.fitMode || "cover"};
            `;
            container.appendChild(blockEl);
          }
        }
      } else if (block.block_type === "text") {
        blockEl = document.createElement("div");
        blockEl.className = "text-layer";
        blockEl.textContent = block.content || block.title || "";
        blockEl.style.cssText = `
          position: absolute;
          left: ${meta.x || 50}%;
          top: ${meta.y || 50}%;
          transform: translate(-50%, -50%);
          font-size: ${meta.fontSize || 16}px;
          color: ${meta.color || "#333"};
        `;
        container.appendChild(blockEl);
      } else if (block.block_type === "quote") {
        blockEl = document.createElement("div");
        blockEl.className = "sticker-layer";
        blockEl.textContent = block.emoji || "😀";
        blockEl.style.cssText = `
          position: absolute;
          left: ${meta.x || 50}%;
          top: ${meta.y || 50}%;
          transform: translate(-50%, -50%) scale(${meta.scale || 1});
          font-size: 48px;
        `;
        container.appendChild(blockEl);
      }
    }

    // view mode일 때 상호작용 비활성화
    if (blockEl && mode === "view") {
      blockEl.style.pointerEvents = "none";
      blockEl.style.cursor = "default";
    }
  });
}

// 전역으로 노출 (마이페이지에서 사용)
window.renderMoodboardBlocks = renderMoodboardBlocks;

// =========================
// 무드 프리셋 정의 (6종 이상)
// =========================
const MOOD_PRESETS = {
  clean: {
    name: "클린",
    shadow: "0 2px 8px rgba(0, 0, 0, 0.08)",
    radius: 8,
    backgroundTone: "#FFFFFF",
    textureOpacity: 0,
  },
  soft_day: {
    name: "소프트 데이",
    shadow: "0 4px 12px rgba(0, 0, 0, 0.1)",
    radius: 12,
    backgroundTone: "#FAFAFA",
    textureOpacity: 0.05,
  },
  memory: {
    name: "메모리",
    shadow: "0 2px 16px rgba(0, 0, 0, 0.12)",
    radius: 16,
    backgroundTone: "#F5F5F5",
    textureOpacity: 0.08,
  },
  focus: {
    name: "포커스",
    shadow: "0 8px 24px rgba(0, 0, 0, 0.15)",
    radius: 20,
    backgroundTone: "#F8FAFC",
    textureOpacity: 0.03,
  },
  paper: {
    name: "페이퍼",
    shadow: "0 1px 4px rgba(0, 0, 0, 0.06)",
    radius: 4,
    backgroundTone: "#FFFEF7",
    textureOpacity: 0.1,
  },
  contrast: {
    name: "컨트라스트",
    shadow: "0 6px 20px rgba(0, 0, 0, 0.2)",
    radius: 0,
    backgroundTone: "#000000",
    textureOpacity: 0,
  },
};

// =========================
// 색상 팔레트 정의 (커스텀 색상 제거)
// =========================
const COLOR_PALETTE = [
  "#000000",
  "#333333",
  "#666666",
  "#999999",
  "#CCCCCC",
  "#FFFFFF",
  "#ff5e00",
  "#FF3366",
  "#FF6699",
  "#FF99CC",
  "#FFCCE5",
  "#FF6B35",
  "#FF8C42",
  "#FFA366",
  "#FFB88C",
  "#4ECDC4",
  "#45B7B8",
  "#3DA0A1",
  "#35898A",
  "#95E1D3",
  "#7ED4C3",
  "#68C7B3",
  "#52BAA3",
  "#F38181",
  "#E85A7A",
  "#DD3373",
  "#D20C6C",
  "#AA96DA",
  "#9B87C9",
  "#8C78B8",
  "#7D69A7",
  "#FCBAD3",
  "#F8A5C2",
  "#F490B1",
  "#F07BA0",
];

// UUID validation helper
function isValidUUID(str) {
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str);
}

// =========================
// EditorCore - 메인 클래스
// =========================
const EditorCore = {
  // 상태
  state: {
    supabaseClient: null,
    currentMoodboardId: null,
    currentUserId: null,
    editorMode: null, // 'free' or 'template'
    currentTemplate: null,
    selectedSlotId: null,
    selectedLayerId: null,
    currentMood: "clean",
    layers: [], // ImageLayer, TextLayer, StickerLayer
    isReaderMode: false,
    mode: "idle", // idle / pickingCut / editingText / editingSticker / editingBackground / editingEffect / confirmFeatured / saving
    returnUrl: "mypage_reader.html", // 기본 뒤로가기 URL
    moodboardTitle: "새 무드보드", // 무드보드 제목
    isDirty: false, // 편집 변경 여부 (저장 후 false로 설정)
    is_public: false, // 공개 여부
    is_featured: false, // 대표 무드 여부
    coverBlockId: null, // 대표 블록 ID
    history: {
      past: [],
      present: null,
      future: [],
    },
  },

  // 초기화
  async init() {
    try {
      console.log("[EditorCore] init 시작");
      // Supabase 초기화

      // 사용자 확인 (실패해도 에디터는 계속 진행)
      try {
        await this.getCurrentUser();
      } catch (e) {
        console.warn(
          "[EditorCore] UID 확보 실패 - Auth 대기 중, 에디터는 계속 진행"
        );
      }

      // URL 파라미터 처리
      const urlParams = new URLSearchParams(window.location.search);
      const returnUrl = urlParams.get("return") || "mypage_reader.html";
      this.state.returnUrl = returnUrl;

      const isNew = urlParams.get("new") === "1";
      const moodboardId = urlParams.get("id");
      const isEditMode = urlParams.get("edit") === "true";

      // GUARD: Check if moodboardId is a valid UUID
      if (moodboardId && !isValidUUID(moodboardId)) {
        console.error("[GUARD] moodboardId must be UUID", moodboardId);
        // Fail fast
        alert("잘못된 무드보드 ID입니다.");
        window.location.href = this.state.returnUrl;
        return;
      }

      // 편집 모드: id와 edit=true가 모두 있으면 모드 선택 화면 건너뛰고 바로 편집 화면으로 진입
      if (moodboardId && isEditMode) {
        console.log("[EditorCore] edit mode detected, skip mode selector");
        // 모드 선택 화면을 호출하지 않음
        this.state.currentMoodboardId = moodboardId;
        this.state.editorMode = "free"; // freeform 모드로 강제 설정
        // 무드보드 데이터 로드 시도 (실패해도 모드 선택 화면은 뜨지 않음)
        try {
          await this.loadMoodboardBlocks(moodboardId);
        } catch (error) {
          console.warn("[EditorCore] 무드보드 데이터 로드 실패:", error);
          // 실패해도 편집 화면으로 진입
        }
        // 바로 편집 화면으로 진입
        this.showEditor();
      } else if (isNew || moodboardId) {
        // 새 무드보드 또는 편집 모드 (edit 파라미터 없음) - 모드 선택 화면 표시
        this.showModeSelector();
      } else {
        // 기본: 모드 선택 화면
        this.showModeSelector();
      }

      console.log("[EditorCore] 초기화 완료");
    } catch (error) {
      console.error("[EditorCore] init 오류:", error);
      console.error("[EditorCore] init 오류 스택:", error.stack);
      // alert 제거 - 로그만 찍고 계속 진행
      console.warn("[EditorCore] 초기화 중 오류 발생했지만 에디터는 계속 진행");
    }
  },

  // =========================
  // 대표 블록 설정
  // =========================
  async setCoverBlock(blockId) {
    if (!this.state.currentMoodboardId) {
      alert("무드보드를 먼저 저장해주세요.");
      return;
    }

    try {
      // 1. Optimistic Update
      const oldCoverId = this.state.coverBlockId;
      this.state.coverBlockId = blockId;

      // 2. DB Update
      const { error } = await this.state.supabaseClient
        .from("moodboards")
        .update({ cover_block_id: blockId })
        .eq("id", this.state.currentMoodboardId);

      if (error) {
        // Revert on error
        this.state.coverBlockId = oldCoverId;
        console.error("Failed to set cover block:", error);
        alert("대표 블록 설정에 실패했습니다.");
        return;
      }

      console.log("[EditorCore] setCoverBlock success:", blockId);

      // 3. UI Refresh
      // Re-render Adjust Panel to show "Current Cover" state
      if (this.state.selectedLayerId === blockId) {
        this.openToolPanel("adjust");
      }

      // Re-render Canvas to show badge (if implemented in renderer)
      this.LayerManager.render();
    } catch (e) {
      console.error("[EditorCore] setCoverBlock error:", e);
    }
  },

  // 사용자 확인
  async getCurrentUser() {
    try {
      console.log("[EditorCore] getCurrentUser 시작");

      // 1. 전역 변수 확인 (이미 설정된 경우)
      if (window.currentUserId) {
        this.state.currentUserId = window.currentUserId;
        console.log(
          "[EditorCore] 전역 변수에서 사용자 확인됨:",
          this.state.currentUserId
        );
        return { uid: window.currentUserId };
      }

      // 2. Firebase Auth - onAuthStateChanged로 대기
      try {
        const { getAuth, onAuthStateChanged } = await import(
          "https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js"
        );
        const auth = getAuth();

        // 이미 currentUser가 있으면 즉시 반환
        if (auth.currentUser) {
          this.state.currentUserId = auth.currentUser.uid;
          window.currentUserId = auth.currentUser.uid;
          console.log(
            "[EditorCore] Firebase 사용자 확인됨:",
            this.state.currentUserId
          );
          return auth.currentUser;
        }

        // onAuthStateChanged로 대기 (최대 5초)
        const user = await new Promise((resolve, reject) => {
          let unsubscribe = null;
          const timeout = setTimeout(() => {
            if (unsubscribe) unsubscribe();
            reject(new Error("Firebase Auth 대기 시간 초과"));
          }, 5000);

          unsubscribe = onAuthStateChanged(auth, (user) => {
            clearTimeout(timeout);
            if (unsubscribe) unsubscribe();
            if (user) {
              resolve(user);
            } else {
              reject(null);
            }
          });
        });

        if (user) {
          this.state.currentUserId = user.uid;
          window.currentUserId = user.uid;
          console.log(
            "[EditorCore] Firebase 사용자 확보 (onAuthStateChanged):",
            this.state.currentUserId
          );
          return user;
        }
      } catch (firebaseError) {
        console.warn("[EditorCore] Firebase Auth 확인 실패:", firebaseError);
        // Firebase 실패해도 계속 진행
      }

      // 3. Supabase Auth 확인
      if (this.state.supabaseClient) {
        try {
          const {
            data: { session },
          } = await this.state.supabaseClient.auth.getSession();
          if (session?.user) {
            this.state.currentUserId = session.user.id;
            window.currentUserId = session.user.id;
            console.log(
              "[EditorCore] Supabase 사용자 확인됨:",
              this.state.currentUserId
            );
            return session.user;
          }
        } catch (supabaseError) {
          console.warn("[EditorCore] Supabase Auth 확인 실패:", supabaseError);
        }
      }

      console.warn(
        "[EditorCore] 사용자 없음 - UID 확보 실패 (Auth 대기 중일 수 있음)"
      );
      return null;
    } catch (error) {
      console.error("[EditorCore] getCurrentUser 오류:", error);
      console.error("[EditorCore] getCurrentUser 오류 스택:", error.stack);
      return null;
    }
  },

  // =========================
  // 화면 전환
  // =========================
  showModeSelector() {
    try {
      console.log("[EditorCore] showModeSelector 시작");
      document.getElementById("modeSelectorScreen")?.classList.remove("hidden");
      document
        .getElementById("templateSelectorScreen")
        ?.classList.remove("active");
      document.getElementById("editorScreen")?.classList.remove("active");
      console.log("[EditorCore] showModeSelector 완료");
    } catch (error) {
      console.error("[EditorCore] showModeSelector 오류:", error);
      console.error("[EditorCore] showModeSelector 오류 스택:", error.stack);
    }
  },

  showTemplateSelector() {
    try {
      console.log("[EditorCore] showTemplateSelector 시작");
      document.getElementById("modeSelectorScreen")?.classList.add("hidden");
      document
        .getElementById("templateSelectorScreen")
        ?.classList.add("active");
      document.getElementById("editorScreen")?.classList.remove("active");

      // 템플릿 목록 렌더링
      this.TemplateManager.renderTemplateList();
      console.log("[EditorCore] showTemplateSelector 완료");
    } catch (error) {
      console.error("[EditorCore] showTemplateSelector 오류:", error);
      console.error(
        "[EditorCore] showTemplateSelector 오류 스택:",
        error.stack
      );
    }
  },

  showEditor() {
    try {
      console.log("[EditorCore] showEditor 시작");
      document.getElementById("modeSelectorScreen")?.classList.add("hidden");
      document
        .getElementById("templateSelectorScreen")
        ?.classList.remove("active");
      document.getElementById("editorScreen")?.classList.add("active");

      // 에디터 초기화
      this.CanvasManager.init();

      // 무드보드 제목 업데이트 및 편집 기능 설정
      this.setupTitleEditor();

      console.log("[EditorCore] showEditor 완료");
    } catch (error) {
      console.error("[EditorCore] showEditor 오류:", error);
      console.error("[EditorCore] showEditor 오류 스택:", error.stack);
    }
  },

  // 무드보드 제목 편집 기능 설정
  setupTitleEditor() {
    const titleEl = document.getElementById("editorTitle");
    if (!titleEl) return;

    // 제목 업데이트
    titleEl.textContent = this.state.moodboardTitle || "새 무드보드";
    titleEl.style.cursor = "pointer";
    titleEl.title = "클릭하여 이름 변경";

    // 클릭 이벤트 제거 후 재등록 (중복 방지)
    const newTitleEl = titleEl.cloneNode(true);
    titleEl.parentNode.replaceChild(newTitleEl, titleEl);

    newTitleEl.addEventListener("click", () => {
      this.editTitle();
    });
  },

  // 제목 편집 모드
  editTitle() {
    const titleEl = document.getElementById("editorTitle");
    if (!titleEl) return;

    const currentTitle = this.state.moodboardTitle || "새 무드보드";
    const input = document.createElement("input");
    input.type = "text";
    input.value = currentTitle;
    input.style.cssText = `
      font-size: 18px;
      font-weight: 600;
      color: #333;
      text-align: center;
      border: 2px solid #ff5e00;
      border-radius: 4px;
      padding: 4px 8px;
      background: white;
      width: 200px;
      max-width: calc(100vw - 200px);
    `;

    const saveTitle = () => {
      const newTitle = input.value.trim() || "새 무드보드";
      if (newTitle !== currentTitle) {
        this.state.moodboardTitle = newTitle;
        this.state.isDirty = true; // 제목 변경 시 편집 변경 플래그 설정
      }
      titleEl.textContent = newTitle;
      titleEl.style.cursor = "pointer";
    };

    const cancelEdit = () => {
      titleEl.textContent = currentTitle;
      titleEl.style.cursor = "pointer";
    };

    input.addEventListener("blur", saveTitle);
    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        saveTitle();
      } else if (e.key === "Escape") {
        e.preventDefault();
        cancelEdit();
      }
    });

    titleEl.textContent = "";
    titleEl.appendChild(input);
    input.focus();
    input.select();
  },

  // =========================
  // 모드 선택
  // =========================
  selectMode(mode) {
    try {
      console.log("[EditorCore] selectMode 시작, mode:", mode);
      this.state.editorMode = mode;

      if (mode === "free") {
        // 자유형 - 바로 에디터 열기
        this.state.currentTemplate = null;
        this.showEditor();
      } else if (mode === "template") {
        // 템플릿형 - 템플릿 선택 화면 표시
        this.showTemplateSelector();
      }
      console.log("[EditorCore] selectMode 완료");
    } catch (error) {
      console.error("[EditorCore] selectMode 오류:", error);
      console.error("[EditorCore] selectMode 오류 스택:", error.stack);
    }
  },

  backToModeSelector() {
    try {
      console.log("[EditorCore] backToModeSelector 시작");
      // 무조건 마이페이지로 이동
      window.location.href = this.state.returnUrl;
      console.log("[EditorCore] backToModeSelector 완료");
    } catch (error) {
      console.error("[EditorCore] backToModeSelector 오류:", error);
      console.error("[EditorCore] backToModeSelector 오류 스택:", error.stack);
    }
  },

  // =========================
  // 템플릿 선택
  // =========================
  selectTemplate(templateId) {
    try {
      console.log("[EditorCore] selectTemplate 시작, templateId:", templateId);
      const template = getTemplate(templateId);
      if (!template) {
        console.error(
          "[EditorCore] selectTemplate 오류: 템플릿을 찾을 수 없음, templateId:",
          templateId
        );
        return;
      }

      this.state.currentTemplate = template;
      this.state.currentMood = template.defaultMood || "clean";
      this.state.layers = []; // 레이어 초기화
      this.LayerManager.layers = [];
      this.showEditor();
      console.log("[EditorCore] selectTemplate 완료");
    } catch (error) {
      console.error("[EditorCore] selectTemplate 오류:", error);
      console.error("[EditorCore] selectTemplate 오류 스택:", error.stack);
    }
  },

  // =========================
  // 뒤로가기
  // =========================
  handleBack() {
    if (this.state.editorMode === "template" && !this.state.currentTemplate) {
      // 템플릿 선택 화면에서 뒤로가기 → 무조건 마이페이지로
      window.location.href = this.state.returnUrl;
    } else if (this.state.editorMode === null) {
      // 모드 선택 화면에서 뒤로가기 → 무조건 마이페이지로
      window.location.href = this.state.returnUrl;
    } else {
      // 에디터에서 뒤로가기
      // isDirty가 false면 confirm 없이 바로 이동
      if (!this.state.isDirty) {
        window.location.href = this.state.returnUrl;
      } else {
        // isDirty가 true면 confirm 표시
        if (
          confirm("편집을 종료하시겠습니까? 저장하지 않은 내용은 사라집니다.")
        ) {
          window.location.href = this.state.returnUrl;
        }
      }
    }
  },

  // =========================
  // 저장
  // =========================
  async save() {
    console.log("[DEBUG][SAVE ENTRY]", arguments, this);
    console.log("[DEBUG][SAVE PATH]", "save");
    try {
      this.state.mode = "saving";

      // 1. 먼저 무드보드 생성 (필요 시)
      if (!this.state.currentMoodboardId) {
        await this.createMoodboard();
      }

      // 2. 무드보드 데이터 저장 + 썸네일 생성
      const thumbnailResult = await this.saveMoodboardData();

      // 3. 저장 성공 피드백
      const successModal = document.createElement("div");
      successModal.className = "save-success-modal";
      successModal.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: white;
        border-radius: 12px;
        padding: 20px 24px;
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
        z-index: 10002;
        font-size: 14px;
        color: #333;
      `;
      successModal.textContent = "저장되었습니다!";
      document.body.appendChild(successModal);

      // 4. 피드백 후 썸네일 선택 모달 표시 (또는 바로 Featured)
      setTimeout(() => {
        successModal.remove();
        if (thumbnailResult && thumbnailResult.gridUrl) {
          this.openThumbnailSelectionModal(thumbnailResult);
        } else {
          // 썸네일 생성 실패시 바로 Featured 질문
          this.confirmFeaturedAfterSave();
        }
      }, 1500);
    } catch (error) {
      console.error("[EditorCore] 저장 오류:", error);
      alert("저장에 실패했습니다: " + (error.message || "알 수 없는 오류"));
      this.state.mode = "idle";
    }
  },

  // 썸네일 확인 모달
  openThumbnailSelectionModal(thumbnails) {
    this.state.mode = "confirmThumbnail";
    const modal = document.createElement("div");
    modal.className = "thumbnail-modal-overlay";
    modal.style.cssText = `
        position: fixed; top: 0; left: 0; right: 0; bottom: 0;
        background: rgba(0, 0, 0, 0.5); z-index: 10001;
        display: flex; align-items: center; justify-content: center; padding: 20px;
      `;

    const content = document.createElement("div");
    content.style.cssText = `
        background: white; border-radius: 16px; padding: 24px;
        max-width: 320px; width: 100%; text-align: center;
      `;

    // Use Featured (Higher Res/Ratio) for preview if available, else Grid
    const previewUrl = thumbnails.featuredUrl || thumbnails.gridUrl;

    content.innerHTML = `
        <h3 style="font-size: 18px; font-weight: 600; color: #333; margin: 0 0 16px 0;">썸네일 확인</h3>
        <div style="width: 100%; aspect-ratio: 4/5; background: #eee; border-radius: 8px; overflow: hidden; margin-bottom: 20px;">
            <img src="${previewUrl}" style="width: 100%; height: 100%; object-fit: cover;">
        </div>
        <p style="font-size: 14px; color: #666; margin-bottom: 24px;">
            이 썸네일로 무드보드가 저장됩니다.
        </p>
        <button id="confirmThumbBtn" style="width: 100%; padding: 12px; background: #ff5e00; color: white; border: none; border-radius: 8px; font-size: 14px; font-weight: 600; cursor: pointer;">
            확인
        </button>
      `;

    modal.appendChild(content);
    document.body.appendChild(modal);

    document.getElementById("confirmThumbBtn").onclick = () => {
      modal.remove();
      this.confirmFeaturedAfterSave();
    };
  },

  // 저장 후 대표 무드 설정 모달 표시
  confirmFeaturedAfterSave() {
    this.state.mode = "confirmFeatured";
    const modal = document.createElement("div");
    modal.className = "featured-modal-overlay";
    modal.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.5);
      z-index: 10001;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
    `;

    const modalContent = document.createElement("div");
    modalContent.style.cssText = `
      background: white;
      border-radius: 16px;
      padding: 24px;
      max-width: 320px;
      width: 100%;
    `;

    modalContent.innerHTML = `
      <h3 style="font-size: 18px; font-weight: 600; color: #333; margin: 0 0 16px 0; text-align: center;">
        대표 무드 설정
      </h3>
      <p style="font-size: 14px; color: #666; margin: 0 0 24px 0; text-align: center;">
        이 무드보드를 대표 무드로 설정하시겠습니까?
      </p>
      <div style="display: flex; gap: 12px;">
        <button id="featuredNoBtn" style="flex: 1; padding: 12px; border: 1px solid #ddd; border-radius: 8px; background: white; color: #333; font-size: 14px; font-weight: 500; cursor: pointer;">
          아니오
        </button>
        <button id="featuredYesBtn" style="flex: 1; padding: 12px; border: none; border-radius: 8px; background: #ff5e00; color: white; font-size: 14px; font-weight: 500; cursor: pointer;">
          네
        </button>
      </div>
    `;

    modal.appendChild(modalContent);
    document.body.appendChild(modal);

    // 모달이 DOM에 추가된 후 버튼 찾기
    const handleYesClick = async () => {
      console.log("[EditorCore] 대표 무드 설정: 네 클릭");
      modal.remove();
      try {
        await this.setAsFeatured();
        // 대표 설정 성공 피드백
        const featuredModal = document.createElement("div");
        featuredModal.className = "save-success-modal";
        featuredModal.style.cssText = `
          position: fixed;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          background: white;
          border-radius: 12px;
          padding: 20px 24px;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
          z-index: 10002;
          font-size: 14px;
          color: #333;
        `;
        featuredModal.textContent = "대표 무드로 설정되었습니다";
        document.body.appendChild(featuredModal);
        setTimeout(() => {
          featuredModal.remove();
          this.state.mode = "idle";
          // 마이페이지로 이동 (강제 새로고침을 위해 타임스탬프 추가)
          const separator = this.state.returnUrl.includes("?") ? "&" : "?";
          window.location.href = `${
            this.state.returnUrl
          }${separator}_refresh=${Date.now()}`;
        }, 1500);
      } catch (error) {
        console.error("[EditorCore] 대표 무드 설정 오류:", error);
        alert("대표 무드 설정에 실패했습니다.");
        this.state.mode = "idle";
        // 마이페이지로 이동 (강제 새로고침을 위해 타임스탬프 추가)
        const separator = this.state.returnUrl.includes("?") ? "&" : "?";
        window.location.href = `${
          this.state.returnUrl
        }${separator}_refresh=${Date.now()}`;
      }
    };

    const handleNoClick = () => {
      console.log("[EditorCore] 대표 무드 설정: 아니오 클릭");
      modal.remove();
      this.state.mode = "idle";
      // 마이페이지로 이동 (강제 새로고침을 위해 타임스탬프 추가)
      const separator = this.state.returnUrl.includes("?") ? "&" : "?";
      window.location.href = `${
        this.state.returnUrl
      }${separator}_refresh=${Date.now()}`;
    };

    // 버튼 이벤트 바인딩 (DOM 추가 후)
    setTimeout(() => {
      const yesBtn = document.getElementById("featuredYesBtn");
      const noBtn = document.getElementById("featuredNoBtn");

      if (yesBtn) {
        yesBtn.addEventListener("click", handleYesClick);
        console.log("[EditorCore] 네 버튼 이벤트 바인딩 완료");
      } else {
        console.error("[EditorCore] featuredYesBtn을 찾을 수 없습니다");
      }

      if (noBtn) {
        noBtn.addEventListener("click", handleNoClick);
        console.log("[EditorCore] 아니오 버튼 이벤트 바인딩 완료");
      } else {
        console.error("[EditorCore] featuredNoBtn을 찾을 수 없습니다");
      }
    }, 0);

    // 오버레이 클릭 시 닫기 (선택 강제)
    modal.addEventListener("click", (e) => {
      if (e.target === modal) {
        // 오버레이 클릭은 무시 (반드시 선택해야 함)
      }
    });
  },

  async saveMoodboardData() {
    console.log("[DEBUG][SAVE PATH]", "saveMoodboardData");
    console.log("[DEBUG][SAVE SCOPE]", {
      thisKeys: Object.keys(this),
      windowKeys: Object.keys(window).filter(
        (k) =>
          k.toLowerCase().includes("editor") ||
          k.toLowerCase().includes("layer")
      ),
      editor: window.editor,
      editorLayers: window.editor?.layers,
      EditorCore: window.EditorCore,
      EditorCoreLayers: window.EditorCore?.LayerManager?.layers,
      thisLayers: this.layers,
      thisEditorLayers: this.editor?.layers,
      thisLayerManager: this.LayerManager,
      thisLayerManagerLayers: this.LayerManager?.layers,
    });

    // GUARD: ID Contract Enforcement
    if (
      this.state.currentMoodboardId &&
      !isValidUUID(this.state.currentMoodboardId)
    ) {
      console.error(
        "[GUARD] moodboardId must be UUID",
        this.state.currentMoodboardId
      );
      alert("무드보드 ID가 유효하지 않습니다.");
      return;
    }

    if (!this.state.currentMoodboardId) return;

    // Supabase 클라이언트 초기화 보장
    if (!this.state.supabaseClient) {
      this.state.supabaseClient = await window.getSupabase();
    }

    if (!this.state.supabaseClient) {
      console.error("[EditorCore] Supabase 클라이언트를 초기화할 수 없습니다");
      return;
    }

    // 무드보드 제목 업데이트
    const title = this.state.moodboardTitle || "새 무드보드";

    // 항상 Supabase에 저장 (세션 여부와 무관)
    // owner_id도 Firebase UID로 강제 업데이트 (혹시 모를 불일치 방지)
    let firebaseUid = this.state.currentUserId;

    // Firebase UID 재확보
    try {
      const { getAuth } = await import(
        "https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js"
      );
      const auth = getAuth();
      if (auth.currentUser) {
        firebaseUid = auth.currentUser.uid;
      }
    } catch (e) {
      console.warn("[EditorCore] Firebase UID 재확보 실패:", e);
    }

    // GUARD: Firebase UID Check
    if (!firebaseUid) {
      console.error(
        "[SAVE FAILED] User not authenticated (Firebase UID missing)"
      );
      alert("로그인이 필요합니다.");
      return;
    }

    // moodboards 업데이트
    const updateData = {
      title: title,
      owner_id: firebaseUid ? firebaseUid.trim() : firebaseUid, // Firebase UID 강제 업데이트 (trim 적용)
      updated_at: new Date().toISOString(),
    };

    // 템플릿 모드일 경우에만 메타 정보 명시적으로 저장
    if (
      this.state.editorMode === "template" &&
      this.state.currentTemplate?.id
    ) {
      updateData.is_public = this.state.is_public === true;
    }

    console.log("[DEBUG][VISIBILITY META]", {
      is_public: updateData.is_public,
      is_featured: updateData.is_featured,
    });

    await this.state.supabaseClient
      .from("moodboards")
      .update(updateData)
      .eq("id", this.state.currentMoodboardId);

    // 항상 Supabase에 저장 (세션 여부와 무관)
    // 기존 블록 삭제
    await this.state.supabaseClient
      .from("moodboard_blocks")
      .delete()
      .eq("moodboard_id", this.state.currentMoodboardId);

    // 실제 레이어 배열 찾기 (우선순위 순)
    const layers =
      window.editor?.layers ||
      this.LayerManager?.layers ||
      this.layers ||
      this.editor?.layers ||
      window.EditorCore?.LayerManager?.layers ||
      window.__editor?.layers ||
      [];

    console.log("[DEBUG][LAYERS SOURCE]", {
      layersLength: layers.length,
      layersSource: window.editor?.layers
        ? "window.editor.layers"
        : this.LayerManager?.layers
        ? "this.LayerManager.layers"
        : this.layers
        ? "this.layers"
        : this.editor?.layers
        ? "this.editor.layers"
        : window.EditorCore?.LayerManager?.layers
        ? "window.EditorCore.LayerManager.layers"
        : window.__editor?.layers
        ? "window.__editor.layers"
        : "none",
      layers: layers,
    });

    // blocksPayload 생성: 실제 레이어 배열 기반
    const blocksPayload = layers.map((layer, index) => {
      let blockType, cutId, title, content, emoji;

      if (layer.type === "image") {
        // cut_id 추출: layer.cutId ?? layer.meta?.cutId ?? layer.data?.cutId ?? null
        cutId = layer.cutId ?? layer.meta?.cutId ?? layer.data?.cutId ?? null;
        // cut_id가 존재하면 block_type = 'cut', 없으면 block_type = 'image'
        if (cutId) {
          blockType = "cut";
        } else {
          blockType = "image";
        }
        title = null;
        content = null;
        emoji = null;
      } else if (layer.type === "text") {
        blockType = "text";
        cutId = null;
        title = null;
        content = layer.content || null;
        emoji = null;
      } else if (layer.type === "sticker") {
        blockType = "quote";
        cutId = null;
        title = null;
        content = null;
        emoji = layer.stickerId || null;
      } else {
        // 기본값 (text)
        blockType = "text";
        cutId = null;
        title = null;
        content = null;
        emoji = null;
      }

      // STEP 2: layout 필드 추가 (기존 로직 유지, layout만 추가)
      const blockPayload = {
        moodboard_id: this.state.currentMoodboardId,
        owner_id: firebaseUid ? firebaseUid.trim() : firebaseUid,
        block_type: blockType,
        cut_id: cutId,
        title: title,
        content: content,
        emoji: emoji,
        span: 6, // 기존 필드 유지 (fallback용)
        order_index: index, // 기존 필드 유지 (fallback용)
      };

      // layout 생성 (에디터 모드에 따라)
      try {
        const editorLayout = createLayoutFromLayer(
          layer,
          this.state.editorMode || "free",
          this.state.currentTemplate?.id || null
        );
        // layout이 있으면 추가 (없어도 기존 저장은 성공해야 함)
        if (editorLayout) {
          blockPayload.layout = editorLayout;
        }
      } catch (error) {
        // layout 생성 실패해도 기존 저장은 성공해야 함
        console.warn("[EditorCore] layout 생성 실패 (기존 저장 계속):", error);
      }

      return blockPayload;
    });

    console.log(
      "[DEBUG][BLOCKS TO INSERT]",
      blocksPayload,
      "length:",
      blocksPayload.length
    );
    // [DEBUG][BLOCKS TO INSERT LAYOUT] 로그 추가
    console.group("[DEBUG][BLOCKS TO INSERT LAYOUT]");
    blocksPayload.forEach((block, idx) => {
      console.log({
        idx,
        id: block.id || `new-${idx}`,
        block_type: block.block_type,
        order_index: block.order_index,
        cut_id: block.cut_id,
        layout: block.layout ? JSON.parse(JSON.stringify(block.layout)) : null,
      });
    });
    console.groupEnd();
    console.log(
      "[DEBUG][CUT_ID CHECK]",
      blocksPayload
        .filter((b) => b.block_type === "cut")
        .map((b) => ({ order: b.order_index, cut_id: b.cut_id }))
    );

    // 새 블록 저장
    if (blocksPayload.length > 0) {
      const { error } = await this.state.supabaseClient
        .from("moodboard_blocks")
        .insert(blocksPayload);

      if (error) {
        console.error("[MOODBOARD BLOCKS INSERT ERROR]", error, blocksPayload);
        throw error;
      }
    }

    // =========================================================
    // THUMBNAIL GENERATION HOOK (STRICT)
    // =========================================================
    let thumbnailResult = null;
    if (this.ThumbnailManager && this.state.currentMoodboardId) {
      thumbnailResult = await this.ThumbnailManager.generateAndSaveThumbnails(
        this.state.currentMoodboardId,
        this.state.supabaseClient
      );
    }
    // =========================================================

    // user_feed_events에 무드보드 생성 이벤트 저장 (마이 탭 반영용)
    if (this.state.currentUserId && this.state.supabaseClient) {
      try {
        const moodboardData = {
          moodboard_id: this.state.currentMoodboardId,
          moodboard_data: {
            name: title,
            title: title,
            template: this.state.currentTemplate?.id || null,
            style: this.state.currentMood || "clean",
            blocks: blocksPayload,
            backgroundColor:
              this.CanvasManager.canvas?.style.background || "#fafafa",
            isPublic: false,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            thumbnail_url: thumbnailResult?.gridUrl || null,
          },
        };

        // 기존 이벤트 확인 (같은 무드보드 ID가 있는지)
        const { data: existingEvents } = await this.state.supabaseClient
          .from("user_feed_events")
          .select("id")
          .eq("user_id", this.state.currentUserId)
          .eq("event_type", "moodboard_created")
          .eq("metadata->>moodboard_id", this.state.currentMoodboardId);

        if (existingEvents && existingEvents.length > 0) {
          // 기존 이벤트 업데이트
          const { error } = await this.state.supabaseClient
            .from("user_feed_events")
            .update({
              metadata: moodboardData,
            })
            .eq("id", existingEvents[0].id);
        } else {
          // 새 이벤트 생성
          const { error } = await this.state.supabaseClient
            .from("user_feed_events")
            .insert({
              user_id: this.state.currentUserId,
              event_type: "moodboard_created",
              metadata: moodboardData,
            });
        }
      } catch (error) {
        console.warn("[EditorCore] user_feed_events 저장 중 오류:", error);
      }
    }

    // 저장 성공 시 isDirty를 false로 설정
    this.state.isDirty = false;

    return thumbnailResult;
  },

  async setAsFeatured() {
    if (!this.state.currentMoodboardId || !this.state.currentUserId) return;

    try {
      // Firebase UID 재확보
      let firebaseUid = this.state.currentUserId;
      try {
        const { getAuth } = await import(
          "https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js"
        );
        const auth = getAuth();
        if (auth.currentUser) {
          firebaseUid = auth.currentUser.uid;
        }
      } catch (e) {
        console.warn("[EditorCore] Firebase UID 재확보 실패:", e);
      }

      // Supabase: reader_profiles 테이블에 featured_moodboard_id 업데이트
      const { error } = await this.state.supabaseClient
        .from("reader_profiles")
        .update({ featured_moodboard_id: this.state.currentMoodboardId })
        .eq("reader_id", firebaseUid);

      if (error) {
        console.error("[EditorCore] 대표 무드보드 설정 오류:", error);
        console.error(
          "[EditorCore] 에러 상세:",
          JSON.stringify(error, null, 2)
        );
        throw error;
      }

      console.log("[EditorCore] 대표 무드보드 설정 성공:", {
        reader_id: firebaseUid,
        featured_moodboard_id: this.state.currentMoodboardId,
      });

      // user_feed_events의 metadata에도 featured 플래그 업데이트
      if (!this.state.isReaderMode && this.state.supabaseClient) {
        try {
          // 기존 이벤트 찾기
          const { data: existingEvents } = await this.state.supabaseClient
            .from("user_feed_events")
            .select("id, metadata")
            .eq("user_id", this.state.currentUserId)
            .eq("event_type", "moodboard_created")
            .eq("metadata->>moodboard_id", this.state.currentMoodboardId);

          if (existingEvents && existingEvents.length > 0) {
            // 기존 metadata에 featured 플래그 추가
            const existingMetadata = existingEvents[0].metadata || {};
            const updatedMetadata = {
              ...existingMetadata,
              moodboard_data: {
                ...existingMetadata.moodboard_data,
                featured: true,
              },
            };

            const { error: updateError } = await this.state.supabaseClient
              .from("user_feed_events")
              .update({
                metadata: updatedMetadata,
              })
              .eq("id", existingEvents[0].id);

            if (updateError) {
              console.warn(
                "[EditorCore] user_feed_events featured 플래그 업데이트 실패:",
                updateError
              );
              // 실패해도 대표 설정은 성공한 것으로 처리
            }
          }
        } catch (updateError) {
          console.warn(
            "[EditorCore] user_feed_events featured 플래그 업데이트 중 오류:",
            updateError
          );
          // 실패해도 대표 설정은 성공한 것으로 처리
        }
      }

      console.log(
        "[EditorCore] 대표 무드보드 설정 완료:",
        this.state.currentMoodboardId
      );
    } catch (error) {
      console.error("[EditorCore] setAsFeatured 오류:", error);
      throw error;
    }
  },

  // =========================
  // Thumbnail Manager (NEW)
  // =========================
  ThumbnailManager: {
    // 1. Capture Canvas
    async captureMoodboardCanvas() {
      if (typeof html2canvas === "undefined") {
        // Load html2canvas if missing
        await new Promise((resolve, reject) => {
          const script = document.createElement("script");
          script.src =
            "https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js";
          script.onload = resolve;
          script.onerror = reject;
          document.head.appendChild(script);
        });
      }

      let targetElement = document.getElementById("editorCanvas");
      if (!targetElement) throw new Error("Canvas root not found");

      // 대표 블록이 설정되어 있다면 해당 요소만 캡처
      const coverBlockId = EditorCore.state.coverBlockId;
      if (coverBlockId) {
        // 레이어 ID로 DOM 요소 찾기 (보통 data-layer-id 또는 id 속성 사용)
        // LayerManager가 렌더링할 때 id를 부여한다고 가정
        // 또는 editorCanvas의 자식 중 해당 ID를 가진 요소 탐색
        const layerElement =
          document.getElementById(coverBlockId) ||
          targetElement.querySelector(`[data-layer-id="${coverBlockId}"]`) ||
          targetElement.querySelector(`[id="${coverBlockId}"]`);

        if (layerElement) {
          console.log("[ThumbnailManager] Capture Cover Block:", coverBlockId);
          targetElement = layerElement;
        } else {
          console.warn(
            "[ThumbnailManager] Cover Block defined but element not found. Fallback to full canvas."
          );
        }
      }

      return await html2canvas(targetElement, {
        scale: 2, // High resolution capture
        useCORS: true,
        backgroundColor: null, // Transparent if logic allows, or white
        ignoreElements: (element) => {
          // Ignore UI elements that shouldn't be in thumbnail
          if (
            element.classList.contains("grid-line") ||
            element.classList.contains("snap-guide") ||
            element.classList.contains("selection-box") ||
            element.classList.contains("layer-delete-btn") ||
            element.classList.contains("resize-handle") ||
            element.classList.contains("cover-badge") ||
            element.dataset.ignoreThumbnail === "true"
          ) {
            return true;
          }
          return false;
        },
      });
    },

    // 2. Resize Canvas
    resizeCanvas(srcCanvas, targetWidth, targetHeight) {
      const destCanvas = document.createElement("canvas");
      destCanvas.width = targetWidth;
      destCanvas.height = targetHeight;
      const ctx = destCanvas.getContext("2d");

      // Fill white background
      ctx.fillStyle = "#FFFFFF";
      ctx.fillRect(0, 0, targetWidth, targetHeight);

      // Draw Image (Cover Fit)
      const srcRatio = srcCanvas.width / srcCanvas.height;
      const destRatio = targetWidth / targetHeight;

      let drawWidth, drawHeight, offsetX, offsetY;

      if (srcRatio > destRatio) {
        drawHeight = targetHeight;
        drawWidth = srcCanvas.width * (targetHeight / srcCanvas.height);
        offsetX = (targetWidth - drawWidth) / 2;
        offsetY = 0;
      } else {
        drawWidth = targetWidth;
        drawHeight = srcCanvas.height * (targetWidth / srcCanvas.width);
        offsetX = 0;
        offsetY = (targetHeight - drawHeight) / 2;
      }

      ctx.drawImage(
        srcCanvas,
        0,
        0,
        srcCanvas.width,
        srcCanvas.height,
        offsetX,
        offsetY,
        drawWidth,
        drawHeight
      );
      return destCanvas;
    },

    // 3. Canvas to Blob
    async canvasToBlob(canvas) {
      return new Promise((resolve) => {
        canvas.toBlob((blob) => resolve(blob), "image/jpeg", 0.9);
      });
    },

    // 4. Upload Thumbnail
    async uploadThumbnail(path, blob, supabase) {
      const { data, error } = await supabase.storage
        .from("moodboard_thumbnails")
        .upload(path, blob, {
          upsert: true,
          contentType: "image/jpeg",
        });

      if (error) throw error;

      // Get Public URL
      const {
        data: { publicUrl },
      } = supabase.storage.from("moodboard_thumbnails").getPublicUrl(path);

      return publicUrl;
    },

    // 5. Generate and Save Flow
    async generateAndSaveThumbnails(moodboardId, supabase) {
      console.log("[ThumbnailManager] Start generation for:", moodboardId);

      try {
        // Step A: Capture
        const originalCanvas = await this.captureMoodboardCanvas();

        // Step B: Process Grid Thumbnail (3:4 -> 900x1200)
        const gridCanvas = this.resizeCanvas(originalCanvas, 900, 1200);
        const gridBlob = await this.canvasToBlob(gridCanvas);

        // Step C: Process Featured Thumbnail (4:5 -> 1000x1250)
        const featuredCanvas = this.resizeCanvas(originalCanvas, 1000, 1250);
        const featuredBlob = await this.canvasToBlob(featuredCanvas);

        // Step D: Upload
        // Using timestamp to bust cache if needed, but strict path requested: {id}/grid.jpg
        const gridPath = `${moodboardId}/grid.jpg`;
        const featuredPath = `${moodboardId}/featured.jpg`;

        const [gridUrl, featuredUrl] = await Promise.all([
          this.uploadThumbnail(gridPath, gridBlob, supabase),
          this.uploadThumbnail(featuredPath, featuredBlob, supabase),
        ]);

        console.log("[ThumbnailManager] Uploaded:", { gridUrl, featuredUrl });

        // Step E: Update DB
        // Add timestamp to query param to force UI refresh
        const t = new Date().getTime();
        const finalGridUrl = `${gridUrl}?t=${t}`;
        const finalFeaturedUrl = `${featuredUrl}?t=${t}`;

        const { error } = await supabase
          .from("moodboards")
          .update({
            thumbnail_url: finalGridUrl,
            featured_thumbnail_url: finalFeaturedUrl,
          })
          .eq("id", moodboardId);

        if (error) throw error;

        console.log("[ThumbnailManager] Database updated.");
        return { gridUrl: finalGridUrl, featuredUrl: finalFeaturedUrl };
      } catch (e) {
        console.error("[ThumbnailManager] Failed:", e);
        // Fail silently - do not block save flow
      }
    },
  },

  // 무드보드 데이터 로드 (편집 모드용)
  async loadMoodboardBlocks(moodboardId) {
    try {
      console.log(
        "[EditorCore] loadMoodboardBlocks 시작, moodboardId:",
        moodboardId
      );

      // Supabase 클라이언트 확인
      if (!this.state.supabaseClient) {
        this.state.supabaseClient = await window.getSupabase();
      }

      if (!this.state.supabaseClient) {
        console.error(
          "[EditorCore] Supabase 클라이언트를 초기화할 수 없습니다"
        );
        return;
      }

      // 1. 무드보드 정보 가져오기 (mode, template_id, is_public, cover_block_id 포함)
      const { data: moodboardData, error: moodboardError } =
        await this.state.supabaseClient
          .from("moodboards")
          .select(
            "id, title, description, is_public, cover_block_id, layout_type, template_id"
          )
          .eq("id", moodboardId)
          .single();

      if (moodboardError) {
        console.error("[EditorCore] 무드보드 조회 오류:", moodboardError);
        throw moodboardError;
      }

      if (moodboardData) {
        // 제목 설정
        this.state.moodboardTitle = moodboardData.title || "새 무드보드";
        console.log(
          "[EditorCore] 무드보드 제목 로드:",
          this.state.moodboardTitle
        );

        // is_public을 state에 저장
        this.state.is_public = moodboardData.is_public ?? false;
        // cover_block_id를 state에 저장
        this.state.cover_block_id = moodboardData.cover_block_id ?? null;

        // MODE INITIALIZATION (CRITICAL)
        const layoutType = moodboardData.layout_type || "free";
        this.state.editorMode = layoutType;
        console.log(`[EDITOR LOAD] mode: ${layoutType}`);

        if (layoutType === "template") {
          const templateId = moodboardData.template_id;
          if (templateId && window.getTemplate) {
            const template = window.getTemplate(templateId);
            if (template) {
              this.state.currentTemplate = template;
              console.log(`[EDITOR TEMPLATE] template_id: ${templateId}`);
            } else {
              console.warn(
                `[EDITOR FALLBACK] reason: missing template definition for ${templateId}`
              );
              this.state.editorMode = "free"; // Fallback
            }
          } else {
            console.warn(
              `[EDITOR FALLBACK] reason: missing template_id in data`
            );
            this.state.editorMode = "free"; // Fallback
          }
        }
      }

      // 2. 무드보드 블록 가져오기
      // Firebase UID 확인 및 supabaseClient 업데이트
      const currentUid = this.state.currentUserId || window.currentUserId;
      if (currentUid) {
        // Just rely on global client
        if (!this.state.supabaseClient) {
          this.state.supabaseClient = await window.getSupabase();
        }
        console.log("[SUPABASE HDR UID] 복원 시점:", currentUid);
      } else {
        console.warn("[EditorCore] Firebase UID가 없어 기본 클라이언트 사용");
        if (!this.state.supabaseClient) {
          this.state.supabaseClient = await window.getSupabase();
        }
      }

      console.log(
        "[EditorCore] moodboard_blocks 조회 시작, moodboardId:",
        moodboardId
      );
      const { data: blocksData, error: blocksError } =
        await this.state.supabaseClient
          .from("moodboard_blocks")
          .select("*")
          .eq("moodboard_id", moodboardId)
          .order("order_index", { ascending: true });

      if (blocksError) {
        console.error("[EditorCore] 블록 조회 오류:", blocksError);
        throw blocksError;
      }

      // [DEBUG][DB BLOCKS RAW] 로그 추가
      if (blocksData && blocksData.length > 0) {
        console.group("[DEBUG][DB BLOCKS RAW]");
        blocksData.forEach((block, idx) => {
          console.log({
            idx,
            id: block.id,
            block_type: block.block_type,
            order_index: block.order_index,
            cut_id: block.cut_id,
            span: block.span,
            layout: block.layout
              ? JSON.parse(JSON.stringify(block.layout))
              : null,
            owner_id: block.owner_id,
            moodboard_id: block.moodboard_id,
          });
        });
        console.groupEnd();
      }

      // 블록이 없을 때만 로그 출력하고 빈 상태로 시작
      if (!blocksData || blocksData.length === 0) {
        console.log("[EditorCore] no blocks found, start empty");
        // 빈 레이어 배열로 초기화 (빈 캔버스)
        this.LayerManager.layers = [];
        EditorCore.state.layers = [];
        return;
      }

      // 2-1. cut_id로 image_url 복구: cuts 테이블에서 조회
      const cutIds = blocksData
        .filter((b) => b.block_type === "cut" && b.cut_id)
        .map((b) => b.cut_id);

      console.log("[DEBUG][RESTORE CUT IDS]", cutIds);

      let cutMap = {};
      if (cutIds.length > 0) {
        const { data: cutsData, error: cutsError } =
          await this.state.supabaseClient
            .from("cuts")
            .select("id, image_url")
            .in("id", cutIds);

        if (cutsError) {
          console.error("[EditorCore] cuts 조회 오류:", cutsError);
        } else if (cutsData) {
          cutMap = cutsData.reduce((acc, cut) => {
            acc[cut.id] = cut.image_url;
            return acc;
          }, {});
        }
      }
      console.log("[DEBUG][CUT MAP]", cutMap);

      // 3. 블록을 레이어로 변환하여 LayerManager에 직접 할당
      // STEP 3: layout 분기 처리 (NEW 방식 vs LEGACY 방식)
      const restoredLayers = [];
      // 원본 block 정보를 레이어와 매핑하기 위한 배열 (디버그용)
      const blockToLayerMap = [];

      // Template mapping helper:
      const getSlotIdByIndex = (idx) => {
        if (
          this.state.editorMode === "template" &&
          this.state.currentTemplate
        ) {
          const slots = this.state.currentTemplate.slots || [];
          if (slots[idx]) return slots[idx].id;
        }
        return null;
      };

      blocksData.forEach((block) => {
        const meta = block.meta || {};
        let layer = null;

        // Derive slotId if missing (for Template Mode restoration)
        const derivedSlotId = getSlotIdByIndex(block.order_index);

        // STEP 3: layout이 있으면 NEW 방식, 없으면 LEGACY 방식
        if (block.layout) {
          // NEW 방식: layout 기반 복원
          const layout = block.layout;

          if (block.block_type === "cut" || block.block_type === "image") {
            // cut_id가 null인 경우 placeholder 블록 생성
            const slotId = layout.slotId || meta.slotId || derivedSlotId;

            if (!block.cut_id) {
              layer = {
                id: block.id,
                type: block.block_type === "cut" ? "image" : "image",
                slotId: slotId,
                imageUrl: null,
                fitMode: meta.fitMode || "fill",
                offsetX: layout.offset?.x || meta.slotOffsetX || 0,
                offsetY: layout.offset?.y || meta.slotOffsetY || 0,
                scale: layout.transform?.scale || meta.slotScale || 1.0,
                x: layout.position?.x ?? meta.x ?? 50,
                y: layout.position?.y ?? meta.y ?? 50,
                width: layout.position?.w ?? meta.width ?? 80,
                height: layout.position?.h ?? meta.height ?? 80,
                cutId: null,
              };
            } else {
              const restoredImageUrl =
                cutMap[block.cut_id] || meta.imageUrl || null;
              layer = {
                id: block.id,
                type: block.block_type === "cut" ? "image" : "image",
                slotId: slotId,
                imageUrl: restoredImageUrl,
                fitMode: meta.fitMode || "fill",
                offsetX: layout.offset?.x || meta.slotOffsetX || 0,
                offsetY: layout.offset?.y || meta.slotOffsetY || 0,
                scale: layout.transform?.scale || meta.slotScale || 1.0,
                x: layout.position?.x ?? meta.x ?? 50,
                y: layout.position?.y ?? meta.y ?? 50,
                width: layout.position?.w ?? meta.width ?? 80,
                height: layout.position?.h ?? meta.height ?? 80,
                cutId: block.cut_id || null,
              };
            }
          } else if (block.block_type === "text") {
            layer = {
              id: block.id,
              type: "text",
              content: block.content || block.title || meta.content || "텍스트",
              x: layout.position?.x ?? meta.x ?? 50,
              y: layout.position?.y ?? meta.y ?? 50,
              fontSize: meta.fontSize || 16,
              color: meta.color || "#333",
              effects: meta.effects || {},
            };
          } else if (block.block_type === "quote") {
            layer = {
              id: block.id,
              type: "sticker",
              stickerId: block.emoji || meta.stickerId || "😀",
              x: layout.position?.x ?? meta.x ?? 50,
              y: layout.position?.y ?? meta.y ?? 50,
              scale: layout.transform?.scale ?? meta.scale ?? 1.0,
              effects: meta.effects || {},
            };
          }
        } else {
          // LEGACY 방식: 기존 meta 기반 복원 (기존 로직 유지)
          if (block.block_type === "cut" || block.block_type === "image") {
            const slotId = meta.slotId || derivedSlotId;
            // cut_id가 null인 경우 placeholder 블록 생성 (정상 상태)
            if (!block.cut_id) {
              layer = {
                id: block.id,
                type: block.block_type === "cut" ? "image" : "image",
                slotId: slotId,
                imageUrl: null,
                fitMode: meta.fitMode || "fill",
                offsetX: meta.slotOffsetX || 0,
                offsetY: meta.slotOffsetY || 0,
                scale: meta.slotScale || 1.0,
                // 자유형 모드용 속성
                x: meta.x || 50,
                y: meta.y || 50,
                width: meta.width || 80,
                height: meta.height || 80,
                cutId: null,
              };
            } else {
              const restoredImageUrl =
                cutMap[block.cut_id] || meta.imageUrl || null;
              layer = {
                id: block.id,
                type: block.block_type === "cut" ? "image" : "image",
                slotId: slotId,
                imageUrl: restoredImageUrl,
                fitMode: meta.fitMode || "fill",
                offsetX: meta.slotOffsetX || 0,
                offsetY: meta.slotOffsetY || 0,
                scale: meta.slotScale || 1.0,
                x: meta.x || 50,
                y: meta.y || 50,
                width: meta.width || 80,
                height: meta.height || 80,
                cutId: block.cut_id || null,
              };
            }
          } else if (block.block_type === "text") {
            // 텍스트 레이어
            layer = {
              id: block.id,
              type: "text",
              content: block.content || block.title || meta.content || "텍스트",
              x: meta.x || 50,
              y: meta.y || 50,
              fontSize: meta.fontSize || 16,
              color: meta.color || "#333",
              effects: meta.effects || {},
            };
          } else if (block.block_type === "quote") {
            // 스티커 레이어
            layer = {
              id: block.id,
              type: "sticker",
              stickerId: block.emoji || meta.stickerId || "😀",
              x: meta.x || 50,
              y: meta.y || 50,
              scale: meta.scale || 1.0,
              effects: meta.effects || {},
            };
          }
        }

        if (layer) {
          restoredLayers.push(layer);
          // 디버그용: 원본 block 정보 저장
          blockToLayerMap.push({ block, layer });
        }
      });

      // 4. LayerManager.layers에 직접 할당
      this.LayerManager.layers = restoredLayers;
      EditorCore.state.layers = restoredLayers;

      console.log("[EditorCore] blocks restored:", restoredLayers.length);

      // [DEBUG][EDITOR BLOCKS AFTER RESTORE] 로그 추가
      console.group("[DEBUG][EDITOR BLOCKS AFTER RESTORE]");
      blockToLayerMap.forEach((item, idx) => {
        const block = item.block;
        const layer = item.layer;
        console.log({
          idx,
          id: layer.id,
          type: layer.type, // block.block_type과 비교용
          order_index: block.order_index, // 원본 block의 order_index 사용
          cutId: layer.cutId, // block.cut_id와 비교용
          span: block.span, // 원본 block의 span 사용
          layout: block.layout
            ? JSON.parse(JSON.stringify(block.layout))
            : null, // 원본 block의 layout 사용 (layer에는 없음)
        });
      });
      console.groupEnd();

      // 5. 히스토리 초기화 (undo 스택 초기화)
      if (this.LayerManager.history) {
        this.LayerManager.history.past = [];
        this.LayerManager.history.present = JSON.parse(
          JSON.stringify(restoredLayers)
        );
        this.LayerManager.history.future = [];
      }

      // 6. 레이어 렌더링은 showEditor()에서 CanvasManager.init()이 호출되면서
      // 자동으로 LayerManager.render()가 호출됨
    } catch (error) {
      console.error("[EditorCore] loadMoodboardBlocks 오류:", error);
      throw error;
    }
  },

  async createMoodboard() {
    console.log("[DEBUG][SAVE PATH]", "createMoodboard");
    // Firebase UID 확보 (필수)
    let firebaseUid = null;

    // 1. Firebase Auth에서 직접 가져오기 시도
    try {
      const { getAuth, onAuthStateChanged } = await import(
        "https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js"
      );
      const auth = getAuth();

      if (auth.currentUser) {
        firebaseUid = auth.currentUser.uid;
      } else {
        // onAuthStateChanged로 대기 (최대 3초)
        const user = await new Promise((resolve, reject) => {
          let unsubscribe = null;
          const timeout = setTimeout(() => {
            if (unsubscribe) unsubscribe();
            reject(new Error("Firebase Auth 대기 시간 초과"));
          }, 3000);

          unsubscribe = onAuthStateChanged(auth, (user) => {
            clearTimeout(timeout);
            if (unsubscribe) unsubscribe();
            if (user) {
              resolve(user);
            } else {
              reject(null);
            }
          });
        });
        if (user) {
          firebaseUid = user.uid;
        }
      }
    } catch (firebaseError) {
      console.warn("[EditorCore] Firebase Auth 확인 실패:", firebaseError);
    }

    // 2. 전역 변수 확인
    if (!firebaseUid && window.currentUserId) {
      firebaseUid = window.currentUserId;
    }

    // 3. getCurrentUser로 재시도
    if (!firebaseUid) {
      const user = await this.getCurrentUser();
      if (user) {
        // user가 Firebase user 객체인지 확인
        if (user.uid) {
          firebaseUid = user.uid;
        } else if (typeof user === "object" && user.id) {
          // Supabase user인 경우 Firebase UID를 다시 시도
          console.warn("[EditorCore] Supabase user 감지, Firebase UID 재시도");
        }
      }
    }

    if (!firebaseUid) {
      alert("로그인이 필요합니다.");
      return;
    }

    // Firebase UID로 owner_id 강제 설정 (trim 적용)
    const ownerId = firebaseUid.trim();
    console.log("[MOODBOARD SAVE] Firebase UID 확보:", {
      owner_id: ownerId,
      uid: firebaseUid,
    });

    // Supabase 클라이언트 초기화 보장
    if (!this.state.supabaseClient) {
      this.state.supabaseClient = await window.getSupabase();
    }

    if (!this.state.supabaseClient) {
      console.error(
        "[MOODBOARD SAVE] Supabase 클라이언트를 초기화할 수 없습니다"
      );
      throw new Error("무드보드 저장에 실패했습니다.");
    }

    // 항상 Supabase에 저장 (세션 여부와 무관)
    const moodboardPayload = {
      owner_id: ownerId, // Firebase UID 강제 사용 (trim 적용)
      title: this.state.moodboardTitle || "새 무드보드",
      description: this.state.moodboardDescription || null,
      is_public: false,
    };

    // 템플릿 모드일 경우에만 메타 정보 명시적으로 저장
    if (this.state.editorMode === "template") {
      moodboardPayload.is_public = this.state.is_public === true;
    }

    const { data, error } = await this.state.supabaseClient
      .from("moodboards")
      .insert([moodboardPayload])
      .select()
      .single();

    if (error) {
      console.error("[MOODBOARD SAVE] 저장 오류:", error);
      console.error(
        "[MOODBOARD SAVE] 에러 상세:",
        JSON.stringify(error, null, 2)
      );
      throw error;
    }

    if (!data || !data.id) {
      console.error("[MOODBOARD SAVE] INSERT 실패: data가 없습니다");
      throw new Error("무드보드 저장에 실패했습니다.");
    }

    console.log("[MOODBOARD SAVE] 저장 성공:", data.id);
    this.state.currentMoodboardId = data.id;

    // 저장 성공 후 localStorage에 마지막 생성된 무드보드 ID 저장
    localStorage.setItem("LAST_CREATED_MOODBOARD_ID", data.id);
    console.log("[MOODBOARD SAVE] localStorage에 저장:", data.id);
  },

  async saveMoodboard() {
    console.log("[DEBUG][SAVE PATH]", "saveMoodboard");

    // GUARD: ID Contract Enforcement
    if (
      this.state.currentMoodboardId &&
      !isValidUUID(this.state.currentMoodboardId)
    ) {
      console.error(
        "[GUARD] moodboardId must be UUID",
        this.state.currentMoodboardId
      );
      alert("무드보드 ID가 유효하지 않습니다.");
      return;
    }

    if (!this.state.currentMoodboardId) return;

    // Firebase UID 확인 및 supabaseClient 업데이트
    const currentUid = this.state.currentUserId || window.currentUserId;
    if (currentUid) {
      if (!this.state.supabaseClient) {
        this.state.supabaseClient = await window.getSupabase();
      }
      console.log("[SUPABASE HDR UID] 저장 시점:", currentUid);
    } else {
      console.warn("[EditorCore] Firebase UID가 없어 기본 클라이언트 사용");
      if (!this.state.supabaseClient) {
        this.state.supabaseClient = await window.getSupabase();
      }
    }

    if (!this.state.supabaseClient) {
      console.error("[EditorCore] Supabase 클라이언트를 초기화할 수 없습니다");
      return;
    }

    // 레이어 데이터를 블록 형식으로 변환하여 저장
    const blocks = this.LayerManager.getBlocksForSave();

    console.log(
      "[EditorCore] moodboard_blocks 저장 시작, moodboardId:",
      this.state.currentMoodboardId,
      "blocks:",
      blocks.length
    );

    // 항상 Supabase에 저장 (세션 여부와 무관)
    // 기존 블록 삭제
    const { error: deleteError } = await this.state.supabaseClient
      .from("moodboard_blocks")
      .delete()
      .eq("moodboard_id", this.state.currentMoodboardId);

    if (deleteError) {
      console.error("[EditorCore] moodboard_blocks 삭제 오류:", deleteError);
      throw deleteError;
    }

    // 새 블록 저장
    if (blocks.length > 0) {
      const { error: insertError } = await this.state.supabaseClient
        .from("moodboard_blocks")
        .insert(blocks);
      if (insertError) {
        console.error("[EditorCore] moodboard_blocks 저장 오류:", insertError);
        throw insertError;
      }
      console.log(
        "[EditorCore] moodboard_blocks 저장 완료:",
        blocks.length,
        "개 블록"
      );
    } else {
      console.log("[EditorCore] 저장할 블록이 없음");
    }
  },

  // =========================
  // 툴 패널 열기
  // =========================
  openToolPanel(tool) {
    this.BottomSheetManager.open(tool);
  },

  closeImageSelectionModal() {
    const modal = document.getElementById("imageSelectionModal");
    if (modal) {
      modal.style.display = "none";
      modal.style.pointerEvents = "none";
      modal.style.visibility = "hidden";
      modal.style.opacity = "0";
    }
  },
};

// =========================
// CanvasManager - 캔버스 관리
// =========================
EditorCore.CanvasManager = {
  canvas: null,
  canvasWrapper: null,

  init() {
    this.canvas = document.getElementById("editorCanvas");
    this.canvasWrapper = document.getElementById("editorCanvasWrapper");

    if (!this.canvas) return;

    // 템플릿 모드인 경우 슬롯 렌더링
    if (
      EditorCore.state.editorMode === "template" &&
      EditorCore.state.currentTemplate
    ) {
      this.renderTemplateSlots();
    } else if (EditorCore.state.editorMode === "free") {
      // 자유형 모드: 빈 캔버스
      this.canvas.innerHTML = "";
      this.canvas.style.background = "#fafafa";
    }

    // 무드 적용
    this.applyMood(EditorCore.state.currentMood);

    // 레이어 렌더링
    EditorCore.LayerManager.render();
  },

  renderTemplateSlots() {
    if (!this.canvas || !EditorCore.state.currentTemplate) return;

    const template = EditorCore.state.currentTemplate;
    this.canvas.innerHTML = "";
    this.canvas.style.background = template.defaultBackground || "#fafafa";

    template.slots.forEach((slot) => {
      const slotEl = document.createElement("div");
      slotEl.className = "template-slot";
      slotEl.dataset.slotId = slot.id;
      slotEl.style.left = `${slot.x}%`;
      slotEl.style.top = `${slot.y}%`;
      slotEl.style.width = `${slot.w}%`;
      slotEl.style.height = `${slot.h}%`;

      // 슬롯 클릭 이벤트
      slotEl.addEventListener("click", (e) => {
        // 컨트롤 버튼 클릭은 무시
        if (e.target.closest(".slot-controls")) return;
        if (e.target.closest(".slot-add-btn")) {
          // + 버튼 클릭 시 즉시 Cut Picker 열기
          EditorCore.state.selectedSlotId = slot.id;
          EditorCore.TemplateManager.selectSlot(slot.id);
          EditorCore.state.mode = "pickingCut";
          EditorCore.BottomSheetManager.openCutPicker(slot.id);
          return;
        }

        EditorCore.state.selectedSlotId = slot.id;
        EditorCore.TemplateManager.selectSlot(slot.id);

        // 이미지가 있으면 조정 패널, 없으면 Cut Picker 열기
        const layer = EditorCore.LayerManager.layers.find(
          (l) => l.slotId === slot.id
        );
        if (layer) {
          // placeholder cut (cutId === null)인 경우 Cut Picker 열기
          if (
            layer.type === "image" &&
            (layer.cutId === null || layer.cutId === undefined)
          ) {
            console.log(
              "[PLACEHOLDER CUT CLICK]",
              layer.id,
              "open cut selector"
            );
            EditorCore.state.selectedSlotId = slot.id;
            EditorCore.state.mode = "pickingCut";
            EditorCore.BottomSheetManager.openCutPicker(slot.id);
          } else {
            EditorCore.state.selectedLayerId = layer.id;
            EditorCore.openToolPanel("adjust");
          }
        } else {
          // 빈 슬롯 클릭 시 Cut Picker 열기
          EditorCore.state.mode = "pickingCut";
          EditorCore.BottomSheetManager.openCutPicker(slot.id);
        }
      });

      // 플레이스홀더: + 버튼만 표시 (카메라 아이콘 제거)
      const placeholder = document.createElement("div");
      placeholder.className = "template-slot-placeholder";
      const addBtn = document.createElement("button");
      addBtn.className = "slot-add-btn";
      addBtn.innerHTML = "+";
      addBtn.style.cssText = `
        width: 48px;
        height: 48px;
        border-radius: 50%;
        border: 2px solid #ddd;
        background: white;
        color: #999;
        font-size: 24px;
        font-weight: 300;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        transition: all 0.2s;
      `;
      addBtn.addEventListener("mouseenter", () => {
        addBtn.style.borderColor = "#ff5e00";
        addBtn.style.color = "#ff5e00";
      });
      addBtn.addEventListener("mouseleave", () => {
        addBtn.style.borderColor = "#ddd";
        addBtn.style.color = "#999";
      });
      placeholder.appendChild(addBtn);
      slotEl.appendChild(placeholder);

      // 컨트롤 버튼 (선택 시 표시)
      const controls = document.createElement("div");
      controls.className = "slot-controls";

      const deleteBtn = document.createElement("button");
      deleteBtn.className = "slot-control-btn";
      deleteBtn.innerHTML = "×";
      deleteBtn.title = "삭제";
      deleteBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        const layer = EditorCore.LayerManager.layers.find(
          (l) => l.slotId === slot.id
        );
        if (layer) {
          EditorCore.LayerManager.deleteLayer(layer.id);
          slotEl.classList.remove("has-content");
          slotEl.querySelector(".slot-image")?.remove();
          // + 버튼 다시 표시
          const placeholder = document.createElement("div");
          placeholder.className = "template-slot-placeholder";
          const addBtn = document.createElement("button");
          addBtn.className = "slot-add-btn";
          addBtn.innerHTML = "+";
          addBtn.style.cssText = `
            width: 48px;
            height: 48px;
            border-radius: 50%;
            border: 2px solid #ddd;
            background: white;
            color: #999;
            font-size: 24px;
            font-weight: 300;
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            transition: all 0.2s;
          `;
          addBtn.addEventListener("click", (e) => {
            e.stopPropagation();
            EditorCore.state.selectedSlotId = slot.id;
            EditorCore.TemplateManager.selectSlot(slot.id);
            EditorCore.state.mode = "pickingCut";
            EditorCore.BottomSheetManager.openCutPicker(slot.id);
          });
          placeholder.appendChild(addBtn);
          slotEl.appendChild(placeholder);
        }
      });

      controls.appendChild(deleteBtn);
      slotEl.appendChild(controls);

      this.canvas.appendChild(slotEl);
    });

    // 레이어 렌더링
    EditorCore.LayerManager.render();
  },

  applyMood(moodName) {
    if (!this.canvas) return;

    const mood = MOOD_PRESETS[moodName] || MOOD_PRESETS.clean;

    // 그림자 적용
    this.canvas.style.boxShadow = mood.shadow;

    // 반경 적용
    this.canvas.style.borderRadius = `${mood.radius}px`;

    // 배경 톤 적용
    if (!EditorCore.state.currentTemplate?.defaultBackground) {
      this.canvas.style.background = mood.backgroundTone;
    }

    // 텍스처 오버레이 (선택적)
    if (mood.textureOpacity > 0) {
      this.canvas.style.backgroundImage = `
        repeating-linear-gradient(
          0deg,
          rgba(0, 0, 0, ${mood.textureOpacity}) 0px,
          transparent 1px,
          transparent 2px,
          rgba(0, 0, 0, ${mood.textureOpacity}) 3px
        )
      `;
    }
  },
};

// =========================
// TemplateManager - 템플릿 관리
// =========================
EditorCore.TemplateManager = {
  renderTemplateList() {
    const grid = document.getElementById("templateGrid");
    if (!grid) return;

    const templates = getTemplateList();
    grid.innerHTML = templates
      .map(
        (template) => `
      <div class="template-card" onclick="EditorCore.selectTemplate('${template.id}')">
        <div class="template-card-name">${template.name}</div>
        <div class="template-card-desc">${template.description}</div>
      </div>
    `
      )
      .join("");
  },

  selectSlot(slotId) {
    // 모든 슬롯 선택 해제
    document.querySelectorAll(".template-slot").forEach((slot) => {
      slot.classList.remove("selected");
    });

    // 선택된 슬롯 표시
    const slotEl = document.querySelector(`[data-slot-id="${slotId}"]`);
    if (slotEl) {
      slotEl.classList.add("selected");
    }
  },

  addImageToSlot(slotId, imageUrlOrPayload, cutId = null) {
    // 유연한 인자 처리: 2번째 인자가 문자열이면 imageUrl, 객체면 {cutId, imageUrl}
    let imageUrl, finalCutId;
    if (typeof imageUrlOrPayload === "string") {
      imageUrl = imageUrlOrPayload;
      finalCutId = cutId;
    } else if (imageUrlOrPayload && typeof imageUrlOrPayload === "object") {
      imageUrl = imageUrlOrPayload.imageUrl;
      finalCutId = imageUrlOrPayload.cutId || null;
    } else {
      console.error("[TemplateManager] addImageToSlot: invalid arguments");
      return;
    }

    const slotEl = document.querySelector(`[data-slot-id="${slotId}"]`);
    if (!slotEl) return;

    // 플레이스홀더 제거
    const placeholder = slotEl.querySelector(".template-slot-placeholder");
    if (placeholder) placeholder.remove();

    // 기존 이미지 제거
    const existingImg = slotEl.querySelector(".slot-image");
    if (existingImg) existingImg.remove();

    // 이미지 추가
    const img = document.createElement("img");
    img.src = imageUrl;
    img.className = "slot-image fill";
    img.draggable = false;

    // 드래그 이벤트 (이미지 위치 조정)
    this.setupImageDrag(img, slotEl, slotId);

    slotEl.appendChild(img);
    slotEl.classList.add("has-content");

    // 레이어 추가 또는 업데이트
    const existingLayer = EditorCore.LayerManager.layers.find(
      (l) => l.slotId === slotId
    );
    if (existingLayer) {
      EditorCore.LayerManager.updateLayer(existingLayer.id, {
        imageUrl,
        cutId: finalCutId,
        fitMode: "fill",
      });
    } else {
      EditorCore.LayerManager.addImageLayer({
        slotId,
        imageUrl,
        cutId: finalCutId,
        fitMode: "fill",
      });
    }

    EditorCore.LayerManager.render();
  },

  setupImageDrag(img, slotEl, slotId) {
    let isDragging = false;
    let startX = 0;
    let startY = 0;
    let startOffsetX = 0;
    let startOffsetY = 0;
    let initialDistance = 0;
    let initialScale = 1;
    let isPinching = false;

    const getLayer = () =>
      EditorCore.LayerManager.layers.find((l) => l.slotId === slotId);

    // 단일 터치: 드래그
    img.addEventListener("touchstart", (e) => {
      if (e.touches.length === 1) {
        const layer = getLayer();
        if (!layer || EditorCore.state.selectedSlotId !== slotId) return;

        isDragging = true;
        isPinching = false;
        const touch = e.touches[0];
        startX = touch.clientX;
        startY = touch.clientY;
        startOffsetX = layer.offsetX || 0;
        startOffsetY = layer.offsetY || 0;
        e.preventDefault();
      } else if (e.touches.length === 2) {
        // 핀치 시작
        isPinching = true;
        isDragging = false;
        const touch1 = e.touches[0];
        const touch2 = e.touches[1];
        initialDistance = Math.hypot(
          touch2.clientX - touch1.clientX,
          touch2.clientY - touch1.clientY
        );
        const layer = getLayer();
        initialScale = layer?.scale || 1;
        e.preventDefault();
      }
    });

    img.addEventListener("touchmove", (e) => {
      const layer = getLayer();
      if (!layer) return;

      if (e.touches.length === 1 && isDragging && !isPinching) {
        const touch = e.touches[0];
        const deltaX = touch.clientX - startX;
        const deltaY = touch.clientY - startY;

        const canvasRect =
          EditorCore.CanvasManager.canvas.getBoundingClientRect();

        // 픽셀을 캔버스 기준 퍼센트로 변환
        const deltaXPercent = (deltaX / canvasRect.width) * 100;
        const deltaYPercent = (deltaY / canvasRect.height) * 100;

        const newOffsetX = startOffsetX + deltaXPercent;
        const newOffsetY = startOffsetY + deltaYPercent;

        EditorCore.LayerManager.updateLayer(layer.id, {
          offsetX: newOffsetX,
          offsetY: newOffsetY,
        });

        e.preventDefault();
      } else if (e.touches.length === 2 && isPinching) {
        const touch1 = e.touches[0];
        const touch2 = e.touches[1];
        const currentDistance = Math.hypot(
          touch2.clientX - touch1.clientX,
          touch2.clientY - touch1.clientY
        );

        const scale = initialScale * (currentDistance / initialDistance);
        const clampedScale = Math.max(0.5, Math.min(3, scale));

        EditorCore.LayerManager.updateLayer(layer.id, {
          scale: clampedScale,
        });

        e.preventDefault();
      }
    });

    img.addEventListener("touchend", () => {
      isDragging = false;
      isPinching = false;
    });
  },
};

// =========================
// LayerManager - 레이어 관리
// =========================
EditorCore.LayerManager = {
  layers: [],
  history: {
    past: [],
    present: null,
    future: [],
  },

  addImageLayer(data) {
    const layer = {
      id: `layer-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type: "image",
      slotId: data.slotId || null,
      imageUrl: data.imageUrl,
      cutId: data.cutId || null,
      fitMode: data.fitMode || "fill",
      offsetX: data.offsetX || 0,
      offsetY: data.offsetY || 0,
      scale: data.scale || 1.0,
      // 자유형 모드용 속성
      x: data.x || 50,
      y: data.y || 50,
      width: data.width || 80,
      height: data.height || 80,
    };

    this.saveHistory();
    this.layers.push(layer);
    EditorCore.state.layers = this.layers;
    EditorCore.state.isDirty = true; // 편집 변경 플래그 설정
    this.render();
    return layer;
  },

  addTextLayer(data) {
    const layer = {
      id: `layer-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type: "text",
      content: data.content || "텍스트",
      x: data.x || 50,
      y: data.y || 50,
      fontSize: data.fontSize || 16,
      color: data.color || "#333",
      effects: {},
    };

    this.saveHistory();
    this.layers.push(layer);
    EditorCore.state.layers = this.layers;
    EditorCore.state.isDirty = true; // 편집 변경 플래그 설정
    this.render();
    return layer;
  },

  addStickerLayer(data) {
    const layer = {
      id: `layer-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type: "sticker",
      stickerId: data.stickerId,
      x: data.x || 50,
      y: data.y || 50,
      scale: data.scale || 1.0,
      effects: {},
    };

    this.saveHistory();
    this.layers.push(layer);
    EditorCore.state.layers = this.layers;
    EditorCore.state.isDirty = true; // 편집 변경 플래그 설정
    this.render();
    return layer;
  },

  deleteLayer(layerId) {
    this.saveHistory();
    this.layers = this.layers.filter((l) => l.id !== layerId);
    EditorCore.state.layers = this.layers;
    EditorCore.state.isDirty = true; // 편집 변경 플래그 설정
    const element = document.querySelector(`[data-layer-id="${layerId}"]`);
    if (element) element.remove();
    this.render();
  },

  updateLayer(layerId, updates) {
    const layer = this.layers.find((l) => l.id === layerId);
    if (layer) {
      Object.assign(layer, updates);
      EditorCore.state.isDirty = true; // 편집 변경 플래그 설정
      this.render();
    }
  },

  // Undo/Redo 기능
  saveHistory() {
    const state = JSON.parse(JSON.stringify(this.layers));
    this.history.past.push(this.history.present);
    this.history.present = state;
    this.history.future = [];
    // 히스토리 제한 (최대 10개)
    if (this.history.past.length > 10) {
      this.history.past.shift();
    }
  },

  undo() {
    if (this.history.past.length === 0) return;
    this.history.future.unshift(this.history.present);
    this.history.present = this.history.past.pop();
    this.layers = JSON.parse(JSON.stringify(this.history.present || []));
    EditorCore.state.layers = this.layers;
    this.render();
  },

  redo() {
    if (this.history.future.length === 0) return;
    this.history.past.push(this.history.present);
    this.history.present = this.history.future.shift();
    this.layers = JSON.parse(JSON.stringify(this.history.present || []));
    EditorCore.state.layers = this.layers;
    this.render();
  },

  render() {
    const canvas = EditorCore.CanvasManager.canvas;
    if (!canvas) return;

    // 기존 텍스트/스티커 레이어 제거
    canvas.querySelectorAll(".text-layer, .sticker-layer").forEach((el) => {
      if (!el.closest(".template-slot")) el.remove();
    });

    // 기존 placeholder cut 요소 제거 (재렌더링 시 정리)
    canvas.querySelectorAll(".placeholder-cut-layer").forEach((el) => {
      el.remove();
    });

    // 레이어 렌더링 로직
    // 템플릿 모드인 경우 슬롯에 이미지 표시
    if (EditorCore.state.editorMode === "template") {
      this.layers.forEach((layer) => {
        if (layer.type === "image" && layer.slotId) {
          const slotEl = document.querySelector(
            `[data-slot-id="${layer.slotId}"]`
          );
          if (slotEl) {
            // cut 타입인 경우 cutId가 null이면 placeholder cut → 이미지 로딩 금지, placeholder UI 유지
            if (layer.cutId === null || layer.cutId === undefined) {
              const existingImg = slotEl.querySelector(".slot-image");
              if (existingImg) {
                existingImg.remove();
              }
              slotEl.classList.remove("has-content");

              // placeholder cut 클릭 이벤트 바인딩 (한 번만)
              if (!slotEl.dataset.placeholderBound) {
                slotEl.dataset.placeholderBound = "true";
                slotEl.addEventListener("click", (e) => {
                  // 컨트롤 버튼 클릭은 무시
                  if (e.target.closest(".slot-controls")) return;
                  if (e.target.closest(".slot-add-btn")) return;

                  const placeholderLayer = EditorCore.LayerManager.layers.find(
                    (l) => l.id === layer.id && l.cutId === null
                  );
                  if (placeholderLayer) {
                    console.log(
                      "[PLACEHOLDER CUT CLICK]",
                      placeholderLayer.id,
                      "open cut selector"
                    );
                    EditorCore.state.selectedSlotId = layer.slotId;
                    EditorCore.state.mode = "pickingCut";
                    EditorCore.BottomSheetManager.openCutPicker(layer.slotId);
                  }
                });
              }
              return; // 다음 레이어로
            }
            // imageUrl이 null이거나 없는 경우 placeholder로 처리 (이미지 요소 생성 안 함)
            if (!layer.imageUrl) {
              // placeholder 슬롯은 이미지 없이 슬롯만 표시
              const existingImg = slotEl.querySelector(".slot-image");
              if (existingImg) {
                existingImg.remove();
              }
              slotEl.classList.remove("has-content");
              return; // 다음 레이어로
            }

            let img = slotEl.querySelector(".slot-image");
            if (!img) {
              img = document.createElement("img");
              img.className = `slot-image ${layer.fitMode}`;
              img.draggable = false;
              slotEl.appendChild(img);

              // 드래그 설정
              EditorCore.TemplateManager.setupImageDrag(
                img,
                slotEl,
                layer.slotId
              );
            }
            // imageUrl이 null이면 이미지 로드 시도 금지
            if (layer.imageUrl) {
              img.src = layer.imageUrl;
            }
            img.className = `slot-image ${layer.fitMode}`;

            // 퍼센트 기반 변환 (offsetX, offsetY는 이미 퍼센트)
            const offsetX = layer.offsetX || 0;
            const offsetY = layer.offsetY || 0;
            const scale = layer.scale || 1;

            img.style.transform = `translate(${offsetX}%, ${offsetY}%) scale(${scale})`;
            img.style.transformOrigin = "center center";

            slotEl.classList.add("has-content");
          }
        }
      });
    }

    // 자유형 모드: 이미지 레이어를 캔버스에 직접 렌더링
    if (EditorCore.state.editorMode === "free") {
      this.layers.forEach((layer) => {
        if (layer.type === "image" && !layer.slotId) {
          // cut 타입인 경우 cutId가 null이면 placeholder cut → 이미지 로딩 금지, placeholder UI 유지
          if (layer.cutId === null || layer.cutId === undefined) {
            const existingImgEl = document.querySelector(
              `[data-layer-id="${layer.id}"]`
            );
            if (existingImgEl) {
              existingImgEl.remove();
            }

            // placeholder cut을 위한 빈 div 생성 (클릭 가능하도록)
            let placeholderEl = document.querySelector(
              `[data-placeholder-cut-id="${layer.id}"]`
            );
            if (!placeholderEl) {
              placeholderEl = document.createElement("div");
              placeholderEl.className = "placeholder-cut-layer";
              placeholderEl.dataset.placeholderCutId = layer.id;
              placeholderEl.dataset.layerId = layer.id;
              placeholderEl.style.cssText = `
                position: absolute;
                left: ${layer.x}%;
                top: ${layer.y}%;
                width: ${layer.width}%;
                height: ${layer.height}%;
                transform: translate(-50%, -50%);
                border: 2px dashed #ccc;
                background: rgba(0, 0, 0, 0.02);
                cursor: pointer;
                z-index: 999;
                display: flex;
                align-items: center;
                justify-content: center;
              `;
              placeholderEl.innerHTML = `
                <div style="color: #999; font-size: 12px; text-align: center;">컷 선택</div>
              `;
              canvas.appendChild(placeholderEl);

              // 클릭 이벤트 바인딩
              placeholderEl.addEventListener("click", (e) => {
                e.stopPropagation();
                const placeholderLayer = EditorCore.LayerManager.layers.find(
                  (l) => l.id === layer.id && l.cutId === null
                );
                if (placeholderLayer) {
                  console.log(
                    "[PLACEHOLDER CUT CLICK]",
                    placeholderLayer.id,
                    "open cut selector"
                  );
                  EditorCore.state.selectedLayerId = placeholderLayer.id;
                  EditorCore.state.mode = "pickingCut";
                  EditorCore.BottomSheetManager.openCutPicker(null);
                }
              });
            }
            return; // 다음 레이어로
          }
          // imageUrl이 null이거나 없는 경우 placeholder로 처리 (이미지 요소 생성 안 함)
          if (!layer.imageUrl) {
            // 기존 이미지 요소 제거
            const existingImgEl = document.querySelector(
              `[data-layer-id="${layer.id}"]`
            );
            if (existingImgEl) {
              existingImgEl.remove();
            }
            return; // 다음 레이어로
          }

          let wrapper = document.querySelector(`[data-layer-id="${layer.id}"]`);

          // [PATCH] Migrate from IMG to DIV wrapper if needed
          if (wrapper && wrapper.tagName === "IMG") {
            wrapper.remove();
            wrapper = null;
          }

          if (!wrapper) {
            wrapper = document.createElement("div");
            wrapper.className = "free-image-layer";
            wrapper.dataset.layerId = layer.id;

            const contentImg = document.createElement("img");
            contentImg.className = "free-image-content";
            contentImg.style.width = "100%";
            contentImg.style.height = "100%";
            contentImg.style.display = "block";
            contentImg.style.pointerEvents = "none";
            contentImg.draggable = false;

            wrapper.appendChild(contentImg);
            canvas.appendChild(wrapper);
            this.enableFreeImageResize(wrapper, layer.id);
          }

          // Update content
          const innerImg = wrapper.querySelector("img");
          if (innerImg && layer.imageUrl) {
            innerImg.src = layer.imageUrl;
            innerImg.style.objectFit = layer.fitMode || "cover";
          }

          wrapper.style.cssText = `
            position: absolute;
            left: ${layer.x}%;
            top: ${layer.y}%;
            width: ${layer.width}%;
            height: ${layer.height}%;
            transform: translate(-50%, -50%) scale(${layer.scale || 1});
            cursor: move;
            user-select: none;
            z-index: 1000;
          `;

          // 대표 블록 뱃지 표시
          // 기존 뱃지 제거
          const existingBadge = document.querySelector(
            `.cover-badge[data-parent-id="${layer.id}"]`
          );
          if (existingBadge) existingBadge.remove();

          if (EditorCore.state.coverBlockId === layer.id) {
            const badge = document.createElement("div");
            badge.className = "cover-badge";
            badge.dataset.parentId = layer.id;
            badge.dataset.ignoreThumbnail = "true";
            badge.textContent = "대표";
            badge.style.cssText = `
              position: absolute;
              top: calc(${layer.y}% - ${layer.height / 2}% - 10px); 
              left: calc(${layer.x}% - ${layer.width / 2}%);
              background: #ff5e00;
              color: white;
              font-size: 10px;
              padding: 2px 6px;
              border-radius: 4px;
              z-index: 1003;
              pointer-events: none;
              box-shadow: 0 1px 3px rgba(0,0,0,0.2);
              font-weight: bold;
              white-space: nowrap;
            `;
            // 뱃지는 canvas에 직접 추가하여 이미지 위에 표시 (이미지는 transform을 쓰므로 위치 계산 필요)
            // 하지만 이미지가 move/resize될 때 뱃지도 따라다녀야 함.
            // 이미지가 img 태그라 자식을 가질 수 없음.
            // 따라서 뱃지를 canvas의 직계 자식으로 두고 위치를 sync하거나,
            // 이미지를 div로 감싸는 구조여야 하는데 구조 변경은 위험함.
            // 대안: 뱃지 위치를 계산해서 canvas에 append. render()가 주기적으로 호출되므로 위치 업데이트됨.
            canvas.appendChild(badge);
          }
        }
      });
    }

    // 텍스트/스티커 레이어 렌더링 (템플릿/자유형 모두)
    this.layers.forEach((layer) => {
      if (layer.type === "text") {
        // 텍스트 레이어 렌더링
        let textEl = document.querySelector(`[data-layer-id="${layer.id}"]`);
        if (!textEl) {
          textEl = document.createElement("div");
          textEl.className = "text-layer";
          textEl.dataset.layerId = layer.id;
          canvas.appendChild(textEl);

          if (EditorCore.state.editorMode === "free") {
            this.enableFreeImageResize(textEl, layer.id);
          } else {
            this.enableDrag(textEl, layer.id);
          }
        }

        textEl.textContent = layer.content;
        textEl.style.cssText = `
            position: absolute;
            left: ${layer.x}%;
            top: ${layer.y}%;
            transform: translate(-50%, -50%);
            font-size: ${layer.fontSize}px;
            color: ${layer.color};
            cursor: move;
            user-select: none;
            z-index: 1000;
            width: ${layer.width ? layer.width + "%" : "max-content"};
            height: ${layer.height ? layer.height + "%" : "auto"};
            white-space: pre-wrap;
            word-break: break-word;
        `;

        // 효과 적용
        if (layer.effects) {
          this.applyLayerEffects(textEl, layer.effects);
        }
      } else if (layer.type === "sticker") {
        // 스티커 레이어 렌더링
        let stickerEl = document.querySelector(`[data-layer-id="${layer.id}"]`);
        if (!stickerEl) {
          stickerEl = document.createElement("div");
          stickerEl.className = "sticker-layer";
          stickerEl.dataset.layerId = layer.id;

          // 스티커는 비율 유지가 중요하므로 드래그만 (또는 스케일)
          // "Enable box resize for TEXT layers" -> 스티커는 제외
          canvas.appendChild(stickerEl);
          this.enableDrag(stickerEl, layer.id);
        }

        stickerEl.textContent = layer.stickerId;
        stickerEl.style.cssText = `
            position: absolute;
            left: ${layer.x}%;
            top: ${layer.y}%;
            transform: translate(-50%, -50%) scale(${layer.scale || 1});
            font-size: 48px;
            cursor: move;
            user-select: none;
            z-index: 1000;
        `;

        // 효과 적용
        if (layer.effects) {
          this.applyLayerEffects(stickerEl, layer.effects);
        }
      }
    });
  },

  // 공통 드래그 함수 (마우스 + 모바일 터치 지원)
  enableDrag(element, layerId) {
    let dragging = false;
    let startX, startY, startLeft, startTop;
    const canvas = EditorCore.CanvasManager.canvas;

    // Desktop: 마우스 이벤트
    element.addEventListener("mousedown", (e) => {
      // 선택된 레이어만 드래그 가능
      if (EditorCore.state.selectedLayerId !== layerId) return;

      dragging = true;
      startX = e.clientX;
      startY = e.clientY;
      const layer = this.layers.find((l) => l.id === layerId);
      if (!layer) return;
      startLeft = layer.x;
      startTop = layer.y;
      e.preventDefault();
      e.stopPropagation();
    });

    const handleMouseMove = (e) => {
      if (!dragging) return;
      const canvasRect = canvas.getBoundingClientRect();
      const deltaX = e.clientX - startX;
      const deltaY = e.clientY - startY;
      const deltaXPercent = (deltaX / canvasRect.width) * 100;
      const deltaYPercent = (deltaY / canvasRect.height) * 100;

      const newX = Math.max(0, Math.min(100, startLeft + deltaXPercent));
      const newY = Math.max(0, Math.min(100, startTop + deltaYPercent));

      this.updateLayer(layerId, { x: newX, y: newY });
      e.preventDefault();
    };

    const handleMouseUp = () => {
      dragging = false;
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);

    // Mobile: 터치 이벤트
    element.addEventListener(
      "touchstart",
      (e) => {
        // 선택된 레이어만 드래그 가능
        if (EditorCore.state.selectedLayerId !== layerId) return;

        dragging = true;
        const touch = e.touches[0];
        const canvasRect = canvas.getBoundingClientRect();
        startX = touch.clientX;
        startY = touch.clientY;
        const layer = this.layers.find((l) => l.id === layerId);
        if (!layer) return;
        startLeft = layer.x;
        startTop = layer.y;
        e.preventDefault();
        e.stopPropagation();
      },
      { passive: false }
    );

    const handleTouchMove = (e) => {
      if (!dragging) return;
      const touch = e.touches[0];
      const canvasRect = canvas.getBoundingClientRect();
      const deltaX = touch.clientX - startX;
      const deltaY = touch.clientY - startY;
      const deltaXPercent = (deltaX / canvasRect.width) * 100;
      const deltaYPercent = (deltaY / canvasRect.height) * 100;

      const newX = Math.max(0, Math.min(100, startLeft + deltaXPercent));
      const newY = Math.max(0, Math.min(100, startTop + deltaYPercent));

      this.updateLayer(layerId, { x: newX, y: newY });
      e.preventDefault();
    };

    const handleTouchEnd = () => {
      dragging = false;
    };

    document.addEventListener("touchmove", handleTouchMove, { passive: false });
    document.addEventListener("touchend", handleTouchEnd);

    // 클릭 이벤트 (선택 표시)
    element.addEventListener("click", (e) => {
      e.stopPropagation();
      EditorCore.state.selectedLayerId = layerId;
      // 선택 표시
      document
        .querySelectorAll(".text-layer, .sticker-layer, .free-image-layer")
        .forEach((el) => {
          el.style.outline = "none";
          el.querySelector(".layer-delete-btn")?.remove();
          el.querySelectorAll(".resize-handle").forEach((h) => h.remove());
        });
      element.style.outline = "2px solid #ff5e00";

      // 삭제 버튼 추가
      const deleteBtn = document.createElement("button");
      deleteBtn.className = "layer-delete-btn";
      deleteBtn.innerHTML = "×";
      deleteBtn.style.cssText = `
        position: absolute;
        top: -12px;
        right: -12px;
        width: 24px;
        height: 24px;
        border-radius: 50%;
        border: none;
        background: #ff5e00;
        color: white;
        font-size: 16px;
        font-weight: bold;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 1001;
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
      `;
      deleteBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        EditorCore.LayerManager.deleteLayer(layerId);
      });
      element.appendChild(deleteBtn);
    });
  },

  setupTextDrag(element, layerId) {
    if (EditorCore.state.editorMode === "free") {
      this.enableFreeImageResize(element, layerId);
    } else {
      this.enableDrag(element, layerId);
    }
  },

  setupStickerDrag(element, layerId) {
    this.enableDrag(element, layerId);
  },

  // 자유형 모드 이미지 드래그 및 크기 조정
  enableFreeImageResize(element, layerId) {
    let dragging = false;
    let resizing = false;
    let resizeHandle = null;
    let startX, startY, startLeft, startTop, startWidth, startHeight;
    const canvas = EditorCore.CanvasManager.canvas;

    // 클릭 이벤트 (선택 표시)
    element.addEventListener("click", (e) => {
      // 핸들 클릭은 무시
      if (e.target.classList.contains("resize-handle")) return;

      e.stopPropagation();
      EditorCore.state.selectedLayerId = layerId;
      // 선택 표시
      document
        .querySelectorAll(".free-image-layer, .text-layer, .sticker-layer")
        .forEach((el) => {
          el.style.outline = "none";
          el.querySelector(".layer-delete-btn")?.remove();
          el.querySelectorAll(".resize-handle").forEach((h) => h.remove());
        });
      element.style.outline = "2px solid #ff5e00";

      // 삭제 버튼 추가
      const deleteBtn = document.createElement("button");
      deleteBtn.className = "layer-delete-btn";
      deleteBtn.innerHTML = "×";
      deleteBtn.style.cssText = `
        position: absolute;
        top: -12px;
        right: -12px;
        width: 24px;
        height: 24px;
        border-radius: 50%;
        border: none;
        background: #ff5e00;
        color: white;
        font-size: 16px;
        font-weight: bold;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 1001;
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
      `;
      deleteBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        EditorCore.LayerManager.deleteLayer(layerId);
      });
      element.appendChild(deleteBtn);

      // 크기 조절 핸들 추가 (4개 모서리)
      const handles = [
        { position: "top-left", cursor: "nwse-resize" },
        { position: "top-right", cursor: "nesw-resize" },
        { position: "bottom-left", cursor: "nesw-resize" },
        { position: "bottom-right", cursor: "nwse-resize" },
      ];

      handles.forEach(({ position, cursor }) => {
        const handle = document.createElement("div");
        handle.className = "resize-handle";
        handle.dataset.position = position;
        handle.style.cssText = `
          position: absolute;
          width: 12px;
          height: 12px;
          background: #ff5e00;
          border: 2px solid white;
          border-radius: 50%;
          cursor: ${cursor};
          z-index: 1002;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
        `;

        if (position.includes("top")) {
          handle.style.top = "-6px";
        } else {
          handle.style.bottom = "-6px";
        }
        if (position.includes("left")) {
          handle.style.left = "-6px";
        } else {
          handle.style.right = "-6px";
        }

        handle.addEventListener("mousedown", (e) => {
          e.stopPropagation();
          resizing = true;
          resizeHandle = position;
          const layer = this.layers.find((l) => l.id === layerId);
          if (!layer) return;
          startX = e.clientX;
          startY = e.clientY;
          startLeft = layer.x || 50;
          startTop = layer.y || 50;
          startWidth = layer.width || 80;
          startHeight = layer.height || 80;
        });

        handle.addEventListener(
          "touchstart",
          (e) => {
            e.stopPropagation();
            resizing = true;
            resizeHandle = position;
            const touch = e.touches[0];
            const layer = this.layers.find((l) => l.id === layerId);
            if (!layer) return;
            startX = touch.clientX;
            startY = touch.clientY;
            startLeft = layer.x || 50;
            startTop = layer.y || 50;
            startWidth = layer.width || 80;
            startHeight = layer.height || 80;
          },
          { passive: false }
        );

        element.appendChild(handle);
      });
    });

    // 드래그로 위치 이동
    element.addEventListener("mousedown", (e) => {
      if (
        e.target.classList.contains("resize-handle") ||
        e.target.classList.contains("layer-delete-btn")
      )
        return;
      if (EditorCore.state.selectedLayerId !== layerId) return;

      dragging = true;
      startX = e.clientX;
      startY = e.clientY;
      const layer = this.layers.find((l) => l.id === layerId);
      if (!layer) return;
      startLeft = layer.x || 50;
      startTop = layer.y || 50;
      e.preventDefault();
      e.stopPropagation();
    });

    element.addEventListener(
      "touchstart",
      (e) => {
        if (
          e.target.classList.contains("resize-handle") ||
          e.target.classList.contains("layer-delete-btn")
        )
          return;
        if (EditorCore.state.selectedLayerId !== layerId) return;

        dragging = true;
        const touch = e.touches[0];
        const canvasRect = canvas.getBoundingClientRect();
        startX = touch.clientX;
        startY = touch.clientY;
        const layer = this.layers.find((l) => l.id === layerId);
        if (!layer) return;
        startLeft = layer.x || 50;
        startTop = layer.y || 50;
        e.preventDefault();
        e.stopPropagation();
      },
      { passive: false }
    );

    const handleMouseMove = (e) => {
      const canvasRect = canvas.getBoundingClientRect();

      if (resizing && resizeHandle) {
        // [RESIZE LOGIC START]
        if (!this._resizeStarted) {
          console.log("[FREE RESIZE START]", layerId);
          this._resizeStarted = true;
          // Calculate initial aspect ratio from visual dimensions
          const rect = element.getBoundingClientRect();
          this._startAspectRatio = rect.width / rect.height;
        }

        const deltaX = ((e.clientX - startX) / canvasRect.width) * 100;
        const deltaY = ((e.clientY - startY) / canvasRect.height) * 100;

        // Base calculations on Width change primarily for simplicity in aspect locking
        // Or handle corner-specific logic.
        // Simple approach: Lock to Width delta, calculate Height.

        let newWidth = startWidth;
        let newHeight = startHeight;

        // Determine primary delta based on handle
        let primaryDelta = 0;
        if (resizeHandle.includes("right")) primaryDelta = deltaX;
        else if (resizeHandle.includes("left")) primaryDelta = -deltaX;

        // Calculate raw new width
        newWidth = Math.max(10, Math.min(100, startWidth + primaryDelta));

        // Lock Aspect Ratio: newHeight = newWidth / aspect (but we need to account for canvas aspect ratio)
        // Canvas aspect ratio factor: (canvasHeight / canvasWidth)
        // aspect = w% / h% * (canvasW / canvasH) -> h% = w% * (canvasW / canvasH) / aspect
        const canvasRatio = canvasRect.width / canvasRect.height;
        // visualAspect = (w% * CW) / (h% * CH) = (w%/h%) * canvasRatio
        // h% = (w% * canvasRatio) / visualAspect
        newHeight = (newWidth * canvasRatio) / this._startAspectRatio;

        // Clamp Height
        newHeight = Math.max(10, Math.min(100, newHeight));
        // Re-adjust width if height was clamped? For now, strict width drive is fine.

        // Center update (since transform translate -50,-50 is used, x/y is center)
        // Changing width/height grows from center if we don't update x/y?
        // No, CSS is top/left with translate -50,-50.
        // This means x/y is the CENTER of the image.
        // If we simply change w/h, it grows from center.
        // Users expect corner resize. So we must shift center.

        // Calculate shift in %
        const widthChange = newWidth - startWidth;
        const heightChange = newHeight - startHeight;

        let newX = startLeft;
        let newY = startTop;

        if (resizeHandle.includes("right")) newX += widthChange / 2;
        if (resizeHandle.includes("left")) newX -= widthChange / 2;
        if (resizeHandle.includes("bottom")) newY += heightChange / 2;
        if (resizeHandle.includes("top")) newY -= heightChange / 2;

        console.log(
          "[FREE RESIZE MOVE]",
          newWidth.toFixed(2),
          newHeight.toFixed(2)
        );

        this.updateLayer(layerId, {
          width: newWidth,
          height: newHeight,
          x: newX,
          y: newY,
        });
      } else if (dragging) {
        // 위치 이동
        const deltaX = ((e.clientX - startX) / canvasRect.width) * 100;
        const deltaY = ((e.clientY - startY) / canvasRect.height) * 100;
        const newX = Math.max(0, Math.min(100, startLeft + deltaX));
        const newY = Math.max(0, Math.min(100, startTop + deltaY));
        this.updateLayer(layerId, { x: newX, y: newY });
      }

      if (resizing || dragging) {
        e.preventDefault();
      }
    };

    const handleTouchMove = (e) => {
      const touch = e.touches[0];
      const canvasRect = canvas.getBoundingClientRect();

      if (resizing && resizeHandle) {
        if (!this._resizeStarted) {
          console.log("[FREE RESIZE START]", layerId);
          this._resizeStarted = true;
          const rect = element.getBoundingClientRect();
          this._startAspectRatio = rect.width / rect.height;
        }

        const deltaX = ((touch.clientX - startX) / canvasRect.width) * 100;
        // deltaY unused for primary calculation in locked aspect mode

        let newWidth = startWidth;
        let newHeight = startHeight;

        let primaryDelta = 0;
        if (resizeHandle.includes("right")) primaryDelta = deltaX;
        else if (resizeHandle.includes("left")) primaryDelta = -deltaX;

        newWidth = Math.max(10, Math.min(100, startWidth + primaryDelta));

        const canvasRatio = canvasRect.width / canvasRect.height;
        newHeight = (newWidth * canvasRatio) / this._startAspectRatio;
        newHeight = Math.max(10, Math.min(100, newHeight));

        const widthChange = newWidth - startWidth;
        const heightChange = newHeight - startHeight;

        let newX = startLeft;
        let newY = startTop;

        if (resizeHandle.includes("right")) newX += widthChange / 2;
        if (resizeHandle.includes("left")) newX -= widthChange / 2;
        if (resizeHandle.includes("bottom")) newY += heightChange / 2;
        if (resizeHandle.includes("top")) newY -= heightChange / 2;

        console.log(
          "[FREE RESIZE MOVE]",
          newWidth.toFixed(2),
          newHeight.toFixed(2)
        );

        this.updateLayer(layerId, {
          width: newWidth,
          height: newHeight,
          x: newX,
          y: newY,
        });
      } else if (dragging) {
        // 위치 이동
        const deltaX = ((touch.clientX - startX) / canvasRect.width) * 100;
        const deltaY = ((touch.clientY - startY) / canvasRect.height) * 100;
        const newX = Math.max(0, Math.min(100, startLeft + deltaX));
        const newY = Math.max(0, Math.min(100, startTop + deltaY));
        this.updateLayer(layerId, { x: newX, y: newY });
      }

      if (resizing || dragging) {
        e.preventDefault();
      }
    };

    const handleMouseUp = () => {
      if (this._resizeStarted) {
        const layer = this.layers.find((l) => l.id === layerId);
        if (layer) {
          console.log(
            "[FREE RESIZE END]",
            layerId,
            layer.width.toFixed(2),
            layer.height.toFixed(2)
          );
        }
        this._resizeStarted = false;
      }
      dragging = false;
      resizing = false;
      resizeHandle = null;
    };

    const handleTouchEnd = () => {
      if (this._resizeStarted) {
        const layer = this.layers.find((l) => l.id === layerId);
        if (layer) {
          console.log(
            "[FREE RESIZE END]",
            layerId,
            layer.width.toFixed(2),
            layer.height.toFixed(2)
          );
        }
        this._resizeStarted = false;
      }
      dragging = false;
      resizing = false;
      resizeHandle = null;
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
    document.addEventListener("touchmove", handleTouchMove, { passive: false });
    document.addEventListener("touchend", handleTouchEnd);
  },

  applyLayerEffects(element, effects) {
    if (effects.shadow === "light") {
      element.style.boxShadow = "0 2px 4px rgba(0, 0, 0, 0.1)";
    } else if (effects.shadow === "medium") {
      element.style.boxShadow = "0 4px 8px rgba(0, 0, 0, 0.15)";
    } else if (effects.shadow === "strong") {
      element.style.boxShadow = "0 8px 16px rgba(0, 0, 0, 0.2)";
    } else {
      element.style.boxShadow = "none";
    }

    if (effects.border === "thin") {
      element.style.border = "1px solid #ff5e00";
    } else if (effects.border === "medium") {
      element.style.border = "2px solid #ff5e00";
    } else if (effects.border === "thick") {
      element.style.border = "3px solid #ff5e00";
    } else {
      element.style.border = "none";
    }

    if (effects.radius) {
      element.style.borderRadius = `${effects.radius}px`;
    }

    if (effects.blur === "light") {
      element.style.filter = "blur(2px)";
    } else if (effects.blur === "medium") {
      element.style.filter = "blur(4px)";
    } else {
      element.style.filter = "none";
    }
  },

  getBlocksForSave() {
    // 레이어를 DB 블록 형식으로 변환
    return this.layers.map((layer, index) => {
      const baseBlock = {
        moodboard_id: EditorCore.state.currentMoodboardId,
        block_type: layer.type,
        order_index: index,
        meta: {},
      };

      if (layer.type === "image") {
        // cut_id 추출: layer.cutId ?? layer.meta?.cutId ?? layer.data?.cutId ?? null
        const cutId =
          layer.cutId ?? layer.meta?.cutId ?? layer.data?.cutId ?? null;
        baseBlock.cut_id = cutId;
        // cut_id가 존재하면 block_type = 'cut', 없으면 block_type = 'image'
        if (cutId) {
          baseBlock.block_type = "cut";
        } else {
          baseBlock.block_type = "image";
        }
        baseBlock.meta = {
          slotId: layer.slotId,
          slotOffsetX: layer.offsetX,
          slotOffsetY: layer.offsetY,
          slotScale: layer.scale,
          imageUrl: layer.imageUrl,
          fitMode: layer.fitMode,
        };
      } else if (layer.type === "text") {
        baseBlock.title = layer.content;
        baseBlock.meta = {
          x: layer.x,
          y: layer.y,
          fontSize: layer.fontSize,
          color: layer.color,
          effects: layer.effects || {},
        };
      } else if (layer.type === "sticker") {
        baseBlock.meta = {
          stickerId: layer.stickerId,
          x: layer.x,
          y: layer.y,
          scale: layer.scale || 1.0,
          effects: layer.effects || {},
        };
      }

      // STEP 2: layout 필드 추가 (기존 로직 유지, layout만 추가)
      try {
        const editorLayout = createLayoutFromLayer(
          layer,
          EditorCore.state.editorMode || "free",
          EditorCore.state.currentTemplate?.id || null
        );
        // layout이 있으면 추가 (없어도 기존 저장은 성공해야 함)
        if (editorLayout) {
          baseBlock.layout = editorLayout;
        }
      } catch (error) {
        // layout 생성 실패해도 기존 저장은 성공해야 함
        console.warn(
          "[LayerManager] layout 생성 실패 (기존 저장 계속):",
          error
        );
      }

      return baseBlock;
    });
  },
};

// =========================
// ToolbarManager - 툴바 관리
// =========================
EditorCore.ToolbarManager = {
  init() {
    // 툴바 버튼 활성화 상태 관리
    document.querySelectorAll(".toolbar-btn").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        const tool = e.currentTarget.dataset.tool;
        if (tool) {
          EditorCore.openToolPanel(tool);
        }
      });
    });
  },
};

// =========================
// MoodPresetManager - 무드 프리셋 관리
// =========================
EditorCore.MoodPresetManager = {
  applyMood(moodName) {
    EditorCore.state.currentMood = moodName;
    EditorCore.CanvasManager.applyMood(moodName);
    EditorCore.LayerManager.render();

    // 모든 슬롯에 무드 적용 (선택적)
    // 필요시 레이어에도 무드 스타일 적용 가능
  },

  renderMoodPresets() {
    return Object.keys(MOOD_PRESETS)
      .map((moodId) => {
        const mood = MOOD_PRESETS[moodId];
        const isActive = EditorCore.state.currentMood === moodId;
        return `
        <div class="mood-preset-btn ${isActive ? "active" : ""}" 
             data-mood-id="${moodId}"
             onclick="EditorCore.MoodPresetManager.applyMood('${moodId}'); EditorCore.BottomSheetManager.close();">
          <div class="mood-preset-preview" style="background: ${
            mood.backgroundTone
          }; box-shadow: ${mood.shadow}; border-radius: ${
          mood.radius
        }px;"></div>
          <div class="mood-preset-name">${mood.name}</div>
        </div>
      `;
      })
      .join("");
  },
};

// =========================
// BottomSheetManager - 바텀시트 관리
// =========================
EditorCore.BottomSheetManager = {
  overlay: null,
  sheet: null,
  content: null,

  init() {
    this.overlay = document.getElementById("bottomSheetOverlay");
    this.sheet = document.getElementById("bottomSheet");
    this.content = document.getElementById("bottomSheetContent");

    // 오버레이 클릭 시 닫기
    if (this.overlay) {
      this.overlay.addEventListener("click", () => this.close());
    }

    // 스와이프 다운 닫기 (간단한 구현)
    let startY = 0;
    if (this.sheet) {
      this.sheet.addEventListener("touchstart", (e) => {
        startY = e.touches[0].clientY;
      });

      this.sheet.addEventListener("touchmove", (e) => {
        const currentY = e.touches[0].clientY;
        if (currentY - startY > 50) {
          this.close();
        }
      });
    }
  },

  open(tool) {
    if (!this.sheet || !this.content) return;

    let html = "";

    switch (tool) {
      case "image":
        html = this.renderImagePanel();
        break;
      case "text":
        html = this.renderTextPanel();
        break;
      case "sticker":
        html = this.renderStickerPanel();
        break;
      case "adjust":
        html = this.renderAdjustPanel();
        break;
      case "align":
        html = this.renderAlignPanel();
        break;
      case "layout":
        html = this.renderLayoutPanel();
        break;
      case "mood":
        html = this.renderMoodPanel();
        break;
      case "background":
        html = this.renderBackgroundPanel();
        break;
      case "effect":
        html = this.renderEffectPanel();
        break;
    }

    this.content.innerHTML = html;
    if (this.overlay) {
      this.overlay.classList.add("show");
      this.overlay.style.pointerEvents = "auto";
      this.overlay.style.visibility = "visible";
      this.overlay.style.opacity = "1";
    }
    if (this.sheet) {
      this.sheet.classList.add("open");
    }

    // 패널별 이벤트 바인딩
    setTimeout(() => {
      if (tool === "text") {
        // 색상 선택
        document.querySelectorAll(".color-swatch").forEach((btn) => {
          btn.addEventListener("click", () => {
            document
              .querySelectorAll(".color-swatch")
              .forEach((b) => b.classList.remove("active"));
            btn.classList.add("active");
          });
        });
        // 크기 선택
        document.querySelectorAll(".text-size-btn").forEach((btn) => {
          btn.addEventListener("click", () => {
            document
              .querySelectorAll(".text-size-btn")
              .forEach((b) => b.classList.remove("active"));
            btn.classList.add("active");
          });
        });
        // 기본값 설정
        const defaultColorBtn = document.querySelector(
          ".color-swatch[data-color='#333333']"
        );
        const defaultSizeBtn = document.querySelector(
          ".text-size-btn[data-size='16']"
        );
        if (defaultColorBtn) defaultColorBtn.classList.add("active");
        if (defaultSizeBtn) defaultSizeBtn.classList.add("active");
      } else if (tool === "mood") {
        // 무드 프리셋 클릭 이벤트
        document.querySelectorAll(".mood-preset-btn").forEach((btn) => {
          btn.addEventListener("click", (e) => {
            const moodId =
              btn.getAttribute("data-mood-id") ||
              btn.onclick?.toString().match(/'([^']+)'/)?.[1];
            if (moodId) {
              EditorCore.MoodPresetManager.applyMood(moodId);
              this.close();
            }
          });
        });
      } else if (tool === "adjust") {
        // 조정 패널 버튼 활성화 상태 업데이트
        const layer = EditorCore.LayerManager.layers.find(
          (l) =>
            l.slotId === EditorCore.state.selectedSlotId ||
            l.id === EditorCore.state.selectedLayerId
        );
        if (layer && layer.type === "image") {
          document.querySelectorAll(".adjust-btn").forEach((btn) => {
            const onclickStr = btn.getAttribute("onclick") || "";
            if (
              onclickStr.includes("fitMode: 'fit'") &&
              layer.fitMode === "fit"
            ) {
              btn.classList.add("active");
            } else if (
              onclickStr.includes("fitMode: 'fill'") &&
              layer.fitMode === "fill"
            ) {
              btn.classList.add("active");
            }
          });
        }
      }
    }, 100);
  },

  close() {
    if (this.overlay) {
      this.overlay.classList.remove("show");
      this.overlay.style.pointerEvents = "none";
      this.overlay.style.visibility = "hidden";
      this.overlay.style.opacity = "0";
    }
    if (this.sheet) {
      this.sheet.classList.remove("open");
    }
  },

  renderImagePanel() {
    // 자유형 모드에서는 슬롯 없이도 컷 선택 가능
    const slotId = EditorCore.state.selectedSlotId;
    if (EditorCore.state.editorMode === "free") {
      // 자유형 모드: 슬롯 없이 컷 선택
      this.openCutPicker(null);
      return "";
    }

    if (!slotId) {
      return `<div class="panel-section"><div class="panel-hint">슬롯을 선택해주세요</div></div>`;
    }

    // Cut Picker 열기 (로컬 업로드 제거)
    this.openCutPicker(slotId);
    return "";
  },

  // loadUserCuts 제거 (openCutPicker로 통합)

  async fetchUserCuts() {
    try {
      // UID 확보 (최우선)
      let currentUserId =
        EditorCore.state.currentUserId || window.currentUserId;

      // Firebase에서 UID 가져오기 시도
      if (!currentUserId) {
        try {
          const { getAuth } = await import(
            "https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js"
          );
          const auth = getAuth();
          if (auth.currentUser) {
            currentUserId = auth.currentUser.uid;
          }
        } catch (e) {
          // Firebase 사용 불가
        }
      }

      if (!currentUserId) {
        console.error("[BottomSheetManager] UID 없음 → 컷 로드 중단");
        return [];
      }

      // UID가 없으면 컷 로드 절대 시도하지 않음
      EditorCore.state.currentUserId = currentUserId;

      // Supabase 클라이언트 확인
      if (!EditorCore.state.supabaseClient) {
        EditorCore.state.supabaseClient = await window.getSupabase();
      }

      if (!EditorCore.state.supabaseClient) {
        console.error("[BottomSheetManager] Supabase 클라이언트 없음");
        return [];
      }

      // Reader와 동일한 방식: user_feed_events + cuts 테이블 사용
      console.log(
        "[BottomSheetManager] 저장된 컷 로드 시작, user_id:",
        currentUserId
      );

      // 1. user_feed_events에서 cut_saved 이벤트 조회
      const { data: events, error: eventsError } =
        await EditorCore.state.supabaseClient
          .from("user_feed_events")
          .select("id, metadata, created_at")
          .eq("user_id", currentUserId)
          .eq("event_type", "cut_saved")
          .order("created_at", { ascending: false });

      if (eventsError) {
        console.error(
          "[BottomSheetManager] user_feed_events 조회 오류:",
          eventsError
        );
        return [];
      }

      if (!events || events.length === 0) {
        console.log("[BottomSheetManager] 저장된 컷이 없습니다");
        return [];
      }

      // 2. metadata에서 cut_id 추출
      const cutIdsFromMetadata = events
        .map((event) => event.metadata?.cut_id)
        .filter((id) => id !== null && id !== undefined);

      if (cutIdsFromMetadata.length === 0) {
        console.log("[BottomSheetManager] cut_id가 없습니다");
        return [];
      }

      // 3. cuts 테이블에서 이미지 URL 가져오기
      const { data: cutsData, error: cutsError } =
        await EditorCore.state.supabaseClient
          .from("cuts")
          .select("id, image_url")
          .in("id", cutIdsFromMetadata);

      if (cutsError) {
        console.error("[BottomSheetManager] cuts 테이블 조회 오류:", cutsError);
        return [];
      }

      // 4. cuts 맵 생성
      const cutsMap = new Map();
      if (cutsData) {
        cutsData.forEach((cut) => {
          cutsMap.set(cut.id, cut.image_url);
        });
      }

      // 5. 이벤트와 매칭하여 컷 목록 구성
      const cuts = events
        .map((event) => {
          const cutId = event.metadata?.cut_id;
          if (!cutId) {
            console.warn(
              "[BottomSheetManager] cut_id가 없는 이벤트:",
              event.id
            );
            return null;
          }

          // cuts 테이블에서 가져온 image_url 우선 사용
          let imageUrl = cutsMap.get(cutId);

          // cuts 테이블에 없으면 metadata의 image_url 사용
          if (!imageUrl) {
            imageUrl = event.metadata?.image_url || null;
          }

          if (!imageUrl) {
            console.warn(
              `[BottomSheetManager] 이미지 URL을 찾을 수 없음, cut_id: ${cutId}`
            );
            return null;
          }

          return {
            id: cutId,
            imageUrl: imageUrl,
            createdAt: event.created_at,
          };
        })
        .filter((cut) => cut !== null);

      console.log(`[BottomSheetManager] ${cuts.length}개의 컷을 불러왔습니다`);
      if (cuts.length === 0) {
        console.warn(
          "[BottomSheetManager] 컷 목록이 비어있습니다. events:",
          events.length,
          "cutsData:",
          cutsData?.length
        );
      }
      return cuts;
    } catch (error) {
      console.error("[BottomSheetManager] fetchUserCuts 오류:", error);
      return [];
    }
  },

  // Cut Picker 열기 (즉시 컷 목록 표시)
  async openCutPicker(slotId) {
    EditorCore.state.selectedSlotId = slotId;
    EditorCore.state.mode = "pickingCut";

    if (!this.sheet || !this.content) return;

    // UID 재확보 (중요)
    const currentUserId =
      EditorCore.state.currentUserId || window.currentUserId;
    if (!currentUserId) {
      // UID가 없으면 사용자 확인 시도
      await EditorCore.getCurrentUser();
      if (!EditorCore.state.currentUserId) {
        console.error("[BottomSheetManager] UID 없음 → Cut Picker 열기 실패");
        this.content.innerHTML = `
          <div class="panel-section">
            <h3 class="panel-title">컷 선택</h3>
            <div class="panel-hint" style="text-align: center; padding: 20px;">
              로그인이 필요합니다.<br>
              페이지를 새로고침해주세요.
            </div>
          </div>
        `;
        if (this.overlay) {
          this.overlay.classList.add("show");
          this.overlay.style.pointerEvents = "auto";
          this.overlay.style.visibility = "visible";
          this.overlay.style.opacity = "1";
        }
        if (this.sheet) {
          this.sheet.classList.add("open");
        }
        return;
      }
    }

    // 로딩 표시
    this.content.innerHTML = `
      <div class="panel-section">
        <h3 class="panel-title">컷 선택</h3>
        <div class="panel-hint" style="text-align: center; padding: 20px;">컷을 불러오는 중...</div>
      </div>
    `;
    if (this.overlay) {
      this.overlay.classList.add("show");
      this.overlay.style.pointerEvents = "auto";
      this.overlay.style.visibility = "visible";
      this.overlay.style.opacity = "1";
    }
    if (this.sheet) {
      this.sheet.classList.add("open");
    }

    // 컷 불러오기
    const cuts = await this.fetchUserCuts();

    if (!this.content) {
      console.error("[BottomSheetManager] content 컨테이너가 없습니다");
      return;
    }

    if (cuts.length === 0) {
      this.content.innerHTML = `
        <div class="panel-section">
          <h3 class="panel-title">컷 선택</h3>
          <div class="panel-hint" style="text-align: center; padding: 20px;">
            저장된 컷이 없습니다.<br>
            먼저 피드를 업로드해주세요.
          </div>
        </div>
      `;
      return;
    }

    // 컷 그리드 표시
    try {
      this.content.innerHTML = `
        <div class="panel-section">
          <h3 class="panel-title">컷 선택</h3>
          <div class="image-grid" style="margin-top: 16px;">
            ${cuts
              .map(
                (cut) => `
              <div class="image-grid-item" onclick="EditorCore.BottomSheetManager.selectCut('${
                cut.imageUrl
              }', ${slotId ? `'${slotId}'` : "null"}, '${cut.id}')">
                <img src="${
                  cut.imageUrl
                }" alt="컷" style="width: 100%; height: 100%; object-fit: cover;">
              </div>
            `
              )
              .join("")}
          </div>
        </div>
      `;
    } catch (error) {
      console.error("[BottomSheetManager] 컷 그리드 렌더링 오류:", error);
      this.content.innerHTML = `
        <div class="panel-section">
          <h3 class="panel-title">컷 선택</h3>
          <div class="panel-hint" style="text-align: center; padding: 20px; color: #ff5e00;">
            컷 목록을 표시하는 중 오류가 발생했습니다.<br>
            콘솔을 확인해주세요.
          </div>
        </div>
      `;
    }
  },

  selectCut(imageUrl, slotId = null, cutId = null) {
    console.log("[DEBUG][CUT SELECTED]", {
      slotId: slotId || EditorCore.state.selectedSlotId,
      cutId: cutId,
      imageUrl: imageUrl,
    });
    const targetSlotId = slotId || EditorCore.state.selectedSlotId;

    // 자유형 모드: 슬롯 없이 이미지 레이어 추가
    if (EditorCore.state.editorMode === "free") {
      // 선택된 placeholder 레이어 찾기 (selectedLayerId 우선, 없으면 cutId가 null인 첫 번째 레이어)
      let placeholderLayer = null;
      if (EditorCore.state.selectedLayerId) {
        placeholderLayer = EditorCore.LayerManager.layers.find(
          (l) =>
            l.id === EditorCore.state.selectedLayerId &&
            l.type === "image" &&
            l.cutId === null &&
            !l.slotId
        );
      }
      if (!placeholderLayer) {
        placeholderLayer = EditorCore.LayerManager.layers.find(
          (l) => l.type === "image" && l.cutId === null && !l.slotId
        );
      }

      if (placeholderLayer) {
        // placeholder 레이어 업데이트
        EditorCore.LayerManager.updateLayer(placeholderLayer.id, {
          imageUrl: imageUrl,
          cutId: cutId,
        });
      } else {
        // 새 레이어 추가
        EditorCore.LayerManager.addImageLayer({
          slotId: null,
          imageUrl: imageUrl,
          cutId: cutId,
          fitMode: "fill",
          x: 50,
          y: 50,
          width: 80,
          height: 80,
        });
      }
      EditorCore.LayerManager.render();
      EditorCore.state.mode = "idle";
      this.close();
      return;
    }

    // 템플릿 모드: 슬롯에 이미지 추가
    if (!targetSlotId) return;

    // 기존 placeholder 레이어 찾기 (cutId가 null인 레이어)
    const placeholderLayer = EditorCore.LayerManager.layers.find(
      (l) => l.type === "image" && l.slotId === targetSlotId && l.cutId === null
    );

    if (placeholderLayer) {
      // placeholder 레이어 업데이트
      EditorCore.LayerManager.updateLayer(placeholderLayer.id, {
        imageUrl: imageUrl,
        cutId: cutId,
      });
    } else {
      // 기존 방식으로 이미지 추가 (cutId 포함)
      EditorCore.TemplateManager.addImageToSlot(targetSlotId, {
        cutId: cutId,
        imageUrl: imageUrl,
      });
    }
    EditorCore.state.mode = "idle";
    this.close();
  },

  // openImageUpload 제거 (로컬 업로드 금지)

  renderTextPanel() {
    EditorCore.state.mode = "editingText";
    return `
      <div class="panel-section" style="padding: 12px;">
        <h3 class="panel-title" style="font-size: 16px; margin-bottom: 12px;">텍스트 추가</h3>
        <input type="text" id="textInput" placeholder="텍스트를 입력하세요" style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 8px; margin-bottom: 12px; font-size: 14px;">
        
        <div style="margin-bottom: 12px;">
          <label style="display: block; font-size: 11px; color: #666; margin-bottom: 6px; font-weight: 500;">폰트 크기</label>
          <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 6px;">
            <button class="text-size-btn" data-size="12" style="padding: 6px 4px; border: 1px solid #ddd; border-radius: 6px; background: white; font-size: 12px; min-height: 32px;">12</button>
            <button class="text-size-btn" data-size="16" style="padding: 6px 4px; border: 1px solid #ddd; border-radius: 6px; background: white; font-size: 16px; min-height: 32px;">16</button>
            <button class="text-size-btn" data-size="20" style="padding: 6px 4px; border: 1px solid #ddd; border-radius: 6px; background: white; font-size: 20px; min-height: 32px;">20</button>
            <button class="text-size-btn" data-size="24" style="padding: 6px 4px; border: 1px solid #ddd; border-radius: 6px; background: white; font-size: 24px; min-height: 32px;">24</button>
          </div>
        </div>

        <div style="margin-bottom: 12px;">
          <label style="display: block; font-size: 11px; color: #666; margin-bottom: 6px; font-weight: 500;">색상</label>
          <div class="color-palette-grid" style="display: grid; grid-template-columns: repeat(6, 1fr); gap: 6px;">
            ${COLOR_PALETTE.map(
              (color, idx) => `
              <button class="color-swatch" data-color="${color}" style="width: 100%; aspect-ratio: 1; border: 2px solid ${
                color === "#FFFFFF" ? "#ddd" : "transparent"
              }; border-radius: 6px; background: ${color}; cursor: pointer; transition: transform 0.2s;" onmouseenter="this.style.transform='scale(1.1)'" onmouseleave="this.style.transform='scale(1)'"></button>
            `
            ).join("")}
          </div>
        </div>

        <button onclick="EditorCore.BottomSheetManager.addText()" style="width: 100%; padding: 10px; background: #ff5e00; color: white; border: none; border-radius: 8px; font-size: 14px; font-weight: 500; cursor: pointer; margin-top: 8px;">추가</button>
      </div>
    `;
  },

  renderStickerPanel() {
    EditorCore.state.mode = "editingSticker";
    const emojis = [
      "😀",
      "😃",
      "😄",
      "😁",
      "😆",
      "😅",
      "🤣",
      "😂",
      "🙂",
      "🙃",
      "😉",
      "😊",
      "😇",
      "🥰",
      "😍",
      "🤩",
      "😘",
      "😗",
      "😚",
      "😙",
      "😋",
      "😛",
      "😜",
      "🤪",
      "😝",
      "🤑",
      "🤗",
      "🤭",
      "🤫",
      "🤔",
      "🤐",
      "🤨",
      "😐",
      "😑",
      "😶",
      "😏",
      "😒",
      "🙄",
      "😬",
      "🤥",
      "😌",
      "😔",
      "😪",
      "🤤",
      "😴",
      "😷",
      "🤒",
      "🤕",
      "🤢",
      "🤮",
      "🤧",
      "🥵",
      "🥶",
      "😶‍🌫️",
      "😵",
      "😵‍💫",
      "🤯",
      "🤠",
      "🥳",
      "🥸",
      "😎",
      "🤓",
      "🧐",
      "💯",
      "💢",
      "💥",
      "💫",
      "💦",
      "💨",
      "🕳️",
      "💣",
      "💬",
      "👁️‍🗨️",
      "🗨️",
      "🗯️",
      "💭",
      "💤",
      "👋",
      "🤚",
      "🖐️",
      "✋",
      "🖖",
      "👌",
      "🤌",
      "🤏",
      "✌️",
      "🤞",
      "🤟",
      "🤘",
      "🤙",
      "👈",
      "👉",
      "👆",
      "🖕",
      "👇",
      "☝️",
      "👍",
      "👎",
      "✊",
      "👊",
      "🤛",
      "🤜",
      "👏",
      "🙌",
      "👐",
      "🤲",
      "🤝",
      "🙏",
      "✍️",
      "💪",
      "🦾",
      "🦿",
      "🦵",
      "🦶",
      "👂",
      "🦻",
      "👃",
      "🧠",
      "🫀",
      "🫁",
      "🦷",
      "🦴",
      "👀",
      "👁️",
      "👅",
      "👄",
      "💋",
      "💘",
      "💝",
      "💖",
      "💗",
      "💓",
      "💞",
      "💕",
      "💟",
      "❣️",
      "💔",
      "❤️",
      "🧡",
      "💛",
      "💚",
      "💙",
      "💜",
      "🖤",
      "🤍",
      "🤎",
      "💯",
      "💢",
      "💥",
      "💫",
      "💦",
      "💨",
      "🕳️",
      "💣",
      "💬",
      "👁️‍🗨️",
      "🗨️",
      "🗯️",
      "💭",
      "💤",
    ];

    return `
      <div class="panel-section">
        <h3 class="panel-title">스티커 추가</h3>
        <div class="emoji-grid" style="display: grid; grid-template-columns: repeat(6, 1fr); gap: 8px; max-height: 400px; overflow-y: auto; padding: 8px 0;">
          ${emojis
            .map(
              (emoji) => `
            <button class="emoji-btn" data-emoji="${emoji}" onclick="EditorCore.BottomSheetManager.addSticker('${emoji}')" style="width: 100%; aspect-ratio: 1; border: 1px solid #eee; border-radius: 8px; background: white; font-size: 24px; cursor: pointer; transition: all 0.2s;" onmouseenter="this.style.background='#f5f5f5'; this.style.borderColor='#ff5e00'" onmouseleave="this.style.background='white'; this.style.borderColor='#eee'">${emoji}</button>
          `
            )
            .join("")}
        </div>
      </div>
    `;
  },

  addSticker(emoji) {
    EditorCore.LayerManager.addStickerLayer({
      stickerId: emoji,
      x: 50,
      y: 50,
      scale: 1.0,
    });

    EditorCore.LayerManager.render();
    EditorCore.state.mode = "idle";
    this.close();
  },

  renderAdjustPanel() {
    const slotId = EditorCore.state.selectedSlotId;
    const layer = EditorCore.LayerManager.layers.find(
      (l) => l.slotId === slotId || l.id === EditorCore.state.selectedLayerId
    );

    if (!layer || layer.type !== "image") {
      return `<div class="panel-section"><div class="panel-hint">이미지를 선택해주세요</div></div>`;
    }

    return `
      <div class="panel-section" style="padding: 12px;">
        <h3 class="panel-title" style="font-size: 16px; margin-bottom: 12px;">조정</h3>
        <div class="adjust-options-grid" style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 6px;">
          <div style="grid-column: 1 / -1; font-size: 11px; color: #666; margin-bottom: 4px; font-weight: 500;">이미지 맞춤</div>
          <button class="adjust-btn ${layer.fitMode === "fit" ? "active" : ""}" 
                  onclick="EditorCore.LayerManager.updateLayer('${
                    layer.id
                  }', {fitMode: 'fit'}); EditorCore.LayerManager.render();"
                  style="padding: 6px 4px; border: 1px solid #ddd; border-radius: 6px; background: white; font-size: 11px; min-height: 32px;">
            Fit
          </button>
          <button class="adjust-btn ${
            layer.fitMode === "fill" ? "active" : ""
          }" 
                  onclick="EditorCore.LayerManager.updateLayer('${
                    layer.id
                  }', {fitMode: 'fill'}); EditorCore.LayerManager.render();"
                  style="padding: 6px 4px; border: 1px solid #ddd; border-radius: 6px; background: white; font-size: 11px; min-height: 32px;">
            Fill
          </button>
          <button class="adjust-btn" onclick="EditorCore.LayerManager.updateLayer('${
            layer.id
          }', {offsetX: 0, offsetY: 0}); EditorCore.LayerManager.render();"
                  style="padding: 6px 4px; border: 1px solid #ddd; border-radius: 6px; background: white; font-size: 11px; min-height: 32px;">
            중앙
          </button>

          <div style="grid-column: 1 / -1; font-size: 11px; color: #666; margin-top: 8px; margin-bottom: 4px; font-weight: 500;">대표 설정</div>
          <button class="adjust-btn ${
            EditorCore.state.coverBlockId === layer.id ? "active" : ""
          }" 
                  onclick="EditorCore.setCoverBlock('${layer.id}');"
                  style="grid-column: 1 / -1; padding: 8px 4px; border: 1px solid ${
                    EditorCore.state.coverBlockId === layer.id
                      ? "#ff5e00"
                      : "#ddd"
                  }; border-radius: 6px; background: ${
      EditorCore.state.coverBlockId === layer.id ? "#fff5f0" : "white"
    }; color: ${
      EditorCore.state.coverBlockId === layer.id ? "#ff5e00" : "#333"
    }; font-size: 12px; min-height: 36px; font-weight: 600;">
            ${
              EditorCore.state.coverBlockId === layer.id
                ? "✓ 현재 대표 블록"
                : "대표 블록으로 설정"
            }
          </button>

          <div style="grid-column: 1 / -1; font-size: 11px; color: #666; margin-top: 8px; margin-bottom: 4px; font-weight: 500;">크기 조정</div>
          <button class="adjust-btn" onclick="(() => { const currentLayer = EditorCore.LayerManager.layers.find(l => l.id === '${
            layer.id
          }'); if (currentLayer) { EditorCore.LayerManager.updateLayer('${
      layer.id
    }', {scale: Math.max(0.5, (currentLayer.scale || 1) - 0.1)}); EditorCore.LayerManager.render(); } })();"
                  style="padding: 6px 4px; border: 1px solid #ddd; border-radius: 6px; background: white; font-size: 11px; min-height: 32px;">
            축소
          </button>
          <button class="adjust-btn" onclick="(() => { const currentLayer = EditorCore.LayerManager.layers.find(l => l.id === '${
            layer.id
          }'); if (currentLayer) { EditorCore.LayerManager.updateLayer('${
      layer.id
    }', {scale: Math.min(3, (currentLayer.scale || 1) + 0.1)}); EditorCore.LayerManager.render(); } })();"
                  style="padding: 6px 4px; border: 1px solid #ddd; border-radius: 6px; background: white; font-size: 11px; min-height: 32px;">
            확대
          </button>
          <button class="adjust-btn" onclick="EditorCore.LayerManager.updateLayer('${
            layer.id
          }', {scale: 1}); EditorCore.LayerManager.render();"
                  style="padding: 6px 4px; border: 1px solid #ddd; border-radius: 6px; background: white; font-size: 11px; min-height: 32px;">
            리셋
          </button>
        </div>
        <div style="margin-top: 8px; font-size: 10px; color: #666; line-height: 1.4;">
          이미지를 드래그하여 위치를 조정하거나 핀치하여 크기를 조정할 수 있습니다.
        </div>
      </div>

    `;
  },

  renderAlignPanel() {
    return `
      <div class="panel-section">
        <h3 class="panel-title">정렬</h3>
        <div class="panel-hint">정렬 기능은 준비 중입니다</div>
      </div>
    `;
  },

  renderLayoutPanel() {
    return `
      <div class="panel-section">
        <h3 class="panel-title">레이아웃</h3>
        <div class="panel-hint">레이아웃 변경 기능은 준비 중입니다</div>
      </div>
    `;
  },

  renderMoodPanel() {
    return `
      <div class="panel-section">
        <h3 class="panel-title">무드 선택</h3>
        <div class="mood-preset-grid">
          ${EditorCore.MoodPresetManager.renderMoodPresets()}
        </div>
      </div>
    `;
  },

  renderBackgroundPanel() {
    EditorCore.state.mode = "editingBackground";
    return `
      <div class="panel-section" style="padding: 12px;">
        <h3 class="panel-title" style="font-size: 16px; margin-bottom: 12px;">배경색 변경</h3>
        <div class="color-palette-grid" style="display: grid; grid-template-columns: repeat(6, 1fr); gap: 6px;">
          ${COLOR_PALETTE.map(
            (color, idx) => `
            <button class="bg-color-swatch" data-color="${color}" onclick="EditorCore.BottomSheetManager.setBackgroundColor('${color}')" style="width: 100%; aspect-ratio: 1; border: 2px solid ${
              color === "#FFFFFF" ? "#ddd" : "transparent"
            }; border-radius: 6px; background: ${color}; cursor: pointer; transition: transform 0.2s;" onmouseenter="this.style.transform='scale(1.1)'" onmouseleave="this.style.transform='scale(1)'"></button>
          `
          ).join("")}
        </div>
      </div>
    `;
  },

  setBackgroundColor(color) {
    if (EditorCore.CanvasManager.canvas) {
      EditorCore.CanvasManager.canvas.style.background = color;
    }
    EditorCore.state.mode = "idle";
    this.close();
  },

  renderEffectPanel() {
    EditorCore.state.mode = "editingEffect";
    const selectedLayer = EditorCore.LayerManager.layers.find(
      (l) => l.id === EditorCore.state.selectedLayerId
    );

    if (!selectedLayer) {
      return `
        <div class="panel-section">
          <h3 class="panel-title">효과</h3>
          <div class="panel-hint">효과를 적용할 객체를 선택해주세요</div>
        </div>
      `;
    }

    return `
      <div class="panel-section" style="padding: 12px;">
        <h3 class="panel-title" style="font-size: 16px; margin-bottom: 12px;">효과 적용</h3>
        
        <div class="effect-options-grid" style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 6px;">
          <div style="grid-column: 1 / -1; font-size: 11px; color: #666; margin-bottom: 4px; font-weight: 500;">그림자</div>
          <button onclick="EditorCore.BottomSheetManager.applyEffect('shadow', 'none')" style="padding: 6px 4px; border: 1px solid #ddd; border-radius: 6px; background: white; font-size: 11px; min-height: 32px;">없음</button>
          <button onclick="EditorCore.BottomSheetManager.applyEffect('shadow', 'light')" style="padding: 6px 4px; border: 1px solid #ddd; border-radius: 6px; background: white; font-size: 11px; min-height: 32px;">약함</button>
          <button onclick="EditorCore.BottomSheetManager.applyEffect('shadow', 'medium')" style="padding: 6px 4px; border: 1px solid #ddd; border-radius: 6px; background: white; font-size: 11px; min-height: 32px;">보통</button>
          <button onclick="EditorCore.BottomSheetManager.applyEffect('shadow', 'strong')" style="padding: 6px 4px; border: 1px solid #ddd; border-radius: 6px; background: white; font-size: 11px; min-height: 32px;">강함</button>

          <div style="grid-column: 1 / -1; font-size: 11px; color: #666; margin-top: 8px; margin-bottom: 4px; font-weight: 500;">테두리</div>
          <button onclick="EditorCore.BottomSheetManager.applyEffect('border', 'none')" style="padding: 6px 4px; border: 1px solid #ddd; border-radius: 6px; background: white; font-size: 11px; min-height: 32px;">없음</button>
          <button onclick="EditorCore.BottomSheetManager.applyEffect('border', 'thin')" style="padding: 6px 4px; border: 1px solid #ddd; border-radius: 6px; background: white; font-size: 11px; min-height: 32px;">얇게</button>
          <button onclick="EditorCore.BottomSheetManager.applyEffect('border', 'medium')" style="padding: 6px 4px; border: 1px solid #ddd; border-radius: 6px; background: white; font-size: 11px; min-height: 32px;">보통</button>
          <button onclick="EditorCore.BottomSheetManager.applyEffect('border', 'thick')" style="padding: 6px 4px; border: 1px solid #ddd; border-radius: 6px; background: white; font-size: 11px; min-height: 32px;">두껍게</button>

          <div style="grid-column: 1 / -1; font-size: 11px; color: #666; margin-top: 8px; margin-bottom: 4px; font-weight: 500;">라운드</div>
          <button onclick="EditorCore.BottomSheetManager.applyEffect('radius', '0')" style="padding: 6px 4px; border: 1px solid #ddd; border-radius: 6px; background: white; font-size: 11px; min-height: 32px;">없음</button>
          <button onclick="EditorCore.BottomSheetManager.applyEffect('radius', '8')" style="padding: 6px 4px; border: 1px solid #ddd; border-radius: 6px; background: white; font-size: 11px; min-height: 32px;">약함</button>
          <button onclick="EditorCore.BottomSheetManager.applyEffect('radius', '16')" style="padding: 6px 4px; border: 1px solid #ddd; border-radius: 6px; background: white; font-size: 11px; min-height: 32px;">보통</button>
          <button onclick="EditorCore.BottomSheetManager.applyEffect('radius', '24')" style="padding: 6px 4px; border: 1px solid #ddd; border-radius: 6px; background: white; font-size: 11px; min-height: 32px;">강함</button>

          <div style="grid-column: 1 / -1; font-size: 11px; color: #666; margin-top: 8px; margin-bottom: 4px; font-weight: 500;">블러</div>
          <button onclick="EditorCore.BottomSheetManager.applyEffect('blur', 'none')" style="padding: 6px 4px; border: 1px solid #ddd; border-radius: 6px; background: white; font-size: 11px; min-height: 32px;">없음</button>
          <button onclick="EditorCore.BottomSheetManager.applyEffect('blur', 'light')" style="padding: 6px 4px; border: 1px solid #ddd; border-radius: 6px; background: white; font-size: 11px; min-height: 32px;">약함</button>
          <button onclick="EditorCore.BottomSheetManager.applyEffect('blur', 'medium')" style="padding: 6px 4px; border: 1px solid #ddd; border-radius: 6px; background: white; font-size: 11px; min-height: 32px;">보통</button>
          <div></div>
        </div>
      </div>
    `;
  },

  applyEffect(type, value) {
    const layer = EditorCore.LayerManager.layers.find(
      (l) => l.id === EditorCore.state.selectedLayerId
    );
    if (!layer) {
      console.warn(
        "[BottomSheetManager] applyEffect: 레이어를 찾을 수 없습니다"
      );
      return;
    }

    if (!layer.effects) layer.effects = {};

    if (value === "none") {
      delete layer.effects[type];
    } else {
      layer.effects[type] = value;
    }

    EditorCore.LayerManager.updateLayer(layer.id, { effects: layer.effects });
    EditorCore.LayerManager.render();
    EditorCore.state.mode = "idle";
    this.close();
  },

  // loadUserCuts 제거 (openCutPicker로 통합)

  addText() {
    const input = document.getElementById("textInput");
    if (!input || !input.value.trim()) return;

    // 선택된 색상과 크기 가져오기
    const selectedColorBtn = document.querySelector(".color-swatch.active");
    const selectedSizeBtn = document.querySelector(".text-size-btn.active");
    const color = selectedColorBtn ? selectedColorBtn.dataset.color : "#333333";
    const fontSize = selectedSizeBtn
      ? parseInt(selectedSizeBtn.dataset.size)
      : 16;

    EditorCore.LayerManager.addTextLayer({
      content: input.value.trim(),
      x: 50,
      y: 50,
      fontSize,
      color,
    });

    EditorCore.LayerManager.render();
    EditorCore.state.mode = "idle";
    this.close();
  },
};

// =========================
// 전역 함수 (HTML에서 호출용)
// =========================
window.EditorCore = EditorCore;
window.selectMode = (mode) => EditorCore.selectMode(mode);
window.selectTemplate = (id) => EditorCore.selectTemplate(id);
window.backToModeSelector = () => EditorCore.backToModeSelector();

// =========================
// 초기화
// =========================
document.addEventListener("DOMContentLoaded", async () => {
  await EditorCore.init();
  EditorCore.BottomSheetManager.init();
  EditorCore.ToolbarManager.init();
});
