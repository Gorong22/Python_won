// scripts/signup.js
document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("signup-form");
  if (!form) return;

  /* -------------------------------
     ✅ 비밀번호 안내 문구 삽입
  --------------------------------*/
  const pwInput = form.querySelector('input[name="password"]');
  if (pwInput) {
    const notice = document.createElement("p");
    notice.textContent = "※ 모든 비밀번호는 암호화되어 안전하게 저장됩니다.";
    notice.classList.add("pw-notice");
    pwInput.insertAdjacentElement("afterend", notice);
  }

  const submitBtn = form.querySelector('button[type="submit"]');

  /* -------------------------------
     ✅ 유틸: 로딩 상태 토글
  --------------------------------*/
  function setLoading(isLoading) {
    if (!submitBtn) return;
    submitBtn.disabled = isLoading;
    if (isLoading) {
      submitBtn.dataset.loading = "1";
      submitBtn._origText = submitBtn.textContent;
      submitBtn.textContent = "처리 중...";
    } else {
      submitBtn.dataset.loading = "0";
      submitBtn.textContent = submitBtn._origText || "회원가입";
    }
  }

  /* -------------------------------
     ✅ 기본 검증 유틸
  --------------------------------*/
  const isEmail = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
  const isValidAge = (v) => {
    const n = Number(v);
    return Number.isInteger(n) && n >= 10 && n <= 100;
  };

  /* -------------------------------
     ✅ 비밀번호 해시(SHA-256)
  --------------------------------*/
  async function hashPassword(password) {
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const hashBuffer = await crypto.subtle.digest("SHA-256", data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
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
     ✅ 폼 제출 이벤트
  --------------------------------*/
  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const name = (form.name?.value || "").trim();
    const gender = form.gender?.value || "";
    const age = (form.age?.value || "").trim();
    const email = (form.email?.value || "").trim();
    const password = (form.password?.value || "").trim();

    // ---------------- 검증 ----------------
    if (!name || !gender || !age || !email || !password) {
      alert("모든 항목을 입력해주세요.");
      return;
    }
    if (!isValidAge(age)) {
      alert("나이는 10~100 사이의 정수로 입력해주세요.");
      return;
    }
    if (!isEmail(email)) {
      alert("올바른 이메일 형식이 아닙니다.");
      return;
    }
    if (password.length < 6) {
      alert("비밀번호는 최소 6자 이상 입력해주세요.");
      return;
    }
    if (!/[0-9]/.test(password)) {
      alert("비밀번호에 숫자를 1자 이상 포함해주세요.");
      return;
    }
    if (!/[!@#$%^&*(),.?\":{}|<>]/.test(password)) {
      alert("비밀번호에 특수문자를 1자 이상 포함해주세요.");
      return;
    }

    // ---------------- 비밀번호 해시 처리 ----------------
    const hashedPw = await hashPassword(password);

    // ---------------- 전송 데이터 구성 ----------------
    const payload = {
      action: "signup",
      name,
      gender,
      age,
      email,
      password: hashedPw,
      plate: "pending",
      answers: JSON.stringify([]),
    };

    setLoading(true);
    gaEvent("signup_submit_clicked", {
      page_title: document.title || "signup",
      method: "web_form",
    });

    try {
      const res = await fetchWithTimeout(
        "https://script.google.com/macros/s/AKfycby64_DR1ntrW761V-PfEPLV8aG3RmBr088LUMeZ1SSOgcanqSWLTbagePhq4CpkmDWIlw/exec",
        {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams(payload),
        },
        15000
      );

      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();

      if (data.status === "success") {
        // ✅ localStorage 저장 (자동 로그인 + 이후 서베이 연결)
        const userData = { name, gender, age, email };
        localStorage.setItem("user", JSON.stringify(userData));

        gaEvent("signup_success", { page_title: document.title || "signup" });
        alert(
          `${name}님, 회원가입이 완료되었습니다.\n지금 바로 심리 테스트를 진행해볼까요?`
        );

        // ✅ 회원가입 후 → survey.html 로 이동
        setTimeout(() => {
          window.location.href = "./survey.html";
        }, 300);

        return;
      }

      // ---------------- 중복 이메일 처리 ----------------
      if (data.status === "duplicate") {
        gaEvent("signup_duplicate", {
          email_domain: email.split("@")[1] || "",
        });
        alert("이미 가입된 이메일입니다. 로그인해 주세요.");
        return;
      }

      // ---------------- 기타 에러 처리 ----------------
      gaEvent("signup_failed", { reason: data.message || "unknown" });
      alert("오류가 발생했습니다: " + (data.message || "등록 실패"));
    } catch (err) {
      console.error(err);
      gaEvent("signup_network_error", { message: String(err?.message || err) });
      if (err?.name === "AbortError") {
        alert("서버 응답이 지연되고 있습니다. 잠시 후 다시 시도해주세요.");
      } else {
        alert("서버 통신 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.");
      }
    } finally {
      setLoading(false);
    }
  });
});
