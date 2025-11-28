/* ============================================================
   0. HERO 패널 등장 애니메이션 (순차 등장)
============================================================ */
document.addEventListener("DOMContentLoaded", () => {
  const panels = document.querySelectorAll(".panel");
  panels.forEach((p, i) => {
    p.style.animationDelay = `${0.25 + i * 0.18}s`;
    p.classList.add("panel-show");
  });
});

/* ============================================================
     1. Scroll Down Button
  ============================================================ */
document.addEventListener("DOMContentLoaded", () => {
  const scrollBtn = document.querySelector(".scroll-down");
  if (!scrollBtn) return;

  scrollBtn.addEventListener("click", () => {
    window.scrollTo({
      top: window.innerHeight * 0.9,
      behavior: "smooth",
    });
  });
});

/* ============================================================
     2. 스크롤 Section Fade Up
  ============================================================ */
const sectionObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("fade-up-show");
        sectionObserver.unobserve(entry.target);
      }
    });
  },
  {
    threshold: 0.2,
  }
);

// fade-up 요소 모두 관찰
document.querySelectorAll(".fade-up").forEach((el) => {
  sectionObserver.observe(el);
});

/* ============================================================
     3. SNS FEED 카드 순차 등장 (옵션)
  ============================================================ */
const feedCards = document.querySelectorAll(".feed-card");

if (feedCards.length > 0) {
  const feedObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          feedCards.forEach((card, i) => {
            card.style.animationDelay = `${i * 0.12}s`;
            card.classList.add("feed-card-show");
          });
          feedObserver.disconnect();
        }
      });
    },
    { threshold: 0.2 }
  );

  feedObserver.observe(feedCards[0]);
}

/* ============================================================
     4. iOS Safari smooth scroll fix
  ============================================================ */
document.documentElement.style.scrollBehavior = "smooth";
