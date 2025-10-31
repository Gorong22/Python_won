(function () {
  const loader = document.getElementById("app-loader");
  window.addEventListener("load", () =>
    setTimeout(() => loader && loader.classList.remove("active"), 150)
  );
  window.fireEvent = (n, p = {}) => {
    try {
      gtag("event", n, p);
    } catch (e) {}
  };
  const LS_USER = "ik_user",
    LS_CART = "ik_cart",
    LS_REV = "ik_reviews";
  window.Auth = {
    current() {
      try {
        return JSON.parse(localStorage.getItem(LS_USER) || "null");
      } catch (e) {
        return null;
      }
    },
    login(e, n) {
      const u = { email: e, name: n };
      localStorage.setItem(LS_USER, JSON.stringify(u));
      return u;
    },
    logout() {
      localStorage.removeItem(LS_USER);
    },
  };
  window.Cart = {
    list() {
      try {
        return JSON.parse(localStorage.getItem(LS_CART) || "[]");
      } catch (e) {
        return [];
      }
    },
    save(x) {
      localStorage.setItem(LS_CART, JSON.stringify(x));
    },
    add(it) {
      const a = Cart.list();
      a.push({ ...it, id: Date.now() });
      Cart.save(a);
      toast("장바구니에 담겼습니다");
    },
  };
  window.Reviews = {
    key: LS_REV,
    list(plate) {
      try {
        return JSON.parse(localStorage.getItem(LS_REV) || "{}")[plate] || [];
      } catch (e) {
        return [];
      }
    },
    add(plate, rev) {
      const all = JSON.parse(localStorage.getItem(LS_REV) || "{}");
      all[plate] = all[plate] || [];
      all[plate].push(rev);
      localStorage.setItem(LS_REV, JSON.stringify(all));
    },
  };
  window.toast = (msg) => {
    let t = document.querySelector(".toast");
    if (!t) {
      t = document.createElement("div");
      t.className = "toast";
      document.body.appendChild(t);
    }
    t.textContent = msg;
    t.classList.add("show");
    setTimeout(() => t.classList.remove("show"), 1400);
  };
  window.initSlider = (sel) => {
    const el = document.querySelector(sel);
    if (!el) return;
    const track = el.querySelector(".slides"),
      slides = [...el.querySelectorAll(".slide")],
      dots = [...el.querySelectorAll(".dot")];
    let i = 0;
    const go = (n) => {
      i = (n + slides.length) % slides.length;
      track.style.transform = `translateX(-${i * 100}%)`;
      dots.forEach((d, k) => d.classList.toggle("active", k === i));
    };
    el.querySelector("[data-prev]")?.addEventListener("click", () => go(i - 1));
    el.querySelector("[data-next]")?.addEventListener("click", () => go(i + 1));
    dots.forEach((d, k) => d.addEventListener("click", () => go(k)));
    setInterval(() => go(i + 1), 4800);
    go(0);
  };

  window.sharePage = async (title = document.title, url = location.href) => {
    try {
      if (navigator.share) {
        await navigator.share({ title, url });
        toast("공유했어요");
      } else {
        await navigator.clipboard.writeText(url);
        toast("링크가 복사되었습니다");
      }
    } catch (e) {
      /* cancelled */
    }
  };
})();

// 🔹 슬라이더 (자동 전환 + 드래그/스와이프 지원)
function initSlider(selector) {
  const slider = document.querySelector(selector);
  if (!slider) return;

  const slides = slider.querySelector(".slides");
  const slideItems = slides.querySelectorAll(".slide");
  const total = slideItems.length;

  let index = 0;
  let startX = 0;
  let currentX = 0;
  let isDragging = false;
  let autoTimer;

  // 이동 함수
  function goToSlide(i) {
    index = (i + total) % total;
    slides.style.transform = `translateX(-${index * 100}%)`;
  }

  // 자동 슬라이드
  function startAuto() {
    autoTimer = setInterval(() => goToSlide(index + 1), 4000);
  }
  function stopAuto() {
    clearInterval(autoTimer);
  }

  // 터치/드래그 이벤트
  slider.addEventListener("touchstart", startDrag, { passive: true });
  slider.addEventListener("mousedown", startDrag);
  slider.addEventListener("touchmove", drag, { passive: true });
  slider.addEventListener("mousemove", drag);
  slider.addEventListener("touchend", endDrag);
  slider.addEventListener("mouseup", endDrag);
  slider.addEventListener("mouseleave", endDrag);

  function startDrag(e) {
    stopAuto();
    isDragging = true;
    startX = e.touches ? e.touches[0].clientX : e.clientX;
  }

  function drag(e) {
    if (!isDragging) return;
    currentX = e.touches ? e.touches[0].clientX : e.clientX;
    const diff = currentX - startX;
    slides.style.transform = `translateX(calc(-${index * 100}% + ${diff}px))`;
  }

  function endDrag(e) {
    if (!isDragging) return;
    isDragging = false;
    const diff = currentX - startX;
    if (diff > 50) goToSlide(index - 1);
    else if (diff < -50) goToSlide(index + 1);
    else goToSlide(index);
    startAuto();
  }

  // 초기 시작
  goToSlide(0);
  startAuto();
}
/****************************************************
 * ✅ 로그인 상태 감지 및 버튼 토글 (모든 HTML 공통)
 ****************************************************/
document.addEventListener("DOMContentLoaded", () => {
  const loginBtn = document.getElementById("login-btn");
  const logoutBtn = document.getElementById("logout-btn");

  // 로그인 상태 확인 (localStorage)
  const userData = JSON.parse(localStorage.getItem("signupData") || "null");

  if (userData && userData.email) {
    // 로그인 상태 → 로그아웃 버튼 표시
    if (loginBtn) loginBtn.style.display = "none";
    if (logoutBtn) logoutBtn.style.display = "inline-block";
  } else {
    // 로그아웃 상태 → 로그인 버튼 표시
    if (loginBtn) loginBtn.style.display = "inline-block";
    if (logoutBtn) logoutBtn.style.display = "none";
  }

  // 로그아웃 클릭 시
  if (logoutBtn) {
    logoutBtn.addEventListener("click", () => {
      localStorage.removeItem("signupData");
      alert("로그아웃 되었습니다.");
      location.reload();
    });
  }
});
// scripts/common.js
document.addEventListener("DOMContentLoaded", () => {
  const user = JSON.parse(localStorage.getItem("user"));

  const nav = document.querySelector(".nav");
  const loginLink = nav?.querySelector('a[href="./login.html"]');
  const signupLink = nav?.querySelector('a[href="./signup.html"]');

  // 이미 로그인한 경우
  if (user && user.email) {
    // 기존 로그인/회원가입 링크 제거
    if (loginLink) loginLink.remove();
    if (signupLink) signupLink.remove();

    // 마이페이지 & 로그아웃 버튼 추가
    const myLink = document.createElement("a");
    myLink.href = "./mypage.html";
    myLink.textContent = "마이페이지";

    const logoutLink = document.createElement("a");
    logoutLink.href = "#";
    logoutLink.textContent = "로그아웃";
    logoutLink.addEventListener("click", () => {
      localStorage.removeItem("user");
      alert("로그아웃 되었습니다.");
      location.reload();
    });

    nav.appendChild(myLink);
    nav.appendChild(logoutLink);
  } else {
    // 로그인 안 한 경우 → “회원가입 / 로그인” 유지
    if (!loginLink && !signupLink) {
      const signup = document.createElement("a");
      signup.href = "./signup.html";
      signup.textContent = "회원가입";

      const login = document.createElement("a");
      login.href = "./login.html";
      login.textContent = "로그인";

      nav.innerHTML = "";
      nav.appendChild(signup);
      nav.appendChild(login);
    }
  }
});
