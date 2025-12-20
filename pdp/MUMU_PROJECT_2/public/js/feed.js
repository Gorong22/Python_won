// 임시 로그인 여부 (나중에 Firebase Auth 연결 예정)
const isLoggedIn = false; // true면 회원 UI

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
    const { auth } = await import("/js/firebase_init.js");
    const { onAuthStateChanged } = await import(
      "https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js"
    );

    return new Promise((resolve) => {
      const unsubscribe = onAuthStateChanged(auth, async (user) => {
        unsubscribe();
        if (!user || !user.uid) {
          resolve({ isReaderLoggedIn: false, isCreatorLoggedIn: false });
          return;
        }

        // 독자 로그인 확인 (Firebase Auth만 확인)
        const isReaderLoggedIn = !!user.uid;

        // 크리에이터 로그인 확인 제거 (creators 테이블 조회 금지)
        // 좋아요/댓글 기능은 모든 Firebase 유저가 사용 가능
        const isCreatorLoggedIn = false;

        resolve({ isReaderLoggedIn, isCreatorLoggedIn, userId: user.uid });
      });
    });
  } catch (error) {
    console.error("[인증] 로그인 상태 확인 실패:", error);
    return { isReaderLoggedIn: false, isCreatorLoggedIn: false };
  }
}

window.addEventListener("DOMContentLoaded", async () => {
  // 독자와 크리에이터 로그인 상태 확인
  const authStatus = await checkAuthStatus();

  if (!authStatus.isReaderLoggedIn) {
    alert("독자 로그인이 필요합니다. 로그인 페이지로 이동합니다.");
    window.location.href = "/login.html";
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

  // feedList가 존재할 때만 실제 피드 로드 (Supabase 우선, 실패 시 mock)
  const feedList =
    document.getElementById("feedList") || document.querySelector(".feed-list");
  if (feedList && !isSearchModeActive()) {
    loadLiveFeed(feedList);
  }

  // Progressive feed rendering: 초기 3개만 표시, 나머지는 점진적으로 렌더링
  if (!isSearchModeActive()) {
    renderFeedItemsProgressively();
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

/* ============================
   MOBILE IMAGE RESIZE HELPER
============================ */
function isMobileDevice() {
  const ua = navigator.userAgent || navigator.vendor || window.opera;
  const isIOS = /iPad|iPhone|iPod/.test(ua) && !window.MSStream;
  const isMobileWidth = window.innerWidth <= 480;
  return isIOS || isMobileWidth;
}

function applyMobileImageResize(imageUrl) {
  if (!imageUrl) return imageUrl;

  const cafe24Domain = "ecimg.cafe24img.com";
  if (!imageUrl.includes(cafe24Domain)) {
    return imageUrl;
  }

  if (!isMobileDevice()) {
    return imageUrl;
  }

  const separator = imageUrl.includes("?") ? "&" : "?";
  return imageUrl + separator + "RS=420x";
}

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
    console.warn("[feed] supabase 로드 실패 → mock_feed.json 사용");
    return loadMockFeed(feedListEl);
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
          cuts!inner(id, image_url, order_index, is_visible)
        `
      )
      .eq("is_public", true)
      .or("status.eq.approved,status.eq.published")
      .order("updated_at", { ascending: false })
      .limit(20);

    if (error) {
      console.warn("[feed] works 쿼리 실패:", error);
      return loadMockFeed(feedListEl);
    }

    const works = Array.isArray(data) ? data : [];

    // 크리에이터 정보 매핑 (works.creator_id는 UUID이므로 creators.id로 조회 후 firebase_uid 가져오기)
    const creatorUuids = [
      ...new Set(works.map((w) => w.creator_id).filter(Boolean)),
    ];
    const creatorUuidToFirebaseUidMap = {};
    const creatorFirebaseUidToNameMap = {};

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
              creatorUuidToFirebaseUidMap[creator.id] = creator.firebase_uid;
              if (creator.firebase_uid && creator.pen_name) {
                creatorFirebaseUidToNameMap[creator.firebase_uid] = creator.pen_name;
              }
            }
          });
        }
      } catch (err) {
        console.error("[feed] 크리에이터 정보 로드 실패:", err);
      }
    }

    const items = works.map((w) => {
      const cuts = Array.isArray(w.cuts)
        ? w.cuts
            .filter((c) => c.is_visible !== false)
            .sort((a, b) => (a.order_index || 0) - (b.order_index || 0))
        : [];
      const thumbnail =
        w.thumbnail_url || (cuts.length > 0 ? cuts[0].image_url : null) || null;
      
      // works.creator_id (UUID) → firebase_uid 변환
      const creatorFirebaseUid = w.creator_id 
        ? creatorUuidToFirebaseUidMap[w.creator_id] || null
        : null;
      const creatorName = creatorFirebaseUid
        ? creatorFirebaseUidToNameMap[creatorFirebaseUid] || "사용자"
        : "사용자";
      
      return {
        id: w.id,
        creator: creatorName,
        creator_id: creatorFirebaseUid, // ✅ firebase_uid만 저장 (UUID 제거)
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
      };
    });

    feedListEl.innerHTML = "";
    // 피드 리스트 표시
    feedListEl.style.display = "";
    items.forEach((item) => {
      const cardHTML = createFeedCard(item);
      feedListEl.insertAdjacentHTML("beforeend", cardHTML);
    });

    // 슬라이드 점 동기화 초기화
    attachFeedImageSliders();

    attachCreatorMoreBtnListeners();
    attachFollowBtnListeners();
    normalizeCommentButtons();

    // 컷 이미지 롱프레스 및 더블 클릭 이벤트 추가
    attachCutImageInteractions();

    // 좋아요/댓글 수 업데이트
    updateFeedStats(items.map((item) => item.id))
      .catch((err) => console.error("[피드] 통계 업데이트 실패:", err))
      .finally(() => {
        // 로딩 스피너 숨기기
        hideFullPageLoader();
      });
  } catch (err) {
    console.warn("[feed] live feed 로드 실패:", err);
    loadMockFeed(feedListEl);
  }
}

// 전체 화면 로딩 스피너 숨기기
function hideFullPageLoader() {
  const loader = document.getElementById("full-page-loader");
  if (loader) {
    loader.classList.add("hidden");
    // 애니메이션 완료 후 DOM에서 제거
    setTimeout(() => {
      if (loader.parentNode) {
        loader.remove();
      }
    }, 300);
  }
}

// mock 데이터를 fallback으로 사용
function loadMockFeed(feedListEl) {
  if (isSearchModeActive()) return;

  fetch("data/mock_feed.json")
    .then((res) => {
      if (!res.ok) throw new Error("mock_feed.json load failed");
      return res.json();
    })
    .then((data) => {
      if (isSearchModeActive()) return;

      const target =
        feedListEl ||
        document.getElementById("feedList") ||
        document.querySelector(".feed-list");
      if (!target) return;
      target.innerHTML = "";
      // 피드 리스트 표시
      target.style.display = "";

      data.forEach((item) => {
        const cardHTML = createFeedCard(item);
        target.insertAdjacentHTML("beforeend", cardHTML);
      });

      // 슬라이드 점 동기화 초기화
      attachFeedImageSliders();

      attachCreatorMoreBtnListeners();
      attachFollowBtnListeners();
      normalizeCommentButtons();

      // 좋아요/댓글 수 업데이트
      updateFeedStats(data.map((item) => item.id))
        .catch((err) => console.error("[피드] 통계 업데이트 실패:", err))
        .finally(() => {
          // 로딩 스피너 숨기기
          hideFullPageLoader();
        });
    })
    .catch((err) => {
      console.warn("mock_feed.json load failed:", err);
      // 에러 발생 시에도 로딩 스피너 숨기기
      hideFullPageLoader();
    });
}

let creatorMoreBtnDelegateAttached = false;
let followBtnDelegateAttached = false;

function attachCreatorMoreBtnListeners() {
  if (creatorMoreBtnDelegateAttached) return;
  creatorMoreBtnDelegateAttached = true;

  document.addEventListener("click", function (e) {
    const btn = e.target.closest(".creator-more-btn");
    if (!btn) return;

    e.preventDefault();
    e.stopPropagation();
    const modal = document.getElementById("CreatorMoreModal");
    if (modal && modal.style.display === "flex") {
      closeCreatorMoreModal();
    } else {
      openCreatorMoreModal(btn);
    }
  });
}

function attachFollowBtnListeners() {
  if (followBtnDelegateAttached) return;
  followBtnDelegateAttached = true;

  document.addEventListener("click", function (e) {
    const btn = e.target.closest(".follow-btn, .creator-follow-btn");
    if (!btn) return;

    e.preventDefault();
    e.stopPropagation();
    btn.classList.toggle("following");
    if (btn.classList.contains("following")) {
      btn.textContent = "팔로잉";
    } else {
      btn.textContent = "팔로우";
    }
  });
}

// 컷 이미지 롱프레스 및 더블 클릭 이벤트 핸들러
function attachCutImageInteractions() {
  const feedItems = document.querySelectorAll(".feed-item");

  feedItems.forEach((feedItem) => {
    const imageContainer = feedItem.querySelector(".feed-image-container");
    if (!imageContainer) return;

    const feedId = feedItem.getAttribute("data-feed-id");
    const workId = feedItem.getAttribute("data-work-id") || feedId;

    // cuts 데이터 가져오기 (feed-item의 data-cuts 속성에서)
    let cuts = [];
    const cutsData = feedItem.getAttribute("data-cuts");
    if (cutsData) {
      try {
        cuts = JSON.parse(cutsData);
      } catch (e) {
        console.warn("컷 데이터 파싱 실패:", e);
      }
    }

    // 롱프레스 타이머 및 더블 클릭 관련 변수
    let longPressTimer = null;
    let lastClickTime = 0;
    let lastClickTarget = null;
    let isLongPressActive = false;

    // 롱프레스 시작 (모바일)
    imageContainer.addEventListener(
      "touchstart",
      function (e) {
        isLongPressActive = false;
        const target = e.target.closest(".feed-image-item");
        if (!target) return;

        longPressTimer = setTimeout(() => {
          isLongPressActive = true;
          handleLongPress(feedItem, workId, cuts, imageContainer);
        }, 550);
      },
      { passive: true }
    );

    // 롱프레스 종료 (모바일)
    imageContainer.addEventListener(
      "touchend",
      function (e) {
        if (longPressTimer) {
          clearTimeout(longPressTimer);
          longPressTimer = null;
        }
        // 롱프레스가 활성화되지 않았으면 더블 탭 처리
        if (!isLongPressActive) {
          handleDoubleTap(e, feedItem);
        }
        isLongPressActive = false;
      },
      { passive: true }
    );

    imageContainer.addEventListener(
      "touchcancel",
      function (e) {
        if (longPressTimer) {
          clearTimeout(longPressTimer);
          longPressTimer = null;
        }
        isLongPressActive = false;
      },
      { passive: true }
    );

    // 롱프레스 시작 (PC)
    imageContainer.addEventListener("mousedown", function (e) {
      isLongPressActive = false;
      const target = e.target.closest(".feed-image-item");
      if (!target) return;

      longPressTimer = setTimeout(() => {
        isLongPressActive = true;
        handleLongPress(feedItem, workId, cuts, imageContainer);
      }, 550);
    });

    // 롱프레스 종료 (PC)
    imageContainer.addEventListener("mouseup", function (e) {
      if (longPressTimer) {
        clearTimeout(longPressTimer);
        longPressTimer = null;
      }
      isLongPressActive = false;
    });

    imageContainer.addEventListener("mouseleave", function (e) {
      if (longPressTimer) {
        clearTimeout(longPressTimer);
        longPressTimer = null;
      }
      isLongPressActive = false;
    });

    // 더블 클릭 (PC)
    imageContainer.addEventListener("dblclick", function (e) {
      e.preventDefault();
      e.stopPropagation();
      // 롱프레스가 활성화되지 않았을 때만 처리
      if (!isLongPressActive) {
        handleDoubleClick(feedItem);
      }
    });

    // 더블 탭 처리 (모바일)
    function handleDoubleTap(e, feedItem) {
      const currentTime = Date.now();
      const target = e.target.closest(".feed-image-item");

      if (target === lastClickTarget && currentTime - lastClickTime < 300) {
        // 더블 탭 감지
        e.preventDefault();
        e.stopPropagation();
        handleDoubleClick(feedItem);
        lastClickTime = 0;
        lastClickTarget = null;
      } else {
        lastClickTime = currentTime;
        lastClickTarget = target;
      }
    }
  });
}

// 롱프레스 핸들러 (컷 저장)
function handleLongPress(feedItem, workId, cuts, imageContainer) {
  if (!workId || !cuts || cuts.length === 0) {
    console.warn("컷 저장: work_id 또는 cuts 데이터가 없습니다");
    return;
  }

  // 현재 보이는 컷 인덱스 찾기
  let currentCutIndex = 0;
  if (imageContainer) {
    const containerWidth = imageContainer.offsetWidth;
    const scrollLeft = imageContainer.scrollLeft;
    currentCutIndex = Math.round(scrollLeft / containerWidth);
    currentCutIndex = Math.max(0, Math.min(currentCutIndex, cuts.length - 1));
  }

  // 기존 handleCutSaveClick 함수와 동일한 로직 사용
  currentSaveWorkId = workId;
  currentSaveCuts = cuts;
  currentSaveCutIndex = currentCutIndex;

  // 모달 1번 표시
  openCutSaveConfirmModal();
}

// 더블 클릭 핸들러 (좋아요)
function handleDoubleClick(feedItem) {
  const feedId = feedItem.getAttribute("data-feed-id");
  if (!feedId) return;

  // 좋아요 버튼 찾기
  const likeButton = feedItem.querySelector(
    '.feed-card-stat[aria-label="좋아요"]'
  );
  if (!likeButton) return;

  // 좋아요 버튼 클릭 이벤트 트리거
  const clickEvent = new MouseEvent("click", {
    bubbles: true,
    cancelable: true,
    view: window,
  });
  likeButton.dispatchEvent(clickEvent);
}

/* ============================
   FEED CARD TEMPLATE
============================ */

function createFeedCard(item) {
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
      .map(
        (imgUrl, idx) => `
      <div class="feed-image-item">
        <img 
          src="${imgUrl}" 
          alt="${item.title || "작품"} - 이미지 ${idx + 1}"
          loading="lazy"
          decoding="async"
          style="width: 100%; height: 100%; object-fit: contain; display: block;"
        />
      </div>
    `
      )
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

  return `
    <article class="feed-item" data-feed-id="${item.id}" data-work-id="${
    item.id
  }" data-creator-id="${item.creator_id || ""}" data-cuts='${JSON.stringify(
    item.cuts || []
  )}'>
      <div class="feed-card-header">
        <div class="feed-card-title-group">
          <h3 class="feed-card-title">${item.title || ""}</h3>
          <p class="feed-card-desc">${item.desc || ""}</p>
      </div>
        <div class="feed-card-avatar">
          <div class="avatar-circle" data-creator-id="${item.creator_id || ""}">
            <svg xmlns="http://www.w3.org/2000/svg" width="23" height="23" viewBox="0 0 23 23" fill="none">
              <path d="M11.498 0C13.0228 0 14.4851 0.605699 15.5632 1.68385C16.6414 2.762 17.2471 4.22429 17.2471 5.74902C17.2471 7.27376 16.6414 8.73605 15.5632 9.8142C14.4851 10.8923 13.0228 11.498 11.498 11.498C9.97331 11.498 8.51102 10.8923 7.43287 9.8142C6.35472 8.73605 5.74902 7.27376 5.74902 5.74902C5.74902 4.22429 6.35472 2.762 7.43287 1.68385C8.51102 0.605699 9.97331 0 11.498 0ZM11.498 22.9961C11.498 22.9961 22.9961 22.9961 22.9961 20.1216C22.9961 16.6722 17.3908 12.9353 11.498 12.9353C5.6053 12.9353 0 16.6722 0 20.1216C0 22.9961 11.498 22.9961 11.498 22.9961Z" fill="#FF5E00"/>
            </svg>
      </div>
          <div class="avatar-plus"></div>
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
            <button class="feed-card-stat stat-icon-comment" type="button" aria-label="댓글" data-action="comment" data-feed-id="${
              item.id
            }">
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

async function toggleLike(workId, isLiked) {
  const supabase = await loadSupabaseClient();
  if (!supabase) throw new Error("supabase 없음");

  const userId = await getCurrentUserId();
  if (!userId) throw new Error("로그인 필요");

  if (isLiked) {
    // 좋아요 취소
    const { error } = await supabase
      .from("likes")
      .delete()
      .eq("user_id", userId)
      .eq("target_type", "work")
      .eq("target_id", workId);

    if (error) throw error;
  } else {
    // 좋아요 추가
    const { error } = await supabase.from("likes").insert({
      user_id: userId,
      target_type: "work",
      target_id: workId,
    });

    if (error) throw error;
  }
}

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
    const { auth } = await import("/js/firebase_init.js");
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

// 좋아요 추가
window.likeTarget = async function (targetType, targetId, firebaseUid) {
  if (!window.supabase) {
    const error = new Error("Supabase client not available");
    console.error("[좋아요] 에러:", error);
    return { error };
  }
  try {
    // 먼저 이미 좋아요가 있는지 확인
    const { data: existingLike, error: checkError } = await window.supabase
      .from("likes")
      .select("id")
      .eq("target_type", targetType)
      .eq("target_id", targetId)
      .eq("user_id", firebaseUid)
      .maybeSingle();

    if (checkError && checkError.code !== "PGRST116") {
      console.error("[좋아요] 확인 실패:", checkError);
      return { error: checkError };
    }

    // 이미 좋아요가 있으면 성공으로 처리 (중복 방지)
    if (existingLike) {
      return { data: existingLike, error: null };
    }

    // 좋아요 추가
    const { data, error } = await window.supabase.from("likes").insert({
      target_type: targetType,
      target_id: targetId,
      user_id: firebaseUid, // firebase_uid를 user_id로 저장
    });
    if (error) {
      console.error("[좋아요] 추가 실패:", error);
      // 409 에러(중복) 또는 23505(unique constraint violation)는 무시하고 성공으로 처리
      if (
        error.code === "23505" ||
        error.code === "409" ||
        error.status === 409 ||
        error.message?.includes("duplicate") ||
        error.message?.includes("already exists")
      ) {
        console.log("[좋아요] 이미 좋아요가 있습니다. (중복 무시)");
        return { data: existingLike || null, error: null };
      }
    }
    return { data, error };
  } catch (err) {
    console.error("[좋아요] 추가 예외:", err);
    return { error: err };
  }
};

// 좋아요 취소
window.unlikeTarget = async function (targetType, targetId, firebaseUid) {
  if (!window.supabase) {
    const error = new Error("Supabase client not available");
    console.error("[좋아요] 에러:", error);
    return { error };
  }
  try {
    const { data, error } = await window.supabase
      .from("likes")
      .delete()
      .eq("target_type", targetType)
      .eq("target_id", targetId)
      .eq("user_id", firebaseUid); // firebase_uid를 user_id로 조회
    if (error) {
      console.error("[좋아요] 취소 실패:", error);
    }
    return { data, error };
  } catch (err) {
    console.error("[좋아요] 취소 예외:", err);
    return { error: err };
  }
};

// 좋아요 여부 확인
async function hasLiked(targetType, targetId, firebaseUid) {
  if (!window.supabase) {
    const error = new Error("Supabase client not available");
    console.error("[좋아요] 에러:", error);
    return { data: null, error };
  }
  try {
    const { data, error } = await window.supabase
      .from("likes")
      .select("id")
      .eq("target_type", targetType)
      .eq("target_id", targetId)
      .eq("user_id", firebaseUid) // firebase_uid를 user_id로 조회
      .single();
    if (error && error.code !== "PGRST116") {
      console.error("[좋아요] 확인 실패:", error);
    }
    return { data, error: error && error.code !== "PGRST116" ? error : null };
  } catch (err) {
    console.error("[좋아요] 확인 예외:", err);
    return { data: null, error: err };
  }
}

// 댓글 목록
async function loadComments(targetType, targetId) {
  if (!window.supabase) {
    const error = new Error("Supabase client not available");
    console.error("[댓글] 에러:", error);
    return { data: null, error };
  }
  try {
    // 기본 쿼리로 댓글 가져오기 (users 조인은 renderComments에서 처리)
    const { data, error } = await window.supabase
      .from("comments")
      .select("*")
      .eq("target_type", targetType)
      .eq("target_id", targetId)
      .order("created_at", { ascending: true });

    if (error) {
      console.error("[댓글] 목록 로드 실패:", error);
    }
    return { data, error };
  } catch (err) {
    console.error("[댓글] 목록 로드 예외:", err);
    return { data: null, error: err };
  }
}

window.loadComments = loadComments;

// 댓글 작성
window.createComment = async function (
  targetType,
  targetId,
  content,
  firebaseUid
) {
  if (!window.supabase) {
    const error = new Error("Supabase client not available");
    console.error("[댓글] 에러:", error);
    return { data: null, error };
  }
  try {
    const { data, error } = await window.supabase.from("comments").insert({
      target_type: targetType,
      target_id: targetId,
      content,
      user_id: firebaseUid, // firebase_uid를 user_id로 저장
    });
    if (error) {
      console.error("[댓글] 작성 실패:", error);
    }
    return { data, error };
  } catch (err) {
    console.error("[댓글] 작성 예외:", err);
    return { data: null, error: err };
  }
};

// 댓글 삭제
window.deleteComment = async function (commentId, firebaseUid) {
  if (!window.supabase) {
    const error = new Error("Supabase client not available");
    console.error("[댓글] 에러:", error);
    return { data: null, error };
  }
  try {
    const { data, error } = await window.supabase
      .from("comments")
      .delete()
      .eq("id", commentId)
      .eq("user_id", firebaseUid); // firebase_uid를 user_id로 조회
    if (error) {
      console.error("[댓글] 삭제 실패:", error);
    }
    return { data, error };
  } catch (err) {
    console.error("[댓글] 삭제 예외:", err);
    return { data: null, error: err };
  }
};

// 대댓글 목록
window.loadReplies = async function (commentId) {
  if (!window.supabase) {
    const error = new Error("Supabase client not available");
    console.error("[대댓글] 에러:", error);
    return { data: null, error };
  }
  try {
    const { data, error } = await window.supabase
      .from("comment_replies")
      .select("*")
      .eq("comment_id", commentId)
      .order("created_at", { ascending: true });
    if (error) {
      console.error("[대댓글] 목록 로드 실패:", error);
    }
    return { data, error };
  } catch (err) {
    console.error("[대댓글] 목록 로드 예외:", err);
    return { data: null, error: err };
  }
};

// 대댓글 작성
async function createReply(commentId, content, firebaseUid) {
  if (!window.supabase) {
    const error = new Error("Supabase client not available");
    console.error("[대댓글] 에러:", error);
    return { data: null, error };
  }
  try {
    const { data, error } = await window.supabase
      .from("comment_replies")
      .insert({
        comment_id: commentId,
        content,
        user_id: firebaseUid, // firebase_uid를 user_id로 저장
      });
    if (error) {
      console.error("[대댓글] 작성 실패:", error);
    }
    return { data, error };
  } catch (err) {
    console.error("[대댓글] 작성 예외:", err);
    return { data: null, error: err };
  }
}

// 대댓글 삭제
async function deleteReply(replyId, firebaseUid) {
  if (!window.supabase) {
    const error = new Error("Supabase client not available");
    console.error("[대댓글] 에러:", error);
    return { data: null, error };
  }
  try {
    const { data, error } = await window.supabase
      .from("comment_replies")
      .delete()
      .eq("id", replyId)
      .eq("user_id", firebaseUid); // firebase_uid를 user_id로 조회
    if (error) {
      console.error("[대댓글] 삭제 실패:", error);
    }
    return { data, error };
  } catch (err) {
    console.error("[대댓글] 삭제 예외:", err);
    return { data: null, error: err };
  }
}

// 피드별 좋아요/댓글 수 업데이트
async function updateFeedStats(feedIds) {
  if (!feedIds || feedIds.length === 0) return;

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
          const result = await window.supabase
            .from("likes")
            .select("target_id")
            .eq("target_type", "cut")
            .in("target_id", feedIds);
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
          const result = await window.supabase
            .from("comments")
            .select("target_id")
            .eq("target_type", "feed")
            .in("target_id", feedIds);
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

        if (likesData) {
          likesData.forEach((like) => {
            likeCounts[like.target_id] = (likeCounts[like.target_id] || 0) + 1;
          });
        }

        if (commentsData) {
          commentsData.forEach((comment) => {
            commentCounts[comment.target_id] =
              (commentCounts[comment.target_id] || 0) + 1;
          });
        }

        // UI 업데이트
        feedIds.forEach((feedId) => {
          const feedItem = document.querySelector(
            `.feed-item[data-feed-id="${feedId}"]`
          );
          if (!feedItem) return;

          // 좋아요 수 업데이트
          const likeButton = feedItem.querySelector(
            '.feed-card-stat[aria-label="좋아요"]'
          );
          if (likeButton) {
            const likeCountEl = likeButton.querySelector(".stat-count");
            if (likeCountEl) {
              // 로딩 스피너 제거 후 숫자 표시
              const spinner = likeCountEl.querySelector(
                ".stat-loading-spinner"
              );
              if (spinner) {
                spinner.remove();
              }
              likeCountEl.textContent = likeCounts[feedId] || 0;
            }
          }

          // 댓글 수 업데이트
          const commentButton = feedItem.querySelector(
            '.feed-card-stat[aria-label="댓글"]'
          );
          if (commentButton) {
            const commentCountEl = commentButton.querySelector(".stat-count");
            if (commentCountEl) {
              // 로딩 스피너 제거 후 숫자 표시
              const spinner = commentCountEl.querySelector(
                ".stat-loading-spinner"
              );
              if (spinner) {
                spinner.remove();
              }
              commentCountEl.textContent = commentCounts[feedId] || 0;
            }
          }
        });

        // 현재 사용자의 좋아요 상태 확인 및 업데이트 (에러와 관계없이 시도)
        try {
          const firebaseUid = await getCurrentFirebaseUid();
          if (firebaseUid && window.supabase) {
            const { data: userLikes, error: userLikesError } =
              await window.supabase
                .from("likes")
                .select("target_id")
                .eq("target_type", "cut")
                .eq("user_id", firebaseUid) // firebase_uid를 user_id로 조회
                .in("target_id", feedIds);

            if (!userLikesError && userLikes) {
              const likedFeedIds = new Set(userLikes.map((l) => l.target_id));
              feedIds.forEach((feedId) => {
                const feedItem = document.querySelector(
                  `.feed-item[data-feed-id="${feedId}"]`
                );
                if (!feedItem) return;

                const likeButton = feedItem.querySelector(
                  '.feed-card-stat[aria-label="좋아요"]'
                );
                if (likeButton) {
                  const svgPath = likeButton.querySelector(".stat-icon path");
                  if (likedFeedIds.has(feedId)) {
                    likeButton.classList.add("active");
                    if (svgPath) {
                      svgPath.setAttribute("stroke", "#FF5E00");
                    }
                  } else {
                    likeButton.classList.remove("active");
                    if (svgPath) {
                      svgPath.setAttribute("stroke", "#A0A0A0");
                    }
                  }
                }
              });
            }
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

// 기타 전역 함수 노출 (updateFeedStats, createReply, deleteReply, hasLiked, getCurrentFirebaseUid)
window.updateFeedStats = updateFeedStats;
window.createReply = createReply;
window.deleteReply = deleteReply;
window.hasLiked = hasLiked;
window.getCurrentFirebaseUid = getCurrentFirebaseUid;

/* ============================
   Supabase Client Loader
============================ */
let cachedSupabaseClient = null;
async function loadSupabaseClient() {
  if (cachedSupabaseClient) return cachedSupabaseClient;
  try {
    const mod = await import("/js/supabase-auth.js");
    cachedSupabaseClient = mod.supabase;
    return cachedSupabaseClient;
  } catch (e) {
    console.warn("Supabase 모듈 로드 실패:", e);
    return null;
  }
}

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
  // stat-icon-heart 클릭 시 색상 변경 (이벤트 위임)
  document.addEventListener("click", function (e) {
    if (e.target.closest(".stat-icon-heart")) {
      const icon = e.target.closest(".stat-icon-heart");
      e.preventDefault();
      icon.classList.toggle("active");

      const statItem = icon.parentElement.querySelector(".stat-item");
      if (statItem) {
        let currentCount = parseInt(statItem.textContent) || 0;
        if (icon.classList.contains("active")) {
          statItem.textContent = currentCount + 1;
        } else {
          statItem.textContent = Math.max(0, currentCount - 1);
        }
      }
    }
  });

  // 댓글 아이콘/버튼 클릭 시 댓글 모달 열기 (이벤트 위임)
  // feed-stat-interaction.js에서 처리하므로 여기서는 제거

  // 댓글 모달 내 comment-stat-icon-heart 클릭 시 색상 변경 및 숫자 업데이트 (이벤트 위임)
  document.addEventListener("click", function (e) {
    if (e.target.closest(".comment-stat-icon-heart")) {
      const icon = e.target.closest(".comment-stat-icon-heart");
      e.preventDefault();
      e.stopPropagation();
      icon.classList.toggle("active");

      const statItem = icon.parentElement.querySelector("span");
      if (statItem) {
        let currentCount = parseInt(statItem.textContent) || 0;
        if (icon.classList.contains("active")) {
          statItem.textContent = currentCount + 1;
        } else {
          statItem.textContent = Math.max(0, currentCount - 1);
        }
      }
    }
  });

  // follow-btn 클릭 시 팔로우/팔로잉 토글 (이벤트 위임)
  document.addEventListener("click", function (e) {
    if (e.target.closest(".follow-btn, .creator-follow-btn")) {
      const btn = e.target.closest(".follow-btn, .creator-follow-btn");
      e.preventDefault();
      e.stopPropagation();
      btn.classList.toggle("following");
      if (btn.classList.contains("following")) {
        btn.textContent = "팔로잉";
      } else {
        btn.textContent = "팔로우";
      }
    }
  });

  // comment-more-btn 클릭 시 옵션 모달 열기/닫기 (토글) (이벤트 위임)
  document.addEventListener("click", function (e) {
    if (e.target.closest(".comment-more-btn")) {
      const btn = e.target.closest(".comment-more-btn");
      e.preventDefault();
      e.stopPropagation();
      const commentItem = btn.closest(".comment-item");
      if (commentItem) {
        const modal = document.getElementById("commentMoreModal");
        if (modal && modal.style.display === "flex") {
          closeCommentMoreModal();
        } else {
          openCommentMoreModal(btn, commentItem);
        }
      }
    }
  });

  // CreatorMoreModal-option 클릭 시 준비중인 기능 팝업 표시 (이벤트 위임)
  document.addEventListener("click", function (e) {
    if (e.target.closest(".CreatorMoreModal-option")) {
      e.preventDefault();
      e.stopPropagation();
      closeCreatorMoreModal();
      setTimeout(() => {
        showComingSoonModal();
      }, 200);
    }
  });
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
    openCutSaveConfirmModal();
  } catch (error) {
    console.error("컷 저장: 데이터 파싱 오류", error);
  }
};

// 모달 1번: 저장 확인
function openCutSaveConfirmModal() {
  const modal = document.getElementById("cutSaveConfirmModal");
  if (modal) {
    modal.style.display = "flex";
  }
}

function closeCutSaveConfirmModal() {
  const modal = document.getElementById("cutSaveConfirmModal");
  if (modal) {
    modal.style.display = "none";
  }
  currentSaveWorkId = null;
  currentSaveCuts = null;
  currentSaveCutIndex = 0;
}

// 저장 확인 후 실제 저장
async function confirmCutSave() {
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
      const { auth } = await import("/js/firebase_init.js");
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
    closeCutSaveConfirmModal();

    // 모달 2번 표시
    openCutSaveCompleteModal();
  } catch (error) {
    console.error("컷 저장 중 오류:", error);
    alert("컷 저장에 실패했습니다.");
  }
}

// 모달 2번: 저장 완료 후 무드보드 이동 확인
function openCutSaveCompleteModal() {
  const modal = document.getElementById("cutSaveCompleteModal");
  if (modal) {
    modal.style.display = "flex";
  }
}

function closeCutSaveCompleteModal() {
  const modal = document.getElementById("cutSaveCompleteModal");
  if (modal) {
    modal.style.display = "none";
  }
  currentSaveWorkId = null;
  currentSaveCuts = null;
  currentSaveCutIndex = 0;
}

// 무드보드로 이동
function goToMoodboard() {
  closeCutSaveCompleteModal();
  window.location.href = "mypage_reader.html";
}

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

// 전역 함수 바인딩 검증 로그
console.log("[feed.js 전역 바인딩 완료]", {
  likeTarget: typeof window.likeTarget,
  unlikeTarget: typeof window.unlikeTarget,
  loadComments: typeof window.loadComments,
  createComment: typeof window.createComment,
  deleteComment: typeof window.deleteComment,
  loadReplies: typeof window.loadReplies,
  updateSingleFeedStats: typeof window.updateSingleFeedStats,
});
