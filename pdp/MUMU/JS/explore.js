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
