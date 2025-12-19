// ============================
// MOODBOARD MANAGEMENT
// ============================

const MOODBOARDS_KEY = "mumumoodboards";
const REPRESENTATIVE_KEY = "mumumoodboard_representative";
let moodboards = [];
let currentMoodboardId = null;
let editorGrid = null;

// AppState
const AppState = {
  canvases: new Map(),
  activeCanvasId: null,
  activeMoodboardId: null,
};

// Canvas 인스턴스 생성자
function createCanvas(canvasId, containerEl) {
  const grid = GridStack.init(
    {
      column: 12,
      cellHeight: 50,
      margin: 8,
      minRow: 1,
      float: false,
      animate: true,
      disableOneColumnMode: true,
      resizable: {
        handles: "e, se, s, sw, w",
      },
    },
    containerEl
  );

  const canvas = {
    id: canvasId,
    grid: grid,
    container: containerEl,
    blocks: [],
    thumbnail: null,
  };

  AppState.canvases.set(canvasId, canvas);
  return canvas;
}

// Canvas 인스턴스 가져오기
function getCanvas(canvasId) {
  return AppState.canvases.get(canvasId);
}

// 이미지 블록 추가 액션
function addImageBlock(imageUrl) {
  const activeCanvasId = AppState.activeCanvasId;
  if (!activeCanvasId) return;

  const canvas = getCanvas(activeCanvasId);
  if (!canvas) return;

  const blockId = `block-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  const blockData = {
    id: blockId,
    type: "image",
    content: { url: imageUrl },
    x: 0,
    y: 0,
    w: 4,
    h: 3,
    rotation: 0,
  };

  canvas.blocks.push(blockData);
  renderCanvas(activeCanvasId);
  saveEditorLayout();
}

// Canvas 렌더링
function renderCanvas(canvasId) {
  const canvas = getCanvas(canvasId);
  if (!canvas) return;

  const blocks = canvas.blocks || [];
  const grid = canvas.grid;

  grid.removeAll(false);

  blocks.forEach((blockData) => {
    const blockDOM = createBlockDOM(blockData);
    grid.addWidget(blockDOM);
  });

  grid.compact();
}

// Generate canvas thumbnail
function generateCanvasThumbnail(canvasId) {
  const canvas = getCanvas(canvasId);
  if (!canvas || !canvas.container) return;
  if (typeof html2canvas === "undefined") return;

  setTimeout(() => {
    html2canvas(canvas.container, {
      backgroundColor: "#ffffff",
      scale: 0.5,
      logging: false,
      useCORS: true,
    })
      .then((canvasEl) => {
        const thumbnailDataUrl = canvasEl.toDataURL("image/png");
        canvas.thumbnail = thumbnailDataUrl;

        const board = moodboards.find((b) => b.id === AppState.activeMoodboardId);
        if (board) {
          const canvasData = board.canvases.find((c) => c.canvasId === canvasId);
          if (canvasData) {
            canvasData.thumbnail = thumbnailDataUrl;
            saveMoodboards();
            renderCanvasList(board);
          }
        }
      })
      .catch(() => {});
  }, 100);
}

// 블록 DOM 생성
function createBlockDOM(blockData) {
  const blockEl = document.createElement("div");
  blockEl.className = "grid-stack-item";
  blockEl.setAttribute("gs-id", blockData.id);
  blockEl.setAttribute("gs-x", blockData.x || 0);
  blockEl.setAttribute("gs-y", blockData.y || 0);
  blockEl.setAttribute("gs-w", blockData.w || 4);
  blockEl.setAttribute("gs-h", blockData.h || 3);
  blockEl.dataset.blockId = blockData.id;
  blockEl.dataset.blockType = blockData.type;

  const contentEl = document.createElement("div");
  contentEl.className = "grid-stack-item-content";

  const blockInner = document.createElement("div");
  blockInner.className = "moodboard-block";

  const controls = document.createElement("div");
  controls.className = "block-controls";

  const deleteBtn = document.createElement("button");
  deleteBtn.className = "block-control-btn";
  deleteBtn.dataset.action = "delete-block";
  deleteBtn.textContent = "삭제";

  const rotateBtn = document.createElement("button");
  rotateBtn.className = "block-control-btn";
  rotateBtn.dataset.action = "rotate-block";
  rotateBtn.textContent = "회전";

  controls.appendChild(deleteBtn);
  controls.appendChild(rotateBtn);
  blockInner.appendChild(controls);

  if (blockData.type === "image" && blockData.content?.url) {
    const img = document.createElement("img");
    img.src = blockData.content.url;
    img.alt = "Image block";
    img.style.width = "100%";
    img.style.height = "100%";
    img.style.objectFit = "cover";
    img.style.transform = `rotate(${blockData.rotation || 0}deg)`;
    blockInner.appendChild(img);
  }

  contentEl.appendChild(blockInner);
  blockEl.appendChild(contentEl);

  return blockEl;
}

// Initialize moodboards
function initMoodboards() {
  loadMoodboards();
  renderFeaturedMoodboard();
  renderMoodboards();
}

// Load moodboards from localStorage
function loadMoodboards() {
  try {
    const saved = localStorage.getItem(MOODBOARDS_KEY);
    if (saved) {
      moodboards = JSON.parse(saved);
      moodboards.forEach((board) => {
        if (!board.canvases || board.canvases.length === 0) {
          board.canvases = [{ canvasId: board.id || `canvas-${Date.now()}`, ratio: "1:1", blocks: [], thumbnail: null }];
        }
      });
      saveMoodboards();
    }
  } catch (e) {
    moodboards = [];
  }
}

// Save moodboards
function saveMoodboards() {
  try {
    localStorage.setItem(MOODBOARDS_KEY, JSON.stringify(moodboards));
  } catch (e) {}
}

// Set featured moodboard
function setFeaturedMoodboard(boardId) {
  if (!boardId) return;
  moodboards.forEach((b) => {
    b.is_featured = (b.id === boardId);
  });
  saveMoodboards();
  renderFeaturedMoodboard();
  renderMoodboards();
  closeMoodboardMenu();
}

// Get featured moodboard
function getFeaturedMoodboard() {
  let featured = moodboards.find((b) => b.is_featured);
  if (!featured && moodboards.length > 0) {
    featured = moodboards[0];
  }
  return featured;
}

// Render featured moodboard
function renderFeaturedMoodboard() {
  const featured = document.getElementById("featured-moodboard");
  const empty = document.getElementById("featured-empty");
  if (!featured || !empty) return;

  const board = getFeaturedMoodboard();
  if (!board) {
    featured.style.display = "none";
    empty.style.display = "block";
    return;
  }

  featured.style.display = "block";
  empty.style.display = "none";

  const thumbnailUrl = board.canvases?.[0]?.thumbnail || null;
  const canvasCount = board.canvases?.length || 0;

  featured.innerHTML = `
    <div class="featured-preview" onclick="openMoodboardEditor('${board.id}')">
      <div class="featured-thumbnail">
        ${thumbnailUrl ? `<img src="${thumbnailUrl}" alt="${board.name}" />` : '<div class="featured-placeholder">MUMU</div>'}
      </div>
      <div class="featured-info">
        <p class="featured-name">${board.name || "무제 무드보드"}</p>
        <p class="featured-meta">${canvasCount} Canvases</p>
      </div>
    </div>
  `;
}

// Render moodboards grid
function renderMoodboards() {
  const grid = document.getElementById("moodboards-grid");
  const empty = document.getElementById("moodboards-empty");
  if (!grid || !empty) return;

  if (moodboards.length === 0) {
    grid.style.display = "none";
    empty.style.display = "block";
    return;
  }

  grid.style.display = "grid";
  empty.style.display = "none";
  grid.innerHTML = "";

  moodboards.forEach((board) => {
    const item = document.createElement("div");
    item.className = "moodboard-grid-item";
    item.dataset.id = board.id;

    const thumbnailUrl = board.canvases?.[0]?.thumbnail || null;
    const thumbnail = document.createElement("div");
    thumbnail.className = "moodboard-thumbnail";
    thumbnail.innerHTML = thumbnailUrl ? `<img src="${thumbnailUrl}" alt="${board.name}" />` : '<div class="moodboard-placeholder">MUMU</div>';

    const info = document.createElement("div");
    info.className = "moodboard-info";
    info.innerHTML = `
      <p class="moodboard-name">${board.name || "무제 무드보드"}</p>
      <button class="moodboard-menu-btn" onclick="event.stopPropagation(); currentMoodboardId='${board.id}'; openMoodboardMenu();">
        <span class="material-icons">more_vert</span>
      </button>
    `;

    item.appendChild(thumbnail);
    item.appendChild(info);
    item.onclick = () => openMoodboardEditor(board.id);
    grid.appendChild(item);
  });
}

// Create new moodboard
function createNewMoodboard(name = "무제 무드보드") {
  const id = `mb-${Date.now()}`;
  const newBoard = {
    id: id,
    name: name,
    canvases: [{ canvasId: `canvas-${Date.now()}`, ratio: "1:1", blocks: [], thumbnail: null }],
    isPublic: false,
    isHidden: false,
    createdAt: new Date().toISOString()
  };

  moodboards.push(newBoard);
  saveMoodboards();
  renderMoodboards();
  openMoodboardEditor(newBoard.id);
}

// Open moodboard editor
function openMoodboardEditor(boardId) {
  currentMoodboardId = boardId;
  AppState.activeMoodboardId = boardId;
  
  const saved = localStorage.getItem(MOODBOARDS_KEY);
  if (saved) moodboards = JSON.parse(saved);
  
  const board = moodboards.find((b) => b.id === boardId);
  if (!board) return;

  const modal = document.getElementById("moodboardEditorModal");
  const title = document.getElementById("editor-title");

  if (modal && title) {
    title.textContent = board.name || "무드보드 편집";
    modal.classList.add("active");
    initMoodboardEditor(board);
  }
}

// Initialize editor
function initMoodboardEditor(board) {
  AppState.canvases.clear();
  if (!board.canvases || board.canvases.length === 0) {
    board.canvases = [{ canvasId: `canvas-${Date.now()}`, ratio: "1:1", blocks: [], thumbnail: null }];
    saveMoodboards();
  }

  const firstCanvasId = board.canvases[0].canvasId;
  AppState.activeCanvasId = board.activeCanvasId || firstCanvasId;
  const exists = board.canvases.some(c => c.canvasId === AppState.activeCanvasId);
  if (!exists) AppState.activeCanvasId = firstCanvasId;

  renderEditor(board);
  renderEditorFolders();
}

// Render editor
function renderEditor(board) {
  renderCanvasList(board);
  renderActiveCanvas();
}

// Render canvas list
function renderCanvasList(board) {
  const canvasListEl = document.getElementById("editor-canvas-list");
  if (!canvasListEl) return;

  const canvases = board.canvases || [];
  canvasListEl.innerHTML = "";

  canvases.forEach((canvasData) => {
    const canvasCard = document.createElement("div");
    canvasCard.className = "canvas-card";
    if (canvasData.canvasId === AppState.activeCanvasId) canvasCard.classList.add("active");
    canvasCard.dataset.action = "select-canvas";
    canvasCard.dataset.canvasId = canvasData.canvasId;

    const canvas = getCanvas(canvasData.canvasId);
    const thumbnailUrl = canvas?.thumbnail || canvasData.thumbnail || null;
    const thumbnail = document.createElement("div");
    thumbnail.className = "canvas-card-thumbnail";
    thumbnail.innerHTML = thumbnailUrl ? `<img src="${thumbnailUrl}" alt="Thumbnail" />` : '<div class="canvas-placeholder">📋</div>';

    const info = document.createElement("div");
    info.className = "canvas-card-info";
    info.textContent = `캔버스 ${canvases.indexOf(canvasData) + 1}`;

    const duplicateBtn = document.createElement("button");
    duplicateBtn.className = "canvas-duplicate-btn";
    duplicateBtn.dataset.action = "duplicate-canvas";
    duplicateBtn.dataset.canvasId = canvasData.canvasId;
    duplicateBtn.textContent = "복제";

    canvasCard.appendChild(thumbnail);
    canvasCard.appendChild(info);
    canvasCard.appendChild(duplicateBtn);
    canvasListEl.appendChild(canvasCard);
  });

  const addCanvasBtn = document.createElement("button");
  addCanvasBtn.className = "canvas-card add-canvas-btn";
  addCanvasBtn.dataset.action = "add-canvas";
  addCanvasBtn.innerHTML = `
    <div class="canvas-card-thumbnail"><span class="material-icons">add</span></div>
    <div class="canvas-card-info">추가</div>
  `;
  canvasListEl.appendChild(addCanvasBtn);
}

// Render active canvas
function renderActiveCanvas() {
  const gridEl = document.getElementById("editor-moodboard-grid");
  if (!gridEl) return;

  const activeCanvasId = AppState.activeCanvasId;
  if (!activeCanvasId) return;

  const board = moodboards.find((b) => b.id === AppState.activeMoodboardId);
  if (!board) return;

  const canvasData = board.canvases.find((c) => c.canvasId === activeCanvasId);
  if (!canvasData) return;

  let canvas = getCanvas(activeCanvasId);
  if (!canvas) {
    gridEl.innerHTML = "";
    const containerEl = document.createElement("div");
    containerEl.className = "grid-stack";
    gridEl.appendChild(containerEl);
    canvas = createCanvas(activeCanvasId, containerEl);
    if (canvasData.blocks) canvas.blocks = canvasData.blocks.map(b => ({ ...b }));
    if (canvasData.thumbnail) canvas.thumbnail = canvasData.thumbnail;
  } else {
    gridEl.innerHTML = "";
    gridEl.appendChild(canvas.container);
  }

  editorGrid = canvas.grid;
  window.editorGrid = editorGrid;
  renderCanvas(activeCanvasId);
  editorGrid.off("change");
  editorGrid.on("change", () => saveEditorLayout());
}

function selectCanvas(canvasId) {
  saveEditorLayout();
  AppState.activeCanvasId = canvasId;
  const board = moodboards.find((b) => b.id === AppState.activeMoodboardId);
  if (board) renderEditor(board);
}

function addNewCanvas() {
  const board = moodboards.find((b) => b.id === AppState.activeMoodboardId);
  if (!board) return;
  const newCanvasId = `canvas-${Date.now()}`;
  board.canvases.push({ canvasId: newCanvasId, ratio: "1:1", blocks: [], thumbnail: null });
  AppState.activeCanvasId = newCanvasId;
  saveMoodboards();
  renderEditor(board);
}

function duplicateCanvas(canvasId) {
  const board = moodboards.find((b) => b.id === AppState.activeMoodboardId);
  if (!board) return;
  const source = board.canvases.find((c) => c.canvasId === canvasId);
  if (!source) return;
  const newId = `canvas-${Date.now()}`;
  board.canvases.push({ ...source, canvasId: newId, blocks: source.blocks.map(b => ({ ...b })) });
  AppState.activeCanvasId = newId;
  saveMoodboards();
  renderEditor(board);
}

function saveEditorLayout() {
  if (!currentMoodboardId) return;
  const board = moodboards.find((b) => b.id === currentMoodboardId);
  if (!board) return;
  if (!board.canvases) board.canvases = [];
  if (AppState.activeCanvasId) {
    const activeCanvas = getCanvas(AppState.activeCanvasId);
    if (activeCanvas && activeCanvas.grid) {
      const savedLayout = activeCanvas.grid.save();
      const canvasData = board.canvases.find(c => c.canvasId === AppState.activeCanvasId);
      if (canvasData) {
        canvasData.blocks = savedLayout.map(item => {
          const original = activeCanvas.blocks.find(b => b.id === item.id);
          return { ...original, x:item.x, y:item.y, w:item.w, h:item.h };
        });
        if (activeCanvas.thumbnail) canvasData.thumbnail = activeCanvas.thumbnail;
      }
    }
    board.activeCanvasId = AppState.activeCanvasId;
  }
  saveMoodboards();
}

function saveMoodboardEditor() {
  saveEditorLayout();
  closeMoodboardEditor();
  renderMoodboards();
  renderFeaturedMoodboard();
}

function closeMoodboardEditor() {
  const modal = document.getElementById("moodboardEditorModal");
  if (modal) modal.classList.remove("active");
  AppState.canvases.forEach(c => { if (c.grid) c.grid.destroy(false); });
  AppState.canvases.clear();
  AppState.activeCanvasId = null;
  AppState.activeMoodboardId = null;
  if (window.editorGrid) { window.editorGrid.destroy(false); window.editorGrid = null; }
  editorGrid = null;
  currentMoodboardId = null;
}

function setupEditorEventDelegation() {
  document.addEventListener("click", function (e) {
    const target = e.target.closest("[data-action]");
    if (!target) return;
    const action = target.dataset.action;
    const canvasId = target.dataset.canvasId;
    const blockId = target.closest("[data-block-id]")?.dataset.blockId;
    switch (action) {
      case "select-canvas": selectCanvas(canvasId); break;
      case "add-canvas": addNewCanvas(); break;
      case "duplicate-canvas": e.stopPropagation(); duplicateCanvas(canvasId); break;
      case "delete-block": deleteBlock(blockId); break;
      case "rotate-block": rotateBlock(blockId); break;
      case "set-featured-moodboard": setFeaturedMoodboard(currentMoodboardId); break;
    }
  });

  // Inject Featured Option in Menu
  const menuModal = document.getElementById("moodboardMenuModal");
  if (menuModal) {
    const menuList = menuModal.querySelector(".modal-menu-list");
    if (menuList && !menuList.querySelector("[data-action='set-featured-moodboard']")) {
      const featuredBtn = document.createElement("button");
      featuredBtn.className = "modal-menu-item";
      featuredBtn.dataset.action = "set-featured-moodboard";
      featuredBtn.innerHTML = '<span class="material-icons">star</span><span>대표로 설정</span>';
      menuList.prepend(featuredBtn);
    }
  }
}

function deleteBlock(blockId) {
  const canvas = getCanvas(AppState.activeCanvasId);
  if (!canvas) return;
  canvas.blocks = canvas.blocks.filter((b) => b.id !== blockId);
  renderCanvas(AppState.activeCanvasId);
  saveEditorLayout();
}

function rotateBlock(blockId) {
  const canvas = getCanvas(AppState.activeCanvasId);
  if (!canvas) return;
  const block = canvas.blocks.find((b) => b.id === blockId);
  if (block) {
    block.rotation = (block.rotation || 0) + 90;
    renderCanvas(AppState.activeCanvasId);
    saveEditorLayout();
  }
}

function renderEditorFolders() {
  const folderList = document.getElementById("editor-folder-list");
  if (!folderList) return;
  if (typeof window.initFolders === "function") window.initFolders();
  if (!window.folders) {
    folderList.innerHTML = '<p style="padding: 12px; color: #999; font-size: 12px;">폴더가 없습니다</p>';
    return;
  }
  folderList.innerHTML = "";
  window.folders.forEach((folder) => {
    const item = document.createElement("div");
    item.className = "editor-folder-item";
    item.dataset.folderId = folder.id;
    item.textContent = folder.name;
    item.addEventListener("click", () => {
      folderList.querySelectorAll(".editor-folder-item").forEach(el => el.classList.remove("active"));
      item.classList.add("active");
      if (typeof window.editorSelectedFolderId !== "undefined") window.editorSelectedFolderId = folder.id;
      renderEditorCuts(folder.id);
    });
    folderList.appendChild(item);
  });
  if (window.folders.length > 0) {
    const first = window.folders[0];
    folderList.querySelector(`[data-folder-id="${first.id}"]`)?.classList.add("active");
    if (typeof window.editorSelectedFolderId !== "undefined") window.editorSelectedFolderId = first.id;
    renderEditorCuts(first.id);
  }
}

function renderEditorCuts(folderId) {
  const grid = document.getElementById("editor-cuts-grid");
  const empty = document.getElementById("editor-cuts-empty");
  if (!grid || !empty || typeof window.getCutsFromFolder !== "function") return;
  const cuts = window.getCutsFromFolder(folderId);
  if (cuts.length === 0) { grid.style.display = "none"; empty.style.display = "block"; return; }
  grid.style.display = "grid"; empty.style.display = "none"; grid.innerHTML = "";
  cuts.forEach((cut) => {
    const item = document.createElement("div");
    item.className = "editor-cut-item"; item.draggable = true;
    item.innerHTML = `<img src="${cut.url}" alt="Cut" loading="lazy" />`;
    grid.appendChild(item);
    item.addEventListener("dragstart", (e) => e.dataTransfer.setData("text/plain", JSON.stringify({cutId:cut.id, url:cut.url})));
    item.addEventListener("click", () => addImageBlock(cut.url));
  });
  const cv = document.getElementById("editor-moodboard-grid");
  if (cv) {
    cv.addEventListener("dragover", e => e.preventDefault());
    cv.addEventListener("drop", e => { e.preventDefault(); try { const d = JSON.parse(e.dataTransfer.getData("text/plain")); if (d.url) addImageBlock(d.url); } catch(err){} });
  }
}

function openMoodboardMenu() {
  const modal = document.getElementById("moodboardMenuModal");
  if (modal) modal.classList.add("active");
}

function closeMoodboardMenu() {
  const modal = document.getElementById("moodboardMenuModal");
  if (modal) modal.classList.remove("active");
}

function editMoodboardFromGrid() { if (currentMoodboardId) { closeMoodboardMenu(); openMoodboardEditor(currentMoodboardId); } }

function setMoodboardAsRepresentative() { if (currentMoodboardId) setFeaturedMoodboard(currentMoodboardId); }

function toggleMoodboardPrivacy() { if (currentMoodboardId) { const b = moodboards.find(b => b.id === currentMoodboardId); if (b) { b.isPublic = !b.isPublic; saveMoodboards(); renderMoodboards(); } closeMoodboardMenu(); } }

function hideMoodboard() { if (currentMoodboardId) { const b = moodboards.find(b => b.id === currentMoodboardId); if (b) { b.isHidden = !b.isHidden; saveMoodboards(); renderMoodboards(); } closeMoodboardMenu(); } }

function deleteMoodboard() { if (currentMoodboardId && confirm("이 무드보드를 삭제하시겠습니까?")) { moodboards = moodboards.filter(b => b.id !== currentMoodboardId); saveMoodboards(); renderMoodboards(); renderFeaturedMoodboard(); closeMoodboardMenu(); } }

// Global Exports
window.AppState = AppState;
window.initMoodboards = initMoodboards;
window.createNewMoodboard = createNewMoodboard;
window.openMoodboardEditor = openMoodboardEditor;
window.saveMoodboardEditor = saveMoodboardEditor;
window.closeMoodboardEditor = closeMoodboardEditor;
window.openMoodboardMenu = openMoodboardMenu;
window.closeMoodboardMenu = closeMoodboardMenu;
window.editMoodboardFromGrid = editMoodboardFromGrid;
window.setMoodboardAsRepresentative = setMoodboardAsRepresentative;
window.toggleMoodboardPrivacy = toggleMoodboardPrivacy;
window.hideMoodboard = hideMoodboard;
window.deleteMoodboard = deleteMoodboard;
window.saveEditorLayout = saveEditorLayout;
window.selectCanvas = selectCanvas;
window.addNewCanvas = addNewCanvas;
window.duplicateCanvas = duplicateCanvas;
window.renderEditor = renderEditor;
window.generateCanvasThumbnail = generateCanvasThumbnail;

if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", setupEditorEventDelegation);
else setupEditorEventDelegation();
