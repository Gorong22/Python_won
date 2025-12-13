/**
 * AppInitializer - 앱 초기화 관리자
 * ⚠️ 모바일 크래시 방지: 즉시 전역 노출 + 안전 가드 강화
 */

// ⚠️ 모바일 크래시 방지: 즉시 더미 객체 생성 (스크립트 로딩 순서 무관)
(function () {
  "use strict";

  const callbacks = [];
  let isReady = false;
  let isExecuting = false;

  const appInit = {
    register: function (callback) {
      // 모바일 안전 가드: callback이 함수가 아니면 무시
      if (typeof callback !== "function") {
        return;
      }

      // 모바일 안전 가드: try-catch로 감싸서 에러가 전파되지 않게
      try {
        if (isReady && !isExecuting) {
          // 이미 DOM이 준비된 경우 즉시 실행
          try {
            callback();
          } catch (error) {
            // 모바일: 에러를 잡아서 로그만 남기고 계속 진행
          }
        } else {
          // 아직 준비되지 않은 경우 큐에 추가
          callbacks.push(callback);
        }
      } catch (error) {
        // 모바일: register 자체가 실패해도 크래시 방지
      }
    },

    execute: function () {
      if (isReady || isExecuting) return;

      isExecuting = true;
      isReady = true;

      // 모바일 안전 가드: 각 콜백을 독립적으로 실행 (하나 실패해도 나머지 계속)
      callbacks.forEach((callback) => {
        try {
          callback();
        } catch (error) {
          // 모바일: 개별 콜백 실패가 전체를 중단시키지 않게
        }
      });

      callbacks.length = 0;
      isExecuting = false;
    },
  };

  // ⚠️ 모바일 크래시 방지: 즉시 전역 노출 (다른 스크립트가 참조 가능하도록)
  if (typeof window !== "undefined") {
    window.appInit = appInit;
  }
  if (typeof globalThis !== "undefined") {
    globalThis.appInit = appInit;
  }

  // DOM이 준비되면 모든 콜백 실행
  if (typeof document !== "undefined") {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", function () {
        try {
          appInit.execute();
        } catch (error) {
          // 무시
        }
      });
    } else {
      // DOM이 이미 로드됨 - 모바일에서도 안전하게 실행
      setTimeout(function () {
        try {
          appInit.execute();
        } catch (error) {
          // 무시
        }
      }, 0);
    }
  }

  // lazyLoader 초기화 (lazyLoader.js가 로드된 경우)
  function initLazyLoader() {
    try {
      if (typeof window !== "undefined" && typeof window.imageLazyLoader !== "undefined" && typeof window.imageLazyLoader.init === "function") {
        window.imageLazyLoader.init();
      }
    } catch (error) {
      // 무시
    }
  }

  // 즉시 시도 + DOMContentLoaded 후 재시도 (모바일 안전)
  initLazyLoader();
  if (typeof document !== "undefined") {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", initLazyLoader);
    } else {
      setTimeout(initLazyLoader, 0);
    }
  }
})();
