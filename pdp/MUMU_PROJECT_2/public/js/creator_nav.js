// 공통 Creator 네비게이션: 페이지 이동 전용
// data-route 속성을 읽어 해당 HTML로 이동한다.

document.addEventListener("click", (e) => {
  const navItem = e.target.closest(".nav-item");
  if (!navItem) return;

  const route = navItem.dataset.route;
  if (!route) return;

  window.location.href = route;
});

window.__CREATOR_NAV_LOADED__ = true;
