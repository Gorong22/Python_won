/**
 * Image Lazy Loader
 * ⚠️ 모바일 크래시 방지: 즉시 전역 노출 + 안전 가드 강화
 */

// ⚠️ 모바일 크래시 방지: 즉시 더미 객체 생성
(function () {
  "use strict";

  let observer = null;

  const imageLazyLoader = {
    init: function () {
      try {
        // 모바일 안전 가드: IntersectionObserver 지원 체크
        if (typeof IntersectionObserver === "undefined") {
          return;
        }

        observer = new IntersectionObserver(
          function (entries) {
            // 모바일 안전 가드: entries가 배열이 아니면 무시
            if (!entries || typeof entries.forEach !== "function") {
              return;
            }

            entries.forEach(function (entry) {
              try {
                if (entry && entry.isIntersecting && entry.target) {
                  const img = entry.target;
                  if (img && img.dataset && img.dataset.src) {
                    // 모바일 안전 가드: 이미지 로드 실패 시 무시
                    const originalSrc = img.dataset.src;
                    img.onerror = function () {
                      // 모바일: 에러 발생 시 src 제거하여 재시도 방지
                      try {
                        this.src = "";
                        this.onerror = null;
                        this.onload = null;
                        if (observer && img) {
                          try {
                            observer.unobserve(img);
                          } catch (e) {
                            // 무시
                          }
                        }
                      } catch (e) {
                        // 무시
                      }
                    };
                    img.src = originalSrc;
                    img.removeAttribute("data-src");
                    if (observer && img) {
                      try {
                        observer.unobserve(img);
                      } catch (e) {
                        // 무시
                      }
                    }
                  }
                }
              } catch (error) {
                // 모바일: 개별 entry 처리 실패가 전체를 중단시키지 않게
              }
            });
          },
          {
            rootMargin: "50px",
          }
        );
      } catch (error) {
        // 모바일: init 실패해도 크래시 방지
      }
    },

    observe: function (elements) {
      try {
        if (!observer) {
          return; // 모바일: 경고만 출력하고 계속 진행
        }

        if (!elements) {
          return;
        }

        const elementArray =
          Array.isArray(elements) ||
          (elements && typeof elements.forEach === "function")
            ? Array.from(elements)
            : [elements];

        elementArray.forEach(function (element) {
          try {
            if (element && element.nodeType === 1 && observer) {
              observer.observe(element);
            }
          } catch (error) {
            // 모바일: 개별 요소 관찰 실패가 전체를 중단시키지 않게
          }
        });
      } catch (error) {
        // 무시
      }
    },

    unobserve: function (element) {
      try {
        if (observer && element) {
          observer.unobserve(element);
        }
      } catch (error) {
        // 모바일: unobserve 실패해도 무시
      }
    },
  };

  // ⚠️ 모바일 크래시 방지: 즉시 전역 노출
  if (typeof window !== "undefined") {
    window.imageLazyLoader = imageLazyLoader;
  }
  if (typeof globalThis !== "undefined") {
    globalThis.imageLazyLoader = imageLazyLoader;
  }
})();
