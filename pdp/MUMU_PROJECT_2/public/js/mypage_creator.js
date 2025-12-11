// ============================
// FEED ITEM 이미지 로드
// ============================
function loadFeedItemImages() {
  const imageFiles = [
    "05fc67026b745baa8bc09a8131694ea2 1.webp",
    "0ec11e1cd110e223393a6448ecedbd9e 1.webp",
    "16dc32cfa7ec34432fab2208e2943fbc 1.webp",
    "713a8a43f035e885dd99e09a2c038a00 1.webp",
    "IMG_6024 1.webp",
    "IMG_6025 1.webp",
    "IMG_6026 1.webp",
    "IMG_6027 1.webp",
    "IMG_6028 1.webp",
    "IMG_6029 1.webp",
    "IMG_6030 1.webp",
    "IMG_6031 1.webp",
    "IMG_6034 2.webp",
    "IMG_6035 2.webp",
    "IMG_6036 2.webp",
    "IMG_6037 2.webp",
    "IMG_6038 2.webp",
    "IMG_6039 2.webp",
    "IMG_6040 2.webp",
    "IMG_6041 2.webp",
    "IMG_6042 2.webp",
    "IMG_6043 2.webp",
    "IMG_6044 2.webp",
    "IMG_6045 2.webp",
    "IMG_6046 2.webp",
    "IMG_6047 2.webp",
    "IMG_6048 2.webp",
    "IMG_6049 2.webp",
    "IMG_6050 2.webp",
    "IMG_6051 2.webp",
    "IMG_6052 2.webp",
    "IMG_6053 2.webp",
    "IMG_6054 2.webp",
    "IMG_6055 2.webp",
    "IMG_6056 2.webp",
    "IMG_6057 2.webp",
    "IMG_6058 2.webp",
    "IMG_6059 2.webp",
    "IMG_6060 2.webp",
    "IMG_6062 2.webp",
    "IMG_6063 2.webp",
    "IMG_6064 2.webp",
    "IMG_6065 2.webp",
    "c92a1e4a36c0fd711893db91b384a5f8 1.webp"
  ];

  const feedItems = document.querySelectorAll(".feed-item:not(.add-btn)");
  console.log(`Found ${feedItems.length} feed-item elements`);

  if (feedItems.length === 0) {
    console.warn("No .feed-item elements found!");
    return;
  }

  let imageIndex = 0;

  feedItems.forEach((item) => {
    // 이미 img가 있으면 스킵
    if (item.querySelector("img")) {
      return;
    }

    const img = document.createElement("img");
    const fileName = imageFiles[imageIndex % imageFiles.length];
    const encodedFileName = encodeURIComponent(fileName);
    const imagePath = `assets/feed/${encodedFileName}`;
    img.src = imagePath;

    img.onload = () => {
      console.log(`✅ Image loaded: ${imagePath}`);
      item.style.background = "transparent";
    };

    img.onerror = () => {
      console.error(`❌ Failed to load image: ${imagePath}`);
      item.style.background = "#e6e6e6";
    };

    item.appendChild(img);
    imageIndex++;
  });
}

// DOMContentLoaded 시 이미지 로드
document.addEventListener("DOMContentLoaded", () => {
  setTimeout(() => {
    loadFeedItemImages();
  }, 100);

  // add-btn 클릭 시 upload.html로 이동
  const addBtn = document.querySelector(".feed-item.add-btn");
  if (addBtn) {
    addBtn.addEventListener("click", () => {
      window.location.href = "upload.html";
    });
    addBtn.style.cursor = "pointer";
  }
});

function goMyFeed() {
  const tabs = document.querySelectorAll(".tab");
  const indicator = document.querySelector(".tab-indicator");

  tabs.forEach((t) => t.classList.remove("active"));
  tabs[0].classList.add("active");

  if (indicator) {
    indicator.style.left = "0";
  }
}

function goStudio() {
  window.location.href = "creator_dashboard.html";
}

const creatorModeBtn = document.querySelector(".creator-mode-btn");
if (creatorModeBtn) {
  creatorModeBtn.addEventListener("click", () => {
    window.location.href = "mypage_reader.html";
  });
}

// 초기화
const tabs = document.querySelectorAll(".tab");
tabs.forEach((tab, index) => {
  tab.addEventListener("click", () => {
    if (index === 0) {
      goMyFeed();
    } else {
      goStudio();
    }
  });
});
