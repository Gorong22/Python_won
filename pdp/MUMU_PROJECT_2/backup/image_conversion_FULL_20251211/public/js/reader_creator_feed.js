// 탭 전환
document.addEventListener("DOMContentLoaded", () => {
  const tabs = document.querySelectorAll(".creator-tab");
  const panels = document.querySelectorAll(".creator-tab-panel");
  const underline = document.querySelector(
    ".creator-tab-underline .underline-bar"
  );

  tabs.forEach((tab, index) => {
    tab.addEventListener("click", () => {
      // 탭 active
      tabs.forEach((t) => t.classList.remove("active"));
      tab.classList.add("active");

      // 패널 전환
      const targetId = "tab-" + tab.dataset.tab;
      panels.forEach((p) => {
        p.classList.remove("active");
        if (p.id === targetId) p.classList.add("active");
      });

      // 밑줄 이동 (0% 또는 100%)
      const moveX = index * 100;
      underline.style.transform = `translateX(${moveX}%)`;
    });
  });
});
