// welcome_modal.js
// "가입을 환영합니다" 온보딩 환영 모달 로직

(function () {
  "use strict";

  // localStorage 키
  const STORAGE_KEY_ONBOARDING = "mumu_onboarding_completed";
  const STORAGE_KEY_MODAL_SHOWN = "mumu_welcome_modal_shown";

  // DOM 요소
  let overlay = null;
  let closeBtn = null;

  /**
   * Firebase Auth 현재 사용자 확인 (Firebase v9 스타일)
   * @returns {Promise<boolean>} 로그인된 사용자가 있으면 true
   */
  async function checkFirebaseAuth() {
    try {
      // Firebase v9 모듈 import 시도
      let auth;
      try {
        const { auth: authModule } = await import("./firebase_init.js");
        auth = authModule;
      } catch (importError) {
        console.log("[환영팝업] Firebase 모듈 로드 실패:", importError);
        // localStorage로 대체 체크
        const loggedIn = localStorage.getItem("mumu_logged_in") === "true";
        console.log("[환영팝업] localStorage 체크:", loggedIn);
        return loggedIn;
      }

      if (!auth) {
        console.log("[환영팝업] Firebase Auth가 로드되지 않았습니다.");
        // localStorage로 대체 체크
        const loggedIn = localStorage.getItem("mumu_logged_in") === "true";
        return loggedIn;
      }

      // Firebase v9 스타일로 현재 사용자 확인
      const { onAuthStateChanged } = await import(
        "https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js"
      );

      return new Promise((resolve) => {
        const unsubscribe = onAuthStateChanged(auth, (user) => {
          unsubscribe(); // 한 번만 체크하고 구독 해제
          const authenticated = user !== null;
          console.log(
            "[환영팝업] Firebase Auth 상태:",
            authenticated ? "인증됨" : "미인증"
          );
          resolve(authenticated);
        });

        // 2초 후 타임아웃
        setTimeout(() => {
          unsubscribe();
          console.log("[환영팝업] Firebase Auth 상태 변화 대기 타임아웃");
          // 타임아웃 시 localStorage로 대체 체크
          const loggedIn = localStorage.getItem("mumu_logged_in") === "true";
          resolve(loggedIn);
        }, 2000);
      });
    } catch (error) {
      console.error("[환영팝업] Firebase Auth 확인 중 오류:", error);
      // 에러 발생 시 localStorage로 대체 체크
      const loggedIn = localStorage.getItem("mumu_logged_in") === "true";
      return loggedIn;
    }
  }

  /**
   * 모달 표시 여부 확인
   * @returns {Promise<boolean>} 표시해야 하면 true
   */
  async function shouldShowModal() {
    console.log("[환영팝업] 모달 표시 조건 체크 시작");

    // 1) Firebase Auth 기준 회원가입이 완료된 사용자
    const isAuthenticated = await checkFirebaseAuth();
    console.log("[환영팝업] 조건 1 - Firebase Auth:", isAuthenticated);
    if (!isAuthenticated) {
      console.log("[환영팝업] ❌ 조건 불만족: Firebase Auth 미인증");
      return false;
    }

    // 2) 온보딩 설문/선택을 모두 제출한 직후
    const onboardingCompleted =
      localStorage.getItem(STORAGE_KEY_ONBOARDING) === "true";
    console.log("[환영팝업] 조건 2 - 온보딩 완료:", onboardingCompleted);
    console.log(
      "[환영팝업] localStorage 값:",
      localStorage.getItem(STORAGE_KEY_ONBOARDING)
    );
    if (!onboardingCompleted) {
      console.log("[환영팝업] ❌ 조건 불만족: 온보딩 미완료");
      return false;
    }

    // 3) 해당 유저가 아직 환영 모달을 본 적이 없을 때만
    const modalShown = localStorage.getItem(STORAGE_KEY_MODAL_SHOWN) === "true";
    console.log("[환영팝업] 조건 3 - 모달 미노출:", !modalShown);
    if (modalShown) {
      console.log("[환영팝업] ❌ 조건 불만족: 이미 모달 노출됨");
      return false;
    }

    console.log("[환영팝업] ✅ 모든 조건 만족 - 모달 표시 가능");
    return true;
  }

  /**
   * 모달 표시
   */
  function showModal() {
    if (!overlay) {
      console.error("[환영팝업] ❌ overlay 요소를 찾을 수 없습니다.");
      return;
    }

    console.log("[환영팝업] ✅ 모달 표시 실행");
    overlay.style.display = "flex";
    document.body.style.overflow = "hidden"; // 스크롤 방지

    // 접근성: 버튼에 포커스
    if (closeBtn) {
      closeBtn.focus();
    }

    // 모달 표시 직후 즉시 flag 저장
    localStorage.setItem(STORAGE_KEY_MODAL_SHOWN, "true");
    console.log("[환영팝업] ✅ mumu_welcome_modal_shown = true 저장 완료");
  }

  /**
   * 모달 닫기
   */
  function closeModal() {
    if (!overlay) return;

    console.log("[환영팝업] 모달 닫기");
    overlay.style.display = "none";
    document.body.style.overflow = ""; // 스크롤 복원

    // 모달이 1회 노출되면 즉시 flag를 영구적으로 저장 (이미 showModal에서 저장됨)
    // 중복 저장 방지를 위해 여기서는 저장하지 않음
  }

  /**
   * "확인" 버튼 클릭 핸들러
   */
  function handleClose() {
    closeModal();
  }

  /**
   * 오버레이 클릭 핸들러 (배경 클릭 시 닫기 방지)
   */
  function handleOverlayClick(e) {
    // 모달 자체를 클릭한 경우는 무시 (명시적 버튼 클릭만 허용)
    if (e.target === overlay) {
      // 배경 클릭 시에도 닫지 않음
    }
  }

  /**
   * 초기화
   */
  async function init() {
    console.log("[환영팝업] 초기화 시작");
    console.log("[환영팝업] DOM 상태:", document.readyState);

    // DOM 요소 참조
    overlay = document.getElementById("welcome-modal-overlay");
    closeBtn = document.getElementById("welcome-modal-close-btn");

    if (!overlay || !closeBtn) {
      console.error("[환영팝업] ❌ DOM 요소를 찾을 수 없습니다.");
      console.error("[환영팝업] overlay:", overlay);
      console.error("[환영팝업] closeBtn:", closeBtn);
      return;
    }

    console.log("[환영팝업] ✅ DOM 요소 찾기 성공");

    // 모달 표시 조건 확인
    const shouldShow = await shouldShowModal();
    if (!shouldShow) {
      console.log("[환영팝업] 모달 표시 조건 불만족 - 초기화 종료");
      return;
    }

    // 이벤트 리스너 등록
    closeBtn.addEventListener("click", handleClose);
    overlay.addEventListener("click", handleOverlayClick);

    // ESC 키로 닫기 (선택사항, UX 개선)
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && overlay && overlay.style.display !== "none") {
        handleClose();
      }
    });

    // 모달 표시 비활성화 (맨 앞에 뜨는 모달 방지)
    // setTimeout(() => {
    //   showModal();
    // }, 300);
  }

  // DOMContentLoaded 또는 이미 로드된 경우 즉시 실행
  // Firebase Auth가 로드될 때까지 대기 (Firebase v9)
  async function waitForFirebase() {
    console.log("[환영팝업] Firebase 로드 대기 중...");

    try {
      // Firebase v9 모듈 import 시도
      await import("./firebase_init.js");
      console.log("[환영팝업] ✅ Firebase 로드 완료");

      // Firebase가 로드되었으면 초기화
      if (document.readyState === "loading") {
        console.log("[환영팝업] DOM 로딩 중 - DOMContentLoaded 대기");
        document.addEventListener("DOMContentLoaded", init);
      } else {
        console.log("[환영팝업] DOM 로드 완료 - 즉시 초기화");
        init();
      }
    } catch (error) {
      console.warn(
        "[환영팝업] ⚠️ Firebase 로드 실패 - localStorage로 진행:",
        error
      );
      // Firebase가 없어도 온보딩 완료 플래그만 있으면 진행
      if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", init);
      } else {
        init();
      }
    }
  }

  // 페이지 로드 시 즉시 시작
  console.log("[환영팝업] 스크립트 로드 완료");
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => {
      console.log("[환영팝업] DOMContentLoaded 이벤트 발생");
      waitForFirebase();
    });
  } else {
    console.log("[환영팝업] DOM 이미 로드됨 - 즉시 시작");
    waitForFirebase();
  }
})();
