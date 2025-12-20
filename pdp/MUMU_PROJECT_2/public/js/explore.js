/* ==========================
   Header 커스터마이징
========================== */
fetch("components/header.html")
  .then((r) => {
    if (!r.ok) throw new Error("header load failed");
    return r.text();
  })
  .then((html) => {
    document.getElementById("header").innerHTML = html;
    // 헤더 내용 변경
    const headerTitle = document.querySelector("#header .header-title");
    if (headerTitle) {
      headerTitle.remove();
    }
    // 헤더 구조 변경: 왼쪽에 로고, 오른쪽에 검색 아이콘
    const header = document.getElementById("header");
    if (header) {
      const headerLeft = document.querySelector("#header .header-left");
      if (headerLeft) {
        headerLeft.innerHTML =
          '<svg xmlns="http://www.w3.org/2000/svg" width="66" height="33" viewBox="0 0 66 33" fill="none" class="header-logo"><path d="M21.8057 19.4238C23.8834 13.555 25.4048 8.11381 27.5078 0.767578V0H36.5371V28.0244C38.3632 27.4704 40.1105 26.7874 42.2383 25.9531V0H51.2666V27.998C53.0869 27.4409 54.8359 26.754 56.9707 25.917V0H65.999V32.9912H56.9707V29.625C54.8758 30.2024 53.1431 30.7743 51.2666 31.3496V32.9912H42.2383V29.6504C40.1516 30.2283 38.4204 30.801 36.5371 31.377V32.9912H27.5078V14.6396C25.8102 19.8463 24.2073 24.8635 21.8057 31.4521V32.9912H12.7764V14.6719C11.0575 19.9443 9.43511 25.0266 6.97852 31.7471L6.94531 31.7393V32.9902H0V23.3994L6.94531 7.63965V19.8115C9.09084 13.803 10.6326 8.29372 12.7764 0.804688V0H21.8057V19.4238Z" fill="#000000"/></svg>';
      }
      const headerLink = document.querySelector("#header .header-link");
      if (headerLink) {
        headerLink.innerHTML = `
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20" fill="none">
          <path d="M14.7981 15.8571C13.0268 17.3552 10.7451 18.1107 8.42974 17.9657C6.11442 17.8208 3.94473 16.7865 2.37414 15.0792C0.803543 13.3719 -0.0463972 11.1236 0.0019555 8.80424C0.0503082 6.48489 0.993212 4.27398 2.6336 2.6336C4.27398 0.993212 6.48489 0.0503082 8.80424 0.0019555C11.1236 -0.0463972 13.3719 0.803543 15.0792 2.37414C16.7865 3.94473 17.8208 6.11442 17.9657 8.42974C18.1107 10.7451 17.3552 13.0268 15.8571 14.7981L19.7615 18.7025C19.8351 18.7711 19.8942 18.8538 19.9351 18.9457C19.9761 19.0376 19.9981 19.1369 19.9999 19.2375C20.0017 19.3381 19.9832 19.438 19.9455 19.5313C19.9078 19.6246 19.8517 19.7094 19.7805 19.7805C19.7094 19.8517 19.6246 19.9078 19.5313 19.9455C19.438 19.9832 19.3381 20.0017 19.2375 19.9999C19.1369 19.9981 19.0376 19.9761 18.9457 19.9351C18.8538 19.8942 18.7711 19.8351 18.7025 19.7615L14.7981 15.8571ZM16.4846 8.99151C16.4846 7.00423 15.6951 5.09835 14.2899 3.69313C12.8847 2.28791 10.9788 1.49846 8.99151 1.49846C7.00423 1.49846 5.09835 2.28791 3.69313 3.69313C2.28791 5.09835 1.49846 7.00423 1.49846 8.99151C1.49846 10.9788 2.28791 12.8847 3.69313 14.2899C5.09835 15.6951 7.00423 16.4846 8.99151 16.4846C10.9788 16.4846 12.8847 15.6951 14.2899 14.2899C15.6951 12.8847 16.4846 10.9788 16.4846 8.99151Z" fill="#111111"/>
          </svg>
        `;
        headerLink.href = "search.html";
        headerLink.style.display = "flex";
        headerLink.style.alignItems = "center";
        headerLink.style.justifyContent = "center";
        headerLink.style.width = "25px";
        headerLink.style.height = "25px";
      }
    }
  })
  .catch((error) => console.error("Error fetching header.html:", error));

/* =============================
  ELEMENTS
============================= */
const searchInput = document.getElementById("searchInput");
const beforeSearch = document.getElementById("beforeSearch");
const afterSearch = document.getElementById("afterSearch");
const searchResults = document.getElementById("searchResults");
const customCursor = document.getElementById("cursor");

/* =============================
  1) 검색창 포커스 → 검색 화면 켜기
============================= */
if (searchInput) {
  searchInput.addEventListener("focus", () => {
    openSearchMode();
  });

  /* =============================
    2) 검색 입력 → 결과 업데이트
  ============================= */
  searchInput.addEventListener("input", () => {
    const keyword = searchInput.value.trim();
    if (keyword.length > 0) {
      renderSearchResults(keyword);
    } else {
      if (searchResults) {
        searchResults.innerHTML = "";
      }
    }
  });
}

/* =============================
  3) 외부 클릭 → 검색 닫기
============================= */
document.addEventListener("click", (e) => {
  const searchBox = document.querySelector(".search-box");
  if (!searchBox) return;

  if (searchBox.contains(e.target)) return;

  if (afterSearch && afterSearch.style.display === "block") {
    closeSearchMode();
  }
});

/* =============================
  검색 모드 ON / OFF
============================= */
function openSearchMode() {
  if (beforeSearch) beforeSearch.style.display = "none";
  if (afterSearch) afterSearch.style.display = "block";
  if (searchResults) searchResults.innerHTML = "";
}

function closeSearchMode() {
  if (beforeSearch) beforeSearch.style.display = "block";
  if (afterSearch) afterSearch.style.display = "none";
  if (searchResults) searchResults.innerHTML = "";
  if (searchInput) {
    searchInput.blur();
    searchInput.value = "";
  }
}

/* =============================
  검색 결과 렌더링
============================= */
function renderSearchResults(keyword = "") {
  if (!searchResults) return;

  if (!keyword || keyword.length === 0) {
    searchResults.innerHTML = "";
    return;
  }

  searchResults.innerHTML = "";

  // 랜덤 이미지 배열 (중복 방지)
  const randomImages = [
    "a1.webp",
    "a4.webp",
    "b2.webp",
    "c1.webp",
    "c4.webp",
    "d1.webp",
    "d3.webp",
    "e1.webp",
    "f1.webp",
    "f3.webp",
    "g1.webp",
    "h2.webp",
    "h3.webp",
    "h4.webp",
    "i2.webp",
    "i3.webp",
    "i4.webp",
    "j2.webp",
    "j3.webp",
    "j4.webp",
    "스크린샷 2025-12-09 14.55.11.webp",
    "스크린샷 2025-12-09 14.56.01.webp",
    "스크린샷 2025-12-09 14.56.37.webp",
    "스크린샷 2025-12-09 14.56.56.webp",
    "스크린샷 2025-12-09 14.57.20.webp",
    "스크린샷 2025-12-09 14.58.25.webp",
    "스크린샷 2025-12-09 14.59.09.webp",
    "스크린샷 2025-12-09 15.00.18.webp",
    "스크린샷 2025-12-09 15.00.39.webp",
    "스크린샷 2025-12-09 15.01.38.webp",
  ];

  for (let i = 0; i < 18; i++) {
    const imgIndex = i % randomImages.length;
    const imgName = randomImages[imgIndex];
    searchResults.innerHTML += `
      <div class="search-item">
        <div class="search-thumb"><img src="assets/random/${imgName}" loading="lazy" style="object-fit: cover; width: 100%; height: 100%;" alt="" /></div>
        <div class="search-title">작품 제목 ${i + 1}</div>
        <div class="search-author">작가명</div>
        <div class="search-meta">👁 NEW</div>
      </div>
    `;
  }
}

/* =============================
  슬라이더 기능
============================= */
document.addEventListener("DOMContentLoaded", () => {
  // custom cursor (layout-safe)
  if (customCursor) {
    window.addEventListener("mousemove", (e) => {
      customCursor.style.transform = `translate(${e.clientX}px, ${e.clientY}px) translate(-50%, -50%)`;
    });
  }

  const sliderItems = document.querySelectorAll(".taste-slider-item");

  sliderItems.forEach((sliderItem) => {
    const track = sliderItem.querySelector(".taste-slider-track");
    const thumb = sliderItem.querySelector(".taste-slider-thumb");
    if (!track || !thumb) return;

    let isDragging = false;
    let dragOffset = 0; // thumb 중심점과 마우스 위치의 offset
    const padding = 5; // 양 끝 여백 (px)

    // percentage에 따라 thumb 위치 설정
    function setThumbPosition(percentage) {
      const trackWidth = track.offsetWidth;
      const thumbWidth = thumb.offsetWidth;
      const minLeft = padding; // 왼쪽 여백
      const maxLeft = trackWidth - thumbWidth - padding; // 오른쪽 여백
      const left = padding + (percentage / 100) * (maxLeft - minLeft);
      thumb.style.left = `${Math.max(minLeft, Math.min(maxLeft, left))}px`;
    }

    // 마우스/터치 위치를 percentage로 변환
    function getPercentageFromEvent(e) {
      const trackRect = track.getBoundingClientRect();
      const clientX = e.touches ? e.touches[0].clientX : e.clientX;
      const thumbWidth = thumb.offsetWidth;

      // thumb 중심점이 마우스 위치를 따라가도록 계산 (여백 고려)
      let targetX = clientX - trackRect.left - dragOffset;
      const minX = padding + thumbWidth / 2; // 왼쪽 여백 + thumb 반지름
      const maxX = trackRect.width - padding - thumbWidth / 2; // 오른쪽 여백 + thumb 반지름
      targetX = Math.max(minX, Math.min(maxX, targetX));

      // 여백을 고려한 percentage 계산
      const effectiveWidth = trackRect.width - padding * 2 - thumbWidth;
      const percentage = ((targetX - padding - thumbWidth / 2) / effectiveWidth) * 100;
      return Math.max(0, Math.min(100, percentage));
    }

    // 마우스 다운
    thumb.addEventListener("mousedown", (e) => {
      e.preventDefault();
      e.stopPropagation();
      isDragging = true;

      const trackRect = track.getBoundingClientRect();
      const thumbRect = thumb.getBoundingClientRect();
      const thumbCenter = thumbRect.left + thumbRect.width / 2;
      dragOffset = e.clientX - thumbCenter;

      document.addEventListener("mousemove", handleMove);
      document.addEventListener("mouseup", handleEnd);
    });

    // 터치 시작
    thumb.addEventListener("touchstart", (e) => {
      e.preventDefault();
      e.stopPropagation();
      isDragging = true;

      const trackRect = track.getBoundingClientRect();
      const thumbRect = thumb.getBoundingClientRect();
      const thumbCenter = thumbRect.left + thumbRect.width / 2;
      dragOffset = e.touches[0].clientX - thumbCenter;

      document.addEventListener("touchmove", handleMove);
      document.addEventListener("touchend", handleEnd);
    });

    // 트랙 클릭
    track.addEventListener("click", (e) => {
      if (e.target === thumb || isDragging) return;
      const percentage = getPercentageFromEvent(e);
      setThumbPosition(percentage);
    });

    // 트랙 터치
    track.addEventListener("touchstart", (e) => {
      if (e.target === thumb || isDragging) return;
      const percentage = getPercentageFromEvent(e);
      setThumbPosition(percentage);
    });

    // 이동 처리
    function handleMove(e) {
      if (!isDragging) return;
      e.preventDefault();
      const percentage = getPercentageFromEvent(e);
      setThumbPosition(percentage);
    }

    // 종료 처리
    function handleEnd(e) {
      if (!isDragging) return;
      isDragging = false;
      dragOffset = 0;
      document.removeEventListener("mousemove", handleMove);
      document.removeEventListener("mouseup", handleEnd);
      document.removeEventListener("touchmove", handleMove);
      document.removeEventListener("touchend", handleEnd);
    }
  });
});

/* =============================
  왼쪽 이미지 카드 자동 스크롤 (무한 루프) - transform 기반
============================= */
document.addEventListener("DOMContentLoaded", () => {
  const container = document.querySelector(".taste-explore-left");
  if (!container) {
    console.log("container 없음");
    return;
  }

  const cardGroupWrapper = container.querySelector(".card-group-wrapper");
  if (!cardGroupWrapper) {
    console.log("card-group-wrapper 없음");
    return;
  }

  const track = cardGroupWrapper.querySelector(".auto-scroll-track");
  if (!track) {
    console.log("track 없음");
    return;
  }

  const cards = Array.from(track.children);
  if (cards.length === 0) {
    console.log("card 없음");
    return;
  }

  // 카드 복제
  cards.forEach((card) => {
    track.appendChild(card.cloneNode(true));
  });

  // 검은 배경 컬럼 내에서만 스크롤 (위/아래 여백 포함)
  const containerPaddingTop = 10; // CSS padding-top 값
  const containerPaddingBottom = 10; // CSS padding-bottom 값
  const containerHeight = container.clientHeight; // 검은색 컨테이너 높이 (670px)
  const visibleHeight = containerHeight - containerPaddingTop - containerPaddingBottom; // 실제 스크롤 가능한 높이 (검은 영역 내부)

  let offset = 0; // 시작 위치
  const speed = 0.6;

  // 원본 카드들의 높이 계산 (복제 전)
  const originalTrackHeight = track.scrollHeight / 2; // 원본 높이

  // 최대 스크롤 위치: 원본 높이에서 보이는 높이를 뺀 값
  // 검은색 영역을 넘어가지 않도록 제한
  const maxOffset = Math.max(0, originalTrackHeight - visibleHeight);

  console.log("containerHeight:", containerHeight);
  console.log("visibleHeight:", visibleHeight);
  console.log("originalTrackHeight:", originalTrackHeight);
  console.log("maxOffset:", maxOffset);

  // 스크롤이 필요 없는 경우 (콘텐츠가 컨테이너보다 작은 경우)
  if (maxOffset <= 0) {
    console.log("스크롤 불필요: 콘텐츠가 컨테이너보다 작습니다");
    return;
  }

  function loop() {
    offset += speed;

    // 최대 위치에 도달하면 처음으로 리셋 (무한 루프)
    if (offset >= maxOffset) {
      offset = 0;
    }

    // 위쪽 여백을 고려한 transform
    // 검은색 컨테이너 내에서만 보이도록 제한
    const transformY = offset + containerPaddingTop;
    track.style.transform = `translateY(-${transformY}px)`;

    requestAnimationFrame(loop);
  }

  loop();
});
