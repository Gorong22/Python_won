// moodboard_intro.js
// 무드보드 안내 팝업 로직

(function () {
  "use strict";

  // localStorage 키
  const STORAGE_KEY_ONBOARDING = "onboardingCompleted";
  const STORAGE_KEY_INTRO_SHOWN = "moodboardIntroShown";

  // DOM 요소
  let overlay = null;
  let skipBtn = null;
  let confirmBtn = null;

  /**
   * 팝업 표시 여부 확인
   * @returns {boolean} 표시해야 하면 true
   */
  function shouldShowIntro() {
    const onboardingCompleted =
      localStorage.getItem(STORAGE_KEY_ONBOARDING) === "true";
    const introShown = localStorage.getItem(STORAGE_KEY_INTRO_SHOWN) === "true";

    return onboardingCompleted && !introShown;
  }

  /**
   * 팝업 표시
   */
  function showIntro() {
    if (!overlay) return;

    // CSS 로드 확인
    const styleSheet = document.querySelector(
      'link[href="/css/moodboard_intro.css"]'
    );
    if (!styleSheet) {
      console.warn("moodboard_intro.css가 로드되지 않았습니다.");
    }

    // HTML 로드 확인
    const introRoot = document.getElementById("moodboard-intro-root");
    if (!introRoot || !introRoot.innerHTML.trim()) {
      console.warn("moodboard_intro.html이 로드되지 않았습니다.");
      return;
    }

    // 팝업 표시
    overlay.classList.add("show");
    document.body.style.overflow = "hidden"; // 스크롤 방지

    // 접근성: 첫 번째 버튼에 포커스
    if (skipBtn) {
      skipBtn.focus();
    }
  }

  /**
   * 팝업 닫기
   */
  function closeIntro() {
    if (!overlay) return;

    overlay.classList.remove("show");
    document.body.style.overflow = ""; // 스크롤 복원

    // localStorage에 표시 완료 기록
    localStorage.setItem(STORAGE_KEY_INTRO_SHOWN, "true");
  }

  /**
   * "아니요" 버튼 클릭 핸들러
   */
  function handleSkip() {
    closeIntro();
    // 홈 피드 그대로 유지 (아무 동작 없음)
  }

  /**
   * "네!" 버튼 클릭 핸들러
   */
  function handleConfirm() {
    closeIntro();
    // 무드보드 페이지로 이동
    window.location.href = "/moodboard.html";
  }

  /**
   * 오버레이 클릭 핸들러 (배경 클릭 시 닫기 방지)
   */
  function handleOverlayClick(e) {
    // 모달 자체를 클릭한 경우는 무시
    if (e.target === overlay) {
      // 배경 클릭 시에도 닫지 않음 (명시적 버튼 클릭만 허용)
      // e.stopPropagation();
    }
  }

  /**
   * 초기화
   */
  function init() {
    // 팝업 표시 조건 확인
    if (!shouldShowIntro()) {
      return;
    }

    // HTML 로드
    loadIntroHTML()
      .then(() => {
        // DOM 요소 참조
        overlay = document.getElementById("moodboardIntroOverlay");
        skipBtn = document.getElementById("moodboardIntroSkipBtn");
        confirmBtn = document.getElementById("moodboardIntroConfirmBtn");

        if (!overlay || !skipBtn || !confirmBtn) {
          console.error("필수 DOM 요소를 찾을 수 없습니다.");
          return;
        }

        // 이벤트 리스너 등록
        skipBtn.addEventListener("click", handleSkip);
        confirmBtn.addEventListener("click", handleConfirm);
        overlay.addEventListener("click", handleOverlayClick);

        // ESC 키로 닫기 (선택사항, 요구사항에 없지만 UX 개선)
        document.addEventListener("keydown", function (e) {
          if (e.key === "Escape" && overlay?.classList.contains("show")) {
            handleSkip(); // ESC는 "아니요"와 동일하게 처리
          }
        });

        // 팝업 표시
        // 약간의 지연을 두어 페이지 로드 후 표시 (UX 개선)
        setTimeout(() => {
          showIntro();
        }, 300);
      })
      .catch((error) => {
        console.error("무드보드 안내 팝업 로드 실패:", error);
      });
  }

  /**
   * HTML 컴포넌트 로드
   */
  function loadIntroHTML() {
    return fetch("/components/moodboard_intro.html")
      .then((response) => {
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.text();
      })
      .then((html) => {
        const root = document.getElementById("moodboard-intro-root");
        if (root) {
          root.innerHTML = html;
        } else {
          throw new Error("moodboard-intro-root 요소를 찾을 수 없습니다.");
        }
      });
  }

  // DOMContentLoaded 또는 이미 로드된 경우 즉시 실행
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    // 이미 로드된 경우
    init();
  }
})();
