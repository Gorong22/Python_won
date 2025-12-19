// ============================
// FOLDER MANAGEMENT
// ============================

const FOLDERS_KEY = "mumufolders";
let folders = [];
let currentFolderId = null;

// Initialize folders
function initFolders() {
  loadFolders();
  renderFolders();
  // Update global reference
  window.folders = folders;
}

// Load folders from localStorage
function loadFolders() {
  try {
    const saved = localStorage.getItem(FOLDERS_KEY);
    if (saved) {
      folders = JSON.parse(saved);
    } else {
      // Initialize with demo folders
      folders = [
        {
          id: "folder1",
          name: "로맨스 컷",
          isPublic: false,
          cuts: [
            {
              id: "cut1",
              url: "assets/random/스크린샷 2025-12-09 14.56.01.webp",
              memo: "",
            },
          ],
        },
        {
          id: "folder2",
          name: "액션 컷",
          isPublic: true,
          cuts: [{ id: "cut2", url: "assets/random/d1.webp", memo: "" }],
        },
      ];
      saveFolders();
    }
  } catch (e) {
    console.error("Failed to load folders:", e);
    folders = [];
  }
}

// Save folders to localStorage
function saveFolders() {
  try {
    localStorage.setItem(FOLDERS_KEY, JSON.stringify(folders));
  } catch (e) {
    console.error("Failed to save folders:", e);
  }
}

// Render folders grid
function renderFolders() {
  const grid = document.getElementById("folders-grid");
  const empty = document.getElementById("folders-empty");

  if (!grid || !empty) return;

  if (folders.length === 0) {
    grid.style.display = "none";
    empty.style.display = "block";
    return;
  }

  grid.style.display = "grid";
  empty.style.display = "none";
  grid.innerHTML = "";

  folders.forEach((folder) => {
    const folderItem = document.createElement("div");
    folderItem.className = "folder-item";
    folderItem.dataset.folderId = folder.id;

    // Thumbnail (first cut or placeholder)
    const thumbnail = document.createElement("div");
    thumbnail.className = "folder-thumbnail";
    if (folder.cuts && folder.cuts.length > 0) {
      const img = document.createElement("img");
      img.src = folder.cuts[0].url;
      img.alt = folder.name;
      img.loading = "lazy";
      thumbnail.appendChild(img);
    } else {
      thumbnail.innerHTML = '<div class="folder-thumbnail-empty">📁</div>';
    }

    // Folder info
    const info = document.createElement("div");
    info.className = "folder-info";

    const name = document.createElement("div");
    name.className = "folder-name";
    name.textContent = folder.name;

    const meta = document.createElement("div");
    meta.className = "folder-meta";
    meta.innerHTML = `
      <span class="folder-count">${
        folder.cuts ? folder.cuts.length : 0
      }개</span>
      <span class="folder-privacy">${
        folder.isPublic ? "🌐 공개" : "🔒 비공개"
      }</span>
    `;

    info.appendChild(name);
    info.appendChild(meta);

    folderItem.appendChild(thumbnail);
    folderItem.appendChild(info);

    // Click to open folder
    folderItem.addEventListener("click", function () {
      openFolder(folder.id);
    });

    grid.appendChild(folderItem);
  });
}

// Create new folder
function createNewFolder() {
  const name = prompt("폴더 이름을 입력하세요:");
  if (!name || name.trim() === "") return;

  const newFolder = {
    id: `folder-${Date.now()}`,
    name: name.trim(),
    isPublic: false,
    cuts: [],
  };

  folders.push(newFolder);
  saveFolders();
  window.folders = folders;
  renderFolders();
}

// Open folder content view
function openFolder(folderId) {
  const folder = folders.find((f) => f.id === folderId);
  if (!folder) return;

  currentFolderId = folderId;

  // Hide folder list, show folder content
  document.getElementById("folder-list-view").style.display = "none";
  const contentView = document.getElementById("folder-content-view");
  contentView.style.display = "block";

  // Update title
  document.getElementById("folder-content-title").textContent = folder.name;

  // Render cuts
  renderFolderCuts(folder);
}

// Render cuts in folder
function renderFolderCuts(folder) {
  const grid = document.getElementById("folder-cuts-grid");
  const empty = document.getElementById("folder-cuts-empty");

  if (!grid || !empty) return;

  if (!folder.cuts || folder.cuts.length === 0) {
    grid.style.display = "none";
    empty.style.display = "block";
    return;
  }

  grid.style.display = "grid";
  empty.style.display = "none";
  grid.innerHTML = "";

  folder.cuts.forEach((cut) => {
    const cutItem = document.createElement("div");
    cutItem.className = "folder-cut-item";
    cutItem.dataset.cutId = cut.id;

    const img = document.createElement("img");
    img.src = cut.url;
    img.alt = "Saved cut";
    img.loading = "lazy";

    const removeBtn = document.createElement("button");
    removeBtn.className = "cut-remove-btn";
    removeBtn.innerHTML = "×";
    removeBtn.onclick = function (e) {
      e.stopPropagation();
      removeCutFromFolder(folder.id, cut.id);
    };

    cutItem.appendChild(img);
    cutItem.appendChild(removeBtn);
    grid.appendChild(cutItem);
  });
}

// Back to folder list
function backToFolderList() {
  document.getElementById("folder-content-view").style.display = "none";
  document.getElementById("folder-list-view").style.display = "block";
  currentFolderId = null;
}

// Remove cut from folder
function removeCutFromFolder(folderId, cutId) {
  if (!confirm("이 컷을 폴더에서 제거하시겠습니까?")) return;

  const folder = folders.find((f) => f.id === folderId);
  if (!folder) return;

  folder.cuts = folder.cuts.filter((c) => c.id !== cutId);
  saveFolders();
  window.folders = folders;

  if (currentFolderId === folderId) {
    renderFolderCuts(folder);
  } else {
    renderFolders();
  }
}

// Folder menu functions
function openFolderMenu() {
  const modal = document.getElementById("folderMenuModal");
  if (modal) {
    modal.classList.add("active");
  }
}

function closeFolderMenu() {
  const modal = document.getElementById("folderMenuModal");
  if (modal) {
    modal.classList.remove("active");
  }
}

function renameCurrentFolder() {
  if (!currentFolderId) return;

  const folder = folders.find((f) => f.id === currentFolderId);
  if (!folder) return;

  closeFolderMenu();

  const modal = document.getElementById("folderNameModal");
  const input = document.getElementById("folderNameInput");
  const title = document.getElementById("folder-name-title");

  if (modal && input && title) {
    title.textContent = "폴더 이름 변경";
    input.value = folder.name;
    modal.classList.add("active");
  }
}

function saveFolderName() {
  if (!currentFolderId) return;

  const input = document.getElementById("folderNameInput");
  if (!input || !input.value.trim()) return;

  const folder = folders.find((f) => f.id === currentFolderId);
  if (folder) {
    folder.name = input.value.trim();
    saveFolders();
    window.folders = folders;
    document.getElementById("folder-content-title").textContent = folder.name;
    renderFolders();
  }

  closeFolderNameModal();
}

function closeFolderNameModal() {
  const modal = document.getElementById("folderNameModal");
  if (modal) {
    modal.classList.remove("active");
    document.getElementById("folderNameInput").value = "";
  }
}

function toggleFolderPrivacy() {
  if (!currentFolderId) return;

  const folder = folders.find((f) => f.id === currentFolderId);
  if (folder) {
    folder.isPublic = !folder.isPublic;
    saveFolders();
    window.folders = folders;
    renderFolders();
  }

  closeFolderMenu();
}

function deleteCurrentFolder() {
  if (!currentFolderId) return;

  if (!confirm("이 폴더를 삭제하시겠습니까? 폴더 안의 모든 컷이 삭제됩니다.")) {
    closeFolderMenu();
    return;
  }

  folders = folders.filter((f) => f.id !== currentFolderId);
  saveFolders();
  window.folders = folders;
  backToFolderList();
  renderFolders();
  closeFolderMenu();
}

// Get all cuts from all folders (for moodboard editor)
function getAllCutsFromFolders() {
  const allCuts = [];
  folders.forEach((folder) => {
    if (folder.cuts) {
      folder.cuts.forEach((cut) => {
        allCuts.push({ ...cut, folderId: folder.id, folderName: folder.name });
      });
    }
  });
  return allCuts;
}

// Get cuts from specific folder
function getCutsFromFolder(folderId) {
  const folder = folders.find((f) => f.id === folderId);
  return folder ? folder.cuts || [] : [];
}

// Expose folders array globally for editor
window.folders = folders;

// Make functions globally available
window.initFolders = initFolders;
window.createNewFolder = createNewFolder;
window.backToFolderList = backToFolderList;
window.openFolderMenu = openFolderMenu;
window.closeFolderMenu = closeFolderMenu;
window.renameCurrentFolder = renameCurrentFolder;
window.saveFolderName = saveFolderName;
window.closeFolderNameModal = closeFolderNameModal;
window.toggleFolderPrivacy = toggleFolderPrivacy;
window.deleteCurrentFolder = deleteCurrentFolder;
window.getAllCutsFromFolders = getAllCutsFromFolders;
window.getCutsFromFolder = getCutsFromFolder;
