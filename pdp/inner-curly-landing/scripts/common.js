(function () {
  const loader = document.getElementById("app-loader");
  window.addEventListener("load", () =>
    setTimeout(() => loader && loader.classList.remove("active"), 150)
  );

  // ✅ GA4 event wrapper
  window.fireEvent = (n, p = {}) => {
    try {
      gtag("event", n, p);
    } catch (e) {}
  };

  // ✅ LocalStorage Keys
  const LS_USER = "user";
  const LS_CART = "ik_cart";
  const LS_REV = "ik_reviews";

  // ✅ Auth Utility
  window.Auth = {
    current() {
      try {
        return JSON.parse(localStorage.getItem(LS_USER) || "null");
      } catch {
        return null;
      }
    },
    login(email, name) {
      const u = { email, name };
      localStorage.setItem(LS_USER, JSON.stringify(u));
      return u;
    },
    logout() {
      localStorage.removeItem(LS_USER);
    },
  };

  // ✅ Cart Utility
  window.Cart = {
    list() {
      try {
        return JSON.parse(localStorage.getItem(LS_CART) || "[]");
      } catch {
        return [];
      }
    },
    save(items) {
      localStorage.setItem(LS_CART, JSON.stringify(items));
    },
    add(item) {
      const a = Cart.list();
      a.push({ ...item, id: Date.now() });
      Cart.save(a);
      toast("장바구니에 담겼습니다");
    },
  };

  // ✅ Reviews Utility
  window.Reviews = {
    key: LS_REV,
    list(plate) {
      try {
        return JSON.parse(localStorage.getItem(LS_REV) || "{}")[plate] || [];
      } catch {
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

  // ✅ Toast Notification
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

  // ✅ Slider (자동 전환 + 클릭)
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

  // ✅ 공유 기능
  window.sharePage = async (title = document.title, url = location.href) => {
    try {
      if (navigator.share) {
        await navigator.share({ title, url });
        toast("공유했어요");
      } else {
        await navigator.clipboard.writeText(url);
        toast("링크가 복사되었습니다");
      }
    } catch {
      /* cancelled */
    }
  };
})();

/****************************************************
 * ✅ 로그인 상태 감지 및 헤더 토글 (공통)
 ****************************************************/
document.addEventListener("DOMContentLoaded", () => {
  updateHeader();
});

function updateHeader() {
  const user = JSON.parse(localStorage.getItem("user"));
  const nav = document.querySelector(".nav");
  if (!nav) return;

  nav.innerHTML = "";

  if (user && user.email) {
    // 로그인 상태
    const myLink = document.createElement("a");
    myLink.href = "./mypage.html";
    myLink.textContent = "마이페이지";

    const logoutLink = document.createElement("a");
    logoutLink.href = "#";
    logoutLink.textContent = "로그아웃";
    logoutLink.addEventListener("click", () => {
      localStorage.removeItem("user");
      alert("로그아웃 되었습니다.");
      location.href = "index.html";
    });

    nav.appendChild(myLink);
    nav.appendChild(logoutLink);
  } else {
    // 비로그인 상태
    const signup = document.createElement("a");
    signup.href = "./signup.html";
    signup.textContent = "회원가입";

    const login = document.createElement("a");
    login.href = "./login.html";
    login.textContent = "로그인";

    nav.appendChild(signup);
    nav.appendChild(login);
  }
}
