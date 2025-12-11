/* =============================
  ELEMENTS
============================= */
const searchInput = document.getElementById("searchInput");
const beforeSearch = document.getElementById("beforeSearch");
const afterSearch = document.getElementById("afterSearch");
const searchResults = document.getElementById("searchResults");

/* =============================
  1) 검색창 포커스 → 검색 화면 켜기
============================= */
searchInput.addEventListener("focus", () => {
  openSearchMode();
});

/* =============================
  2) 검색 입력 → 결과 업데이트
============================= */
searchInput.addEventListener("input", () => {
  const keyword = searchInput.value.trim();
  renderSearchResults(keyword); // 입력 여부와 상관없이 계속 렌더
});

/* =============================
  3) 외부 클릭 → 입력 없으면 검색 닫기
============================= */
document.addEventListener("click", (e) => {
  if (e.target === searchInput) return;

  const keyword = searchInput.value.trim();

  if (afterSearch.style.display === "block" && keyword.length === 0) {
    closeSearchMode();
  }
});

/* =============================
  검색 모드 ON / OFF
============================= */
function openSearchMode() {
  beforeSearch.style.display = "none";
  afterSearch.style.display = "block";

  // 🔥 입력 없어도 기본 카드 바로 보여야 함
  renderSearchResults();
}

function closeSearchMode() {
  beforeSearch.style.display = "block";
  afterSearch.style.display = "none";
  searchResults.innerHTML = "";
}

/* =============================
  검색 결과 렌더링
============================= */
function renderSearchResults(keyword = "") {
  searchResults.innerHTML = "";

  for (let i = 0; i < 18; i++) {
    searchResults.innerHTML += `
      <div class="search-item">
        <div class="search-thumb"></div>
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
  const sliderItems = document.querySelectorAll(".taste-slider-item");

  sliderItems.forEach((sliderItem) => {
    const track = sliderItem.querySelector(".taste-slider-track");
    const thumb = sliderItem.querySelector(".taste-slider-thumb");
    if (!track || !thumb) return;

    let isDragging = false;
    const padding = 6; // 좌우 여백 (px)

    // thumb의 현재 위치를 percentage로 계산
    function getCurrentPercentage() {
      const trackRect = track.getBoundingClientRect();
      const thumbRect = thumb.getBoundingClientRect();
      const thumbCenter = thumbRect.left + thumbRect.width / 2;
      const effectiveWidth = trackRect.width - (padding * 2);
      const percentage = ((thumbCenter - trackRect.left - padding) / effectiveWidth) * 100;
      return Math.max(0, Math.min(100, percentage));
    }

    // percentage에 따라 thumb 위치 설정
    function setThumbPosition(percentage) {
      const trackWidth = track.offsetWidth;
      const thumbWidth = thumb.offsetWidth;
      const effectiveWidth = trackWidth - (padding * 2);
      const minLeft = padding;
      const maxLeft = trackWidth - thumbWidth - padding;
      const left = padding + (percentage / 100) * (maxLeft - minLeft);
      thumb.style.left = `${Math.max(minLeft, Math.min(maxLeft, left))}px`;
    }

    // 클릭/터치 위치를 percentage로 변환
    function getPercentageFromEvent(e) {
      const trackRect = track.getBoundingClientRect();
      const clientX = e.touches ? e.touches[0].clientX : e.clientX;
      const effectiveWidth = trackRect.width - (padding * 2);
      const relativeX = clientX - trackRect.left - padding;
      const percentage = (relativeX / effectiveWidth) * 100;
      return Math.max(0, Math.min(100, percentage));
    }

    // 마우스 다운
    thumb.addEventListener("mousedown", (e) => {
      e.preventDefault();
      isDragging = true;
      document.addEventListener("mousemove", handleMove);
      document.addEventListener("mouseup", handleEnd);
    });

    // 터치 시작
    thumb.addEventListener("touchstart", (e) => {
      e.preventDefault();
      isDragging = true;
      document.addEventListener("touchmove", handleMove);
      document.addEventListener("touchend", handleEnd);
    });

    // 트랙 클릭
    track.addEventListener("click", (e) => {
      if (e.target === thumb) return;
      const percentage = getPercentageFromEvent(e);
      setThumbPosition(percentage);
    });

    // 트랙 터치
    track.addEventListener("touchstart", (e) => {
      if (e.target === thumb) return;
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
      document.removeEventListener("mousemove", handleMove);
      document.removeEventListener("mouseup", handleEnd);
      document.removeEventListener("touchmove", handleMove);
      document.removeEventListener("touchend", handleEnd);
    }
  });
});
