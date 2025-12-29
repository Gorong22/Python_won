/**
 * MUMU – MOBILE VIEWPORT HEIGHT SYNC (iOS-SAFE)
 */
(function () {
  // creator_studio 제외
  if (
    document.body.classList.contains("creator-studio") ||
    window.location.pathname.includes("creator_studio")
  ) {
    return;
  }

  const syncAppHeight = () => {
    // iOS Safari의 주소창 포함/미포함 문제를 해결하기 위해 innerHeight 사용
    const vh = window.innerHeight;
    document.documentElement.style.setProperty("--app-height", `${vh}px`);
  };

  // 초기 실행 및 리사이즈 시 실행
  window.addEventListener("resize", syncAppHeight);
  window.addEventListener("orientationchange", syncAppHeight);
  syncAppHeight();

  // iOS Safari 스크롤 바운스 방지 (중요: #app-content만 스크롤 허용)
  document.addEventListener(
    "touchmove",
    function (e) {
      if (!e.target.closest("#app-content")) {
        e.preventDefault();
      }
    },
    { passive: false }
  );
})();
