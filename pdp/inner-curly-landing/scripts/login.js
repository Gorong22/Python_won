// scripts/login.js
document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("login-form");
  if (!form) return;

  const submitBtn = form.querySelector('button[type="submit"]');

  /* -------------------------------
         ✅ 로딩 상태 토글
      --------------------------------*/
  function setLoading(isLoading) {
    if (!submitBtn) return;
    submitBtn.disabled = isLoading;
    if (isLoading) {
      submitBtn.dataset.loading = "1";
      submitBtn._origText = submitBtn.textContent;
      submitBtn.textContent = "로그인 중...";
    } else {
      submitBtn.dataset.loading = "0";
      submitBtn.textContent = submitBtn._origText || "로그인";
    }
  }

  /* -------------------------------
         ✅ 비밀번호 해시 (SHA-256)
      --------------------------------*/
  async function hashPassword(password) {
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const hashBuffer = await crypto.subtle.digest("SHA-256", data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
  }

  /* -------------------------------
         ✅ fetch 타임아웃 유틸
      --------------------------------*/
  async function fetchWithTimeout(url, options = {}, timeoutMs = 15000) {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetch(url, { ...options, signal: controller.signal });
      clearTimeout(id);
      return res;
    } catch (e) {
      clearTimeout(id);
      throw e;
    }
  }

  /* -------------------------------
         ✅ GA4 이벤트 유틸
      --------------------------------*/
  function gaEvent(name, params = {}) {
    if (typeof window.gtag === "function") {
      window.gtag("event", name, params);
    }
  }

  /* -------------------------------
         ✅ 로그인 폼 제출 이벤트
      --------------------------------*/
  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const email = (form.email?.value || "").trim();
    const password = (form.password?.value || "").trim();

    if (!email || !password) {
      alert("이메일과 비밀번호를 모두 입력해주세요.");
      return;
    }

    setLoading(true);
    gaEvent("login_attempt", { page_title: document.title || "login" });

    try {
      // ✅ 비밀번호 해시 처리
      const hashedPw = await hashPassword(password);

      const payload = {
        action: "login",
        email,
        password: hashedPw,
      };

      // ✅ Apps Script 호출
      const res = await fetchWithTimeout(
        "https://script.google.com/macros/s/AKfycbyU9leJ8elcPFS-tR5LbVdrK3DagxQXA-Z1Cz-QZVdXG9ni8XjnRb3Jksyu2d427FoRCw/exec",
        {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams(payload),
        },
        15000
      );

      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();

      /* -------------------------------
           ✅ 로그인 성공 처리
        --------------------------------*/
      if (data.status === "success" && data.user) {
        Auth.login(data.user);
        localStorage.setItem("justLoggedIn", "1"); // 🔥 플래그 추가

        gaEvent("login_success", {
          page_title: document.title || "login",
          email_domain: email.split("@")[1] || "",
        });

        toast(`${data.user.name || "회원"}님, 환영합니다!`);

        // ✅ 즉시 페이지 이동
        window.location.href = "./mypage.html";
        return;
      }

      /* -------------------------------
           ❌ 로그인 실패 처리
        --------------------------------*/
      if (data.status === "fail") {
        gaEvent("login_failed", { reason: data.message || "invalid_cred" });
        alert("이메일 또는 비밀번호가 일치하지 않습니다.");
        return;
      }

      throw new Error(data.message || "알 수 없는 오류가 발생했습니다.");
    } catch (err) {
      console.error(err);
      gaEvent("login_network_error", { message: String(err?.message || err) });

      if (err?.name === "AbortError") {
        alert("서버 응답이 지연되고 있습니다. 잠시 후 다시 시도해주세요.");
      } else {
        alert("로그인 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.");
      }
    } finally {
      setLoading(false);
    }
  });
});
