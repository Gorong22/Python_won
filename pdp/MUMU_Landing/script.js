// 부드러운 스크롤
document.addEventListener("DOMContentLoaded", () => {
  const scrollBtn = document.querySelector(".scroll-down");
  if (!scrollBtn) return;

  scrollBtn.addEventListener("click", () => {
    window.scrollTo({
      top: window.innerHeight * 0.95,
      behavior: "smooth",
    });
  });
});
