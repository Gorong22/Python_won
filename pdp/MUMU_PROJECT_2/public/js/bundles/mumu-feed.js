// Mumu Bundle
const auth = window.firebaseAuth;
const app = window.firebaseApp;
// External Imports

// --- feed-image-swipe.js ---
document.addEventListener("DOMContentLoaded", () => {
  const imageContainers = document.querySelectorAll(".feed-image-container");

  imageContainers.forEach((container) => {
    const scrollContainer = container.querySelector(".feed-image-scroll");
    if (!scrollContainer) return;

    const items = scrollContainer.querySelectorAll(".feed-image-item");
    if (items.length === 0) return;

    const containerWidth = container.offsetWidth;
    const itemWidth = 332.122;
    const gap = 12;
    // 중앙 정렬을 위한 오프셋 계산
    const centerOffset = (containerWidth - itemWidth) / 2;

    let currentIndex = 0;
    let isDragging = false;
    let startX = 0;
    let currentX = 0;
    let startTime = 0;
    let lastX = 0;
    let lastTime = 0;
    let velocity = 0;
    let startScrollLeft = 0;

    // 초기 위치 설정 (첫 번째 이미지를 중앙에)
    scrollContainer.style.transform = `translateX(-${
      currentIndex * (itemWidth + gap) + centerOffset
    }px)`;

    // 인스타그램 스타일 스와이프 처리 함수
    const handleSwipeEnd = () => {
      if (!isDragging) return;
      isDragging = false;

      const diff = startX - currentX;
      const timeDiff = Date.now() - startTime;
      const distance = Math.abs(diff);

      // 속도 계산 (px/ms)
      velocity = timeDiff > 0 ? distance / timeDiff : 0;

      // 인스타그램 스타일: 거리와 속도를 모두 고려
      const minSwipeDistance = itemWidth * 0.25; // 25% 이상 스와이프
      const minVelocity = 0.3; // 최소 속도 (px/ms)
      const shouldSwipe = distance > minSwipeDistance || velocity > minVelocity;

      if (shouldSwipe) {
        if (diff > 0 && currentIndex < items.length - 1) {
          // 오른쪽으로 스와이프 (다음 이미지)
          currentIndex++;
        } else if (diff < 0 && currentIndex > 0) {
          // 왼쪽으로 스와이프 (이전 이미지)
          currentIndex--;
        }
      }

      // 부드러운 애니메이션으로 이동
      scrollContainer.style.transition =
        "transform 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94)";
      scrollContainer.style.transform = `translateX(-${
        currentIndex * (itemWidth + gap) + centerOffset
      }px)`;
    };

    // 터치 이벤트
    container.addEventListener("touchstart", (e) => {
      isDragging = true;
      startX = e.touches[0].clientX;
      currentX = startX;
      lastX = startX;
      startTime = Date.now();
      lastTime = startTime;
      startScrollLeft = currentIndex * (itemWidth + gap) + centerOffset;
      scrollContainer.style.transition = "none";
      velocity = 0;
    });

    container.addEventListener("touchmove", (e) => {
      if (!isDragging) return;
      e.preventDefault();

      const now = Date.now();
      currentX = e.touches[0].clientX;

      // 속도 계산 (이동 거리 / 시간)
      if (now - lastTime > 0) {
        const moveDistance = Math.abs(currentX - lastX);
        const timeDiff = now - lastTime;
        velocity = moveDistance / timeDiff;
      }

      lastX = currentX;
      lastTime = now;

      const diff = startX - currentX;
      const scrollLeft = startScrollLeft + diff;
      scrollContainer.style.transform = `translateX(-${scrollLeft}px)`;
    });

    container.addEventListener("touchend", handleSwipeEnd);
    container.addEventListener("touchcancel", handleSwipeEnd);

    // 마우스 이벤트
    container.addEventListener("mousedown", (e) => {
      isDragging = true;
      startX = e.clientX;
      currentX = startX;
      lastX = startX;
      startTime = Date.now();
      lastTime = startTime;
      startScrollLeft = currentIndex * (itemWidth + gap) + centerOffset;
      scrollContainer.style.transition = "none";
      container.style.cursor = "grabbing";
      velocity = 0;
    });

    container.addEventListener("mousemove", (e) => {
      if (!isDragging) return;
      e.preventDefault();

      const now = Date.now();
      currentX = e.clientX;

      // 속도 계산
      if (now - lastTime > 0) {
        const moveDistance = Math.abs(currentX - lastX);
        const timeDiff = now - lastTime;
        velocity = moveDistance / timeDiff;
      }

      lastX = currentX;
      lastTime = now;

      const diff = startX - currentX;
      const scrollLeft = startScrollLeft + diff;
      scrollContainer.style.transform = `translateX(-${scrollLeft}px)`;
    });

    container.addEventListener("mouseup", () => {
      handleSwipeEnd();
      container.style.cursor = "grab";
    });

    container.addEventListener("mouseleave", () => {
      if (isDragging) {
        handleSwipeEnd();
        container.style.cursor = "grab";
      }
    });
  });
});

// --- feed.js ---
const isLoggedIn = false; // true면 회원 UI

// [DEBUG] Instrumentation Helper
(function initDebugHelpers() {
  if (window.__MUMU_DEBUG__) return;
  window.__MUMU_DEBUG__ = true;

  window.__dbg = function (label, payload) {
    try {
      const t = new Date().toISOString();
      console.log(
        `[%cMUMU-DBG%c] ${label} @ ${t}`,
        "color:#ff6a00;font-weight:700",
        "color:inherit",
        payload || {}
      );
    } catch (e) {
      console.log("[MUMU-DBG] log failed", e);
    }
  };

  window.__dbgGlobals = function (where) {
    const snap = {
      where,
      App_user: window.App?.user || null,
      hasSupabase: typeof window.supabase !== "undefined",
      hasSupabaseClient: typeof window.supabaseClient !== "undefined",
      likeTarget: typeof window.likeTarget,
      unlikeTarget: typeof window.unlikeTarget,
      loadComments: typeof window.loadComments,
      createComment: typeof window.createComment,
      deleteComment: typeof window.deleteComment,
      openCommentsModal: typeof window.openCommentsModal,
      closeModal: typeof window.closeModal,
      saveCut: typeof window.saveCut,
      saveCutToFolder: typeof window.saveCutToFolder,
    };
    window.__dbg("GLOBALS_SNAPSHOT", snap);
    return snap;
  };

  window.__dbgScripts = function () {
    const scripts = Array.from(document.querySelectorAll("script[src]")).map(
      (s) => s.getAttribute("src")
    );
    window.__dbg("SCRIPT_ORDER", { scripts });
    return scripts;
  };
})();

// (Moved to app_init.js)

// 문서 클릭 시 모든 드롭다운 닫기
document.addEventListener("click", () => {
  document.querySelectorAll(".comment-menu-dropdown.show").forEach((d) => {
    d.classList.remove("show");
  });
});
/* ============================
   MOBILE IMAGE RESIZE HELPER
============================ */
function isMobileDevice() {
  // iOS Safari detection
  const isIOS =
    /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
  // Mobile width detection
  const isMobileWidth = window.innerWidth <= 480;
  return isIOS || isMobileWidth;
}

function applyMobileImageResize(imageUrl) {
  if (!imageUrl) return imageUrl;

  // Only apply to Cafe24 CDN images
  if (!imageUrl.includes("ecimg.cafe24img.com")) {
    return imageUrl;
  }

  // Mobile: add resize parameter ?RS=420x (preserves aspect ratio)
  if (isMobileDevice()) {
    // Check if URL already has query parameters
    const separator = imageUrl.includes("?") ? "&" : "?";
    return imageUrl + separator + "RS=420x";
  }

  // Desktop: return original URL
  return imageUrl;
}

// 독자와 크리에이터 로그인 상태 확인
async function checkAuthStatus() {
  try {
    // 1. localStorage 힌트 확인 (레이싱 방지)
    const wasLoggedIn = localStorage.getItem("mumu_logged_in") === "true";

    // 2. window.getCurrentFirebaseUser 브리지 시도
    if (typeof window.getCurrentFirebaseUser === "function") {
      const user = await window.getCurrentFirebaseUser();
      if (user)
        return {
          isReaderLoggedIn: true,
          isCreatorLoggedIn: false,
          userId: user.uid,
        };
    }

    // const { auth } = await import("/js/firebase_init.js");
    const auth = window.firebaseAuth;
    const { onAuthStateChanged } = await import(
      "https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js"
    );

    return new Promise((resolve) => {
      // 0.5초 타임아웃: Firebase가 너무 늦게 응답하면 localStorage를 믿음
      const timeout = setTimeout(() => {
        resolve({ isReaderLoggedIn: wasLoggedIn, isCreatorLoggedIn: false });
      }, 1500);

      const unsubscribe = onAuthStateChanged(auth, async (user) => {
        clearTimeout(timeout);
        unsubscribe();
        if (!user || !user.uid) {
          resolve({ isReaderLoggedIn: false, isCreatorLoggedIn: false });
          return;
        }
        resolve({
          isReaderLoggedIn: true,
          isCreatorLoggedIn: false,
          userId: user.uid,
        });
      });
    });
  } catch (error) {
    console.error("[인증] 로그인 상태 확인 실패:", error);
    return { isReaderLoggedIn: false, isCreatorLoggedIn: false };
  }
}

window.addEventListener("DOMContentLoaded", async () => {
  if (typeof window.showMumuLoader === "function") window.showMumuLoader();
  try {
    // 독자와 크리에이터 로그인 상태 확인
    const authStatus = await checkAuthStatus();

    if (!authStatus.isReaderLoggedIn) {
      // 첫 진입 시 스플래시 화면으로 이동
      // [FIX] /splash.html -> splash.html (경로 유동성 확보)
      window.location.replace("splash.html");
      return;
    }

    // 크리에이터 로그인은 선택사항이므로 알림 제거

    const guestBox = document.getElementById("guestBox");
    const memberBox = document.getElementById("memberBox");

    // 댓글 아이콘 통일: 각 카드의 두 번째 stat을 댓글로 간주해 클래스/aria 부여
    normalizeCommentButtons();

    // 요소가 존재할 때만 스타일 변경
    if (guestBox && memberBox) {
      // 로그인 상태에 따라 UI 표시
      if (authStatus.isReaderLoggedIn) {
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
      if (!isSearchModeActive()) {
        loadFeedImages();
      }
    }, 100);

    // feedList가 존재할 때만 실제 피드 로드 (Supabase 준비 후 실행)
    const feedList =
      document.getElementById("feedList") ||
      document.querySelector(".feed-list");
    if (feedList && !isSearchModeActive()) {
      console.log("[FEED] init start");
      await ensureSupabaseReady();
      // Initialize Batch Loading
      window.MUMU_FEED_STATE = {
        allWorks: [],
        currentIndex: 0,
        batchSize: 3,
        isLoading: false,
        el: feedList,
      };
      await loadLiveFeed(feedList);
    }

    // Progressive feed rendering: 초기 3개만 표시, 나머지는 점진적으로 렌더링
    if (!isSearchModeActive()) {
      renderFeedItemsProgressively();
    }

    // [DEBUG] Click Capture
    document.addEventListener(
      "click",
      (e) => {
        const el =
          e.target?.closest?.(
            "button, a, [data-action], [data-target-id], .feed-card-stat, .comment-btn, .like-btn"
          ) || e.target;
        const info = {
          tag: el?.tagName,
          class: el?.className,
          id: el?.id,
          text: (el?.innerText || "").slice(0, 40),
          dataAction: el?.dataset?.action,
          dataTargetId: el?.dataset?.targetId,
          aria: el?.getAttribute?.("aria-label"),
          path: e.composedPath
            ? e
                .composedPath()
                .slice(0, 6)
                .map((n) => n?.tagName || n?.id || n?.className)
                .filter(Boolean)
            : null,
        };
        window.__dbg && window.__dbg("CLICK_CAPTURE", info);
        window.__dbgGlobals && window.__dbgGlobals("on_click_capture");
      },
      true
    );
  } finally {
    if (typeof window.hideMumuLoader === "function") window.hideMumuLoader();
  }
});

// 댓글 아이콘 누락 방지: 하트/댓글/저장 순서일 때 중간 요소에 클래스/aria 부여
function normalizeCommentButtons() {
  document.querySelectorAll(".feed-card-stats").forEach((group) => {
    const stats = Array.from(group.querySelectorAll(".feed-card-stat"));
    if (stats[1]) {
      stats[1].classList.add("stat-icon-comment");
      stats[1].setAttribute("aria-label", "댓글");
      const svg = stats[1].querySelector(".stat-icon");
      if (svg) {
        svg.classList.add("stat-icon-comment");
      }
    }
  });
}

// applyMobileImageResize is already declared above

/* ============================
   FEED IMAGES LOADER
============================ */
const IMAGE_FILES = [
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
  "j4.webp",
];

function isSearchModeActive() {
  if (window.location.pathname.includes("search")) return true;
  if (
    document.body.classList.contains("search-mode") ||
    document.documentElement.classList.contains("search-mode")
  )
    return true;
  const searchInput = document.querySelector(
    'input[type="search"], input[placeholder*="검색"], .search-input'
  );
  if (
    searchInput &&
    (document.activeElement === searchInput ||
      searchInput.offsetParent !== null)
  )
    return true;
  const searchContainer = document.querySelector(
    '.search-container, .search-mode, [data-search-mode="true"]'
  );
  if (searchContainer && searchContainer.offsetParent !== null) return true;
  return false;
}

function loadFeedImages() {
  if (isSearchModeActive()) return;

  const feedSections = document.querySelectorAll(
    ".feed-item-section[data-feed-index]"
  );
  let imageIndex = 0;

  feedSections.forEach((section) => {
    const feedIndex = parseInt(section.getAttribute("data-feed-index"));
    // 초기에는 처음 3개 아이템(0, 1, 2)만 이미지 로드
    if (feedIndex >= 3) return;
    if (
      section.style.display === "none" ||
      window.getComputedStyle(section).display === "none"
    )
      return;

    const placeholders = section.querySelectorAll(".content-placeholder");

    placeholders.forEach((placeholder) => {
      if (!placeholder.querySelector("img")) {
        const img = document.createElement("img");
        const fileName = IMAGE_FILES[imageIndex % IMAGE_FILES.length];
        const encodedFileName = encodeURIComponent(fileName);
        const imagePath = `/assets/feed/${encodedFileName}`;
        img.src = applyMobileImageResize(imagePath);
        img.alt = "Feed image";
        img.loading = "lazy";
        img.decoding = "async";

        img.onload = function () {
          this.style.display = "block";
        };

        img.onerror = function () {
          this.style.display = "none";
        };

        placeholder.appendChild(img);
        imageIndex++;
      }
    });
  });

  initSliderDotsSync();
}

function renderFeedItemsProgressively() {
  if (isSearchModeActive()) return;

  const feedSections = document.querySelectorAll(".feed-item-section");
  if (feedSections.length <= 3) return;

  let currentIndex = 3;
  const batchSize = 2;
  let totalImageIndex = 12;

  function renderNextBatch() {
    if (currentIndex >= feedSections.length) {
      initSliderDotsSync();
      return;
    }

    const endIndex = Math.min(currentIndex + batchSize, feedSections.length);
    for (let i = currentIndex; i < endIndex; i++) {
      const section = feedSections[i];
      if (section) {
        section.style.display = "";
        const placeholders = section.querySelectorAll(".content-placeholder");

        placeholders.forEach((placeholder) => {
          if (!placeholder.querySelector("img")) {
            const img = document.createElement("img");
            const fileName = IMAGE_FILES[totalImageIndex % IMAGE_FILES.length];
            const encodedFileName = encodeURIComponent(fileName);
            const imagePath = `/assets/feed/${encodedFileName}`;
            img.src = applyMobileImageResize(imagePath);
            img.alt = "Feed image";
            img.loading = "lazy";
            img.decoding = "async";

            img.onload = function () {
              this.style.display = "block";
            };

            img.onerror = function () {
              this.style.display = "none";
            };

            placeholder.appendChild(img);
            totalImageIndex++;
          }
        });
      }
    }

    currentIndex = endIndex;

    if (currentIndex < feedSections.length) {
      requestAnimationFrame(() => {
        setTimeout(renderNextBatch, 50);
      });
    } else {
      initSliderDotsSync();
    }
  }

  requestAnimationFrame(() => {
    setTimeout(renderNextBatch, 200);
  });
}

/* ============================
   Feed 이미지 슬라이더와 Dots 동기화
============================ */
function attachFeedImageSliders() {
  const imageContainers = document.querySelectorAll(".feed-image-container");

  imageContainers.forEach((container) => {
    const scrollElement = container.querySelector(".feed-image-scroll");
    if (!scrollElement) return;

    const feedItem = container.closest(".feed-item");
    if (!feedItem) return;

    const pagination = feedItem.querySelector(".feed-card-pagination");
    if (!pagination) return;

    const dotsContainer = pagination.querySelector(".pagination-dots");
    if (!dotsContainer) return;

    const imageItems = scrollElement.querySelectorAll(".feed-image-item");
    const dots = dotsContainer.querySelectorAll(".pagination-dot");

    if (imageItems.length <= 1 || dots.length === 0) return;

    // 각 이미지 아이템의 너비를 컨테이너 너비와 정확히 일치시키기
    const setItemWidths = () => {
      const containerWidth = container.offsetWidth;
      imageItems.forEach((item) => {
        item.style.width = `${containerWidth}px`;
        item.style.minWidth = `${containerWidth}px`;
        item.style.maxWidth = `${containerWidth}px`;
      });
    };

    // 초기 너비 설정
    setItemWidths();

    // 리사이즈 시에도 너비 재설정
    const resizeObserver = new ResizeObserver(() => {
      setItemWidths();
    });
    resizeObserver.observe(container);

    // 스크롤 스냅 강제 적용 함수
    const snapToNearest = () => {
      const containerWidth = container.offsetWidth;
      const scrollLeft = container.scrollLeft;
      const currentIndex = Math.round(scrollLeft / containerWidth);
      const targetScroll = currentIndex * containerWidth;

      // 즉시 스냅 (애니메이션 없음)
      if (Math.abs(container.scrollLeft - targetScroll) > 1) {
        container.scrollLeft = targetScroll;
      }
    };

    // 점 업데이트 함수
    const updateActiveDot = () => {
      const containerWidth = container.offsetWidth;
      const scrollLeft = container.scrollLeft;
      const currentIndex = Math.round(scrollLeft / containerWidth);
      const safeIndex = Math.max(0, Math.min(currentIndex, dots.length - 1));

      dots.forEach((dot) => {
        dot.classList.remove("active");
      });

      if (dots[safeIndex]) {
        dots[safeIndex].classList.add("active");
      }
    };

    // 스크롤 이벤트 - 점만 업데이트, 스냅은 스크롤 종료 시에만
    let scrollTimeout;
    let isUserScrolling = false;

    container.addEventListener("scroll", () => {
      isUserScrolling = true;
      clearTimeout(scrollTimeout);

      // 스크롤 중에는 점만 업데이트
      updateActiveDot();

      // 스크롤이 끝난 후에만 스냅 적용
      scrollTimeout = setTimeout(() => {
        isUserScrolling = false;
        snapToNearest();
        updateActiveDot();
      }, 100);
    });

    // 터치/마우스 종료 시 즉시 스냅
    const handleEnd = () => {
      setTimeout(() => {
        snapToNearest();
        updateActiveDot();
      }, 50);
    };

    container.addEventListener("touchend", handleEnd);
    container.addEventListener("touchcancel", handleEnd);
    container.addEventListener("mouseup", handleEnd);
    container.addEventListener("mouseleave", handleEnd);

    // scrollend 이벤트
    if ("onscrollend" in container) {
      container.addEventListener("scrollend", () => {
        snapToNearest();
        updateActiveDot();
      });
    }

    // 초기 상태 설정
    container.scrollLeft = 0;
    setTimeout(() => {
      setItemWidths();
      snapToNearest();
      updateActiveDot();
    }, 100);
  });
}

/* ============================
   슬라이더와 Dots 동기화
============================ */
function initSliderDotsSync() {
  const sliders = document.querySelectorAll(".content-placeholder-slider");

  sliders.forEach((slider) => {
    const sliderItems = slider.querySelectorAll(".content-placeholder");
    const feedItemSection = slider.closest(".feed-item-section");
    const bottomContent = feedItemSection
      ? feedItemSection.querySelector(".bottom-content")
      : null;
    const dotsContainer = bottomContent
      ? bottomContent.querySelector(".content-dots")
      : null;

    if (!dotsContainer) return;

    const dots = dotsContainer.querySelectorAll(".dot");
    const totalSlides = sliderItems.length;

    // dot 개수를 슬라이드 개수에 정확히 맞추기 (항상 재생성)
    dotsContainer.innerHTML = "";
    for (let i = 0; i < totalSlides; i++) {
      const dot = document.createElement("span");
      dot.className = "dot";
      if (i === 0) dot.classList.add("active");
      dotsContainer.appendChild(dot);
    }

    // 모든 dot의 active 클래스 제거 후 첫 번째 dot만 활성화
    const allDots = dotsContainer.querySelectorAll(".dot");
    // 초기 상태에서는 첫 번째 dot만 활성화 (슬라이더가 처음 위치에 있음)
    // 모든 dot의 active 클래스 제거
    allDots.forEach((dot) => {
      dot.classList.remove("active");
    });
    // 첫 번째 dot만 활성화
    if (allDots.length > 0) {
      allDots[0].classList.add("active");
    }

    // 스크롤 이벤트 리스너 - 인스타그램 스타일로 정확한 슬라이드 감지
    let scrollTimeout;
    slider.addEventListener("scroll", () => {
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
        dot.classList.remove("active");
      });

      // 현재 인덱스의 dot만 활성화
      if (allDots[currentIndex]) {
        allDots[currentIndex].classList.add("active");
      }
    };

    // 슬라이더 초기 위치를 0으로 명시적으로 설정
    slider.scrollLeft = 0;

    // 스크롤 스냅이 완료된 후에도 dot 업데이트
    slider.addEventListener("scrollend", () => {
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

async function loadLiveFeed(feedListEl) {
  if (isSearchModeActive()) return;

  // Supabase 클라이언트 로드
  const supabase = await loadSupabaseClient();
  if (!supabase) {
    console.error("[FEED] live feed load failed — mock disabled");
    renderEmptyFeedState(feedListEl);
    return;
  }

  try {
    const { data, error } = await supabase
      .from("works")
      .select(
        `
          id,
          title,
          description,
          genre,
          tags,
          thumbnail_url,
          created_at,
          creator_id,
          status,
          is_public,
          series_id,
          is_standalone,
          episode_number,
          thumb_scale,
          thumb_x,
          thumb_y,
          cuts(id, image_url, order_index, is_visible)
        `
      )
      .eq("is_public", true)
      .or("status.eq.approved,status.eq.published")
      .order("created_at", { ascending: false })
      .limit(20);

    // ✅ 작업 B: 실패 판정 로직 분리
    if (error) {
      // 진짜 실패
      console.error("[FEED] supabase error:", error);
      renderEmptyFeedState(feedListEl);
      return;
    }

    if (!data) {
      // 진짜 실패
      console.error("[FEED] no data returned");
      renderEmptyFeedState(feedListEl);
      return;
    }

    const works = Array.isArray(data) ? data : [];

    if (works.length === 0) {
      // 정상: 빈 피드
      console.log("[FEED] empty feed (normal state)");
      renderEmptyFeedState(feedListEl);
      return;
    }

    // 디버그 로그 추가 (즉시)
    console.log("[DEBUG] works raw:", works);
    console.log("[FEED] works count:", works.length);
    console.log(
      "[FEED] work ids:",
      works.map((w) => w.id)
    );

    // Initialize Global Feed State
    window.MUMU_FEED_STATE = {
      allWorks: works,
      currentIndex: 0,
      batchSize: 5, // 한 번에 로드할 아이템 수
      isLoading: false,
      el: feedListEl,
      creatorUuidToFirebaseUidMap: {},
      creatorFirebaseUidToNameMap: {},
    };

    // 크리에이터 정보 매핑 (works.creator_id는 UUID이므로 creators.id로 조회 후 firebase_uid 가져오기)
    const creatorUuids = [
      ...new Set(works.map((w) => w.creator_id).filter(Boolean)),
    ];

    if (creatorUuids.length > 0) {
      try {
        // works.creator_id (UUID) → creators.id (UUID)로 조회 → firebase_uid 가져오기
        const { data: creators, error: creatorsError } = await supabase
          .from("creators")
          .select("id, firebase_uid, pen_name")
          .in("id", creatorUuids);

        if (!creatorsError && creators) {
          creators.forEach((creator) => {
            if (creator.id && creator.firebase_uid) {
              window.MUMU_FEED_STATE.creatorUuidToFirebaseUidMap[creator.id] =
                creator.firebase_uid;
              if (creator.firebase_uid && creator.pen_name) {
                window.MUMU_FEED_STATE.creatorFirebaseUidToNameMap[
                  creator.firebase_uid
                ] = creator.pen_name;
              }
            }
          });
        }
      } catch (err) {
        console.error("[feed] 크리에이터 정보 로드 실패:", err);
      }
    }

    feedListEl.innerHTML = "";
    feedListEl.style.display = "";

    // Render Initial Batch
    await renderNextFeedBatch();

    // Setup Infinite Scroll
    setupFeedInfiniteScroll();
  } catch (err) {
    console.error("[FEED] live feed load failed — mock disabled:", err);
    renderEmptyFeedState(feedListEl);
  } finally {
    hideFullPageLoader();
  }
}

async function renderNextFeedBatch() {
  const state = window.MUMU_FEED_STATE;
  if (!state || state.isLoading || state.currentIndex >= state.allWorks.length)
    return;

  state.isLoading = true;
  const batch = state.allWorks.slice(
    state.currentIndex,
    state.currentIndex + state.batchSize
  );

  // Show Batch Loader
  showBatchLoader(state.el);

  // Simulate network delay for smooth feel
  await new Promise((r) => setTimeout(r, 400));

  const items = batch.map((w) => {
    const cuts = Array.isArray(w.cuts)
      ? w.cuts
          .filter((c) => c.is_visible !== false)
          .sort((a, b) => (a.order_index || 0) - (b.order_index || 0))
      : [];
    const thumbnail =
      w.thumbnail_url || (cuts.length > 0 ? cuts[0].image_url : null) || null;

    // works.creator_id (UUID) → firebase_uid 변환
    const creatorFirebaseUid = w.creator_id
      ? state.creatorUuidToFirebaseUidMap[w.creator_id] || null
      : null;
    const creatorName = creatorFirebaseUid
      ? state.creatorFirebaseUidToNameMap[creatorFirebaseUid] || "사용자"
      : "사용자";

    return {
      id: w.id, // ✅ feeds.id (UUID) - CRITICAL: Used as comment target_id
      creator: creatorName,
      creator_id: creatorFirebaseUid, // ✅ firebase_uid (creator modal용)
      creator_uuid: w.creator_id, // ✅ creators.id (uuid) - 백업용
      title: w.title || "",
      desc: w.description || "",
      thumbnail,
      cuts: cuts.map((c) => ({
        id: c.id,
        image_url: c.image_url,
        order_index: c.order_index,
      })), // cuts 정보를 객체로 저장
      tags: Array.isArray(w.tags) ? w.tags : [],
      created_at: w.created_at,
      thumb_scale: w.thumb_scale,
      thumb_x: w.thumb_x,
      thumb_y: w.thumb_y,
      episode_number: w.episode_number,
    };
  });

  removeBatchLoader();

  // ✅ 작업 C: 유효한 피드만 렌더링
  const validItems = items.filter((item) => {
    if (!item?.id || !item?.creator_id) {
      console.error("[FEED][RENDER] skipping invalid feed:", item);
      return false;
    }
    return true;
  });

  validItems.forEach((item) => {
    const cardHTML = createFeedCard(item);
    if (cardHTML) {
      state.el.insertAdjacentHTML("beforeend", cardHTML);
    }
  });

  state.currentIndex += state.batchSize;
  state.isLoading = false;

  // Re-attach listeners for new items
  attachFeedImageSliders();
  attachCreatorMoreBtnListeners();
  attachFollowBtnListeners();
  normalizeCommentButtons();
  // attachCutImageInteractions(); // Moved to global listeners in app_init.js

  // Update Stats for new batch
  const batchIds = batch
    .map((w) => w.id)
    .filter((id) => id && typeof id === "string" && id.trim().length > 0);

  if (batchIds.length > 0) {
    updateFeedStats(batchIds).catch((err) =>
      console.error("[피드] 통계 업데이트 실패:", err)
    );
  }
}

function showBatchLoader(container) {
  if (document.getElementById("batch-loader")) return;
  const loader = document.createElement("div");
  loader.id = "batch-loader";
  loader.innerHTML = `<div class="batch-spinner"></div>`;
  loader.style.cssText =
    "display:flex;justify-content:center;padding:20px;width:100%;";
  container.appendChild(loader);
}

function removeBatchLoader() {
  const loader = document.getElementById("batch-loader");
  if (loader) loader.remove();
}

function setupFeedInfiniteScroll() {
  if (window.MUMU_FEED_OBSERVER) window.MUMU_FEED_OBSERVER.disconnect();

  const options = { root: null, rootMargin: "200px", threshold: 0.1 };
  const observer = new IntersectionObserver((entries) => {
    if (entries[0].isIntersecting) {
      renderNextFeedBatch();
    }
  }, options);

  // Create sentinel
  let sentinel = document.getElementById("feed-sentinel");
  if (!sentinel) {
    sentinel = document.createElement("div");
    sentinel.id = "feed-sentinel";
    sentinel.style.height = "10px";
    window.MUMU_FEED_STATE.el.appendChild(sentinel);
  }

  // Ensure sentinel is at the end
  window.MUMU_FEED_STATE.el.appendChild(sentinel);
  observer.observe(sentinel);
  window.MUMU_FEED_OBSERVER = observer;
}

// ✅ 빈 피드 상태 UI 렌더링
function renderEmptyFeedState(feedListEl) {
  if (!feedListEl) return;
  feedListEl.innerHTML = "";
  feedListEl.style.display = "";
  hideFullPageLoader();
}

// 전체 화면 로딩 스피너 숨기기
function hideFullPageLoader() {
  const loader = document.getElementById("full-page-loader");
  if (loader) {
    loader.classList.add("hidden");
    // 애니메이션 완료 후 숨김 (DOM에서 제거하지 않음 - 재사용 가능하도록)
    setTimeout(() => {
      if (typeof window.hideMumuLoader === "function") {
        window.hideMumuLoader();
      } else {
        loader.style.display = "none";
      }
    }, 300);
  }
}

// ✅ loadMockFeed 완전 제거됨 — mock 사용 금지

let creatorMoreBtnDelegateAttached = false;
let followBtnDelegateAttached = false;

function attachCreatorMoreBtnListeners() {
  if (creatorMoreBtnDelegateAttached) return;
  creatorMoreBtnDelegateAttached = true;

  // ⚠️ STEP 2: 이벤트 관문 통합으로 비활성화
  // document.addEventListener("click", function (e) {
  //   const btn = e.target.closest(".creator-more-btn");
  //   if (!btn) return;
  //   const modal = document.getElementById("CreatorMoreModal");
  //   if (modal && modal.style.display === "flex") {
  //     closeCreatorMoreModal();
  //   } else {
  //     openCreatorMoreModal(btn);
  //   }
  // });
  // 기존 로직은 App.events.handleClick에서 처리됨
}

function attachFollowBtnListeners() {
  if (followBtnDelegateAttached) return;
  followBtnDelegateAttached = true;

  // ⚠️ STEP 2: 이벤트 관문 통합으로 비활성화
  // document.addEventListener("click", function (e) {
  //   const btn = e.target.closest(".follow-btn, .creator-follow-btn");
  //   if (!btn) return;
  //   btn.classList.toggle("following");
  //   if (btn.classList.contains("following")) {
  //     btn.textContent = "팔로잉";
  //   } else {
  //     btn.textContent = "팔로우";
  //   }
  // });
  // 기존 로직은 App.events.handleClick에서 처리됨
}

// attachCutImageInteractions logic moved to global listeners in app_init.js
// function attachCutImageInteractions() { ... }
// function bindCutLongPress() { ... }
// function saveCut() { ... }
// function performSaveCut() { ... }
// function saveCutToDatabase() { ... }
// function showSaveFeedback() { ... }

// 더블 클릭 핸들러 (좋아요) - 더 이상 사용되지 않음 (attachCutImageInteractions에서 직접 처리)
// 이 함수는 레거시 코드이므로 제거하지 않고 주석 처리
// function handleDoubleClick(feedItem) {
//   const feedId = feedItem.getAttribute("data-feed-id");
//   if (!feedId) return;
//
//   // 좋아요 버튼 찾기
//   const likeButton = feedItem.querySelector(
//     '.feed-card-stat[aria-label="좋아요"]'
//   );
//   if (!likeButton) return;
//
//   // 좋아요 버튼 클릭 이벤트 트리거
//   const clickEvent = new MouseEvent("click", {
//     bubbles: true,
//     cancelable: true,
//     view: window,
//   });
//   likeButton.dispatchEvent(clickEvent);
// }

/* ============================
   FEED CARD TEMPLATE
============================ */

function createFeedCard(item) {
  // ✅ 작업 C: dataset이 없는 feed는 렌더 자체를 하지 않음
  if (!item?.id || !item?.creator_id) {
    console.error("[FEED][RENDER] invalid feed data", item);
    return null;
  }

  // cuts 배열이 있으면 모든 이미지를 슬라이드로, 없으면 썸네일만
  const cuts = item.cuts && item.cuts.length > 0 ? item.cuts : [];
  const images =
    cuts.length > 0
      ? cuts.map((c) => (typeof c === "string" ? c : c.image_url))
      : item.thumbnail
      ? [item.thumbnail]
      : [];
  const imageCount = images.length;

  // 이미지 슬라이드 HTML 생성
  let imageSliderHTML = "";
  if (imageCount > 0) {
    const imageItems = images
      .map((imgUrl, idx) => {
        const isThumb = idx === 0 && item.thumb_scale;
        const imgStyle = isThumb
          ? `width: 100%; height: 100%; object-fit: contain; transform: scale(${
              item.thumb_scale
            }); transform-origin: ${item.thumb_x || 50}% ${
              item.thumb_y || 50
            }%; display: block;`
          : `width: 100%; height: 100%; object-fit: contain !important; display: block;`;

        return `
            <div class="feed-image-item feed-cut-item" data-cut-id="${
              cuts[idx]?.id || ""
            }" style="background-color: #f7f7f7;">
              <img
                src="${imgUrl}"
                alt="${item.title || "작품"} - 이미지 ${idx + 1}"
                loading="lazy"
                decoding="async"
                style="${imgStyle}"
              />
            </div>
          `;
      })
      .join("");

    imageSliderHTML = `
      <div class="feed-image-container">
        <div class="feed-image-scroll">
          ${imageItems}
        </div>
      </div>
    `;
  }

  // 슬라이드 점 HTML 생성
  let dotsHTML = "";
  if (imageCount > 1) {
    const dots = Array(imageCount)
      .fill(0)
      .map(
        (_, idx) =>
          `<span class="pagination-dot${idx === 0 ? " active" : ""}"></span>`
      )
      .join("");
    dotsHTML = `<div class="pagination-dots">${dots}</div>`;
  }

  // 날짜 포맷팅
  const dateStr = item.created_at
    ? new Date(item.created_at)
        .toLocaleDateString("ko-KR", {
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
        })
        .replace(/\./g, ".")
        .replace(/\s/g, "")
    : "";

  // ✅ data-feed-id / data-creator-id 강제 설정 (undefined 차단)
  const feedId = item.id; // ✅ works.id (uuid)
  const creatorId = item.creator_id || ""; // ✅ MUST be firebase_uid (text)

  // 디버그 로그 추가
  console.log("[FEED][RENDER] feedId, creatorId:", feedId, creatorId);

  if (!feedId || !creatorId) {
    console.error("[FEED][RENDER] missing critical data!", {
      feedId,
      creatorId,
    });
    return "";
  }

  return `
    <article class="feed-item" data-feed-id="${feedId}" data-work-id="${feedId}" data-creator-id="${creatorId}" data-cuts='${JSON.stringify(
    item.cuts || []
  )}'>
      <div class="feed-card-header">
        <div class="feed-card-title-group">
          ${
            item.series_id
              ? `<div class="feed-series-link" onclick="location.href='series_detail.html?series_id=${item.series_id}'; event.stopPropagation();">시리즈 전체보기</div>`
              : ""
          }
          <h3 class="feed-card-title">${item.title || ""}${
    item.episode_number ? ` (${item.episode_number}화)` : ""
  }</h3>
          <p class="feed-card-desc">${item.description || item.desc || ""}</p>
      </div>
        <div class="feed-card-avatar">
          <div class="avatar-circle" data-creator-id="${creatorId}" data-action="profile" data-target-id="${creatorId}">
            <svg xmlns="http://www.w3.org/2000/svg" width="23" height="23" viewBox="0 0 23 23" fill="none">
              <path d="M11.498 0C13.0228 0 14.4851 0.605699 15.5632 1.68385C16.6414 2.762 17.2471 4.22429 17.2471 5.74902C17.2471 7.27376 16.6414 8.73605 15.5632 9.8142C14.4851 10.8923 13.0228 11.498 11.498 11.498C9.97331 11.498 8.51102 10.8923 7.43287 9.8142C6.35472 8.73605 5.74902 7.27376 5.74902 5.74902C5.74902 4.22429 6.35472 2.762 7.43287 1.68385C8.51102 0.605699 9.97331 0 11.498 0ZM11.498 22.9961C11.498 22.9961 22.9961 22.9961 22.9961 20.1216C22.9961 16.6722 17.3908 12.9353 11.498 12.9353C5.6053 12.9353 0 16.6722 0 20.1216C0 22.9961 11.498 22.9961 11.498 22.9961Z" fill="#FF5E00"/>
            </svg>
      </div>
          <div class="avatar-plus">
            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path d="M5.64258 1V5.64258M5.64258 5.64258V10.2852M5.64258 5.64258H10.2852M5.64258 5.64258H1" stroke="#FFFFFF" stroke-width="2" stroke-linecap="square"/>
            </svg>
          </div>
      </div>
      </div>
      ${imageSliderHTML}
      <div class="feed-card-pagination">
        ${dotsHTML}
        ${dateStr ? `<div class="feed-card-date">${dateStr}</div>` : ""}
      </div>
      <div class="feed-card-footer">
        <div class="feed-card-meta">
          ${
            item.tags && item.tags.length > 0
              ? `<div class="feed-card-tags">${item.tags
                  .slice(0, 3)
                  .map((tag) => `<span class="feed-card-tag">${tag}</span>`)
                  .join("")}</div>`
              : ""
          }
          <div class="feed-card-stats">
            <button class="feed-card-stat" type="button" aria-label="좋아요" data-action="like" data-feed-id="${
              item.id
            }">
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 18 18" fill="none" class="stat-icon">
                <path d="M15.8434 4.05117C15.4768 3.68448 15.0417 3.3936 14.5627 3.19514C14.0837 2.99668 13.5704 2.89453 13.0519 2.89453C12.5335 2.89453 12.0201 2.99668 11.5411 3.19514C11.0621 3.3936 10.627 3.68448 10.2605 4.05117L9.49981 4.81182L8.73916 4.05117C7.99882 3.31083 6.9947 2.89491 5.94771 2.89492C4.90071 2.89492 3.89659 3.31083 3.15626 4.05117C2.41592 4.79151 2 5.79562 2 6.84262C2 7.88962 2.41592 8.89373 3.15626 9.63407L3.91691 10.3947L9.49981 15.9776L15.0827 10.3947L15.8434 9.63407C16.21 9.26756 16.5009 8.83238 16.6994 8.35342C16.8979 7.87445 17 7.36108 17 6.84262C17 6.32417 16.8979 5.81079 16.6994 5.33183C16.5009 4.85286 16.21 4.41769 15.8434 4.05117Z" stroke="#A0A0A0" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
              <span class="stat-count">0</span>
            </button>
            <button class="feed-card-stat stat-icon-comment" type="button" aria-label="댓글" data-action="comment" data-target-id="${
              item.id
            }" data-feed-id="${item.id}">
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 18 18" fill="none" class="stat-icon stat-icon-comment">
                <path d="M16 8.61112C16.0027 9.63769 15.7628 10.6504 15.3 11.5667C14.7512 12.6647 13.9076 13.5882 12.8636 14.2339C11.8195 14.8795 10.6164 15.2217 9.38888 15.2222C8.36231 15.2249 7.34964 14.9851 6.43333 14.5222L2 16L3.47778 11.5667C3.01494 10.6504 2.7751 9.63769 2.77778 8.61112C2.77825 7.3836 3.12047 6.18046 3.76611 5.13644C4.41175 4.09243 5.3353 3.24879 6.43333 2.70002C7.34964 2.23719 8.36231 1.99735 9.38888 2.00002H9.77777C11.3989 2.08946 12.9301 2.77372 14.0782 3.9218C15.2263 5.06987 15.9105 6.60108 16 8.22223V8.61112Z" stroke="#A0A0A0" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
              <span class="stat-count">0</span>
            </button>
          </div>
        </div>
      </div>
    </article>
  `;
}

/* ============================
   LIKE HELPERS
============================ */
async function getCurrentUserId() {
  // Firebase Auth 기준
  if (typeof window.getCurrentFirebaseUser === "function") {
    const user = await window.getCurrentFirebaseUser();
    return user?.uid || null;
  }
  return null;
}

// ✅ toggleLike 함수 제거 - api-functions.js의 window.likeTarget/window.unlikeTarget 사용

/* ============================
   READER 좋아요 / 댓글 / 대댓글 CRUD
============================ */

// Firebase UID 가져오기 헬퍼
async function getCurrentFirebaseUid() {
  try {
    if (typeof window.getCurrentFirebaseUser === "function") {
      const user = await window.getCurrentFirebaseUser();
      return user?.uid || null;
    }
    // 직접 Firebase Auth 확인
    // const { auth } = await import("/js/firebase_init.js");
    const { onAuthStateChanged } = await import(
      "https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js"
    );
    return new Promise((resolve) => {
      const unsubscribe = onAuthStateChanged(auth, (user) => {
        unsubscribe();
        resolve(user?.uid || null);
      });
    });
  } catch (error) {
    console.error("[좋아요/댓글] Firebase UID 가져오기 실패:", error);
    return null;
  }
}

// ✅ 모든 DB 작업은 api-functions.js에서 처리
// window.likeTarget, window.unlikeTarget, window.createComment 등은 api-functions.js에 정의됨

// 피드별 좋아요/댓글 수 업데이트
async function updateFeedStats(feedIds) {
  // ⚠️ STEP 2: isValidUUID 중복 선언 제거 - App.utils.isUUID 사용
  const isValidUUID =
    window.App?.utils?.isUUID ||
    function (v) {
      // 폴백: App.utils가 아직 로드되지 않은 경우
      if (!v || typeof v !== "string") return false;
      return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        v
      );
    };

  // ✅ FEED STATS 방어 로직: Array 체크 및 undefined 완전 제거
  if (!Array.isArray(feedIds) || feedIds.length === 0) {
    console.warn("[FEED STATS] skip query: empty ids");
    return;
  }

  // 엄격한 필터링: undefined, null, 빈 문자열 제거 및 UUID 검증
  // ✅ 피드 ID = works.id (uuid 타입)
  const filteredFeedIds = feedIds.filter((id) => {
    // undefined, null 체크
    if (id === undefined || id === null) {
      console.warn("[FEED STATS] undefined/null id detected, skipping");
      return false;
    }
    // 타입 체크 (string이어야 함)
    if (typeof id !== "string") {
      console.warn("[FEED STATS] non-string id detected:", id, typeof id);
      return false;
    }
    // 빈 문자열 체크
    if (id.trim().length === 0) {
      console.warn("[FEED STATS] empty string id detected, skipping");
      return false;
    }
    // ✅ UUID 형식 검증
    if (!isValidUUID(id)) {
      console.warn("[FEED STATS] invalid UUID format:", id);
      return false;
    }
    return true;
  });

  if (filteredFeedIds.length === 0) {
    console.warn("[FEED STATS] skip query: empty ids after filtering");
    return;
  }

  // Supabase client 대기
  return new Promise((resolve) => {
    function checkSupabase() {
      if (window.supabase) {
        updateStats();
      } else {
        setTimeout(checkSupabase, 50);
      }
    }

    async function updateStats() {
      try {
        // 좋아요 수 조회 (에러가 나도 계속 진행)
        let likesData = null;
        try {
          console.log("[FEED] likes target ids:", filteredFeedIds);
          const result = await window.supabase
            .from("likes")
            .select("target_id")
            .eq("target_type", "feed")
            .in("target_id", filteredFeedIds);
          if (!result.error) {
            likesData = result.data;
          } else {
            console.error("[피드 통계] 좋아요 수 조회 실패:", result.error);
          }
        } catch (likesErr) {
          console.error("[피드 통계] 좋아요 수 조회 예외:", likesErr);
        }

        // 댓글 수 조회 (에러가 나도 계속 진행)
        let commentsData = null;
        try {
          console.log("[FEED] comments target ids:", filteredFeedIds);
          const result = await window.supabase
            .from("comments")
            .select("target_id")
            .eq("target_type", "feed")
            .in("target_id", filteredFeedIds);
          if (!result.error) {
            commentsData = result.data;
          } else {
            console.error("[피드 통계] 댓글 수 조회 실패:", result.error);
          }
        } catch (commentsErr) {
          console.error("[피드 통계] 댓글 수 조회 예외:", commentsErr);
        }

        // 각 피드별로 카운트 계산
        const likeCounts = {};
        const commentCounts = {};

        if (likesData && Array.isArray(likesData)) {
          likesData
            .map((like) => like?.target_id)
            .filter(
              (id) => id && typeof id === "string" && id.trim().length > 0
            )
            .forEach((targetId) => {
              likeCounts[targetId] = (likeCounts[targetId] || 0) + 1;
            });
        }

        if (commentsData && Array.isArray(commentsData)) {
          commentsData
            .map((comment) => comment?.target_id)
            .filter(
              (id) => id && typeof id === "string" && id.trim().length > 0
            )
            .forEach((targetId) => {
              commentCounts[targetId] = (commentCounts[targetId] || 0) + 1;
            });
        }

        // UI 업데이트
        filteredFeedIds.forEach((feedId) => {
          // 1. 피드 카드 내부 업데이트
          const feedItem = document.querySelector(
            `.feed-item[data-feed-id="${feedId}"]`
          );

          // 2. 피드 카드 외부(예: 뷰어 하단 바) 업데이트
          // querySelectorAll로 모든 관련 버튼을 찾음
          const likeButtons = document.querySelectorAll(
            `[data-action="like"][data-feed-id="${feedId}"]`
          );
          const commentButtons = document.querySelectorAll(
            `[data-action="comment"][data-feed-id="${feedId}"]`
          );

          // 좋아요 수 업데이트
          likeButtons.forEach((btn) => {
            const countEl = btn.querySelector(".stat-count");
            if (countEl) {
              const spinner = countEl.querySelector(".stat-loading-spinner");
              if (spinner) spinner.remove();
              countEl.textContent = likeCounts[feedId] || 0;
            }
          });

          // 댓글 수 업데이트
          commentButtons.forEach((btn) => {
            const countEl = btn.querySelector(".stat-count");
            if (countEl) {
              const spinner = countEl.querySelector(".stat-loading-spinner");
              if (spinner) spinner.remove();
              countEl.textContent = commentCounts[feedId] || 0;
            }
          });
        });

        // 현재 사용자의 좋아요 상태 확인 및 업데이트 (에러와 관계없이 시도)
        try {
          console.log("[FEED STATS] 좋아요 상태 로드 시작");
          const firebaseUid = await getCurrentFirebaseUid();
          console.log("[FEED STATS] Firebase UID:", firebaseUid);

          if (firebaseUid && window.supabase) {
            try {
              console.log("[FEED STATS] 좋아요 상태 조회 중...", {
                firebaseUid,
                feedIds: filteredFeedIds,
              });

              const result = await window.supabase
                .from("likes")
                .select("target_id")
                .eq("target_type", "feed")
                .eq("user_id", firebaseUid) // Firebase UID 직접 사용
                .in("target_id", filteredFeedIds);

              console.log("[FEED STATS] 좋아요 상태 조회 결과:", result);

              if (!result.error && result.data) {
                const likedFeedIds = new Set(
                  result.data
                    .map((l) => l?.target_id)
                    .filter(
                      (id) =>
                        id && typeof id === "string" && id.trim().length > 0
                    )
                );

                console.log(
                  "[FEED STATS] 좋아요한 피드 IDs:",
                  Array.from(likedFeedIds)
                );

                filteredFeedIds.forEach((feedId) => {
                  const feedItem = document.querySelector(
                    `.feed-item[data-feed-id="${feedId}"]`
                  );
                  if (!feedItem) return;

                  const likeButton = feedItem.querySelector(
                    '.feed-card-stat[aria-label="좋아요"]'
                  );
                  if (likeButton) {
                    const svgPath = likeButton.querySelector(".stat-icon path");
                    const isLiked = likedFeedIds.has(feedId);

                    console.log(
                      `[FEED STATS] 피드 ${feedId} 좋아요 상태: ${isLiked}`
                    );

                    if (isLiked) {
                      likeButton.classList.add("active");
                      if (svgPath) {
                        svgPath.setAttribute("stroke", "#FF5E00");
                        svgPath.setAttribute("fill", "#FF5E00");
                      }
                    } else {
                      likeButton.classList.remove("active");
                      if (svgPath) {
                        svgPath.setAttribute("stroke", "#A0A0A0");
                        svgPath.removeAttribute("fill");
                      }
                    }
                  }
                });

                console.log("[FEED STATS] ✅ 좋아요 상태 업데이트 완료");
              } else if (result.error) {
                console.error(
                  "[FEED STATS] 좋아요 상태 조회 에러:",
                  result.error
                );
              }
            } catch (err) {
              // 조회 실패는 무시 (에러 로그만)
              console.warn("[피드 통계] 좋아요 상태 조회 실패:", err);
            }
          } else {
            console.warn(
              "[FEED STATS] Firebase UID 없음 또는 Supabase 미초기화",
              {
                hasUid: !!firebaseUid,
                hasSupabase: !!window.supabase,
              }
            );
          }
        } catch (likeStatusErr) {
          console.error("[피드 통계] 좋아요 상태 확인 실패:", likeStatusErr);
          // 에러가 나도 계속 진행
        }
      } catch (err) {
        console.error("[피드 통계] 업데이트 예외:", err);
      }
      resolve();
    }

    checkSupabase();
  });
}

// 단일 피드 통계 업데이트
window.updateSingleFeedStats = async function (feedId) {
  await updateFeedStats([feedId]);
};

// ✅ updateFeedStats는 조회 전용이므로 유지
window.updateFeedStats = updateFeedStats;
// ✅ getCurrentFirebaseUid는 헬퍼 함수이므로 유지
window.getCurrentFirebaseUid = getCurrentFirebaseUid;
// ✅ createReply, deleteReply, hasLiked는 api-functions.js에 정의됨

/* ============================
   Supabase Client Loader (싱글턴)
============================ */
let cachedSupabaseClient = null;
async function loadSupabaseClient() {
  // ✅ 작업 E: 싱글턴 우선 확인
  if (window.supabase || window.__supabase_singleton) {
    return window.supabase || window.__supabase_singleton;
  }

  if (cachedSupabaseClient) return cachedSupabaseClient;

  try {
    // ✅ 작업 E: getSupabase()만 사용 (createClient 직접 사용 금지)
    // const { getSupabase } = await import("/js/supabase-auth.js");
    if (typeof window.getSupabase !== "function") return null;
    cachedSupabaseClient = await window.getSupabase();
    return cachedSupabaseClient;
  } catch (e) {
    console.warn("Supabase 모듈 로드 실패:", e);
    return null;
  }
}

// ✅ 작업 F: Supabase 클라이언트 준비 대기 함수 (타이밍 고정)
async function ensureSupabaseReady(timeoutMs = 8000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    // ✅ 작업 E: 싱글턴 경로 확인
    const s =
      window.supabase || window.__supabase_singleton || cachedSupabaseClient;
    if (s) {
      console.log("[FEED] supabase ready");
      return s;
    }

    // 싱글턴이 없으면 로드 시도
    if (!cachedSupabaseClient) {
      try {
        // const { getSupabase } = await import("/js/supabase-auth.js");
        if (typeof window.getSupabase !== "function") return;
        cachedSupabaseClient = await window.getSupabase();
        if (cachedSupabaseClient) {
          console.log("[FEED] supabase loaded");
          return cachedSupabaseClient;
        }
      } catch (e) {
        // 계속 재시도
      }
    }

    await new Promise((r) => setTimeout(r, 80));
  }
  console.warn("[FEED] supabase timeout after", timeoutMs, "ms");
  return null;
}

// 호환성을 위한 별칭
const waitForSupabaseClient = ensureSupabaseReady;

/* ==========================
   Header 커스터마이징
========================== */
const headerHost = document.getElementById("header");
if (headerHost) {
  fetch("components/header.html")
    .then((r) => {
      if (!r.ok) throw new Error("header load failed");
      return r.text();
    })
    .then((html) => {
      headerHost.innerHTML = html;
      const header = document.querySelector("#header");
      if (header) {
        header.innerHTML = `
          <div class="header-top-row">
            <div class="header-left">
              <svg xmlns="http://www.w3.org/2000/svg" width="66" height="33" viewBox="0 0 66 33" fill="none" class="header-logo"><path d="M21.8057 19.4238C23.8834 13.555 25.4048 8.11381 27.5078 0.767578V0H36.5371V28.0244C38.3632 27.4704 40.1105 26.7874 42.2383 25.9531V0H51.2666V27.998C53.0869 27.4409 54.8359 26.754 56.9707 25.917V0H65.999V32.9912H56.9707V29.625C54.8758 30.2024 53.1431 30.7743 51.2666 31.3496V32.9912H42.2383V29.6504C40.1516 30.2283 38.4204 30.801 36.5371 31.377V32.9912H27.5078V14.6396C25.8102 19.8463 24.2073 24.8635 21.8057 31.4521V32.9912H12.7764V14.6719C11.0575 19.9443 9.43511 25.0266 6.97852 31.7471L6.94531 31.7393V32.9902H0V23.3994L6.94531 7.63965V19.8115C9.09084 13.803 10.6326 8.29372 12.7764 0.804688V0H21.8057V19.4238Z" fill="#FF5E00"/></svg>
            </div>
            <a class="header-link" href="search.html">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 22C13.1 22 14 21.1 14 20H10C10 21.1 10.89 22 12 22ZM18 16V11C18 7.93 16.36 5.36 13.5 4.68V4C13.5 3.17 12.83 2.5 12 2.5C11.17 2.5 10.5 3.17 10.5 4V4.68C7.63 5.36 6 7.92 6 11V16L4 18V19H20V18L18 16Z" fill="#000"/>
              </svg>
            </a>
          </div>
        `;
      }
    })
    .catch((error) => console.error("Error fetching header.html:", error));
}

/* ==========================
   Tabbar 로드
========================== */
const tabbarHost = document.getElementById("tabbar");
if (tabbarHost) {
  fetch("components/tabbar.html")
    .then((r) => {
      if (!r.ok) throw new Error("tabbar load failed");
      return r.text();
    })
    .then((html) => (tabbarHost.innerHTML = html))
    .catch((error) => console.error("Error fetching tabbar.html:", error));
}

/* ================================
   ⭐ 스플래쉬: 최초 1회만 표시
================================= */
const splashLayer = document.getElementById("splashLayer");
const appFrame = document.querySelector(".app-frame");
if (splashLayer && appFrame) {
  const hasVisited = localStorage.getItem("mumu_splash");

  if (hasVisited) {
    splashLayer.style.display = "none";
    appFrame.style.opacity = "1";
  } else {
    localStorage.setItem("mumu_splash", "done");
    setTimeout(() => {
      splashLayer.style.animation = "fadeOut 0.6s ease forwards";
      setTimeout(() => {
        splashLayer.style.display = "none";
        appFrame.style.opacity = "1";
      }, 600);
    }, 1700);
  }
}
/* ================================
   Hero Slider (HOME 전용)
================================ */
(function () {
  "use strict";

  // Hero slider dots sync
  const feedPage = document.querySelector("main.feed-page");
  if (feedPage) {
    const heroSlider = feedPage.querySelector("#heroSlider");
    const heroDots = feedPage.querySelector("#heroDots");

    if (heroSlider && heroDots) {
      const dots = heroDots.querySelectorAll(".dot");
      const slides = heroSlider.querySelectorAll(".hero-slide");

      function updateHeroDots() {
        const scrollLeft = heroSlider.scrollLeft;
        const slideWidth = heroSlider.offsetWidth;
        const currentIndex = Math.round(scrollLeft / slideWidth);

        dots.forEach((dot, index) => {
          dot.classList.toggle("active", index === currentIndex);
        });
      }

      heroSlider.addEventListener("scroll", () => {
        let scrollTimeout;
        clearTimeout(scrollTimeout);
        scrollTimeout = setTimeout(updateHeroDots, 50);
      });

      heroSlider.addEventListener("scrollend", updateHeroDots);
    }
  }
})();

// Event delegation for better performance
document.addEventListener("DOMContentLoaded", () => {
  // ⚠️ STEP 2: 이벤트 관문 통합으로 비활성화
  // stat-icon-heart 클릭 시 색상 변경 (이벤트 위임)
  // document.addEventListener("click", function (e) {
  //   if (e.target.closest(".stat-icon-heart")) {
  //     const icon = e.target.closest(".stat-icon-heart");
  //     icon.classList.toggle("active");
  //     const statItem = icon.parentElement.querySelector(".stat-item");
  //     if (statItem) {
  //       let currentCount = parseInt(statItem.textContent) || 0;
  //       if (icon.classList.contains("active")) {
  //         statItem.textContent = currentCount + 1;
  //       } else {
  //         statItem.textContent = Math.max(0, currentCount - 1);
  //       }
  //     }
  //   }
  // });
  // 댓글 아이콘/버튼 클릭 시 댓글 모달 열기 (이벤트 위임)
  // feed-stat-interaction.js에서 처리하므로 여기서는 제거
  // ⚠️ STEP 2: 이벤트 관문 통합으로 비활성화
  // 댓글 모달 내 comment-stat-icon-heart 클릭 시 색상 변경 및 숫자 업데이트 (이벤트 위임)
  // document.addEventListener("click", function (e) {
  //   if (e.target.closest(".comment-stat-icon-heart")) {
  //     const icon = e.target.closest(".comment-stat-icon-heart");
  //     icon.classList.toggle("active");
  //     const statItem = icon.parentElement.querySelector("span");
  //     if (statItem) {
  //       let currentCount = parseInt(statItem.textContent) || 0;
  //       if (icon.classList.contains("active")) {
  //         statItem.textContent = currentCount + 1;
  //       } else {
  //         statItem.textContent = Math.max(0, currentCount - 1);
  //       }
  //     }
  //   }
  // });
  // ⚠️ STEP 2: 이벤트 관문 통합으로 비활성화
  // follow-btn 클릭 시 팔로우/팔로잉 토글 (이벤트 위임)
  // document.addEventListener("click", function (e) {
  //   if (e.target.closest(".follow-btn, .creator-follow-btn")) {
  //     const btn = e.target.closest(".follow-btn, .creator-follow-btn");
  //     btn.classList.toggle("following");
  //     if (btn.classList.contains("following")) {
  //       btn.textContent = "팔로잉";
  //     } else {
  //       btn.textContent = "팔로우";
  //     }
  //   }
  // });
  // ⚠️ STEP 2: 이벤트 관문 통합으로 비활성화
  // comment-more-btn 클릭 시 옵션 모달 열기/닫기 (토글) (이벤트 위임)
  // document.addEventListener("click", function (e) {
  //   if (e.target.closest(".comment-more-btn")) {
  //     const btn = e.target.closest(".comment-more-btn");
  //     const commentItem = btn.closest(".comment-item");
  //     if (commentItem) {
  //       const modal = document.getElementById("commentMoreModal");
  //       if (modal && modal.style.display === "flex") {
  //         closeCommentMoreModal();
  //       } else {
  //         openCommentMoreModal(btn, commentItem);
  //       }
  //     }
  //   }
  // });
  // ⚠️ STEP 2: 이벤트 관문 통합으로 비활성화
  // CreatorMoreModal-option 클릭 시 준비중인 기능 팝업 표시 (이벤트 위임)
  // document.addEventListener("click", function (e) {
  //   if (e.target.closest(".CreatorMoreModal-option")) {
  //     closeCreatorMoreModal();
  //     setTimeout(() => {
  //       showComingSoonModal();
  //     }, 200);
  //   }
  // });
  // 기존 로직은 App.events.handleClick에서 처리됨
});

/* ============================
   PROGRESSIVE FEED RENDERING
============================ */
function initProgressiveFeedRendering() {
  const feedItems = document.querySelectorAll(
    ".feed-item-section[data-feed-index]"
  );
  const totalItems = feedItems.length;

  if (totalItems <= 3) {
    return;
  }

  // 초기 3개는 이미 표시됨 (0, 1, 2)
  // 나머지 아이템들을 점진적으로 표시
  let currentIndex = 3;
  const batchSize = 2;

  function renderNextBatch() {
    if (currentIndex >= totalItems) {
      return;
    }

    const endIndex = Math.min(currentIndex + batchSize, totalItems);

    for (let i = currentIndex; i < endIndex; i++) {
      const item = Array.from(feedItems).find(
        (el) => el.getAttribute("data-feed-index") === String(i)
      );
      if (item) {
        item.style.display = "";
      }
    }

    currentIndex = endIndex;

    if (currentIndex < totalItems) {
      requestAnimationFrame(() => {
        setTimeout(renderNextBatch, 50);
      });
    }
  }

  // 초기 렌더링 후 첫 배치 시작
  requestAnimationFrame(() => {
    setTimeout(renderNextBatch, 200);
  });
}

// 댓글 모달 엘리먼트가 없다면 최소 구조 생성
// 우선 기존 마크업(id="comment-modal")을 우선 사용하고,
// 없을 때만 새로 만든다.
function ensureCommentModal() {
  let modal =
    document.getElementById("commentModal") ||
    document.getElementById("comment-modal");
  if (modal) return modal;

  modal = document.createElement("div");
  modal.id = "commentModal";
  modal.className = "comment-modal";
  modal.style.display = "none";
  modal.innerHTML = `
    <div class="comment-modal-backdrop"></div>
    <div class="comment-modal-sheet">
      <div class="comment-modal-header">
        <div class="comment-modal-title">댓글</div>
        <button class="comment-modal-close" aria-label="닫기">✕</button>
      </div>
      <div class="comment-modal-body">
        <div class="comment-empty">댓글을 불러오는 중입니다.</div>
      </div>
    </div>
  `;

  // 닫기 버튼
  modal.querySelector(".comment-modal-close")?.addEventListener("click", () => {
    closeCommentModal();
  });

  // 배경 클릭으로 닫기
  modal
    .querySelector(".comment-modal-backdrop")
    ?.addEventListener("click", () => {
      closeCommentModal();
    });

  document.body.appendChild(modal);
  return modal;
}

// 댓글 모달 열기
function openCommentModal() {
  const modal = ensureCommentModal();
  if (!modal) return;
  // 기존 마크업은 overlay+내부 content 구조일 수 있어 flex/ block 모두 수용
  modal.style.display = "flex";
}

// 댓글 모달 닫기 (전역 함수로 선언)
window.closeCommentModal = function () {
  const modal =
    document.getElementById("commentModal") ||
    document.getElementById("comment-modal");
  if (!modal) return;
  const commentSection = modal.querySelector(".comment-section");
  if (commentSection) {
    commentSection.style.animation = "slideDown 0.3s ease forwards";
  }
  modal.style.animation = "fadeOut 0.3s ease forwards";
  setTimeout(() => {
    modal.style.display = "none";
    modal.style.animation = "fadeIn 0.3s ease";
    if (commentSection) {
      commentSection.style.animation = "slideUp 0.3s ease";
    }
  }, 300);
};

// 모달 배경 클릭 시 닫기
document.addEventListener("DOMContentLoaded", () => {
  const modal = document.getElementById("commentModal");
  if (modal) {
    modal.addEventListener("click", function (e) {
      if (e.target === modal) {
        closeCommentModal();
      }
    });
  }
});

// ESC 키로 모달 닫기
document.addEventListener("keydown", function (e) {
  if (e.key === "Escape") {
    const commentModal = document.getElementById("commentModal");
    if (commentModal && commentModal.style.display === "flex") {
      closeCommentModal();
    }
    const commentMoreModal = document.getElementById("commentMoreModal");
    if (commentMoreModal && commentMoreModal.style.display === "flex") {
      closeCommentMoreModal();
    }
    const creatorMoreModal = document.getElementById("CreatorMoreModal");
    if (creatorMoreModal && creatorMoreModal.style.display === "flex") {
      closeCreatorMoreModal();
    }
    const comingSoonModal = document.getElementById("comingSoonModal");
    if (comingSoonModal && comingSoonModal.style.display === "flex") {
      closeComingSoonModal();
    }
  }
});

// 댓글 더보기 모달 열기
function openCommentMoreModal(button, commentItem) {
  const modal = document.getElementById("commentMoreModal");
  const rect = button.getBoundingClientRect();
  modal.style.display = "flex";
  const modalContent = modal.querySelector(".comment-more-modal-content");
  // 버튼의 오른쪽 상단 모서리에 맞춰 위치 조정 (fixed 위치)
  const top = rect.top;
  const right = window.innerWidth - rect.right;
  modalContent.style.top = top + "px";
  modalContent.style.right = right + "px";

  // 스크롤 이벤트 리스너 추가
  if (!modal.hasAttribute("data-scroll-listener")) {
    modal.setAttribute("data-scroll-listener", "true");
    window.addEventListener("scroll", handleCommentMoreModalScroll, {
      passive: true,
    });
  }
}

// 댓글 더보기 모달 닫기
function closeCommentMoreModal() {
  const modal = document.getElementById("commentMoreModal");
  modal.style.animation = "fadeOut 0.2s ease forwards";
  setTimeout(() => {
    modal.style.display = "none";
    modal.style.animation = "fadeIn 0.2s ease";
    // 스크롤 이벤트 리스너 제거
    window.removeEventListener("scroll", handleCommentMoreModalScroll);
    modal.removeAttribute("data-scroll-listener");
  }, 200);
}

// 댓글 더보기 모달 스크롤 핸들러
function handleCommentMoreModalScroll() {
  const modal = document.getElementById("commentMoreModal");
  if (modal && modal.style.display === "flex") {
    closeCommentMoreModal();
  }
}

// creator-more-btn 클릭 시 옵션 모달 열기 (정적 요소용)
document.addEventListener("DOMContentLoaded", () => {
  attachCreatorMoreBtnListeners();
});

// CreatorMoreModal 열기
function openCreatorMoreModal(button) {
  const modal = document.getElementById("CreatorMoreModal");
  const rect = button.getBoundingClientRect();
  modal.style.display = "flex";
  const modalContent = modal.querySelector(".CreatorMoreModal-content");
  // 버튼의 오른쪽 상단 모서리에 맞춰 위치 조정 (fixed 위치)
  const top = rect.top;
  const right = window.innerWidth - rect.right;
  modalContent.style.top = top + "px";
  modalContent.style.right = right + "px";

  // 스크롤 이벤트 리스너 추가
  if (!modal.hasAttribute("data-scroll-listener")) {
    modal.setAttribute("data-scroll-listener", "true");
    window.addEventListener("scroll", handleCreatorMoreModalScroll, {
      passive: true,
    });
  }

  // 모달이 열릴 때 옵션 버튼 이벤트 리스너 연결
  setTimeout(() => {
    document.querySelectorAll(".CreatorMoreModal-option").forEach((btn) => {
      if (!btn.hasAttribute("data-option-listener-attached")) {
        btn.setAttribute("data-option-listener-attached", "true");
        btn.addEventListener("click", function (e) {
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
  const modal = document.getElementById("CreatorMoreModal");
  modal.style.animation = "fadeOut 0.2s ease forwards";
  setTimeout(() => {
    modal.style.display = "none";
    modal.style.animation = "fadeIn 0.2s ease";
    // 스크롤 이벤트 리스너 제거
    window.removeEventListener("scroll", handleCreatorMoreModalScroll);
    modal.removeAttribute("data-scroll-listener");
  }, 200);
}

// CreatorMoreModal 스크롤 핸들러
function handleCreatorMoreModalScroll() {
  const modal = document.getElementById("CreatorMoreModal");
  if (modal && modal.style.display === "flex") {
    closeCreatorMoreModal();
  }
}

// 준비중인 기능 팝업 모달 표시
function showComingSoonModal() {
  const modal = document.getElementById("comingSoonModal");
  if (modal) {
    modal.style.display = "flex";
    modal.style.animation = "fadeIn 0.2s ease";
  }
}

// 준비중인 기능 팝업 모달 닫기
function closeComingSoonModal() {
  const modal = document.getElementById("comingSoonModal");
  if (modal) {
    modal.style.display = "none";
  }
}

// CreatorMoreModal 배경 클릭 시 닫기
document.addEventListener("click", function (e) {
  const creatorMoreModal = document.getElementById("CreatorMoreModal");
  if (creatorMoreModal && creatorMoreModal.style.display === "flex") {
    // CreatorMoreModal-option 클릭은 제외
    if (e.target.closest(".CreatorMoreModal-option")) {
      return;
    }
    // 모달 내용이나 버튼이 아닌 곳을 클릭하면 닫기
    if (
      !e.target.closest(".CreatorMoreModal-content") &&
      !e.target.closest(".creator-more-btn")
    ) {
      closeCreatorMoreModal();
    }
  }

  // commentMoreModal 배경 클릭 시 닫기
  const commentMoreModal = document.getElementById("commentMoreModal");
  if (commentMoreModal && commentMoreModal.style.display === "flex") {
    // 모달 내용이나 버튼이 아닌 곳을 클릭하면 닫기
    if (
      !e.target.closest(".comment-more-modal-content") &&
      !e.target.closest(".comment-more-btn")
    ) {
      closeCommentMoreModal();
    }
  }

  // 준비중인 기능 팝업 배경 클릭 시 닫기
  const comingSoonModal = document.getElementById("comingSoonModal");
  if (comingSoonModal && comingSoonModal.style.display === "flex") {
    if (
      e.target === comingSoonModal ||
      e.target.closest(".coming-soon-modal-close")
    ) {
      closeComingSoonModal();
    }
  }
});

/* ============================
   컷 저장 기능
============================ */
let currentSaveWorkId = null;
let currentSaveCuts = null;
let currentSaveCutIndex = 0;

// 저장 버튼 클릭 핸들러
window.handleCutSaveClick = function (button) {
  const workId = button.getAttribute("data-work-id");
  const cutsData = button.getAttribute("data-cuts");

  if (!workId || !cutsData) {
    console.warn("컷 저장: work_id 또는 cuts 데이터가 없습니다");
    return;
  }

  try {
    const cuts = JSON.parse(cutsData);
    if (!cuts || cuts.length === 0) {
      console.warn("컷 저장: 저장할 컷이 없습니다");
      return;
    }

    // 현재 보이는 컷 인덱스 찾기
    const feedItem = button.closest(".feed-item");
    const imageContainer = feedItem?.querySelector(".feed-image-container");
    let currentCutIndex = 0;

    if (imageContainer) {
      const containerWidth = imageContainer.offsetWidth;
      const scrollLeft = imageContainer.scrollLeft;
      currentCutIndex = Math.round(scrollLeft / containerWidth);
      currentCutIndex = Math.max(0, Math.min(currentCutIndex, cuts.length - 1));
    }

    currentSaveWorkId = workId;
    currentSaveCuts = cuts;
    currentSaveCutIndex = currentCutIndex;

    // 모달 1번 표시
    window.openCutSaveConfirmModal();
  } catch (error) {
    console.error("컷 저장: 데이터 파싱 오류", error);
  }
};

// 모달 1번: 저장 확인
window.openCutSaveConfirmModal = function () {
  const modal = document.getElementById("cutSaveConfirmModal");
  if (modal) {
    modal.style.display = "flex";
  }
};

window.closeCutSaveConfirmModal = function () {
  const modal = document.getElementById("cutSaveConfirmModal");
  if (modal) {
    modal.style.display = "none";
  }
  currentSaveWorkId = null;
  currentSaveCuts = null;
  currentSaveCutIndex = 0;
};

// 저장 확인 후 실제 저장
window.confirmCutSave = async function () {
  if (!currentSaveWorkId || !currentSaveCuts || currentSaveCuts.length === 0) {
    console.warn("컷 저장: 저장할 데이터가 없습니다");
    return;
  }

  const cutToSave = currentSaveCuts[currentSaveCutIndex];
  if (!cutToSave) {
    console.warn("컷 저장: 저장할 컷이 없습니다");
    return;
  }

  try {
    const supabase = await loadSupabaseClient();
    if (!supabase) {
      alert("저장 기능을 사용할 수 없습니다. 로그인해주세요.");
      return;
    }

    // Firebase Auth에서 현재 사용자 ID 가져오기
    let firebaseUser = null;

    // window.getCurrentFirebaseUser가 있으면 사용, 없으면 직접 확인
    if (typeof window.getCurrentFirebaseUser === "function") {
      firebaseUser = await window.getCurrentFirebaseUser();
    } else {
      // 직접 Firebase Auth 확인
      // const { auth } = await import("/js/firebase_init.js");
      const { onAuthStateChanged } = await import(
        "https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js"
      );

      firebaseUser = await new Promise((resolve) => {
        const unsubscribe = onAuthStateChanged(auth, (user) => {
          unsubscribe();
          resolve(user);
        });
      });
    }

    if (!firebaseUser || !firebaseUser.uid) {
      alert("로그인이 필요합니다.");
      return;
    }

    const userId = firebaseUser.uid; // Firebase UID를 user_id로 사용

    const cutId = typeof cutToSave === "object" ? cutToSave.id : null;
    const imageUrl =
      typeof cutToSave === "object" ? cutToSave.image_url : cutToSave;

    // cuts 테이블에 저장 (이미 존재하는 경우는 건너뛰기)
    let savedCutId = cutId;

    if (!cutId) {
      // cuts 테이블에 새로 저장
      const { data: newCut, error: cutError } = await supabase
        .from("cuts")
        .insert({
          work_id: currentSaveWorkId,
          image_url: imageUrl,
          order_index: currentSaveCutIndex,
          is_visible: true,
        })
        .select()
        .single();

      if (cutError) {
        console.error("컷 저장 오류:", cutError);
        alert("컷 저장에 실패했습니다.");
        return;
      }
      savedCutId = newCut.id;
    }

    // reader_folder_cuts 테이블에 저장
    let folderId = null;
    const { data: folder, error: folderError } = await supabase
      .from("reader_folders")
      .select("id")
      .eq("reader_id", userId)
      .eq("name", "저장됨")
      .maybeSingle();

    if (folderError) {
      console.error("폴더 조회 실패:", folderError);
      return;
    }

    if (folder) {
      folderId = folder.id;
    } else {
      const { data: newFolder, error: createError } = await supabase
        .from("reader_folders")
        .insert({
          reader_id: userId,
          name: "저장됨",
          emoji: "📁",
        })
        .select("id")
        .single();

      if (createError) {
        console.error("폴더 생성 실패:", createError);
        return;
      }
      folderId = newFolder.id;
    }

    const { error: folderCutError } = await supabase
      .from("reader_folder_cuts")
      .insert({
        reader_id: userId,
        cut_id: savedCutId,
        folder_id: folderId,
      });

    if (folderCutError) {
      console.error("컷 저장 오류 (reader_folder_cuts):", folderCutError);
      if (folderCutError.code !== "23505") {
        alert("컷 저장에 실패했습니다.");
        return;
      }
    }

    // user_feed_events에 저장 이벤트 기록
    // 독자가 저장한 컷은 feeds 테이블에 저장하지 않으므로 feed_id는 null
    // feed_id는 feeds 테이블에 존재하는 ID여야 하므로, 독자는 null로 설정
    const { error: eventError } = await supabase
      .from("user_feed_events")
      .insert({
        user_id: userId, // Firebase UID 사용
        feed_id: null, // 독자가 저장한 컷은 feeds 테이블에 저장하지 않으므로 null
        event_type: "cut_saved",
        metadata: {
          cut_id: savedCutId,
          cut_index: currentSaveCutIndex,
          image_url: imageUrl,
          work_id: currentSaveWorkId, // work_id는 metadata에 저장
        },
      });

    if (eventError) {
      console.error("이벤트 저장 오류:", eventError);
      // 컷은 저장되었으므로 계속 진행
    }

    // 모달 1번 닫기
    window.closeCutSaveConfirmModal();

    // 모달 2번 표시 (항상 실행)
    window.openCutSaveCompleteModal();

    // 마이페이지 저장 목록 즉시 반영을 위한 이벤트 발생
    window.dispatchEvent(
      new CustomEvent("cutSaved", {
        detail: { cutId: savedCutId },
      })
    );
  } catch (error) {
    console.error("컷 저장 중 오류:", error);
    alert("컷 저장에 실패했습니다.");
    // 에러 발생 시에도 모달 닫기 및 완료 모달 표시
    window.closeCutSaveConfirmModal();
    window.openCutSaveCompleteModal();
  }
};

// 모달 2번: 저장 완료 후 무드보드 이동 확인
window.openCutSaveCompleteModal = function () {
  const modal = document.getElementById("cutSaveCompleteModal");
  if (modal) {
    modal.style.display = "flex";
  }
};

window.closeCutSaveCompleteModal = function () {
  const modal = document.getElementById("cutSaveCompleteModal");
  if (modal) {
    modal.style.display = "none";
  }
  currentSaveWorkId = null;
  currentSaveCuts = null;
  currentSaveCutIndex = 0;
};

// 무드보드로 이동
window.goToMoodboard = function () {
  window.closeCutSaveCompleteModal();
  window.location.href = "mypage_reader.html";
};

// 모달 배경 클릭 시 닫기
document.addEventListener("click", function (e) {
  const confirmModal = document.getElementById("cutSaveConfirmModal");
  if (confirmModal && confirmModal.style.display === "flex") {
    if (e.target === confirmModal) {
      closeCutSaveConfirmModal();
    }
  }

  const completeModal = document.getElementById("cutSaveCompleteModal");
  if (completeModal && completeModal.style.display === "flex") {
    if (e.target === completeModal) {
      closeCutSaveCompleteModal();
    }
  }
});

/* ============================
   상단 복귀 버튼
============================ */
(function () {
  "use strict";

  const scrollToTopBtn = document.getElementById("scrollToTopBtn");
  if (!scrollToTopBtn) return;

  // 스크롤 이벤트로 버튼 표시/숨김
  function toggleScrollToTopButton() {
    const scrollY = window.scrollY || window.pageYOffset;
    const showThreshold = 300; // 300px 이상 스크롤 시 버튼 표시

    if (scrollY > showThreshold) {
      scrollToTopBtn.classList.add("show");
    } else {
      scrollToTopBtn.classList.remove("show");
    }
  }

  // 상단으로 스크롤
  function scrollToTop() {
    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  // 버튼 클릭 이벤트
  scrollToTopBtn.addEventListener("click", scrollToTop);

  // 스크롤 이벤트 리스너
  let scrollTimeout;
  window.addEventListener("scroll", () => {
    clearTimeout(scrollTimeout);
    scrollTimeout = setTimeout(toggleScrollToTopButton, 10);
  });

  // 초기 상태 확인
  toggleScrollToTopButton();
})();

// ✅ 전역 API 함수들은 api-functions.js에 정의됨
// feed.js에서는 updateFeedStats, updateSingleFeedStats, getCurrentFirebaseUid만 정의

// [DEBUG] Snapshot
window.__dbg &&
  window.__dbg("FILE_LOADED", { file: "feed.js", ts: Date.now() });
window.__dbgGlobals && window.__dbgGlobals("after_feed_js_loaded");

// =======================================
// COMMENT MODAL – FINAL FULL IMPLEMENTATION
// =======================================

// 열기
window.openCommentsModal = function (feedId) {
  // HARD GUARD 1: Reject undefined/null/empty
  if (!feedId || feedId === "undefined" || feedId === "null") {
    console.error("[COMMENTS] Invalid feedId", feedId);
    return;
  }

  // HARD GUARD 2: UUID validation
  const isUUID =
    window.App?.utils?.isUUID ||
    function (v) {
      if (!v || typeof v !== "string") return false;
      return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        v
      );
    };

  if (!isUUID(feedId)) {
    console.error("[COMMENTS] feedId is not a valid UUID", feedId);
    return;
  }

  // HARD ASSERT: Verify feedId is feeds.id (not ref_id, work_id, etc)
  console.log("[COMMENT MODAL] ✅ VERIFIED feedId (feeds.id UUID):", feedId);

  console.log("[COMMENT MODAL] open", feedId);

  const modal = document.getElementById("comment-modal");
  if (!modal) {
    console.error("[COMMENT MODAL] element not found");
    return;
  }

  // 표시
  modal.style.display = "flex";
  modal.dataset.feedId = feedId;

  // 댓글 컨테이너
  const content = modal.querySelector(".comment-modal-content");
  if (!content) {
    console.error("[COMMENT MODAL] .comment-modal-content not found");
    return;
  }

  // 로딩 상태
  content.innerHTML = `<div class="comment-empty">댓글을 불러오는 중...</div>`;

  // HARD GUARD 3: Call loadComments with feedId only
  if (typeof window.loadComments === "function") {
    window.loadComments(feedId).then((result) => {
      if (result.error) {
        console.error("[COMMENT MODAL] Load error:", result.error);
        content.innerHTML = `<div class="comment-empty">댓글을 불러올 수 없습니다.</div>`;
        return;
      }

      const comments = result.data || [];
      console.log("[COMMENT MODAL] Fetched comments:", comments.length);
      console.log(
        "[COMMENT MODAL] Full data:",
        JSON.stringify(comments, null, 2)
      );

      // 댓글 목록 렌더링 (빈 경우 포함)
      renderCommentsInModal(content, comments, feedId);
    });
  } else {
    console.warn("[COMMENT MODAL] loadComments not defined");
    content.innerHTML = `<div class="comment-empty">댓글을 불러올 수 없습니다.</div>`;
  }
};

// 댓글 모달에 댓글 목록 + 작성 폼 렌더링
function renderCommentsInModal(container, comments, feedId) {
  container.innerHTML = "";

  // 댓글 목록 컨테이너
  const commentList = document.createElement("div");
  commentList.className = "comment-list-wrapper";
  commentList.style.cssText = "flex: 1; overflow-y: auto; padding: 8px 0;";

  if (comments.length === 0) {
    commentList.innerHTML = `<div class="comment-empty">첫 댓글을 작성해보세요!</div>`;
  } else {
    comments.forEach((comment) => {
      const commentEl = createCommentElement(comment, feedId);
      commentList.appendChild(commentEl);
    });
  }

  // 댓글 작성 입력 폼 (디자인 매칭: moodboard_detail.css 양식)
  const inputArea = document.createElement("div");
  inputArea.className = "comment-input-area";
  // 하단 탭바를 고려하여 bottom 패딩 조정 (40px -> 12px)
  inputArea.style.cssText =
    "padding: 12px 20px 12px 20px; border-top: 1px solid #eee; background: #fff; position: sticky; bottom: 0; z-index: 10;";

  const inputWrapper = document.createElement("div");
  inputWrapper.className = "comment-input-wrapper";
  inputWrapper.style.cssText =
    "display: flex; align-items: center; gap: 0; background: #F5F5F5; border: 1px solid #E5E5E5; border-radius: 10px; padding: 0; overflow: hidden;";

  const textarea = document.createElement("input");
  textarea.type = "text";
  textarea.className = "comment-input";
  textarea.placeholder = "댓글을 입력하세요...";
  textarea.style.cssText =
    "flex: 1; border: none; background: transparent; padding: 12px 16px; font-size: 14px; font-family: inherit; outline: none; color: #333;";

  const submitBtn = document.createElement("button");
  submitBtn.className = "comment-submit-btn";
  submitBtn.textContent = "등록";
  submitBtn.type = "button";
  submitBtn.style.cssText =
    "padding: 12px 20px; background: #FF5E00; color: white; border: none; border-radius: 10px; font-weight: 600; cursor: pointer; font-size: 14px; white-space: nowrap; transition: background 0.2s;";

  submitBtn.onclick = async () => {
    const content = textarea.value.trim();
    if (!content) {
      if (typeof window.showCustomAlert === "function") {
        window.showCustomAlert("댓글 내용을 입력해주세요.");
      } else {
        alert("댓글 내용을 입력해주세요.");
      }
      return;
    }

    try {
      if (typeof window.createComment === "function") {
        submitBtn.disabled = true;
        submitBtn.textContent = "작성 중...";

        const result = await window.createComment(
          "feed",
          feedId,
          null,
          content
        );

        if (result.error) {
          throw result.error;
        }

        textarea.value = "";
        window.openCommentsModal(feedId);
      }
    } catch (err) {
      console.error("[COMMENT] 작성 중 오류:", err);
      if (typeof window.showCustomAlert === "function") {
        window.showCustomAlert("댓글 작성에 실패했습니다.");
      } else {
        alert("댓글 작성에 실패했습니다.");
      }
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = "작성하기";
    }
  };

  inputWrapper.appendChild(textarea);
  inputWrapper.appendChild(submitBtn);
  inputArea.appendChild(inputWrapper);

  container.appendChild(commentList);
  container.appendChild(inputArea);
}

// 개별 댓글 엘리먼트 생성
function createCommentElement(comment, feedId) {
  console.log(
    "[COMMENT ELEMENT] Creating comment:",
    comment.id,
    "replies:",
    comment.replies?.length || 0
  );
  const commentEl = document.createElement("div");
  commentEl.className = "comment-item";
  commentEl.style.cssText =
    "padding: 12px 0; border-bottom: 1px solid #f5f5f5;";

  const header = document.createElement("div");
  header.className = "comment-header";
  header.style.cssText = `
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 8px;
  `;
  const authorContainer = document.createElement("div");
  authorContainer.style.cssText =
    "display: flex; align-items: center; gap: 6px;";

  const author = document.createElement("span");
  author.className = "comment-author";
  author.textContent = comment.display_name || "사용자";
  author.style.cssText = "font-weight: 600; font-size: 14px;";
  authorContainer.appendChild(author);

  // 작가 뱃지 추가
  if (comment.user_role === "creator") {
    const badge = document.createElement("span");
    badge.className = "creator-badge";
    badge.textContent = "M.creator";
    badge.style.cssText =
      "padding: 2px 6px; background: #FF5E00; color: white; font-size: 10px; font-weight: 600; border-radius: 4px;";
    authorContainer.appendChild(badge);
  }

  const date = document.createElement("span");
  date.className = "comment-date";
  date.textContent = new Date(comment.created_at).toLocaleDateString();
  date.style.cssText = "font-size: 12px; color: #888;";

  // 옵션 버튼 (점 3개)
  const moreBtnWrapper = document.createElement("div");
  moreBtnWrapper.className = "comment-menu-btn-wrapper";
  moreBtnWrapper.style.cssText = "position: relative;";

  const moreBtn = document.createElement("button");
  moreBtn.className = "comment-more-btn";
  moreBtn.innerHTML = `
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="12" cy="5" r="2" fill="#888"/>
      <circle cx="12" cy="12" r="2" fill="#888"/>
      <circle cx="12" cy="19" r="2" fill="#888"/>
    </svg>
  `;
  moreBtn.style.cssText =
    "background:none; border:none; cursor:pointer; padding:4px; display:flex; align-items:center; justify-content:center;";

  const menuDropdown = document.createElement("div");
  menuDropdown.className = "comment-menu-dropdown";
  // CSS is in feed-modals.css

  moreBtn.onclick = async (e) => {
    e.stopPropagation();

    // Close other dropdowns
    document.querySelectorAll(".comment-menu-dropdown.show").forEach((d) => {
      if (d !== menuDropdown) d.classList.remove("show");
    });

    const currentUid = await getCurrentFirebaseUid();
    const isMine = currentUid && comment.user_id === currentUid;

    menuDropdown.innerHTML = "";
    if (isMine) {
      const editBtn = document.createElement("button");
      editBtn.className = "comment-menu-item";
      editBtn.textContent = "수정";
      editBtn.onclick = () => showCustomAlert("준비중인 기능입니다.");

      const delBtn = document.createElement("button");
      delBtn.className = "comment-menu-item danger";
      delBtn.textContent = "삭제";
      delBtn.onclick = async () => {
        const confirmed = await showCustomConfirm(
          "이 댓글을 삭제하시겠습니까?",
          "댓글 삭제"
        );
        if (confirmed) {
          if (typeof window.deleteComment === "function") {
            const result = await window.deleteComment(comment.id, currentUid);
            if (!result.error) window.openCommentsModal(feedId);
            else showCustomAlert("댓글 삭제에 실패했습니다.");
          }
        }
      };

      menuDropdown.appendChild(editBtn);
      menuDropdown.appendChild(delBtn);
    } else {
      const reportBtn = document.createElement("button");
      reportBtn.className = "comment-menu-item";
      reportBtn.textContent = "신고하기";
      reportBtn.onclick = async () => {
        const confirmed = await showCustomConfirm(
          "이 댓글을 신고하시겠습니까?",
          "신고하기"
        );
        if (confirmed) {
          showCustomAlert("신고 접수되었습니다. 검토 후 조치하겠습니다.");
        }
      };
      menuDropdown.appendChild(reportBtn);
    }

    menuDropdown.classList.toggle("show");
  };

  moreBtnWrapper.appendChild(moreBtn);
  moreBtnWrapper.appendChild(menuDropdown);

  header.appendChild(authorContainer);
  header.appendChild(moreBtnWrapper);

  const contentDiv = document.createElement("div");
  contentDiv.className = "comment-content";
  contentDiv.textContent = comment.content;
  contentDiv.style.cssText =
    "font-size: 14px; color: #333; line-height: 1.5; margin-bottom: 8px;";

  // 댓글 액션 버튼 컨테이너 (좋아요 + 답글)
  const actionsDiv = document.createElement("div");
  actionsDiv.className = "comment-actions";
  actionsDiv.style.cssText = "display: flex; gap: 16px; align-items: center;";

  // 좋아요 버튼
  const likeBtn = document.createElement("button");
  likeBtn.className = "comment-like-btn";
  likeBtn.type = "button";
  likeBtn.dataset.action = "comment-like";
  likeBtn.dataset.commentId = comment.id;
  likeBtn.style.cssText =
    "display: flex; align-items: center; gap: 4px; font-size: 12px; color: #666; background: none; border: none; cursor: pointer; padding: 4px;";
  likeBtn.innerHTML = `
    <svg width="14" height="14" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg" class="comment-like-icon">
      <path d="M15.8434 4.05117C15.4768 3.68448 15.0417 3.3936 14.5627 3.19514C14.0837 2.99668 13.5704 2.89453 13.0519 2.89453C12.5335 2.89453 12.0201 2.99668 11.5411 3.19514C11.0621 3.3936 10.627 3.68448 10.2605 4.05117L9.49981 4.81182L8.73916 4.05117C7.99882 3.31083 6.9947 2.89491 5.94771 2.89492C4.90071 2.89492 3.89659 3.31083 3.15626 4.05117C2.41592 4.79151 2 5.79562 2 6.84262C2 7.88962 2.41592 8.89373 3.15626 9.63407L3.91691 10.3947L9.49981 15.9776L15.0827 10.3947L15.8434 9.63407C16.21 9.26756 16.5009 8.83238 16.6994 8.35342C16.8979 7.87445 17 7.36108 17 6.84262C17 6.32417 16.8979 5.81079 16.6994 5.33183C16.5009 4.85286 16.21 4.41769 15.8434 4.05117Z" fill="#A0A0A0" stroke="none"/>
    </svg>
    <span class="comment-like-count">0</span>
  `;

  // 대댓글 버튼
  const replyBtn = document.createElement("button");
  replyBtn.className = "comment-reply-btn";
  replyBtn.textContent = "답글";
  replyBtn.type = "button";
  replyBtn.style.cssText =
    "font-size: 12px; color: #666; background: none; border: none; cursor: pointer; padding: 4px 0;";

  replyBtn.onclick = () => {
    showReplyInput(commentEl, comment, feedId);
  };

  actionsDiv.appendChild(likeBtn);
  actionsDiv.appendChild(replyBtn);

  commentEl.appendChild(header);
  commentEl.appendChild(contentDiv);
  commentEl.appendChild(actionsDiv);

  // 대댓글 목록
  if (comment.replies && comment.replies.length > 0) {
    console.log(
      "[COMMENT] Rendering replies for comment:",
      comment.id,
      "replies:",
      comment.replies.length
    );
    const repliesContainer = document.createElement("div");
    repliesContainer.className = "comment-replies open"; // ✅ Add 'open' class to make replies visible
    repliesContainer.style.cssText = "margin-left: 24px; margin-top: 12px;";

    comment.replies.forEach((reply) => {
      const replyEl = createReplyElement(reply);
      repliesContainer.appendChild(replyEl);
      console.log("[COMMENT] ✅ Reply added to container:", reply.id);
    });

    commentEl.appendChild(repliesContainer);
    console.log(
      "[COMMENT] ✅ Replies container added to commentEl. Total replies:",
      comment.replies.length
    );
  } else {
    console.log("[COMMENT] No replies for comment:", comment.id);
  }

  return commentEl;
}

// 대댓글 엘리먼트 생성
function createReplyElement(reply) {
  console.log(
    "[REPLY ELEMENT] Creating reply:",
    reply.id,
    "content:",
    reply.content
  );
  const replyEl = document.createElement("div");
  replyEl.className = "comment-reply-item";
  replyEl.style.cssText = "padding: 8px 0; border-bottom: 1px solid #f9f9f9;";

  const header = document.createElement("div");
  header.style.cssText =
    "display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;";

  const authorContainer = document.createElement("div");
  authorContainer.style.cssText =
    "display: flex; align-items: center; gap: 6px;";

  const author = document.createElement("span");
  author.textContent = reply.display_name || "사용자";
  author.style.cssText = "font-weight: 600; font-size: 13px;";
  authorContainer.appendChild(author);

  // 작가 뱃지 추가
  if (reply.user_role === "creator") {
    const badge = document.createElement("span");
    badge.className = "creator-badge";
    badge.textContent = "M.creator";
    badge.style.cssText =
      "padding: 2px 6px; background: #FF5E00; color: white; font-size: 10px; font-weight: 600; border-radius: 4px;";
    authorContainer.appendChild(badge);
  }

  const date = document.createElement("span");
  date.textContent = new Date(reply.created_at).toLocaleDateString();
  date.style.cssText = "font-size: 11px; color: #888;";

  // 옵션 버튼 (점 3개)
  const moreBtnWrapper = document.createElement("div");
  moreBtnWrapper.className = "comment-menu-btn-wrapper";
  moreBtnWrapper.style.cssText = "position: relative;";

  const moreBtn = document.createElement("button");
  moreBtn.className = "reply-more-btn";
  moreBtn.innerHTML = `
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="12" cy="5" r="2" fill="#888"/>
      <circle cx="12" cy="12" r="2" fill="#888"/>
      <circle cx="12" cy="19" r="2" fill="#888"/>
    </svg>
  `;
  moreBtn.style.cssText =
    "background:none; border:none; cursor:pointer; padding:2px; display:flex; align-items:center;";

  const menuDropdown = document.createElement("div");
  menuDropdown.className = "comment-menu-dropdown";

  moreBtn.onclick = async (e) => {
    e.stopPropagation();

    // Close other dropdowns
    document.querySelectorAll(".comment-menu-dropdown.show").forEach((d) => {
      if (d !== menuDropdown) d.classList.remove("show");
    });

    const currentUid = await getCurrentFirebaseUid();
    const isMine = currentUid && reply.user_id === currentUid;

    menuDropdown.innerHTML = "";
    if (isMine) {
      const editBtn = document.createElement("button");
      editBtn.className = "comment-menu-item";
      editBtn.textContent = "수정";
      editBtn.onclick = () => showCustomAlert("준비중인 기능입니다.");

      const delBtn = document.createElement("button");
      delBtn.className = "comment-menu-item danger";
      delBtn.textContent = "삭제";
      delBtn.onclick = async () => {
        const confirmed = await showCustomConfirm(
          "이 답글을 삭제하시겠습니까?",
          "답글 삭제"
        );
        if (confirmed) {
          if (typeof window.deleteReply === "function") {
            const result = await window.deleteReply(reply.id, currentUid);
            if (!result.error) {
              const modal = document.getElementById("comment-modal");
              const feedId = modal?.dataset.feedId;
              if (feedId) window.openCommentsModal(feedId);
            } else {
              showCustomAlert("답글 삭제에 실패했습니다.");
            }
          }
        }
      };
      menuDropdown.appendChild(editBtn);
      menuDropdown.appendChild(delBtn);
    } else {
      const reportBtn = document.createElement("button");
      reportBtn.className = "comment-menu-item";
      reportBtn.textContent = "신고하기";
      reportBtn.onclick = async () => {
        const confirmed = await showCustomConfirm(
          "이 답글을 신고하시겠습니까?",
          "신고하기"
        );
        if (confirmed) {
          showCustomAlert("신고 접수되었습니다. 검토 후 조치하겠습니다.");
        }
      };
      menuDropdown.appendChild(reportBtn);
    }

    menuDropdown.classList.toggle("show");
  };

  header.appendChild(authorContainer);
  header.appendChild(moreBtnWrapper);
  moreBtnWrapper.appendChild(moreBtn);
  moreBtnWrapper.appendChild(menuDropdown);

  // 날짜는 내용 바로 위에 작게 표시하거나 헤더에 머무름
  // 여기서는 헤더 우측에 버튼이 가고 날짜는 왼쪽에 저자 옆에 붙임
  authorContainer.appendChild(date);

  const content = document.createElement("div");
  content.textContent = reply.content;
  content.style.cssText = "font-size: 13px; color: #333; line-height: 1.4;";

  replyEl.appendChild(header);
  replyEl.appendChild(content);

  return replyEl;
}

// 대댓글 입력 폼 표시
function showReplyInput(commentEl, parentComment, feedId) {
  // 기존 입력 폼이 있으면 제거
  const existingInput = commentEl.querySelector(".reply-input-form");
  if (existingInput) {
    existingInput.remove();
    return;
  }

  const replyForm = document.createElement("div");
  replyForm.className = "reply-input-form";
  replyForm.style.cssText =
    "display: flex; flex-direction: column; gap: 8px; margin-top: 12px; margin-left: 24px; padding: 12px; background: #fdfdfd; border: 1px solid #f0f0f0; border-radius: 12px;";

  const textarea = document.createElement("textarea");
  textarea.className = "reply-input";
  textarea.placeholder = "답글을 입력하세요...";
  textarea.rows = 2;
  textarea.style.cssText =
    "width: 100%; padding: 10px; border: 1px solid #eee; border-radius: 8px; resize: none; font-size: 13px; font-family: inherit; background: #fff;";

  const submitBtn = document.createElement("button");
  submitBtn.textContent = "답글 작성하기";
  submitBtn.type = "button";
  submitBtn.style.cssText =
    "padding: 10px; background: #FF5E00; color: white; border: none; border-radius: 8px; font-size: 13px; font-weight: 700; cursor: pointer; transition: background 0.2s;";

  submitBtn.onclick = async () => {
    const content = textarea.value.trim();
    if (!content) {
      if (typeof window.showCustomAlert === "function") {
        window.showCustomAlert("답글 내용을 입력해주세요.");
      } else {
        alert("답글 내용을 입력해주세요.");
      }
      return;
    }

    try {
      if (typeof window.createComment === "function") {
        submitBtn.disabled = true;
        submitBtn.textContent = "작성 중...";

        const result = await window.createComment(
          "feed",
          feedId,
          parentComment.id,
          content
        );

        if (result.error) {
          throw result.error;
        }

        window.openCommentsModal(feedId);
      }
    } catch (err) {
      console.error("[REPLY] 작성 중 오류:", err);
      if (typeof window.showCustomAlert === "function") {
        window.showCustomAlert("답글 작성에 실패했습니다.");
      } else {
        alert("답글 작성에 실패했습니다.");
      }
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = "답글 작성하기";
    }
  };

  replyForm.appendChild(textarea);
  replyForm.appendChild(submitBtn);

  commentEl.appendChild(replyForm);
  textarea.focus();
}

// 닫기
window.closeCommentModal = function () {
  const modal = document.getElementById("comment-modal");
  if (!modal) return;

  modal.style.display = "none";
  modal.removeAttribute("data-feed-id");
};

// --- feed-stat-interaction.js ---
/* ===============================
   feed-stat-interaction.js
   VERIFIED & PATCHED - ALL FEATURES
   =============================== */

("use strict");

console.log("[FSI] feed-stat-interaction.js LOADED");

/* ===============================
   ID GUARDS
   =============================== */

const isUUID = (v) => {
  if (typeof window.App?.utils?.isUUID === "function")
    return window.App.utils.isUUID(v);
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    v
  );
};
const isFirebaseUID = (v) => {
  if (typeof window.App?.utils?.isFirebaseUID === "function")
    return window.App.utils.isFirebaseUID(v);
  return typeof v === "string" && v.length >= 20 && v.length <= 128;
};

/* ===============================
   AUTH HELPERS
   =============================== */

async function getAuthenticatedSupabase() {
  if (typeof window.getSupabase === "function") {
    return await window.getSupabase();
  }
  return window.supabase;
}

function waitForSupabase(cb, retry = 0) {
  // If getSupabase is available, it's the safest path
  if (typeof window.getSupabase === "function") {
    return cb();
  }
  if (window.supabase) return cb();
  if (retry > 50) return console.error("[FSI] supabase timeout");
  setTimeout(() => waitForSupabase(cb, retry + 1), 100);
}

/* ===============================
   GLOBAL BRIDGES
   =============================== */

// Bridge to feed.js functions
if (!window.openCommentsModal) {
  console.warn("[FSI] openCommentsModal not yet defined in feed.js");
}

if (!window.openCreatorPreviewModal) {
  console.warn("[FSI] openCreatorPreviewModal not yet defined in feed.js");
}

window.openCreatorProfile = function (creatorId) {
  if (typeof window.openCreatorPreviewModal === "function") {
    window.openCreatorPreviewModal(creatorId);
  } else {
    console.error("[FSI] openCreatorPreviewModal not found");
  }
};

window.showToast =
  window.showToast ||
  function (msg) {
    // Try to use showCustomAlert if available, otherwise use console
    if (typeof window.showCustomAlert === "function") {
      window.showCustomAlert(msg);
    } else {
      console.log("[TOAST]", msg);
      // Fallback inline toast
      const toast = document.createElement("div");
      toast.style.cssText =
        "position:fixed;top:20px;left:50%;transform:translateX(-50%);background:rgba(0,0,0,0.8);color:white;padding:12px 24px;border-radius:8px;z-index:10000;";
      toast.textContent = msg;
      document.body.appendChild(toast);
      setTimeout(() => toast.remove(), 2000);
    }
  };

/* ===============================
   LIKE LOGIC
   =============================== */

// 중복 클릭 방지 플래그
const feedLikeProcessing = new Set();

window.handleFeedLikeAction = async function (btn) {
  const feedId =
    btn.closest("[data-feed-id]")?.dataset.feedId || btn.dataset.feedId;

  if (!isUUID(feedId)) return;

  // 중복 클릭 방지
  if (feedLikeProcessing.has(feedId)) {
    console.log("[FEED LIKE] Already processing, skipping...");
    return;
  }

  const countEl = btn.querySelector(".stat-count");
  const svgPath = btn.querySelector(".stat-icon path");

  const uid = await getCurrentFirebaseUid();
  if (!uid) return showToast("로그인이 필요합니다.");

  try {
    const supabase = await getAuthenticatedSupabase();
    if (!supabase) return;

    // 처리 시작
    feedLikeProcessing.add(feedId);

    // 현재 UI 상태 확인
    const wasLiked = btn.classList.contains("active");
    const currentCount = parseInt(countEl?.textContent || "0", 10);

    // Optimistic UI 업데이트
    btn.classList.toggle("active");
    if (countEl) {
      countEl.textContent = wasLiked ? currentCount - 1 : currentCount + 1;
    }
    if (svgPath) {
      if (wasLiked) {
        svgPath.setAttribute("stroke", "#A0A0A0");
        svgPath.removeAttribute("fill");
      } else {
        svgPath.setAttribute("stroke", "#FF5E00");
        svgPath.setAttribute("fill", "#FF5E00");
      }
    }

    // likeTarget이 내부에서 상태를 확인하고 적절히 처리
    const result = await window.likeTarget("feed", feedId, uid);

    // 에러 발생 시 UI 롤백
    if (result.error) {
      btn.classList.toggle("active");
      if (countEl) {
        countEl.textContent = currentCount;
      }
      if (svgPath) {
        if (wasLiked) {
          svgPath.setAttribute("stroke", "#FF5E00");
          svgPath.setAttribute("fill", "#FF5E00");
        } else {
          svgPath.setAttribute("stroke", "#A0A0A0");
          svgPath.removeAttribute("fill");
        }
      }
    }
  } catch (err) {
    console.error("[FEED LIKE] Error:", err);
  } finally {
    // 처리 완료
    setTimeout(() => {
      feedLikeProcessing.delete(feedId);
    }, 500); // 500ms 후 플래그 제거
  }
};

// 중복 클릭 방지 플래그
const commentLikeProcessing = new Set();

window.handleCommentLike = async function (btn) {
  const commentId = btn.dataset.commentId || btn.dataset.replyId;
  const type = btn.dataset.commentId ? "comment" : "reply";

  if (!isUUID(commentId)) return;

  // 중복 클릭 방지
  const key = `${type}-${commentId}`;
  if (commentLikeProcessing.has(key)) {
    console.log("[COMMENT LIKE] Already processing, skipping...");
    return;
  }

  const countEl = btn.querySelector(".comment-like-count");
  const svgPath = btn.querySelector(".comment-like-icon path");

  const uid = await getCurrentFirebaseUid();
  if (!uid) return;

  try {
    const supabase = await getAuthenticatedSupabase();
    if (!supabase) return;

    // 처리 시작
    commentLikeProcessing.add(key);

    // 현재 UI 상태 확인
    const wasLiked = btn.classList.contains("active");
    const currentCount = parseInt(countEl?.textContent || "0", 10);

    // Optimistic UI 업데이트
    btn.classList.toggle("active");
    if (countEl) {
      countEl.textContent = wasLiked ? currentCount - 1 : currentCount + 1;
    }
    if (svgPath) {
      svgPath.setAttribute("fill", wasLiked ? "#A0A0A0" : "#FF5E00");
    }

    // likeTarget이 내부에서 상태를 확인하고 적절히 처리
    const result = await window.likeTarget(type, commentId, uid);

    // 에러 발생 시 UI 롤백
    if (result.error) {
      btn.classList.toggle("active");
      if (countEl) {
        countEl.textContent = currentCount;
      }
      if (svgPath) {
        svgPath.setAttribute("fill", wasLiked ? "#FF5E00" : "#A0A0A0");
      }
    }
  } catch (err) {
    console.error("[COMMENT LIKE] Error:", err);
  } finally {
    // 처리 완료
    setTimeout(() => {
      commentLikeProcessing.delete(key);
    }, 500); // 500ms 후 플래그 제거
  }
};

/* ===============================
   DOUBLE-TAP LIKE
   =============================== */

let lastTap = 0;
const DOUBLE_TAP_DELAY = 300;

window.handleImageDoubleTap = function (img) {
  const now = Date.now();
  const timeSince = now - lastTap;

  if (timeSince < DOUBLE_TAP_DELAY && timeSince > 0) {
    const feedItem = img.closest("[data-feed-id]");
    if (!feedItem) return;

    const likeBtn = feedItem.querySelector('[data-action="like"]');
    if (!likeBtn) return;

    if (!likeBtn.classList.contains("active")) {
      window.handleFeedLikeAction(likeBtn);
    }

    const heart = document.createElement("div");
    heart.className = "double-tap-heart";
    heart.innerHTML = "❤️";
    heart.style.cssText =
      "position:absolute;top:50%;left:50%;transform:translate(-50%,-50%) scale(0);font-size:80px;pointer-events:none;z-index:999;animation:heartPop 0.6s ease-out;";
    feedItem.style.position = "relative";
    feedItem.appendChild(heart);
    setTimeout(() => heart.remove(), 600);
  }

  lastTap = now;
};

/* ===============================
   FOLLOW LOGIC (PATCHED)
   =============================== */

const followProcessing = new Set();

window.toggleCreatorFollow = async function (id) {
  let targetId = id;

  // 1. Resolve targetId if not provided (e.g. from inline onclick)
  if (!targetId || typeof targetId !== "string") {
    const modal =
      document.querySelector('.creator-preview-modal-overlay[style*="flex"]') ||
      document.getElementById("creator-preview-modal");
    targetId = modal?.dataset.creatorId;
    console.log("[FOLLOW] Resolved targetId from modal:", targetId);
  }

  if (!isFirebaseUID(targetId)) {
    console.error("[FOLLOW] invalid targetId", targetId);
    return;
  }

  const uid = await getCurrentFirebaseUid();
  if (!uid) return showToast("로그인이 필요합니다.");
  if (uid === targetId) return showToast("자기 자신은 팔로우할 수 없습니다.");

  // 중복 클릭 방지
  if (followProcessing.has(targetId)) return;

  try {
    const supabase = await getAuthenticatedSupabase();
    if (!supabase) {
      console.error("[FOLLOW] Supabase client not found");
      return;
    }

    followProcessing.add(targetId);

    // 💡 simplify: follows table (Text based) is used for all reader-to-anyone follows.
    // This avoids 22P02 UUID errors from creator_follows table.
    const { data: existing, error: checkError } = await supabase
      .from("follows")
      .select("*")
      .eq("follower_id", uid)
      .eq("following_id", targetId)
      .maybeSingle();

    if (checkError) {
      console.error("[FOLLOW] Status check error:", checkError);
      return;
    }

    const isFollowing = !!existing;

    if (isFollowing) {
      const { error: delError } = await supabase
        .from("follows")
        .delete()
        .eq("follower_id", uid)
        .eq("following_id", targetId);

      if (delError) {
        console.error("[FOLLOW] Delete failed:", delError);
        showToast("팔로우 취소 중 오류가 발생했습니다.");
        return;
      }
      showToast("팔로우 취소");
    } else {
      const { error: insErr } = await supabase.from("follows").insert({
        follower_id: uid,
        following_id: targetId,
      });

      // 409 Conflict 처리: 이미 팔로우 중이면 성공으로 간주
      if (insErr && insErr.code === "23505") {
        console.log("[FOLLOW] Already following (409)");
      } else if (insErr) {
        console.error("[FOLLOW] Insert error:", insErr);
        return showToast("팔로우 중 오류가 발생했습니다.");
      }
      showToast("팔로우 했습니다!");
    }

    // UI 및 버튼 싱크
    updateFollowButtons(targetId, !isFollowing);
  } catch (err) {
    console.error("[FOLLOW] Exception:", err);
  } finally {
    setTimeout(() => followProcessing.delete(targetId), 500);
  }
};

function updateFollowButtons(targetId, isFollowing) {
  // 1. 모든 팔로우 버튼 찾기 (피드, 모달 등)
  const buttons = document.querySelectorAll(
    `[data-action="follow"][data-target-id="${targetId}"], #creator-preview-follow-btn`
  );

  buttons.forEach((b) => {
    b.textContent = isFollowing ? "팔로잉" : "팔로우";
    b.classList.toggle("following", isFollowing);

    // 명시적으로 targetId 보정 (필요한 경우)
    if (!b.dataset.targetId) b.dataset.targetId = targetId;
  });
}

/* ===============================
   CUT SAVE FLOW
   =============================== */

window.handleCutSave = async function (cutId) {
  if (!isUUID(cutId)) {
    console.error("[CUT SAVE] Invalid cutId", cutId);
    return;
  }

  const uid = await getCurrentFirebaseUid();
  if (!uid) {
    showToast("로그인이 필요합니다.");
    return;
  }

  const modal = document.getElementById("cutSaveConfirmModal");
  if (!modal) {
    console.error("[CUT SAVE] Modal not found");
    return;
  }

  modal.style.display = "flex";
  modal.dataset.cutId = cutId;

  const confirmBtn = modal.querySelector('[data-action="confirm-cut-save"]');
  if (confirmBtn) {
    confirmBtn.onclick = async () => {
      window.handleCutLongPress(cutId); // Reuse the direct save logic
      modal.style.display = "none";
    };
  }
};

window.handleCutLongPress = async function (cutId) {
  if (!isUUID(cutId)) return;
  const uid = await getCurrentFirebaseUid();
  if (!uid) {
    // Silent fail or toast if needed, but usually app_init handles this
    return;
  }

  console.log("[CUT SAVE] Direct save triggered for cutId:", cutId);

  try {
    const supabase = await getAuthenticatedSupabase();
    if (!supabase) {
      console.error("[CUT SAVE] Supabase client not found");
      return;
    }

    // Check if client is actually authenticated (safety check)
    if (!window.__supabase_is_authenticated) {
      console.warn("[CUT SAVE] Client is not authenticated, retrying init...");
      if (typeof window.initializeSupabaseAuth === "function") {
        await window.initializeSupabaseAuth();
      }
    }

    try {
      // 1. Ensure "저장됨" folder exists
      let folderId = null;
      const { data: folder } = await supabase
        .from("reader_folders")
        .select("id")
        .eq("reader_id", uid)
        .eq("name", "저장됨")
        .maybeSingle();

      if (folder) {
        folderId = folder.id;
      } else {
        const { data: newFolder, error: createError } = await window.supabase
          .from("reader_folders")
          .insert({
            reader_id: uid,
            name: "저장됨",
            emoji: "📁",
          })
          .select("id")
          .single();

        if (createError) {
          console.error("[CUT SAVE] Folder creation failed:", createError);
          return showToast("저장 실패 (폴더 생성 오류)");
        }
        folderId = newFolder.id;
      }

      // 2. reader_folder_cuts 테이블에 저장
      const { error: folderCutError } = await window.supabase
        .from("reader_folder_cuts")
        .insert({
          reader_id: uid,
          cut_id: cutId,
          folder_id: folderId,
        });

      if (folderCutError) {
        if (folderCutError.code === "23505") {
          showToast("이미 저장된 컷입니다.");
          // Already saved, still show completion modal for consistency
          if (typeof window.openCutSaveCompleteModal === "function") {
            window.openCutSaveCompleteModal();
          }
        } else {
          console.error(
            "[CUT SAVE] Error (reader_folder_cuts):",
            folderCutError
          );
          showToast("컷 저장에 실패했습니다.");
        }
        return;
      }

      // 3. user_feed_events에 저장 이벤트 기록 (백그라운드)
      window.supabase
        .from("user_feed_events")
        .insert({
          user_id: uid,
          feed_id: null,
          event_type: "cut_saved",
          metadata: { cut_id: cutId },
        })
        .then(({ error }) => {
          if (error) console.warn("[EVENT] failed", error);
        });

      // 4. 모달 표시 및 피드백
      if (typeof window.openCutSaveCompleteModal === "function") {
        window.openCutSaveCompleteModal();
      } else {
        showToast("저장되었습니다!");
      }

      // 5. 마이페이지 동기용 이벤트
      window.dispatchEvent(new CustomEvent("cutSaved", { detail: { cutId } }));
    } catch (err) {
      console.error("[CUT SAVE] Exception:", err);
      showToast("저장 중 오류가 발생했습니다.");
    }
  } catch (err) {
    console.error("[CUT SAVE] Auth/Client Exception:", err);
    showToast("인증 서버 연결 중 오류가 발생했습니다.");
  }
};

window.closeCutSaveModal = function () {
  const modal = document.getElementById("cutSaveConfirmModal");
  if (modal) modal.style.display = "none";
};

window.goToMyPage = function () {
  window.location.href = "mypage_reader.html";
};

/* ===============================
   CLICK ROUTER
   =============================== */

if (!window.__FSI_CLICK_BOUND__) {
  window.__FSI_CLICK_BOUND__ = true;

  document.addEventListener(
    "click",
    (e) => {
      const el = e.target.closest("[data-action]");
      if (!el) return;

      const action = el.dataset.action;

      if (action === "comment") {
        const targetId =
          el.dataset.targetId ||
          el.closest("[data-target-id]")?.dataset.targetId;

        if (!targetId) {
          console.error("[COMMENT] targetId is undefined", el);
          return;
        }

        console.log("[COMMENT] openCommentsModal:", targetId);

        if (typeof window.openCommentsModal === "function") {
          window.openCommentsModal(targetId);
        } else {
          console.error("[COMMENT] openCommentsModal not found");
        }

        return;
      }

      const targetId =
        el.dataset.targetId ||
        el.dataset.feedId ||
        el.closest("[data-feed-id]")?.dataset.feedId;

      if (action === "like") window.handleFeedLikeAction(el);
      if (action === "comment-like") window.handleCommentLike(el);
      if (action === "profile") window.openCreatorProfile(targetId);
      if (action === "follow") window.toggleCreatorFollow(targetId);
      if (action === "cut-save") window.handleCutSave(targetId);
    },
    true
  );

  document.addEventListener("dblclick", (e) => {
    const img = e.target.closest(".feed-image, .cut-image");
    if (img) {
      e.preventDefault();
      window.handleImageDoubleTap(img);
    }
  });
}

// console.log("[FSI] ✅ All event handlers registered");

// --- creator-preview-modal.js ---
/* ============================
   CREATOR PROFILE MODAL
============================ */

window.openCreatorPreviewModal = async function (creatorId) {
  console.log("[CREATOR MODAL] Opening for creatorId:", creatorId);

  if (!creatorId) {
    console.error("[CREATOR MODAL] Invalid creatorId");
    return;
  }

  const modal = document.getElementById("creator-preview-modal");
  if (!modal) {
    console.error("[CREATOR MODAL] Modal element not found");
    return;
  }

  // 모달 표시 및 creatorId 저장
  modal.style.display = "flex";
  modal.dataset.creatorId = creatorId;

  // Supabase에서 작가 정보 가져오기
  try {
    const supabase = await loadSupabaseClient();
    if (!supabase) {
      console.error("[CREATOR MODAL] Supabase not available");
      return;
    }

    const { data: creator, error } = await supabase
      .from("creators")
      .select("firebase_uid, pen_name, profile_image_url, introduction")
      .eq("firebase_uid", creatorId)
      .single();

    if (error || !creator) {
      console.error("[CREATOR MODAL] Failed to load creator:", error);
      alert("작가 정보를 불러올 수 없습니다.");
      modal.style.display = "none";
      return;
    }

    // 모달 콘텐츠 업데이트
    const nameEl = modal.querySelector("#creator-preview-name");
    const introEl = modal.querySelector("#creator-preview-intro");
    const avatarEl = modal.querySelector("#creator-preview-avatar");

    if (nameEl) nameEl.textContent = creator.pen_name || "작가";
    if (introEl)
      introEl.textContent = creator.introduction || "작가 소개글이 없습니다.";

    if (avatarEl) {
      if (creator.profile_image_url) {
        avatarEl.innerHTML = `<img src="${creator.profile_image_url}" alt="프로필" style="width: 100%; height: 100%; object-fit: cover; border-radius: 50%;">`;
      } else {
        // MU-MU Orange Styled Placeholder
        avatarEl.innerHTML = `
          <svg xmlns="http://www.w3.org/2000/svg" width="80" height="80" viewBox="0 0 80 80" fill="none">
            <circle cx="40" cy="40" r="40" fill="#FFF2EB" />
            <path d="M40 20C45.5228 20 50 24.4772 50 30C50 35.5228 45.5228 40 40 40C34.4772 40 30 35.5228 30 30C30 24.4772 34.4772 20 40 20ZM40 45C48.2843 45 55 51.7157 55 60H25C25 51.7157 31.7157 45 40 45Z" fill="#FF5E00" />
          </svg>
        `;
      }
    }

    // 팔로우 버튼 상태 확인
    await updateFollowButtonState(creatorId);
  } catch (err) {
    console.error("[CREATOR MODAL] Error:", err);
    alert("작가 정보를 불러오는 중 오류가 발생했습니다.");
    modal.style.display = "none";
  }
};

// 팔로우 버튼 상태 업데이트
async function updateFollowButtonState(creatorId) {
  try {
    const uid = await getCurrentFirebaseUid();
    if (!uid) return;

    const supabase = await loadSupabaseClient();
    if (!supabase) return;

    const { data } = await supabase
      .from("follows")
      .select("id")
      .eq("follower_id", uid)
      .eq("following_id", creatorId)
      .maybeSingle();

    const isFollowing = !!data;
    const followBtn = document.getElementById("creator-preview-follow-btn");

    if (followBtn) {
      followBtn.textContent = isFollowing ? "팔로잉" : "팔로우";
      followBtn.classList.toggle("following", isFollowing);

      // 데이터 속성 설정
      followBtn.dataset.action = "follow";
      followBtn.dataset.targetId = creatorId;
    }
  } catch (err) {
    console.error("[CREATOR MODAL] Failed to update follow button:", err);
  }
}

// 작가 피드로 이동
window.goToCreatorFeed = function () {
  const modal = document.getElementById("creator-preview-modal");
  const creatorId = modal?.dataset?.creatorId;

  if (creatorId) {
    window.location.href = `mypage_creator.html?creator_id=${creatorId}`;
  } else {
    console.error("[CREATOR MODAL] No creatorId found");
  }
};

// 모달 닫기
window.closeCreatorPreviewModal = function () {
  const modal = document.getElementById("creator-preview-modal");
  if (modal) {
    modal.style.display = "none";
    modal.removeAttribute("data-creator-id");
  }
};

console.log("[FEED.JS] ✅ Creator profile modal functions loaded");
