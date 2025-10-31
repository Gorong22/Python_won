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
  const LS_SURVEY = "surveyResult";

  /****************************************************
   * ✅ Auth Utility (로그인 / 로그아웃 / 현재 사용자)
   ****************************************************/
  window.Auth = {
    current() {
      try {
        return JSON.parse(localStorage.getItem(LS_USER) || "null");
      } catch {
        return null;
      }
    },

    saveUser(userObj) {
      if (!userObj || !userObj.email) return;
      localStorage.setItem(LS_USER, JSON.stringify(userObj));
      updateHeader();
    },

    login(data) {
      if (!data || !data.email) return;
      localStorage.setItem(LS_USER, JSON.stringify(data));
      localStorage.setItem("justLoggedIn", "1"); // ✅ 플래그 저장
      toast(`${data.name || "회원"}님, 환영합니다!`);
      updateHeader();
      return data;
    },

    logout() {
      localStorage.removeItem(LS_USER);
      localStorage.removeItem(LS_SURVEY);
      alert("로그아웃 되었습니다.");
      location.href = "./index.html";
    },
  };

  /****************************************************
   * ✅ Cart Utility
   ****************************************************/
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

  /****************************************************
   * ✅ Reviews Utility
   ****************************************************/
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

  /****************************************************
   * ✅ Toast Notification
   ****************************************************/
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

  /****************************************************
   * ✅ Slider (자동 전환 + 클릭)
   ****************************************************/
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

  /****************************************************
   * ✅ 공유 기능
   ****************************************************/
  window.sharePage = async (title = document.title, url = location.href) => {
    try {
      if (navigator.share) {
        await navigator.share({ title, url });
        toast("공유했어요");
      } else {
        await navigator.clipboard.writeText(url);
        toast("링크가 복사되었습니다");
      }
    } catch {}
  };
})();

/****************************************************
 * ✅ 로그인 상태 감지 및 헤더 토글
 ****************************************************/
document.addEventListener("DOMContentLoaded", () => {
  updateHeader();

  // ✅ 로그인 직후 헤더 재렌더링 보정
  if (localStorage.getItem("justLoggedIn")) {
    localStorage.removeItem("justLoggedIn");
    setTimeout(updateHeader, 200);
  }
});

function updateHeader() {
  const user = JSON.parse(localStorage.getItem("user") || "null");
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
    logoutLink.addEventListener("click", (e) => {
      e.preventDefault();
      Auth.logout();
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

/****************************************************
 * ✅ 공통: 구매/결제 관련 버튼 전역 팝업 처리
 ****************************************************/
document.addEventListener("DOMContentLoaded", () => {
  if (!document.getElementById("demo-modal")) {
    const modalHTML = `
      <div id="demo-modal" class="modal-backdrop" style="display:none;align-items:center;justify-content:center;">
        <div class="modal" style="background:#fff;padding:24px;border-radius:16px;box-shadow:0 4px 12px rgba(0,0,0,0.15);max-width:320px;text-align:center;">
          <header style="font-weight:600;color:#5F0080;font-size:18px;margin-bottom:10px;">💜 Inner Kurly Demo</header>
          <div class="body" style="font-size:14px;color:#333;line-height:1.6;margin-bottom:16px;">
            현재는 <strong>데모 버전</strong>입니다.<br/>
            정식 출시 후 더욱 편리한 서비스를 만나보실 수 있습니다 ✨
          </div>
          <div class="footer">
            <button class="btn btn--primary" id="close-demo" style="background:#5F0080;color:#fff;border:none;padding:8px 16px;border-radius:8px;">확인</button>
          </div>
        </div>
      </div>`;
    document.body.insertAdjacentHTML("beforeend", modalHTML);
  }

  const modal = document.getElementById("demo-modal");
  const closeBtn = document.getElementById("close-demo");

  const closeModal = () => (modal.style.display = "none");
  closeBtn.addEventListener("click", closeModal);
  modal.addEventListener("click", (e) => {
    if (e.target === modal) closeModal();
  });

  document.body.addEventListener("click", (e) => {
    const t = e.target.closest("button, a");
    if (!t) return;
    const text = (t.textContent || "").trim();

    const triggerWords = [
      "구매",
      "결제",
      "장바구니",
      "구독",
      "주문",
      "정기배송",
    ];
    if (triggerWords.some((w) => text.includes(w))) {
      e.preventDefault();
      modal.style.display = "flex";
    }
  });
});
