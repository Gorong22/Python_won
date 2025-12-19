// ============================
// MOODBOARD CANVAS
// ============================

let grid = null;
let currentBlockId = null;
let blockCounter = 0;
const STORAGE_KEY = "mumumoodboard";
const REPRESENTATIVE_KEY = "mumumoodboard_representative";
const SAVED_CUTS_KEY = "mumusavedcuts";

// Saved cuts data structure
let savedCuts = [];

// Initialize Gridstack
function initMoodboard() {
  const gridEl = document.getElementById("moodboard-grid");
  if (!gridEl || grid) return; // Don't re-initialize if already initialized

  grid = GridStack.init(
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
    gridEl
  );

  // Load saved layout
  loadMoodboard();

  // Save on change
  grid.on("change", function (event, items) {
    saveMoodboard();
  });

  // Handle block settings button click
  gridEl.addEventListener("click", function (e) {
    const settingsBtn = e.target.closest(".block-settings-btn");
    if (settingsBtn) {
      const blockEl = settingsBtn.closest(".grid-stack-item");
      if (blockEl) {
        currentBlockId = blockEl.getAttribute("gs-id");
        openBlockSettingsModal();
      }
    }
  });
}

// Create a block
function createBlock(type, options = {}) {
  blockCounter++;
  const blockId = `block-${Date.now()}-${blockCounter}`;

  const blockData = {
    id: blockId,
    type: type,
    x: options.x || 0,
    y: options.y || 0,
    w: options.w || 4,
    h: options.h || 3,
    bgColor: options.bgColor || "#ffffff",
    content: options.content || getDefaultContent(type),
  };

  const blockEl = document.createElement("div");
  blockEl.className = "grid-stack-item";
  blockEl.setAttribute("gs-id", blockId);
  blockEl.setAttribute("gs-x", blockData.x);
  blockEl.setAttribute("gs-y", blockData.y);
  blockEl.setAttribute("gs-w", blockData.w);
  blockEl.setAttribute("gs-h", blockData.h);
  blockEl.dataset.blockData = JSON.stringify(blockData);

  const contentEl = document.createElement("div");
  contentEl.className = "grid-stack-item-content";
  contentEl.style.backgroundColor = blockData.bgColor;

  const blockInner = document.createElement("div");
  blockInner.className = "moodboard-block";

  // Block header
  const header = document.createElement("div");
  header.className = "block-header";

  const typeLabel = document.createElement("span");
  typeLabel.className = "block-type-label";
  typeLabel.textContent = getBlockTypeLabel(type);

  const settingsBtn = document.createElement("button");
  settingsBtn.className = "block-settings-btn";
  settingsBtn.innerHTML = `
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="8" cy="3" r="1.5" fill="currentColor"/>
      <circle cx="8" cy="8" r="1.5" fill="currentColor"/>
      <circle cx="8" cy="13" r="1.5" fill="currentColor"/>
    </svg>
  `;

  header.appendChild(typeLabel);
  header.appendChild(settingsBtn);

  // Block content
  const content = document.createElement("div");
  content.className = "block-content";
  content.appendChild(createBlockContent(type, blockData.content));

  blockInner.appendChild(header);
  blockInner.appendChild(content);
  contentEl.appendChild(blockInner);
  blockEl.appendChild(contentEl);

  grid.addWidget(blockEl);

  saveMoodboard();
  return blockId;
}

// Create block content based on type
function createBlockContent(type, contentData) {
  switch (type) {
    case "image":
      const imgContainer = document.createElement("div");
      imgContainer.className = "block-image-container";
      if (contentData.url) {
        const img = document.createElement("img");
        img.src = contentData.url;
        img.className = "block-image";
        img.alt = "Saved cut";
        imgContainer.appendChild(img);
      } else {
        const emptyArea = document.createElement("div");
        emptyArea.className = "block-image-empty";
        emptyArea.innerHTML = `
          <div class="empty-icon">🖼️</div>
          <div class="empty-text">저장된 컷을 선택하세요</div>
        `;
        emptyArea.onclick = function () {
          if (currentBlockId) {
            openBlockSettingsModal();
          }
        };
        imgContainer.appendChild(emptyArea);
      }
      return imgContainer;

    case "text":
      const textArea = document.createElement("textarea");
      textArea.className = "block-text";
      textArea.placeholder = "텍스트를 입력하세요...";
      textArea.value = contentData.text || "";
      textArea.addEventListener("input", function () {
        updateBlockContent(currentBlockId, { text: textArea.value });
      });
      return textArea;

    default:
      return document.createElement("div");
  }
}

// Get default content for block type
function getDefaultContent(type) {
  switch (type) {
    case "image":
      return { url: "", cutId: null };
    case "text":
      return { text: "" };
    default:
      return {};
  }
}

// Get block type label
function getBlockTypeLabel(type) {
  const labels = {
    image: "이미지",
    text: "텍스트",
  };
  return labels[type] || type;
}

// Add block modal
function openAddBlockModal() {
  const modal = document.getElementById("addBlockModal");
  if (modal) {
    modal.classList.add("active");
  }
}

function closeAddBlockModal() {
  const modal = document.getElementById("addBlockModal");
  if (modal) {
    modal.classList.remove("active");
  }
}

// Add block function
function addBlock(type) {
  closeAddBlockModal();

  // Find a good position (next available spot)
  const items = grid.save();
  let maxY = 0;
  items.forEach((item) => {
    if (item.y + item.h > maxY) {
      maxY = item.y + item.h;
    }
  });

  createBlock(type, {
    x: 0,
    y: maxY,
    w: 4,
    h: 3,
  });
}

// Block settings modal
function openBlockSettingsModal() {
  if (!currentBlockId) return;

  const blockEl = document.querySelector(`[gs-id="${currentBlockId}"]`);
  if (!blockEl) return;

  const blockData = JSON.parse(blockEl.dataset.blockData || "{}");

  // Show/hide settings based on block type
  const bgColorGroup = document.getElementById("bgColorGroup");
  const imageSelectGroup = document.getElementById("imageSelectGroup");

  if (blockData.type === "text") {
    if (bgColorGroup) bgColorGroup.style.display = "block";
    if (imageSelectGroup) imageSelectGroup.style.display = "none";

    const bgColorInput = document.getElementById("blockBgColor");
    if (bgColorInput) {
      bgColorInput.value = blockData.bgColor || "#ffffff";
    }
  } else if (blockData.type === "image") {
    if (bgColorGroup) bgColorGroup.style.display = "none";
    if (imageSelectGroup) imageSelectGroup.style.display = "block";

    // Populate saved cuts selector
    populateSavedCutsSelector(blockData.content.cutId);
  }

  const modal = document.getElementById("blockSettingsModal");
  if (modal) {
    modal.classList.add("active");
  }
}

function closeBlockSettingsModal() {
  const modal = document.getElementById("blockSettingsModal");
  if (modal) {
    modal.classList.remove("active");
  }
  currentBlockId = null;
}

// Update block background color
document.addEventListener("DOMContentLoaded", function () {
  const bgColorInput = document.getElementById("blockBgColor");
  if (bgColorInput) {
    bgColorInput.addEventListener("change", function () {
      if (currentBlockId) {
        updateBlockBgColor(currentBlockId, this.value);
      }
    });
  }

  // Initialize saved cuts
  loadSavedCuts();
  renderSavedCuts();

  // Close modals on background click
  const modals = document.querySelectorAll(".block-modal");
  modals.forEach((modal) => {
    modal.addEventListener("click", function (e) {
      if (e.target === modal) {
        closeAddBlockModal();
        closeBlockSettingsModal();
      }
    });
  });
});

// Update block background color
function updateBlockBgColor(blockId, color) {
  const blockEl = document.querySelector(`[gs-id="${blockId}"]`);
  if (!blockEl) return;

  const contentEl = blockEl.querySelector(".grid-stack-item-content");
  if (contentEl) {
    contentEl.style.backgroundColor = color;
  }

  const blockData = JSON.parse(blockEl.dataset.blockData || "{}");
  blockData.bgColor = color;
  blockEl.dataset.blockData = JSON.stringify(blockData);

  saveMoodboard();
}

// Update block content
function updateBlockContent(blockId, contentUpdate) {
  const blockEl = document.querySelector(`[gs-id="${blockId}"]`);
  if (!blockEl) return;

  const blockData = JSON.parse(blockEl.dataset.blockData || "{}");
  blockData.content = { ...blockData.content, ...contentUpdate };
  blockEl.dataset.blockData = JSON.stringify(blockData);

  // Update the visual content
  const contentEl = blockEl.querySelector(".block-content");
  if (contentEl) {
    contentEl.innerHTML = "";
    contentEl.appendChild(
      createBlockContent(blockData.type, blockData.content)
    );

    // Re-attach click handler for empty image blocks
    if (blockData.type === "image" && !blockData.content.url) {
      const emptyArea = contentEl.querySelector(".block-image-empty");
      if (emptyArea) {
        emptyArea.onclick = function () {
          currentBlockId = blockId;
          openBlockSettingsModal();
        };
      }
    }
  }

  saveMoodboard();
}

// Update block image from saved cut
function updateBlockImageFromCut(blockId, cutId) {
  const cut = savedCuts.find((c) => c.id === cutId);
  if (cut) {
    updateBlockContent(blockId, { url: cut.url, cutId: cutId });
    closeBlockSettingsModal();
  }
}

// Load saved cuts from localStorage
function loadSavedCuts() {
  try {
    const saved = localStorage.getItem(SAVED_CUTS_KEY);
    if (saved) {
      savedCuts = JSON.parse(saved);
    } else {
      // Initialize with some demo cuts (in real app, these come from feed saves)
      savedCuts = [
        {
          id: "cut1",
          url: "assets/random/스크린샷 2025-12-09 14.56.01.webp",
          memo: "",
        },
        { id: "cut2", url: "assets/random/d1.webp", memo: "" },
        {
          id: "cut3",
          url: "assets/random/스크린샷 2025-12-09 15.01.38.webp",
          memo: "",
        },
      ];
      saveSavedCuts();
    }
  } catch (e) {
    console.error("Failed to load saved cuts:", e);
    savedCuts = [];
  }
}

// Save saved cuts to localStorage
function saveSavedCuts() {
  try {
    localStorage.setItem(SAVED_CUTS_KEY, JSON.stringify(savedCuts));
  } catch (e) {
    console.error("Failed to save saved cuts:", e);
  }
}

// Render saved cuts grid
function renderSavedCuts() {
  const grid = document.getElementById("saved-cuts-grid");
  const empty = document.getElementById("saved-cuts-empty");

  if (!grid || !empty) return;

  if (savedCuts.length === 0) {
    grid.style.display = "none";
    empty.style.display = "block";
    return;
  }

  grid.style.display = "grid";
  empty.style.display = "none";
  grid.innerHTML = "";

  savedCuts.forEach((cut) => {
    const item = document.createElement("div");
    item.className = "saved-cut-item";
    item.dataset.cutId = cut.id;
    item.draggable = true;

    const img = document.createElement("img");
    img.src = cut.url;
    img.alt = "Saved cut";
    img.loading = "lazy";

    item.appendChild(img);
    grid.appendChild(item);

    // Click to add to moodboard
    item.addEventListener("click", function () {
      addImageBlockFromCut(cut.id);
    });

    // Drag to moodboard
    item.addEventListener("dragstart", function (e) {
      e.dataTransfer.setData("text/plain", cut.id);
      item.classList.add("dragging");
    });

    item.addEventListener("dragend", function () {
      item.classList.remove("dragging");
    });
  });

  // Handle drop on moodboard
  const moodboardGrid = document.getElementById("moodboard-grid");
  if (moodboardGrid) {
    moodboardGrid.addEventListener("dragover", function (e) {
      e.preventDefault();
    });

    moodboardGrid.addEventListener("drop", function (e) {
      e.preventDefault();
      const cutId = e.dataTransfer.getData("text/plain");
      if (cutId) {
        addImageBlockFromCut(cutId);
      }
    });
  }
}

// Add image block from saved cut
function addImageBlockFromCut(cutId) {
  const cut = savedCuts.find((c) => c.id === cutId);
  if (!cut) return;

  const items = grid.save();
  let maxY = 0;
  items.forEach((item) => {
    if (item.y + item.h > maxY) {
      maxY = item.y + item.h;
    }
  });

  createBlock("image", {
    x: 0,
    y: maxY,
    w: 4,
    h: 3,
    content: { url: cut.url, cutId: cutId },
  });
}

// Populate saved cuts selector in settings modal
function populateSavedCutsSelector(selectedCutId) {
  const selector = document.getElementById("savedCutsSelector");
  if (!selector) return;

  selector.innerHTML = "";

  if (savedCuts.length === 0) {
    selector.innerHTML =
      '<p style="text-align: center; color: #999; padding: 20px;">저장된 컷이 없습니다</p>';
    return;
  }

  savedCuts.forEach((cut) => {
    const item = document.createElement("div");
    item.className = `saved-cut-selector-item ${
      cut.id === selectedCutId ? "selected" : ""
    }`;
    item.dataset.cutId = cut.id;

    const img = document.createElement("img");
    img.src = cut.url;
    img.alt = "Saved cut";

    item.appendChild(img);
    selector.appendChild(item);

    item.addEventListener("click", function () {
      // Remove previous selection
      selector.querySelectorAll(".saved-cut-selector-item").forEach((el) => {
        el.classList.remove("selected");
      });
      // Add selection
      item.classList.add("selected");
      // Update block
      if (currentBlockId) {
        updateBlockImageFromCut(currentBlockId, cut.id);
      }
    });
  });
}

// Duplicate block
function duplicateCurrentBlock() {
  if (!currentBlockId) return;

  const blockEl = document.querySelector(`[gs-id="${currentBlockId}"]`);
  if (!blockEl) return;

  const blockData = JSON.parse(blockEl.dataset.blockData || "{}");
  const gridData =
    blockEl.getAttribute("gs-x") +
    "," +
    blockEl.getAttribute("gs-y") +
    "," +
    blockEl.getAttribute("gs-w") +
    "," +
    blockEl.getAttribute("gs-h");

  const [x, y, w, h] = gridData.split(",").map(Number);

  createBlock(blockData.type, {
    x: x + 1,
    y: y,
    w: w,
    h: h,
    bgColor: blockData.bgColor,
    content: JSON.parse(JSON.stringify(blockData.content)),
  });

  closeBlockSettingsModal();
}

// Delete block
function deleteCurrentBlock() {
  if (!currentBlockId) return;

  if (!confirm("이 블록을 삭제하시겠습니까?")) {
    return;
  }

  const blockEl = document.querySelector(`[gs-id="${currentBlockId}"]`);
  if (blockEl) {
    grid.removeWidget(blockEl);
    saveMoodboard();
  }

  closeBlockSettingsModal();
}

// Save moodboard to localStorage
function saveMoodboard() {
  if (!grid) return;

  const items = grid.save();
  const blocksData = items
    .map((item) => {
      const blockEl = document.querySelector(`[gs-id="${item.id}"]`);
      if (blockEl) {
        return JSON.parse(blockEl.dataset.blockData || "{}");
      }
      return null;
    })
    .filter(Boolean);

  const moodboardData = {
    blocks: blocksData,
    layout: items,
    savedAt: new Date().toISOString(),
  };

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(moodboardData));
  } catch (e) {
    console.error("Failed to save moodboard:", e);
  }
}

// Load moodboard from localStorage
function loadMoodboard() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return;

    const moodboardData = JSON.parse(saved);

    if (moodboardData.blocks && moodboardData.blocks.length > 0) {
      // Clear existing blocks
      grid.removeAll();

      // Restore blocks
      moodboardData.blocks.forEach((blockData) => {
        const blockEl = document.createElement("div");
        blockEl.className = "grid-stack-item";
        blockEl.setAttribute("gs-id", blockData.id);
        blockEl.setAttribute("gs-x", blockData.x || 0);
        blockEl.setAttribute("gs-y", blockData.y || 0);
        blockEl.setAttribute("gs-w", blockData.w || 4);
        blockEl.setAttribute("gs-h", blockData.h || 3);
        blockEl.dataset.blockData = JSON.stringify(blockData);

        const contentEl = document.createElement("div");
        contentEl.className = "grid-stack-item-content";
        contentEl.style.backgroundColor = blockData.bgColor || "#ffffff";

        const blockInner = document.createElement("div");
        blockInner.className = "moodboard-block";

        // Block header
        const header = document.createElement("div");
        header.className = "block-header";

        const typeLabel = document.createElement("span");
        typeLabel.className = "block-type-label";
        typeLabel.textContent = getBlockTypeLabel(blockData.type);

        const settingsBtn = document.createElement("button");
        settingsBtn.className = "block-settings-btn";
        settingsBtn.innerHTML = `
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="8" cy="3" r="1.5" fill="currentColor"/>
            <circle cx="8" cy="8" r="1.5" fill="currentColor"/>
            <circle cx="8" cy="13" r="1.5" fill="currentColor"/>
          </svg>
        `;

        header.appendChild(typeLabel);
        header.appendChild(settingsBtn);

        // Block content
        const content = document.createElement("div");
        content.className = "block-content";
        content.appendChild(
          createBlockContent(blockData.type, blockData.content || {})
        );

        blockInner.appendChild(header);
        blockInner.appendChild(content);
        contentEl.appendChild(blockInner);
        blockEl.appendChild(contentEl);

        grid.addWidget(blockEl);
      });
    }
  } catch (e) {
    console.error("Failed to load moodboard:", e);
  }
}

// Set as representative board
function setAsRepresentative() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) {
      alert("저장된 무드보드가 없습니다.");
      return;
    }

    localStorage.setItem(REPRESENTATIVE_KEY, saved);
    alert("대표 보드로 설정되었습니다.");
  } catch (e) {
    console.error("Failed to set representative board:", e);
    alert("대표 보드 설정에 실패했습니다.");
  }
}

// Reset moodboard
function resetMoodboard() {
  if (!confirm("무드보드를 초기화하시겠습니까? 모든 블록이 삭제됩니다.")) {
    return;
  }

  try {
    localStorage.removeItem(STORAGE_KEY);
    if (grid) {
      grid.removeAll();
    }
    alert("무드보드가 초기화되었습니다.");
  } catch (e) {
    console.error("Failed to reset moodboard:", e);
    alert("무드보드 초기화에 실패했습니다.");
  }
}

// Settings modal functions
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

// Profile image upload
document.addEventListener("DOMContentLoaded", function () {
  const profileImageInput = document.getElementById("profileImageInput");
  if (profileImageInput) {
    profileImageInput.addEventListener("change", function (e) {
      if (e.target.files && e.target.files[0]) {
        const file = e.target.files[0];
        const reader = new FileReader();
        reader.onload = function (event) {
          const preview = document.getElementById("profileImagePreview");
          if (preview) {
            preview.style.backgroundImage = `url(${event.target.result})`;
            preview.style.backgroundSize = "cover";
            preview.style.backgroundPosition = "center";
          }
          // Update the actual profile avatar
          const profileAvatar = document.querySelector(".profile-avatar");
          if (profileAvatar) {
            profileAvatar.style.backgroundImage = `url(${event.target.result})`;
            profileAvatar.style.backgroundSize = "cover";
            profileAvatar.style.backgroundPosition = "center";
          }
        };
        reader.readAsDataURL(file);
      }
    });
  }

  // Close settings modal on background click
  const settingsModal = document.getElementById("settingsModal");
  if (settingsModal) {
    settingsModal.addEventListener("click", function (e) {
      if (e.target === settingsModal) {
        closeSettingsModal();
      }
    });
  }
});

// Logout handler
function handleLogout() {
  if (confirm("로그아웃하시겠습니까?")) {
    // Clear localStorage if needed
    // localStorage.clear();
    alert("로그아웃되었습니다.");
    // window.location.href = "index.html";
  }
}

// Delete account handler
function handleDeleteAccount() {
  if (confirm("정말 계정을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.")) {
    if (confirm("최종 확인: 계정을 삭제하시겠습니까?")) {
      // Clear all data
      localStorage.clear();
      alert("계정이 삭제되었습니다.");
      // window.location.href = "index.html";
    }
  }
}

// Initialize on DOM ready
document.addEventListener("DOMContentLoaded", function () {
  initMoodboard();
});

// Make functions globally available
window.addBlock = addBlock;
window.openAddBlockModal = openAddBlockModal;
window.closeAddBlockModal = closeAddBlockModal;
window.openBlockSettingsModal = openBlockSettingsModal;
window.closeBlockSettingsModal = closeBlockSettingsModal;
window.duplicateCurrentBlock = duplicateCurrentBlock;
window.deleteCurrentBlock = deleteCurrentBlock;
window.setAsRepresentative = setAsRepresentative;
window.initMoodboard = initMoodboard;
window.openSettingsModal = openSettingsModal;
window.closeSettingsModal = closeSettingsModal;
window.resetMoodboard = resetMoodboard;
window.handleLogout = handleLogout;
window.handleDeleteAccount = handleDeleteAccount;
window.addImageBlockFromCut = addImageBlockFromCut;
window.loadSavedCuts = loadSavedCuts;
window.renderSavedCuts = renderSavedCuts;

// Expose savedCuts globally
Object.defineProperty(window, "savedCuts", {
  get: function () {
    return savedCuts;
  },
  set: function (value) {
    savedCuts = value;
  },
  enumerable: true,
  configurable: true,
});
