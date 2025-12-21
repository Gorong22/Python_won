// =========================
// IMPORTS & SETUP
// =========================
import { getSupabase } from "./supabase-auth.js";

let supabaseClient = null;
let currentMoodboardId = null;
let currentUserId = null;
let moodboardData = null;
let blocks = [];
let isEditMode = false;
let selectedBlockId = null;
let isDragging = false;
let dragStart = { x: 0, y: 0 };
let blockStartPos = { x: 0, y: 0 };

// =========================
// INITIALIZATION
// =========================
document.addEventListener("DOMContentLoaded", async () => {
  await initializeSupabase();
  await getCurrentUser();
  await loadMoodboardFromURL();
  initializeEventListeners();
  loadPresetGrids();
});

async function initializeSupabase() {
  supabaseClient = getSupabase();
  if (!supabaseClient) {
    console.error("[Moodboard] Supabase client 초기화 실패");
  }
}

async function getCurrentUser() {
  try {
    if (typeof window.getCurrentFirebaseUser === "function") {
      const user = await window.getCurrentFirebaseUser();
      if (user) {
        currentUserId = user.uid;
        checkEditPermission();
      }
    }
  } catch (error) {
    console.error("[Moodboard] 사용자 확인 오류:", error);
  }
}

function checkEditPermission() {
  if (currentUserId && moodboardData && moodboardData.user_id === currentUserId) {
    document.getElementById("editBtn").style.display = "block";
  }
}

async function loadMoodboardFromURL() {
  const urlParams = new URLSearchParams(window.location.search);
  const id = urlParams.get("id");
  
  if (!id) {
    alert("무드보드 ID가 없습니다.");
    history.back();
    return;
  }

  currentMoodboardId = id;
  await loadMoodboard(id);
  await loadBlocks(id);
  await loadCreatorInfo();
  renderBlocks();
}

async function loadMoodboard(id) {
  try {
    const { data, error } = await supabaseClient
      .from("moodboards")
      .select("*")
      .eq("id", id)
      .single();

    if (error) throw error;
    if (!data) {
      alert("무드보드를 찾을 수 없습니다.");
      history.back();
      return;
    }

    moodboardData = data;
    document.getElementById("moodboardTitle").textContent = data.name || "무드보드";
  } catch (error) {
    console.error("[Moodboard] 로드 오류:", error);
    alert("무드보드를 불러오는 중 오류가 발생했습니다.");
  }
}

async function loadBlocks(moodboardId) {
  try {
    const { data, error } = await supabaseClient
      .from("moodboard_blocks")
      .select("*")
      .eq("moodboard_id", moodboardId)
      .order("z_index", { ascending: true });

    if (error) throw error;
    blocks = data || [];
  } catch (error) {
    console.error("[Moodboard] 블록 로드 오류:", error);
    blocks = [];
  }
}

async function loadCreatorInfo() {
  if (!moodboardData || !moodboardData.user_id) return;

  try {
    // readers 테이블에서 조회
    const { data: reader } = await supabaseClient
      .from("readers")
      .select("nickname, avatar_url")
      .eq("id", moodboardData.user_id)
      .single();

    if (reader) {
      document.getElementById("creatorName").textContent = reader.nickname || "독자";
      return;
    }

    // creators 테이블에서 조회
    const { data: creator } = await supabaseClient
      .from("creators")
      .select("display_name, avatar_url")
      .eq("id", moodboardData.user_id)
      .single();

    if (creator) {
      document.getElementById("creatorName").textContent = creator.display_name || "작가";
    }
  } catch (error) {
    console.error("[Moodboard] 작가 정보 로드 오류:", error);
  }
}

// =========================
// RENDERING
// =========================
function renderBlocks() {
  const canvas = document.getElementById("moodboardCanvas");
  if (!canvas) return;

  canvas.innerHTML = "";

  const canvasRect = canvas.getBoundingClientRect();
  const canvasWidth = canvasRect.width - 40; // padding 제외
  const canvasHeight = Math.max(canvasRect.height, 600);

  blocks.forEach((block) => {
    const blockElement = createBlockElement(block, canvasWidth, canvasHeight);
    canvas.appendChild(blockElement);
  });

  // Canvas 높이 조정
  const maxBottom = Math.max(
    ...blocks.map((block) => {
      const y = block.y * canvasHeight;
      const h = block.h * canvasHeight;
      return y + h;
    }),
    600
  );
  canvas.style.minHeight = `${maxBottom + 40}px`;
}

function createBlockElement(block, canvasWidth, canvasHeight) {
  const div = document.createElement("div");
  div.className = `moodboard-block type-${block.type}`;
  div.dataset.blockId = block.id;

  // 위치 및 크기 계산 (0~1 비율을 픽셀로 변환)
  const x = block.x * canvasWidth;
  const y = block.y * canvasHeight;
  const w = block.w * canvasWidth;
  const h = block.h * canvasHeight;

  div.style.left = `${x}px`;
  div.style.top = `${y}px`;
  div.style.width = `${w}px`;
  div.style.height = `${h}px`;
  div.style.zIndex = block.z_index || 1;

  // Style JSON을 inline style로 변환
  if (block.style && typeof block.style === "object") {
    applyBlockStyle(div, block.style);
  }

  // 타입별 콘텐츠 렌더링
  renderBlockContent(div, block);

  // 이벤트 리스너
  div.addEventListener("click", (e) => {
    if (isEditMode) {
      e.stopPropagation();
      selectBlock(block.id);
    } else {
      // 상세 보기 모드에서는 블록 클릭 시 아무 동작 없음
    }
  });

  return div;
}

function applyBlockStyle(element, style) {
  if (!style || typeof style !== "object") return;

  // 폰트 스타일
  if (style.fontSize) element.style.fontSize = `${style.fontSize}px`;
  if (style.fontWeight) element.style.fontWeight = style.fontWeight;
  if (style.fontFamily) element.style.fontFamily = style.fontFamily;
  if (style.color) element.style.color = style.color;
  if (style.textAlign) element.style.textAlign = style.textAlign;
  if (style.lineHeight) element.style.lineHeight = style.lineHeight;

  // 배경
  if (style.backgroundColor) element.style.backgroundColor = style.backgroundColor;
  if (style.backgroundImage) element.style.backgroundImage = `url(${style.backgroundImage})`;
  if (style.backgroundSize) element.style.backgroundSize = style.backgroundSize;

  // 테두리
  if (style.borderWidth) element.style.borderWidth = `${style.borderWidth}px`;
  if (style.borderColor) element.style.borderColor = style.borderColor;
  if (style.borderStyle) element.style.borderStyle = style.borderStyle;
  if (style.borderRadius) element.style.borderRadius = `${style.borderRadius}px`;

  // 그림자
  if (style.boxShadow) element.style.boxShadow = style.boxShadow;

  // 필터
  if (style.filter) element.style.filter = style.filter;
  if (style.opacity !== undefined) element.style.opacity = style.opacity;

  // 기타
  if (style.padding) element.style.padding = style.padding;
  if (style.margin) element.style.margin = style.margin;
}

function renderBlockContent(element, block) {
  switch (block.type) {
    case "cut":
      if (block.style?.imageUrl) {
        const img = document.createElement("img");
        img.src = block.style.imageUrl;
        img.alt = "컷";
        element.appendChild(img);
      }
      break;

    case "text":
      const textDiv = document.createElement("div");
      textDiv.className = "text-content";
      textDiv.textContent = block.style?.text || "텍스트";
      if (isEditMode) {
        textDiv.contentEditable = true;
        textDiv.addEventListener("blur", () => {
          updateBlockStyle(block.id, { text: textDiv.textContent });
        });
      }
      element.appendChild(textDiv);
      break;

    case "emoji":
      element.textContent = block.style?.emoji || "😊";
      break;

    case "color":
      // 색상 블록은 배경색만 있으면 됨
      break;
  }
}

// =========================
// EDIT MODE
// =========================
function toggleEditMode() {
  isEditMode = !isEditMode;
  const canvas = document.getElementById("moodboardCanvas");
  const editorPanel = document.getElementById("editorPanel");
  const editBtn = document.getElementById("editBtn");
  const saveBtn = document.getElementById("saveBtn");
  const followBtn = document.getElementById("followBtn");

  if (isEditMode) {
    canvas.classList.add("edit-mode");
    editorPanel.style.display = "block";
    editBtn.style.display = "none";
    saveBtn.style.display = "block";
    followBtn.style.display = "none";
    enableBlockDragging();
  } else {
    canvas.classList.remove("edit-mode");
    editorPanel.style.display = "none";
    editBtn.style.display = "block";
    saveBtn.style.display = "none";
    followBtn.style.display = "block";
    selectedBlockId = null;
    disableBlockDragging();
    renderBlocks(); // 재렌더링하여 편집 모드 스타일 제거
  }
}

function enableBlockDragging() {
  const canvas = document.getElementById("moodboardCanvas");
  canvas.addEventListener("mousedown", handleCanvasMouseDown);
  document.addEventListener("mousemove", handleMouseMove);
  document.addEventListener("mouseup", handleMouseUp);
}

function disableBlockDragging() {
  const canvas = document.getElementById("moodboardCanvas");
  canvas.removeEventListener("mousedown", handleCanvasMouseDown);
  document.removeEventListener("mousemove", handleMouseMove);
  document.removeEventListener("mouseup", handleMouseUp);
}

function handleCanvasMouseDown(e) {
  const blockElement = e.target.closest(".moodboard-block");
  if (!blockElement) return;

  e.preventDefault();
  selectedBlockId = blockElement.dataset.blockId;
  selectBlock(selectedBlockId);

  isDragging = true;
  const canvas = document.getElementById("moodboardCanvas");
  const canvasRect = canvas.getBoundingClientRect();
  dragStart.x = e.clientX - canvasRect.left;
  dragStart.y = e.clientY - canvasRect.top;

  const block = blocks.find((b) => b.id === selectedBlockId);
  if (block) {
    const canvasWidth = canvasRect.width - 40;
    const canvasHeight = canvasRect.height;
    blockStartPos.x = block.x * canvasWidth;
    blockStartPos.y = block.y * canvasHeight;
  }

  blockElement.classList.add("editing");
}

function handleMouseMove(e) {
  if (!isDragging || !selectedBlockId) return;

  const canvas = document.getElementById("moodboardCanvas");
  const canvasRect = canvas.getBoundingClientRect();
  const canvasWidth = canvasRect.width - 40;
  const canvasHeight = canvasRect.height;

  const deltaX = e.clientX - canvasRect.left - dragStart.x;
  const deltaY = e.clientY - canvasRect.top - dragStart.y;

  const newX = Math.max(0, Math.min(blockStartPos.x + deltaX, canvasWidth));
  const newY = Math.max(0, Math.min(blockStartPos.y + deltaY, canvasHeight));

  const blockElement = document.querySelector(`[data-block-id="${selectedBlockId}"]`);
  if (blockElement) {
    blockElement.style.left = `${newX}px`;
    blockElement.style.top = `${newY}px`;
  }
}

function handleMouseUp() {
  if (!isDragging || !selectedBlockId) return;

  const canvas = document.getElementById("moodboardCanvas");
  const canvasRect = canvas.getBoundingClientRect();
  const canvasWidth = canvasRect.width - 40;
  const canvasHeight = canvasRect.height;

  const blockElement = document.querySelector(`[data-block-id="${selectedBlockId}"]`);
  if (blockElement) {
    const rect = blockElement.getBoundingClientRect();
    const x = (rect.left - canvasRect.left) / canvasWidth;
    const y = (rect.top - canvasRect.top) / canvasHeight;
    const w = rect.width / canvasWidth;
    const h = rect.height / canvasHeight;

    updateBlockPosition(selectedBlockId, x, y, w, h);
    blockElement.classList.remove("editing");
  }

  isDragging = false;
}

function selectBlock(blockId) {
  selectedBlockId = blockId;
  document.querySelectorAll(".moodboard-block").forEach((el) => {
    el.classList.remove("selected");
  });
  const blockElement = document.querySelector(`[data-block-id="${blockId}"]`);
  if (blockElement) {
    blockElement.classList.add("selected");
    showStylePanel(blockId);
  }
}

// =========================
// ADD BLOCKS
// =========================
function addBlock(type) {
  if (!currentMoodboardId) return;

  const canvas = document.getElementById("moodboardCanvas");
  const canvasRect = canvas.getBoundingClientRect();
  const canvasWidth = canvasRect.width - 40;
  const canvasHeight = canvasRect.height;

  // 기본 위치와 크기 (중앙 하단)
  const defaultW = type === "cut" ? 0.3 : type === "text" ? 0.4 : 0.2;
  const defaultH = type === "cut" ? 0.4 : type === "text" ? 0.15 : 0.2;
  const defaultX = 0.5 - defaultW / 2;
  const defaultY = 0.7;

  const newBlock = {
    moodboard_id: currentMoodboardId,
    type: type,
    x: defaultX,
    y: defaultY,
    w: defaultW,
    h: defaultH,
    z_index: blocks.length + 1,
    style: getDefaultStyle(type),
  };

  if (type === "cut") {
    openCutSelectionModal(newBlock);
  } else {
    createBlock(newBlock);
  }
}

function getDefaultStyle(type) {
  const baseStyle = {
    fontSize: 16,
    fontWeight: "normal",
    color: "#000",
    backgroundColor: "#fff",
    borderRadius: 4,
  };

  switch (type) {
    case "text":
      return { ...baseStyle, text: "텍스트를 입력하세요" };
    case "emoji":
      return { ...baseStyle, emoji: "😊", backgroundColor: "transparent" };
    case "color":
      return { ...baseStyle, backgroundColor: "#f0f0f0" };
    default:
      return baseStyle;
  }
}

async function createBlock(blockData) {
  try {
    const { data, error } = await supabaseClient
      .from("moodboard_blocks")
      .insert([blockData])
      .select()
      .single();

    if (error) throw error;

    blocks.push(data);
    renderBlocks();
    selectBlock(data.id);
  } catch (error) {
    console.error("[Moodboard] 블록 생성 오류:", error);
    alert("블록을 추가하는 중 오류가 발생했습니다.");
  }
}

// =========================
// CUT SELECTION
// =========================
function openCutSelectionModal(blockData) {
  const modal = document.getElementById("cutSelectionModal");
  const cutGrid = document.getElementById("cutGrid");
  modal.style.display = "flex";
  cutGrid.innerHTML = "";

  loadCuts().then((cuts) => {
    cuts.forEach((cut) => {
      const cutItem = document.createElement("div");
      cutItem.className = "cut-item";
      const img = document.createElement("img");
      img.src = cut.image_url || cut.thumbnail_url || "";
      img.alt = "컷";
      cutItem.appendChild(img);
      cutItem.addEventListener("click", () => {
        blockData.style = {
          ...blockData.style,
          imageUrl: cut.image_url || cut.thumbnail_url,
        };
        createBlock(blockData);
        closeCutSelectionModal();
      });
      cutGrid.appendChild(cutItem);
    });
  });
}

function closeCutSelectionModal() {
  document.getElementById("cutSelectionModal").style.display = "none";
}

async function loadCuts() {
  try {
    const { data, error } = await supabaseClient
      .from("cuts")
      .select("id, image_url, thumbnail_url")
      .limit(50);

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error("[Moodboard] 컷 로드 오류:", error);
    return [];
  }
}

// =========================
// PRESET GRIDS
// =========================
const PRESET_GRIDS = [
  {
    name: "균형잡힌 그리드",
    blocks: [
      { x: 0, y: 0, w: 0.5, h: 0.5, type: "cut" },
      { x: 0.5, y: 0, w: 0.5, h: 0.5, type: "cut" },
      { x: 0, y: 0.5, w: 0.5, h: 0.5, type: "cut" },
      { x: 0.5, y: 0.5, w: 0.5, h: 0.5, type: "cut" },
    ],
  },
  {
    name: "대형 + 소형",
    blocks: [
      { x: 0, y: 0, w: 0.6, h: 0.6, type: "cut" },
      { x: 0.6, y: 0, w: 0.4, h: 0.3, type: "cut" },
      { x: 0.6, y: 0.3, w: 0.4, h: 0.3, type: "cut" },
      { x: 0, y: 0.6, w: 0.3, h: 0.4, type: "cut" },
      { x: 0.3, y: 0.6, w: 0.3, h: 0.4, type: "cut" },
      { x: 0.6, y: 0.6, w: 0.4, h: 0.4, type: "cut" },
    ],
  },
  {
    name: "세로형 레이아웃",
    blocks: [
      { x: 0.25, y: 0, w: 0.5, h: 0.3, type: "cut" },
      { x: 0.25, y: 0.3, w: 0.5, h: 0.3, type: "cut" },
      { x: 0.25, y: 0.6, w: 0.5, h: 0.3, type: "cut" },
    ],
  },
  {
    name: "가로형 레이아웃",
    blocks: [
      { x: 0, y: 0.3, w: 0.33, h: 0.4, type: "cut" },
      { x: 0.33, y: 0.3, w: 0.34, h: 0.4, type: "cut" },
      { x: 0.67, y: 0.3, w: 0.33, h: 0.4, type: "cut" },
    ],
  },
];

function loadPresetGrids() {
  const presetGrids = document.getElementById("presetGrids");
  if (!presetGrids) return;

  PRESET_GRIDS.forEach((preset, index) => {
    const item = document.createElement("div");
    item.className = "preset-grid-item";
    item.innerHTML = `
      <div class="preset-name">${preset.name}</div>
      <div class="preset-preview" id="presetPreview${index}"></div>
    `;
    item.addEventListener("click", () => applyPresetGrid(preset));
    presetGrids.appendChild(item);

    // 프리셋 미리보기 렌더링
    renderPresetPreview(`presetPreview${index}`, preset.blocks);
  });
}

function renderPresetPreview(containerId, blocks) {
  const container = document.getElementById(containerId);
  if (!container) return;

  blocks.forEach((block) => {
    const previewBlock = document.createElement("div");
    previewBlock.className = "preview-block";
    previewBlock.style.left = `${block.x * 100}%`;
    previewBlock.style.top = `${block.y * 100}%`;
    previewBlock.style.width = `${block.w * 100}%`;
    previewBlock.style.height = `${block.h * 100}%`;
    container.appendChild(previewBlock);
  });
}

async function applyPresetGrid(preset) {
  if (!currentMoodboardId) return;

  try {
    const newBlocks = preset.blocks.map((block, index) => ({
      moodboard_id: currentMoodboardId,
      type: block.type || "cut",
      x: block.x,
      y: block.y,
      w: block.w,
      h: block.h,
      z_index: blocks.length + index + 1,
      style: getDefaultStyle(block.type || "cut"),
    }));

    const { data, error } = await supabaseClient
      .from("moodboard_blocks")
      .insert(newBlocks)
      .select();

    if (error) throw error;

    blocks.push(...data);
    renderBlocks();
    alert("프리셋 그리드가 적용되었습니다.");
  } catch (error) {
    console.error("[Moodboard] 프리셋 적용 오류:", error);
    alert("프리셋을 적용하는 중 오류가 발생했습니다.");
  }
}

// =========================
// STYLE PANEL
// =========================
function showStylePanel(blockId) {
  const block = blocks.find((b) => b.id === blockId);
  if (!block) return;

  const stylePanel = document.getElementById("stylePanel");
  stylePanel.innerHTML = "";

  switch (block.type) {
    case "text":
      renderTextStylePanel(stylePanel, block);
      break;
    case "cut":
      renderCutStylePanel(stylePanel, block);
      break;
    case "emoji":
      renderEmojiStylePanel(stylePanel, block);
      break;
    case "color":
      renderColorStylePanel(stylePanel, block);
      break;
  }

  switchEditorTab("style");
}

function renderTextStylePanel(container, block) {
  const style = block.style || {};

  container.innerHTML = `
    <div class="style-group">
      <label class="style-label">텍스트</label>
      <input type="text" class="style-input" id="textContent" value="${style.text || ""}" placeholder="텍스트 입력" />
    </div>
    <div class="style-group">
      <label class="style-label">폰트 크기</label>
      <input type="number" class="style-input" id="fontSize" value="${style.fontSize || 16}" min="8" max="72" />
    </div>
    <div class="style-group">
      <label class="style-label">폰트 굵기</label>
      <select class="style-input" id="fontWeight">
        <option value="normal" ${style.fontWeight === "normal" ? "selected" : ""}>일반</option>
        <option value="bold" ${style.fontWeight === "bold" ? "selected" : ""}>굵게</option>
        <option value="600" ${style.fontWeight === "600" ? "selected" : ""}>세미볼드</option>
      </select>
    </div>
    <div class="style-group">
      <label class="style-label">텍스트 색상</label>
      <input type="color" class="color-picker" id="textColor" value="${style.color || "#000000"}" />
    </div>
    <div class="style-group">
      <label class="style-label">배경 색상</label>
      <input type="color" class="color-picker" id="backgroundColor" value="${style.backgroundColor || "#ffffff"}" />
    </div>
    <div class="style-group">
      <label class="style-label">정렬</label>
      <select class="style-input" id="textAlign">
        <option value="left" ${style.textAlign === "left" ? "selected" : ""}>왼쪽</option>
        <option value="center" ${style.textAlign === "center" ? "selected" : ""}>가운데</option>
        <option value="right" ${style.textAlign === "right" ? "selected" : ""}>오른쪽</option>
      </select>
    </div>
  `;

  // 이벤트 리스너
  container.querySelectorAll("input, select").forEach((input) => {
    input.addEventListener("change", () => updateBlockStyleFromPanel(block.id));
  });
}

function renderCutStylePanel(container, block) {
  const style = block.style || {};

  container.innerHTML = `
    <div class="style-group">
      <label class="style-label">테두리 반경</label>
      <input type="number" class="style-input" id="borderRadius" value="${style.borderRadius || 0}" min="0" max="50" />
    </div>
    <div class="style-group">
      <label class="style-label">불투명도</label>
      <input type="range" class="style-input" id="opacity" min="0" max="1" step="0.1" value="${style.opacity !== undefined ? style.opacity : 1}" />
      <span id="opacityValue">${style.opacity !== undefined ? style.opacity : 1}</span>
    </div>
  `;

  container.querySelectorAll("input").forEach((input) => {
    input.addEventListener("change", () => {
      if (input.id === "opacity") {
        document.getElementById("opacityValue").textContent = input.value;
      }
      updateBlockStyleFromPanel(block.id);
    });
  });
}

function renderEmojiStylePanel(container, block) {
  const style = block.style || {};

  container.innerHTML = `
    <div class="style-group">
      <label class="style-label">이모지</label>
      <input type="text" class="style-input" id="emoji" value="${style.emoji || "😊"}" maxlength="2" />
    </div>
    <div class="style-group">
      <label class="style-label">크기</label>
      <input type="number" class="style-input" id="emojiSize" value="${style.fontSize || 48}" min="24" max="120" />
    </div>
  `;

  container.querySelectorAll("input").forEach((input) => {
    input.addEventListener("change", () => updateBlockStyleFromPanel(block.id));
  });
}

function renderColorStylePanel(container, block) {
  const style = block.style || {};

  container.innerHTML = `
    <div class="style-group">
      <label class="style-label">배경 색상</label>
      <input type="color" class="color-picker" id="backgroundColor" value="${style.backgroundColor || "#f0f0f0"}" />
    </div>
    <div class="style-group">
      <label class="style-label">테두리 반경</label>
      <input type="number" class="style-input" id="borderRadius" value="${style.borderRadius || 0}" min="0" max="50" />
    </div>
  `;

  container.querySelectorAll("input").forEach((input) => {
    input.addEventListener("change", () => updateBlockStyleFromPanel(block.id));
  });
}

function updateBlockStyleFromPanel(blockId) {
  const block = blocks.find((b) => b.id === blockId);
  if (!block) return;

  const stylePanel = document.getElementById("stylePanel");
  const newStyle = { ...block.style };

  switch (block.type) {
    case "text":
      newStyle.text = document.getElementById("textContent")?.value || "";
      newStyle.fontSize = parseInt(document.getElementById("fontSize")?.value || 16);
      newStyle.fontWeight = document.getElementById("fontWeight")?.value || "normal";
      newStyle.color = document.getElementById("textColor")?.value || "#000000";
      newStyle.backgroundColor = document.getElementById("backgroundColor")?.value || "#ffffff";
      newStyle.textAlign = document.getElementById("textAlign")?.value || "left";
      break;
    case "cut":
      newStyle.borderRadius = parseInt(document.getElementById("borderRadius")?.value || 0);
      newStyle.opacity = parseFloat(document.getElementById("opacity")?.value || 1);
      break;
    case "emoji":
      newStyle.emoji = document.getElementById("emoji")?.value || "😊";
      newStyle.fontSize = parseInt(document.getElementById("emojiSize")?.value || 48);
      break;
    case "color":
      newStyle.backgroundColor = document.getElementById("backgroundColor")?.value || "#f0f0f0";
      newStyle.borderRadius = parseInt(document.getElementById("borderRadius")?.value || 0);
      break;
  }

  updateBlockStyle(blockId, newStyle);
}

function updateBlockStyle(blockId, newStyle) {
  const block = blocks.find((b) => b.id === blockId);
  if (!block) return;

  block.style = { ...block.style, ...newStyle };
  renderBlocks();
  selectBlock(blockId);
}

function updateBlockPosition(blockId, x, y, w, h) {
  const block = blocks.find((b) => b.id === blockId);
  if (!block) return;

  block.x = x;
  block.y = y;
  block.w = w;
  block.h = h;
}

// =========================
// SAVE
// =========================
async function saveMoodboard() {
  if (!currentMoodboardId) return;

  try {
    // 모든 블록 업데이트
    const updatePromises = blocks.map((block) =>
      supabaseClient
        .from("moodboard_blocks")
        .update({
          x: block.x,
          y: block.y,
          w: block.w,
          h: block.h,
          z_index: block.z_index,
          style: block.style,
        })
        .eq("id", block.id)
    );

    await Promise.all(updatePromises);
    alert("저장되었습니다.");
    toggleEditMode();
  } catch (error) {
    console.error("[Moodboard] 저장 오류:", error);
    alert("저장 중 오류가 발생했습니다.");
  }
}

// =========================
// UTILITIES
// =========================
function switchEditorTab(tabName) {
  document.querySelectorAll(".editor-tab").forEach((tab) => {
    tab.classList.remove("active");
    if (tab.dataset.tab === tabName) {
      tab.classList.add("active");
    }
  });

  document.querySelectorAll(".editor-tab-content").forEach((content) => {
    content.classList.remove("active");
    if (content.id === `editorTab${tabName.charAt(0).toUpperCase() + tabName.slice(1)}`) {
      content.classList.add("active");
    }
  });
}

function handleBack() {
  history.back();
}

function toggleFollow() {
  // 팔로우 기능 구현 (필요시)
  const btn = document.getElementById("followBtn");
  btn.classList.toggle("following");
  btn.textContent = btn.classList.contains("following") ? "팔로잉" : "팔로우";
}

function submitComment() {
  // 댓글 기능 구현 (필요시)
  const input = document.getElementById("commentInput");
  if (input.value.trim()) {
    console.log("댓글:", input.value);
    input.value = "";
  }
}

function initializeEventListeners() {
  // 모달 배경 클릭 시 닫기
  document.getElementById("cutSelectionModal").addEventListener("click", (e) => {
    if (e.target.id === "cutSelectionModal") {
      closeCutSelectionModal();
    }
  });
}

// 전역 함수로 export
window.toggleEditMode = toggleEditMode;
window.saveMoodboard = saveMoodboard;
window.addBlock = addBlock;
window.switchEditorTab = switchEditorTab;
window.openCutSelectionModal = openCutSelectionModal;
window.closeCutSelectionModal = closeCutSelectionModal;
window.handleBack = handleBack;
window.toggleFollow = toggleFollow;
window.submitComment = submitComment;

