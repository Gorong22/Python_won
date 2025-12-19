// ============================
// MOODBOARD EDITOR
// ============================

let editorCurrentBlockId = null;
let editorSelectedFolderId = null;

// Initialize editor when modal opens
document.addEventListener("DOMContentLoaded", function () {
  // This will be called when moodboard editor opens
  setupEditorEventListeners();
});

function setupEditorEventListeners() {
  // Add block modal
  const addBlockModal = document.getElementById("addBlockModal");
  if (addBlockModal) {
    addBlockModal.addEventListener("click", function (e) {
      if (e.target === addBlockModal) {
        closeAddBlockModal();
      }
    });
  }

  // Block settings modal
  const blockSettingsModal = document.getElementById("blockSettingsModal");
  if (blockSettingsModal) {
    blockSettingsModal.addEventListener("click", function (e) {
      if (e.target === blockSettingsModal) {
        closeBlockSettingsModal();
      }
    });
  }
}

// Open add block modal
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

// Add block to editor
function addBlock(type) {
  closeAddBlockModal();

  if (typeof window.editorGrid === "undefined" || !window.editorGrid) {
    alert("에디터가 초기화되지 않았습니다.");
    return;
  }

  const items = window.editorGrid.save();
  let maxY = 0;
  items.forEach((item) => {
    if (item.y + item.h > maxY) {
      maxY = item.y + item.h;
    }
  });

  const blockId = `block-${Date.now()}`;
  const blockData = {
    id: blockId,
    type: type,
    x: 0,
    y: maxY,
    w: 4,
    h: 3,
    bgColor: type === "text" ? "#ffffff" : "transparent",
    content: type === "image" ? { url: "", cutId: null } : { text: "" },
  };

  if (typeof window.createEditorBlock === "function") {
    window.createEditorBlock(blockData);
  } else {
    // Fallback: create block directly
    createEditorBlockDirect(blockData);
  }
}

// Create block directly in editor
function createEditorBlockDirect(blockData) {
  if (!window.editorGrid) return;

  const blockEl = document.createElement("div");
  blockEl.className = "grid-stack-item";
  blockEl.setAttribute("gs-id", blockData.id);
  blockEl.setAttribute("gs-x", blockData.x);
  blockEl.setAttribute("gs-y", blockData.y);
  blockEl.setAttribute("gs-w", blockData.w);
  blockEl.setAttribute("gs-h", blockData.h);
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
  typeLabel.textContent = blockData.type === "image" ? "이미지" : "텍스트";

  const settingsBtn = document.createElement("button");
  settingsBtn.className = "block-settings-btn";
  settingsBtn.innerHTML = `
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
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

  if (blockData.type === "image") {
    const empty = document.createElement("div");
    empty.className = "block-image-empty";
    empty.innerHTML =
      '<div class="empty-icon">🖼️</div><div class="empty-text">컷을 선택하세요</div>';
    empty.onclick = function () {
      editorCurrentBlockId = blockData.id;
      openBlockSettings();
    };
    content.appendChild(empty);
  } else if (blockData.type === "text") {
    const textArea = document.createElement("textarea");
    textArea.className = "block-text";
    textArea.value = blockData.content?.text || "";
    textArea.placeholder = "텍스트를 입력하세요...";
    textArea.addEventListener("input", function () {
      updateEditorBlockContent(blockData.id, { text: textArea.value });
    });
    content.appendChild(textArea);
  }

  blockInner.appendChild(header);
  blockInner.appendChild(content);
  contentEl.appendChild(blockInner);
  blockEl.appendChild(contentEl);

  window.editorGrid.addWidget(blockEl);
}

// Open block settings
function openBlockSettings(blockId) {
  editorCurrentBlockId = blockId;

  const blockEl = document.querySelector(
    `#editor-moodboard-grid [gs-id="${blockId}"]`
  );
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
    populateEditorCutsSelector(blockData.content?.cutId);
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
  editorCurrentBlockId = null;
}

// Update editor block content
function updateEditorBlockContent(blockId, contentUpdate) {
  const blockEl = document.querySelector(
    `#editor-moodboard-grid [gs-id="${blockId}"]`
  );
  if (!blockEl) return;

  const blockData = JSON.parse(blockEl.dataset.blockData || "{}");
  blockData.content = { ...blockData.content, ...contentUpdate };
  blockEl.dataset.blockData = JSON.stringify(blockData);

  // Update visual if needed
  if (contentUpdate.url && blockData.type === "image") {
    const contentEl = blockEl.querySelector(".block-content");
    if (contentEl) {
      contentEl.innerHTML = "";
      const img = document.createElement("img");
      img.src = contentUpdate.url;
      img.alt = "Saved cut";
      img.style.width = "100%";
      img.style.height = "100%";
      img.style.objectFit = "cover";
      contentEl.appendChild(img);
    }
  }

  if (typeof window.saveEditorLayout === "function") {
    window.saveEditorLayout();
  }
}

// Update block background color
document.addEventListener("DOMContentLoaded", function () {
  const bgColorInput = document.getElementById("blockBgColor");
  if (bgColorInput) {
    bgColorInput.addEventListener("change", function () {
      if (editorCurrentBlockId) {
        updateEditorBlockBgColor(editorCurrentBlockId, this.value);
      }
    });
  }
});

function updateEditorBlockBgColor(blockId, color) {
  const blockEl = document.querySelector(
    `#editor-moodboard-grid [gs-id="${blockId}"]`
  );
  if (!blockEl) return;

  const contentEl = blockEl.querySelector(".grid-stack-item-content");
  if (contentEl) {
    contentEl.style.backgroundColor = color;
  }

  const blockData = JSON.parse(blockEl.dataset.blockData || "{}");
  blockData.bgColor = color;
  blockEl.dataset.blockData = JSON.stringify(blockData);

  if (typeof window.saveEditorLayout === "function") {
    window.saveEditorLayout();
  }
}

// Populate cuts selector in editor
function populateEditorCutsSelector(selectedCutId) {
  const selector = document.getElementById("savedCutsSelector");
  if (!selector) return;

  if (!editorSelectedFolderId) {
    selector.innerHTML =
      '<p style="text-align: center; color: #999; padding: 20px;">폴더를 선택하세요</p>';
    return;
  }

  if (typeof window.getCutsFromFolder !== "function") {
    selector.innerHTML =
      '<p style="text-align: center; color: #999; padding: 20px;">폴더 데이터를 불러올 수 없습니다</p>';
    return;
  }

  const cuts = window.getCutsFromFolder(editorSelectedFolderId);
  selector.innerHTML = "";

  if (cuts.length === 0) {
    selector.innerHTML =
      '<p style="text-align: center; color: #999; padding: 20px;">이 폴더에 컷이 없습니다</p>';
    return;
  }

  cuts.forEach((cut) => {
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
      selector.querySelectorAll(".saved-cut-selector-item").forEach((el) => {
        el.classList.remove("selected");
      });
      item.classList.add("selected");

      if (editorCurrentBlockId) {
        updateEditorBlockContent(editorCurrentBlockId, {
          url: cut.url,
          cutId: cut.id,
        });
        closeBlockSettingsModal();
      }
    });
  });
}

// Duplicate block
function duplicateCurrentBlock() {
  if (!editorCurrentBlockId || !window.editorGrid) return;

  const blockEl = document.querySelector(
    `#editor-moodboard-grid [gs-id="${editorCurrentBlockId}"]`
  );
  if (!blockEl) return;

  const blockData = JSON.parse(blockEl.dataset.blockData || "{}");
  const x = parseInt(blockEl.getAttribute("gs-x")) || 0;
  const y = parseInt(blockEl.getAttribute("gs-y")) || 0;
  const w = parseInt(blockEl.getAttribute("gs-w")) || 4;
  const h = parseInt(blockEl.getAttribute("gs-h")) || 3;

  const newBlockData = {
    ...blockData,
    id: `block-${Date.now()}`,
    x: x + 1,
    y: y,
    content: JSON.parse(JSON.stringify(blockData.content)),
  };

  createEditorBlockDirect(newBlockData);
  closeBlockSettingsModal();
}

// Delete block
function deleteCurrentBlock() {
  if (!editorCurrentBlockId || !window.editorGrid) return;

  if (!confirm("이 블록을 삭제하시겠습니까?")) {
    return;
  }

  const blockEl = document.querySelector(
    `#editor-moodboard-grid [gs-id="${editorCurrentBlockId}"]`
  );
  if (blockEl) {
    window.editorGrid.removeWidget(blockEl);
    if (typeof window.saveEditorLayout === "function") {
      window.saveEditorLayout();
    }
  }

  closeBlockSettingsModal();
}

// Make functions globally available
window.openAddBlockModal = openAddBlockModal;
window.closeAddBlockModal = closeAddBlockModal;
window.addBlock = addBlock;
window.openBlockSettings = openBlockSettings;
window.closeBlockSettingsModal = closeBlockSettingsModal;
window.duplicateCurrentBlock = duplicateCurrentBlock;
window.deleteCurrentBlock = deleteCurrentBlock;
window.createEditorBlockDirect = createEditorBlockDirect;
window.updateEditorBlockContent = updateEditorBlockContent;
window.populateEditorCutsSelector = populateEditorCutsSelector;
