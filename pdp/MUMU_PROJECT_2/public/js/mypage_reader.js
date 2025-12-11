// ============================
// FEED ITEM 이미지 로드
// ============================
function loadFeedItemImages() {
  const imageFiles = [
    "image 29.webp",
    "image 30.webp",
    "image 31.webp"
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
    const imagePath = `assets/community-images/${encodedFileName}`;
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

// ============================
// MY FEED 이미지 로드
// ============================
function loadMyFeedImages() {
  const imageFiles = [
    "c1.webp",
    "g1.webp"
  ];

  const myfeedThumbs = document.querySelectorAll(".myfeed-thumb");
  console.log(`Found ${myfeedThumbs.length} myfeed-thumb elements`);

  if (myfeedThumbs.length === 0) {
    console.warn("No .myfeed-thumb elements found!");
    return;
  }

  let imageIndex = 0;

  myfeedThumbs.forEach((thumb) => {
    // 이미 img가 있으면 스킵
    if (thumb.querySelector("img")) {
      return;
    }

    const img = document.createElement("img");
    const fileName = imageFiles[imageIndex % imageFiles.length];
    const encodedFileName = encodeURIComponent(fileName);
    const imagePath = `assets/feed/${encodedFileName}`;
    img.src = imagePath;

    img.onload = () => {
      console.log(`✅ Image loaded: ${imagePath}`);
      thumb.style.background = "transparent";
    };

    img.onerror = () => {
      console.error(`❌ Failed to load image: ${imagePath}`);
      thumb.style.background = "#e8e8e8";
    };

    thumb.appendChild(img);
    imageIndex++;
  });
}

// DOMContentLoaded 시 이미지 로드
document.addEventListener("DOMContentLoaded", () => {
  setTimeout(() => {
    loadFeedItemImages();
    loadMyFeedImages();
  }, 100);

  // add-btn 클릭 시 upload.html로 이동
  const addBtn = document.querySelector(".feed-item.add-btn");
  if (addBtn) {
    addBtn.addEventListener("click", () => {
      window.location.href = "feed_upload.html";
    });
    addBtn.style.cursor = "pointer";
  }
});

// 탭 전환
function goMyFeed() {
  const tabs = document.querySelectorAll(".tab");
  const contents = document.querySelectorAll(".tab-content");
  const indicator = document.querySelector(".tab-indicator");

  tabs.forEach((t) => t.classList.remove("active"));
  contents.forEach((c) => c.classList.remove("active"));

  tabs[0].classList.add("active");
  document.getElementById("tab-feed").classList.add("active");
  if (indicator) {
    indicator.style.left = "0";
  }
}

function goMy() {
  const tabs = document.querySelectorAll(".tab");
  const contents = document.querySelectorAll(".tab-content");
  const indicator = document.querySelector(".tab-indicator");

  tabs.forEach((t) => t.classList.remove("active"));
  contents.forEach((c) => c.classList.remove("active"));

  tabs[1].classList.add("active");
  document.getElementById("tab-my").classList.add("active");
  if (indicator) {
    indicator.style.left = "50%";
  }
}

// 초기화
const tabs = document.querySelectorAll(".tab");
tabs.forEach((tab, index) => {
  tab.addEventListener("click", () => {
    if (index === 0) {
      goMyFeed();
    } else {
      goMy();
    }
  });
});

// 독자모드 버튼 클릭 시 창작자 대시보드로 이동
const readerModeBtn = document.querySelector(".reader-mode-btn");
if (readerModeBtn) {
  readerModeBtn.addEventListener("click", () => {
    window.location.href = "creator_dashboard.html";
  });
}

// 하단 탭바: 여기선 단순히 active 표시만
const bottomTabs = document.querySelectorAll(".tab-btn");

bottomTabs.forEach((btn) => {
  btn.addEventListener("click", () => {
    bottomTabs.forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    // 페이지 이동은 href 동작으로 처리
  });
});

// ============================
// 댓글 모달 및 상호작용 기능 (community.js와 동일)
// ============================

// stat-icon-heart 클릭 시 색상 변경
document.addEventListener('DOMContentLoaded', () => {
  // 동적으로 생성된 요소를 위해 이벤트 위임 사용
  document.addEventListener('click', function (e) {
    // stat-icon-heart 클릭 (피드 카드 및 게시글 상세 모달 모두)
    if (e.target.closest('.stat-icon-heart')) {
      const icon = e.target.closest('.stat-icon-heart');
      e.preventDefault();
      e.stopPropagation();
      icon.classList.toggle('active');

      const statItem = icon.parentElement.querySelector('.stat-item');
      if (statItem) {
        let currentCount = parseInt(statItem.textContent) || 0;
        if (icon.classList.contains('active')) {
          statItem.textContent = currentCount + 1;
        } else {
          statItem.textContent = Math.max(0, currentCount - 1);
        }
      }
    }

    // stat-icon-comment 클릭 시 댓글 모달 열기
    if (e.target.closest('.stat-icon-comment')) {
      e.preventDefault();
      openCommentModal();
    }

    // comment-stat-icon-heart 클릭 (댓글 모달 및 게시글 상세 모달 둘 다)
    if (e.target.closest('.comment-stat-icon-heart')) {
      const icon = e.target.closest('.comment-stat-icon-heart');
      e.preventDefault();
      e.stopPropagation();
      icon.classList.toggle('active');

      const statItem = icon.parentElement.querySelector('span');
      if (statItem) {
        let currentCount = parseInt(statItem.textContent) || 0;
        if (icon.classList.contains('active')) {
          statItem.textContent = currentCount + 1;
        } else {
          statItem.textContent = Math.max(0, currentCount - 1);
        }
      }
    }

    // comment-more-btn 클릭
    if (e.target.closest('.comment-more-btn')) {
      const btn = e.target.closest('.comment-more-btn');
      e.preventDefault();
      e.stopPropagation();
      const commentItem = btn.closest('.comment-item');
      if (commentItem) {
        const modal = document.getElementById('commentMoreModal');
        if (modal && modal.style.display === 'flex') {
          closeCommentMoreModal();
        } else {
          openCommentMoreModal(btn, commentItem);
        }
      }
    }

    // post-more-btn 클릭
    if (e.target.closest('.post-more-btn')) {
      const btn = e.target.closest('.post-more-btn');
      e.preventDefault();
      e.stopPropagation();
      const modal = document.getElementById('CreatorMoreModal');
      if (modal && modal.style.display === 'flex') {
        closeCreatorMoreModal();
      } else {
        openCreatorMoreModal(btn);
      }
    }

    // CreatorMoreModal-option 클릭 시 팝업 표시
    if (e.target.closest('.CreatorMoreModal-option')) {
      const optionBtn = e.target.closest('.CreatorMoreModal-option');
      e.preventDefault();
      e.stopPropagation();
      closeCreatorMoreModal();
      setTimeout(() => {
        showComingSoonModal();
      }, 200);
      return;
    }

    // comment-more-option 클릭 시 팝업 표시
    if (e.target.closest('.comment-more-option')) {
      const optionBtn = e.target.closest('.comment-more-option');
      e.preventDefault();
      e.stopPropagation();
      closeCommentMoreModal();
      setTimeout(() => {
        showComingSoonModal();
      }, 200);
      return;
    }
  });
});

// 댓글 모달 열기
function openCommentModal() {
  const modal = document.getElementById('commentModal');
  if (modal) {
    modal.style.display = 'flex';
  }
}

// 댓글 모달 닫기 (전역 함수로 선언)
window.closeCommentModal = function () {
  const modal = document.getElementById('commentModal');
  if (modal) {
    const commentSection = modal.querySelector('.comment-section');
    if (commentSection) {
      commentSection.style.animation = 'slideDown 0.3s ease forwards';
    }
    modal.style.animation = 'fadeOut 0.3s ease forwards';
    setTimeout(() => {
      modal.style.display = 'none';
      modal.style.animation = 'fadeIn 0.3s ease';
      if (commentSection) {
        commentSection.style.animation = 'slideUp 0.3s ease';
      }
    }, 300);
  }
};

// 모달 배경 클릭 시 닫기
document.addEventListener('DOMContentLoaded', () => {
  const modal = document.getElementById('commentModal');
  if (modal) {
    modal.addEventListener('click', function (e) {
      if (e.target === modal) {
        closeCommentModal();
      }
    });
  }
});

// ESC 키로 모달 닫기
document.addEventListener('keydown', function (e) {
  if (e.key === 'Escape') {
    const commentModal = document.getElementById('commentModal');
    if (commentModal && commentModal.style.display === 'flex') {
      closeCommentModal();
    }
    const commentMoreModal = document.getElementById('commentMoreModal');
    if (commentMoreModal && commentMoreModal.style.display === 'flex') {
      closeCommentMoreModal();
    }
    const creatorMoreModal = document.getElementById('CreatorMoreModal');
    if (creatorMoreModal && creatorMoreModal.style.display === 'flex') {
      closeCreatorMoreModal();
    }
    const comingSoonModal = document.getElementById('comingSoonModal');
    if (comingSoonModal && comingSoonModal.style.display === 'flex') {
      closeComingSoonModal();
    }
  }
});

// 댓글 더보기 모달 열기
function openCommentMoreModal(button, commentItem) {
  const modal = document.getElementById('commentMoreModal');
  if (modal && button) {
    const rect = button.getBoundingClientRect();
    modal.style.display = 'flex';
    const modalContent = modal.querySelector('.comment-more-modal-content');
    if (modalContent) {
      const top = rect.top;
      const right = window.innerWidth - rect.right;
      modalContent.style.top = top + 'px';
      modalContent.style.right = right + 'px';

      if (!modal.hasAttribute('data-scroll-listener')) {
        modal.setAttribute('data-scroll-listener', 'true');
        window.addEventListener('scroll', handleCommentMoreModalScroll, { passive: true });
      }
    }
  }
}

// 댓글 더보기 모달 닫기
function closeCommentMoreModal() {
  const modal = document.getElementById('commentMoreModal');
  if (modal) {
    modal.style.animation = 'fadeOut 0.2s ease forwards';
    setTimeout(() => {
      modal.style.display = 'none';
      modal.style.animation = 'fadeIn 0.2s ease';
      window.removeEventListener('scroll', handleCommentMoreModalScroll);
      modal.removeAttribute('data-scroll-listener');
    }, 200);
  }
}

// 댓글 더보기 모달 스크롤 핸들러
function handleCommentMoreModalScroll() {
  const modal = document.getElementById('commentMoreModal');
  if (modal && modal.style.display === 'flex') {
    closeCommentMoreModal();
  }
}

// 준비중인 기능 팝업 모달 표시
function showComingSoonModal() {
  const modal = document.getElementById('comingSoonModal');
  if (modal) {
    modal.style.display = 'flex';
    modal.style.animation = 'fadeIn 0.2s ease';
  }
}

// 준비중인 기능 팝업 모달 닫기
function closeComingSoonModal() {
  const modal = document.getElementById('comingSoonModal');
  if (modal) {
    modal.style.display = 'none';
  }
}

// CreatorMoreModal 열기
function openCreatorMoreModal(button) {
  const modal = document.getElementById('CreatorMoreModal');
  if (modal && button) {
    const rect = button.getBoundingClientRect();
    modal.style.display = 'flex';
    const modalContent = modal.querySelector('.CreatorMoreModal-content');
    if (modalContent) {
      const top = rect.top;
      const right = window.innerWidth - rect.right;
      modalContent.style.top = top + 'px';
      modalContent.style.right = right + 'px';

      if (!modal.hasAttribute('data-scroll-listener')) {
        modal.setAttribute('data-scroll-listener', 'true');
        window.addEventListener('scroll', handleCreatorMoreModalScroll, { passive: true });
      }
    }
  }
}

// CreatorMoreModal 닫기
function closeCreatorMoreModal() {
  const modal = document.getElementById('CreatorMoreModal');
  if (modal) {
    modal.style.animation = 'fadeOut 0.2s ease forwards';
    setTimeout(() => {
      modal.style.display = 'none';
      modal.style.animation = 'fadeIn 0.2s ease';
      window.removeEventListener('scroll', handleCreatorMoreModalScroll);
      modal.removeAttribute('data-scroll-listener');
    }, 200);
  }
}

// CreatorMoreModal 스크롤 핸들러
function handleCreatorMoreModalScroll() {
  const modal = document.getElementById('CreatorMoreModal');
  if (modal && modal.style.display === 'flex') {
    closeCreatorMoreModal();
  }
}

// coming-soon-modal-close 클릭 시 닫기
document.addEventListener('DOMContentLoaded', () => {
  const closeBtn = document.querySelector('.coming-soon-modal-close');
  if (closeBtn) {
    closeBtn.addEventListener('click', () => {
      closeComingSoonModal();
    });
  }
});
