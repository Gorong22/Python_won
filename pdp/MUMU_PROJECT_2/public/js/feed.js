// 임시 로그인 여부 (나중에 Firebase Auth 연결 예정)
const isLoggedIn = false; // true면 회원 UI

window.addEventListener("DOMContentLoaded", () => {
  const guestBox = document.getElementById("guestBox");
  const memberBox = document.getElementById("memberBox");

  // 요소가 존재할 때만 스타일 변경
  if (guestBox && memberBox) {
    if (isLoggedIn) {
      guestBox.style.display = "none";
      memberBox.style.display = "flex";
    } else {
      guestBox.style.display = "block";
      memberBox.style.display = "none";
    }
  }

  // HTML에 정적으로 존재하는 content-placeholder에 이미지 로드
  // 약간의 지연을 두어 DOM이 완전히 로드된 후 실행
  setTimeout(() => {
    loadFeedImages();
  }, 100);

  // feedList가 존재할 때만 loadMockFeed 실행
  const feedList = document.getElementById("feedList");
  if (feedList) {
    loadMockFeed();
  }
});

/* ============================
   FEED IMAGES LOADER
============================ */
function loadFeedImages() {
  const imageFiles = [
    "a1.webp",
    "a2.webp",
    "a3.webp",
    "a4.webp",
    "b2.webp",
    "b3.webp",
    "b4.webp",
    "c1.webp",
    "c2.webp",
    "c3.webp",
    "c4.webp",
    "d1.webp",
    "d2.webp",
    "d3.webp",
    "d4.webp",
    "e1.webp",
    "e2.webp",
    "e3.webp",
    "e4.webp",
    "f1.webp",
    "f2.webp",
    "f3.webp",
    "f4.webp",
    "g1.webp",
    "g2.webp",
    "g3.webp",
    "g4.webp",
    "h1.webp",
    "h2.webp",
    "h3.webp",
    "h4.webp",
    "i1.webp",
    "i2.webp",
    "i3.webp",
    "i4.webp",
    "j1.webp",
    "j2.webp",
    "j3.webp",
    "j4.webp"
  ];

  const placeholders = document.querySelectorAll(".content-placeholder");
  console.log(`Found ${placeholders.length} content-placeholder elements`);

  if (placeholders.length === 0) {
    console.warn("No .content-placeholder elements found!");
    return;
  }

  let imageIndex = 0;

  placeholders.forEach((placeholder, idx) => {
    if (!placeholder.querySelector("img")) {
      const img = document.createElement("img");
      // 공백을 %20으로 인코딩
      const fileName = imageFiles[imageIndex % imageFiles.length];
      const encodedFileName = encodeURIComponent(fileName);
      const imagePath = `assets/feed/${encodedFileName}`;
      img.src = imagePath;
      img.alt = "Feed image";

      // 이미지 로드 성공 처리
      img.onload = function () {
        console.log(`✓ Image loaded successfully: ${fileName} (index: ${idx})`);
        this.style.display = 'block';
      };

      // 이미지 로드 오류 처리
      img.onerror = function () {
        console.error(`✗ Failed to load image: ${imagePath}`);
        console.error(`  Original filename: ${fileName}`);
        console.error(`  Encoded filename: ${encodedFileName}`);
        this.style.display = 'none';
      };

      placeholder.appendChild(img);
      console.log(`Added image ${imageIndex + 1}: ${fileName} to placeholder ${idx + 1}`);
      imageIndex++;
    } else {
      console.log(`Placeholder ${idx + 1} already has an image`);
    }
  });

  console.log(`✓ Attempted to load ${imageIndex} images into ${placeholders.length} placeholders`);

  // 슬라이더와 dots 동기화
  initSliderDotsSync();
}

/* ============================
   슬라이더와 Dots 동기화
============================ */
function initSliderDotsSync() {
  const sliders = document.querySelectorAll('.content-placeholder-slider');

  sliders.forEach((slider) => {
    const sliderItems = slider.querySelectorAll('.content-placeholder');
    const feedItemSection = slider.closest('.feed-item-section');
    const bottomContent = feedItemSection ? feedItemSection.querySelector('.bottom-content') : null;
    const dotsContainer = bottomContent ? bottomContent.querySelector('.content-dots') : null;

    if (!dotsContainer) return;

    const dots = dotsContainer.querySelectorAll('.dot');
    const totalSlides = sliderItems.length;

    // dot 개수를 슬라이드 개수에 정확히 맞추기 (항상 재생성)
    dotsContainer.innerHTML = '';
    for (let i = 0; i < totalSlides; i++) {
      const dot = document.createElement('span');
      dot.className = 'dot';
      if (i === 0) dot.classList.add('active');
      dotsContainer.appendChild(dot);
    }

    // 모든 dot의 active 클래스 제거 후 첫 번째 dot만 활성화
    const allDots = dotsContainer.querySelectorAll('.dot');
    // 초기 상태에서는 첫 번째 dot만 활성화 (슬라이더가 처음 위치에 있음)
    // 모든 dot의 active 클래스 제거
    allDots.forEach((dot) => {
      dot.classList.remove('active');
    });
    // 첫 번째 dot만 활성화
    if (allDots.length > 0) {
      allDots[0].classList.add('active');
    }

    // 스크롤 이벤트 리스너 - 인스타그램 스타일로 정확한 슬라이드 감지
    let scrollTimeout;
    slider.addEventListener('scroll', () => {
      clearTimeout(scrollTimeout);
      scrollTimeout = setTimeout(() => {
        updateActiveDot();
      }, 50);
    });

    // 초기 활성 dot 업데이트
    const updateActiveDot = () => {
      const scrollLeft = slider.scrollLeft;
      const slideWidth = sliderItems[0].offsetWidth;

      // 스크롤 위치를 기준으로 현재 보이는 슬라이드 인덱스 계산
      // 각 슬라이드가 정확히 한 화면을 차지하므로 스크롤 위치를 슬라이드 너비로 나눔
      // 첫 번째 슬라이드(스크롤 0)일 때는 인덱스 0이 되도록 보장
      let currentIndex = 0;
      if (slideWidth > 0) {
        currentIndex = Math.round(scrollLeft / slideWidth);
      }

      // 인덱스 범위 제한 (0부터 allDots.length - 1까지)
      currentIndex = Math.max(0, Math.min(currentIndex, allDots.length - 1));

      // 모든 dot의 active 클래스 제거
      allDots.forEach((dot) => {
        dot.classList.remove('active');
      });

      // 현재 인덱스의 dot만 활성화
      if (allDots[currentIndex]) {
        allDots[currentIndex].classList.add('active');
      }
    };

    // 슬라이더 초기 위치를 0으로 명시적으로 설정
    slider.scrollLeft = 0;

    // 스크롤 스냅이 완료된 후에도 dot 업데이트
    slider.addEventListener('scrollend', () => {
      updateActiveDot();
    });

    // 초기 dot 업데이트 (약간의 지연 후 실행하여 DOM이 완전히 로드된 후 실행)
    setTimeout(() => {
      slider.scrollLeft = 0;
      updateActiveDot();
    }, 50);
  });
}

/* ============================
   FEED RENDER
============================ */

function loadMockFeed() {
  fetch("data/mock_feed.json")
    .then((res) => res.json())
    .then((data) => {
      const feedList = document.getElementById("feedList");
      feedList.innerHTML = "";

      data.forEach((item) => {
        const cardHTML = createFeedCard(item);
        feedList.insertAdjacentHTML("beforeend", cardHTML);
      });

      // 동적으로 생성된 creator-more-btn에 이벤트 리스너 추가
      attachCreatorMoreBtnListeners();
      // 동적으로 생성된 follow-btn에 이벤트 리스너 추가
      attachFollowBtnListeners();
    });
}

function attachCreatorMoreBtnListeners() {
  document.querySelectorAll('.creator-more-btn').forEach(btn => {
    // 이미 이벤트가 연결되어 있는지 확인
    if (!btn.hasAttribute('data-listener-attached')) {
      btn.setAttribute('data-listener-attached', 'true');
      btn.addEventListener('click', function (e) {
        e.preventDefault();
        e.stopPropagation();
        const modal = document.getElementById('CreatorMoreModal');
        // 이미 열려있으면 닫기, 아니면 열기
        if (modal && modal.style.display === 'flex') {
          closeCreatorMoreModal();
        } else {
          openCreatorMoreModal(this);
        }
      });
    }
  });
}

function attachFollowBtnListeners() {
  document.querySelectorAll('.follow-btn, .creator-follow-btn').forEach(btn => {
    // 이미 이벤트가 연결되어 있는지 확인
    if (!btn.hasAttribute('data-listener-attached')) {
      btn.setAttribute('data-listener-attached', 'true');
      btn.addEventListener('click', function (e) {
        e.preventDefault();
        e.stopPropagation();
        this.classList.toggle('following');
        if (this.classList.contains('following')) {
          this.textContent = '팔로잉';
        } else {
          this.textContent = '팔로우';
        }
      });
    }
  });
}

/* ============================
   FEED CARD TEMPLATE
============================ */

function createFeedCard(item) {
  return `
    <article class="feed-card">

      <!-- Creator Info -->
      <div class="creator-info">
        <div class="creator-img"></div>
        <span class="creator-name">${item.creator}</span>
      </div>

      <!-- Thumbnail -->
      <div class="work-thumbnail"></div>

      <!-- Work Info -->
      <div class="work-info">
        <div class="work-title">${item.title}</div>
        <div class="work-desc">${item.desc}</div>
      </div>

      <!-- Action Buttons -->
      <div class="action-row">
        <div class="action-btn"></div>
        <div class="action-btn"></div>
      </div>

      <!-- Comment Preview -->
      <div class="comment-preview"></div>

    </article>
  `;
}

/* ==========================
   Header 커스터마이징
========================== */
fetch("components/header.html")
  .then((r) => r.text())
  .then((html) => {
    document.getElementById("header").innerHTML = html;
    // 헤더 내용 변경
    const headerTitle = document.querySelector("#header .header-title");
    if (headerTitle) {
      headerTitle.remove();
    }
    const header = document.querySelector("#header");
    if (header) {
      header.innerHTML = `
        <div class="header-top-row">
          <div class="header-left">
            <a href="index.html" style="display: flex; width: 100%; height: 100%; align-items: center; justify-content: center;"><img loading="lazy" src="assets/logos/mumu-logo.webp" alt="MUMU Logo" style="max-width: 100%; max-height: 100%; object-fit: contain;"></a>
          </div>
          <a class="header-link" href="#">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 22C13.1 22 14 21.1 14 20H10C10 21.1 10.89 22 12 22ZM18 16V11C18 7.93 16.36 5.36 13.5 4.68V4C13.5 3.17 12.83 2.5 12 2.5C11.17 2.5 10.5 3.17 10.5 4V4.68C7.63 5.36 6 7.92 6 11V16L4 18V19H20V18L18 16Z" fill="#000"/>
            </svg>
          </a>
        </div>
      `;
    }
  })
  .catch((error) => console.error("Error fetching header.html:", error));

/* ==========================
   Tabbar 로드
========================== */
fetch("components/tabbar.html")
  .then((r) => r.text())
  .then((html) => (document.getElementById("tabbar").innerHTML = html))
  .catch((error) => console.error("Error fetching tabbar.html:", error));

/* ================================
   ⭐ 스플래쉬: 최초 1회만 표시
================================= */
const hasVisited = localStorage.getItem("mumu_splash");

if (hasVisited) {
  // 이미 방문 → 스플래시 즉시 제거
  document.getElementById("splashLayer").style.display = "none";
  document.querySelector(".app-frame").style.opacity = "1";
} else {
  // 최초 방문 → 스플래시 표시 후 fadeOut
  localStorage.setItem("mumu_splash", "done");

  setTimeout(() => {
    const splash = document.getElementById("splashLayer");
    splash.style.animation = "fadeOut 0.6s ease forwards";

    setTimeout(() => {
      splash.style.display = "none";
      document.querySelector(".app-frame").style.opacity = "1";
    }, 600);
  }, 1700);
}
// stat-icon 클릭 시 색상 변경
document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('.stat-icon-heart').forEach(icon => {
    icon.addEventListener('click', function (e) {
      e.preventDefault();
      this.classList.toggle('active');

      // 좋아요 아이콘인 경우 숫자 업데이트
      const statItem = this.parentElement.querySelector('.stat-item');
      if (statItem) {
        let currentCount = parseInt(statItem.textContent) || 0;
        if (this.classList.contains('active')) {
          statItem.textContent = currentCount + 1;
        } else {
          statItem.textContent = Math.max(0, currentCount - 1);
        }
      }
    });
  });

  // stat-icon-comment 클릭 시 댓글 모달 열기
  document.querySelectorAll('.stat-icon-comment').forEach(icon => {
    icon.addEventListener('click', function (e) {
      e.preventDefault();
      openCommentModal();
    });
  });

  // 댓글 모달 내 comment-stat-icon-heart 클릭 시 색상 변경 및 숫자 업데이트
  document.querySelectorAll('.comment-stat-icon-heart').forEach(icon => {
    icon.addEventListener('click', function (e) {
      e.preventDefault();
      e.stopPropagation();
      this.classList.toggle('active');

      // 좋아요 아이콘인 경우 숫자 업데이트
      const statItem = this.parentElement.querySelector('span');
      if (statItem) {
        let currentCount = parseInt(statItem.textContent) || 0;
        if (this.classList.contains('active')) {
          statItem.textContent = currentCount + 1;
        } else {
          statItem.textContent = Math.max(0, currentCount - 1);
        }
      }
    });
  });

  // follow-btn 클릭 시 팔로우/팔로잉 토글
  document.querySelectorAll('.follow-btn, .creator-follow-btn').forEach(btn => {
    btn.addEventListener('click', function (e) {
      e.preventDefault();
      e.stopPropagation();
      this.classList.toggle('following');
      if (this.classList.contains('following')) {
        this.textContent = '팔로잉';
      } else {
        this.textContent = '팔로우';
      }
    });
  });

  // comment-more-btn 클릭 시 옵션 모달 열기/닫기 (토글)
  document.querySelectorAll('.comment-more-btn').forEach(btn => {
    btn.addEventListener('click', function (e) {
      e.preventDefault();
      e.stopPropagation();
      const commentItem = this.closest('.comment-item');
      if (commentItem) {
        const modal = document.getElementById('commentMoreModal');
        // 이미 열려있으면 닫기, 아니면 열기
        if (modal && modal.style.display === 'flex') {
          closeCommentMoreModal();
        } else {
          openCommentMoreModal(this, commentItem);
        }
      }
    });
  });

  // CreatorMoreModal-option 클릭 시 준비중인 기능 팝업 표시
  document.querySelectorAll('.CreatorMoreModal-option').forEach(btn => {
    btn.addEventListener('click', function (e) {
      e.preventDefault();
      e.stopPropagation();
      closeCreatorMoreModal();
      setTimeout(() => {
        showComingSoonModal();
      }, 200);
    });
  });
});

// 댓글 모달 열기
function openCommentModal() {
  const modal = document.getElementById('commentModal');
  modal.style.display = 'flex';
}

// 댓글 모달 닫기 (전역 함수로 선언)
window.closeCommentModal = function () {
  const modal = document.getElementById('commentModal');
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
  const rect = button.getBoundingClientRect();
  modal.style.display = 'flex';
  const modalContent = modal.querySelector('.comment-more-modal-content');
  // 버튼의 오른쪽 상단 모서리에 맞춰 위치 조정 (fixed 위치)
  const top = rect.top;
  const right = window.innerWidth - rect.right;
  modalContent.style.top = top + 'px';
  modalContent.style.right = right + 'px';

  // 스크롤 이벤트 리스너 추가
  if (!modal.hasAttribute('data-scroll-listener')) {
    modal.setAttribute('data-scroll-listener', 'true');
    window.addEventListener('scroll', handleCommentMoreModalScroll, { passive: true });
  }
}

// 댓글 더보기 모달 닫기
function closeCommentMoreModal() {
  const modal = document.getElementById('commentMoreModal');
  modal.style.animation = 'fadeOut 0.2s ease forwards';
  setTimeout(() => {
    modal.style.display = 'none';
    modal.style.animation = 'fadeIn 0.2s ease';
    // 스크롤 이벤트 리스너 제거
    window.removeEventListener('scroll', handleCommentMoreModalScroll);
    modal.removeAttribute('data-scroll-listener');
  }, 200);
}

// 댓글 더보기 모달 스크롤 핸들러
function handleCommentMoreModalScroll() {
  const modal = document.getElementById('commentMoreModal');
  if (modal && modal.style.display === 'flex') {
    closeCommentMoreModal();
  }
}

// creator-more-btn 클릭 시 옵션 모달 열기 (정적 요소용)
document.addEventListener('DOMContentLoaded', () => {
  attachCreatorMoreBtnListeners();
});

// CreatorMoreModal 열기
function openCreatorMoreModal(button) {
  const modal = document.getElementById('CreatorMoreModal');
  const rect = button.getBoundingClientRect();
  modal.style.display = 'flex';
  const modalContent = modal.querySelector('.CreatorMoreModal-content');
  // 버튼의 오른쪽 상단 모서리에 맞춰 위치 조정 (fixed 위치)
  const top = rect.top;
  const right = window.innerWidth - rect.right;
  modalContent.style.top = top + 'px';
  modalContent.style.right = right + 'px';

  // 스크롤 이벤트 리스너 추가
  if (!modal.hasAttribute('data-scroll-listener')) {
    modal.setAttribute('data-scroll-listener', 'true');
    window.addEventListener('scroll', handleCreatorMoreModalScroll, { passive: true });
  }

  // 모달이 열릴 때 옵션 버튼 이벤트 리스너 연결
  setTimeout(() => {
    document.querySelectorAll('.CreatorMoreModal-option').forEach(btn => {
      if (!btn.hasAttribute('data-option-listener-attached')) {
        btn.setAttribute('data-option-listener-attached', 'true');
        btn.addEventListener('click', function (e) {
          e.preventDefault();
          e.stopPropagation();
          closeCreatorMoreModal();
          setTimeout(() => {
            showComingSoonModal();
          }, 200);
        });
      }
    });
  }, 10);
}

// CreatorMoreModal 닫기
function closeCreatorMoreModal() {
  const modal = document.getElementById('CreatorMoreModal');
  modal.style.animation = 'fadeOut 0.2s ease forwards';
  setTimeout(() => {
    modal.style.display = 'none';
    modal.style.animation = 'fadeIn 0.2s ease';
    // 스크롤 이벤트 리스너 제거
    window.removeEventListener('scroll', handleCreatorMoreModalScroll);
    modal.removeAttribute('data-scroll-listener');
  }, 200);
}

// CreatorMoreModal 스크롤 핸들러
function handleCreatorMoreModalScroll() {
  const modal = document.getElementById('CreatorMoreModal');
  if (modal && modal.style.display === 'flex') {
    closeCreatorMoreModal();
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

// CreatorMoreModal 배경 클릭 시 닫기
document.addEventListener('click', function (e) {
  const creatorMoreModal = document.getElementById('CreatorMoreModal');
  if (creatorMoreModal && creatorMoreModal.style.display === 'flex') {
    // CreatorMoreModal-option 클릭은 제외
    if (e.target.closest('.CreatorMoreModal-option')) {
      return;
    }
    // 모달 내용이나 버튼이 아닌 곳을 클릭하면 닫기
    if (!e.target.closest('.CreatorMoreModal-content') && !e.target.closest('.creator-more-btn')) {
      closeCreatorMoreModal();
    }
  }

  // commentMoreModal 배경 클릭 시 닫기
  const commentMoreModal = document.getElementById('commentMoreModal');
  if (commentMoreModal && commentMoreModal.style.display === 'flex') {
    // 모달 내용이나 버튼이 아닌 곳을 클릭하면 닫기
    if (!e.target.closest('.comment-more-modal-content') && !e.target.closest('.comment-more-btn')) {
      closeCommentMoreModal();
    }
  }

  // 준비중인 기능 팝업 배경 클릭 시 닫기
  const comingSoonModal = document.getElementById('comingSoonModal');
  if (comingSoonModal && comingSoonModal.style.display === 'flex') {
    if (e.target === comingSoonModal || e.target.closest('.coming-soon-modal-close')) {
      closeComingSoonModal();
    }
  }
});
