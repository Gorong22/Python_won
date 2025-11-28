/* Scroll-down button */
document.addEventListener("DOMContentLoaded", () => {
  const scrollBtn = document.querySelector(".scroll-down");
  scrollBtn?.addEventListener("click", () => {
    window.scrollTo({
      top: window.innerHeight * 0.92,
      behavior: "smooth",
    });
  });
});

/* Panel fade-in + scale-in */
const observer = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("show");
      }
    });
  },
  { threshold: 0.15 }
);

document.querySelectorAll(".panel, .quote-card").forEach((el) => {
  observer.observe(el);
});
const observerScene = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) entry.target.classList.add("show");
    });
  },
  { threshold: 0.15 }
);

document.querySelectorAll(".scene").forEach((el) => {
  observerScene.observe(el);
});
