document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("signup-form");

  form.addEventListener("submit", (e) => {
    e.preventDefault();

    const name = form.name.value.trim();
    const gender = form.gender.value;
    const age = form.age.value.trim();
    const email = form.email.value.trim();

    if (!name || !gender || !age || !email) {
      alert("모든 항목을 입력해주세요!");
      return;
    }

    // ✅ localStorage 저장
    localStorage.setItem(
      "signupData",
      JSON.stringify({ name, gender, age, email })
    );

    // ✅ survey.html로 이동
    window.location.href = "./survey.html";
  });
});
document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("signup-form");

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const name = form.name.value.trim();
    const gender = form.gender.value;
    const age = form.age.value.trim();
    const email = form.email.value.trim();

    if (!name || !gender || !age || !email) {
      alert("모든 항목을 입력해주세요!");
      return;
    }

    // ✅ 회원가입 데이터 구성
    const signupData = {
      action: "signup",
      name,
      gender,
      age,
      email,
      plate: "pending", // 아직 설문 전이므로 임시 저장
      answers: JSON.stringify([]), // 추후 survey.js에서 업데이트 예정
    };

    try {
      // ✅ Google Apps Script Web App 호출
      const res = await fetch(
        "https://script.google.com/macros/s/AKfycbzjitiIfs34h98FrAQLKkzTa9_4ZhAv_2K4xfJu0CY9S9dy2R0RoWfyLM_iDKRYycUOmg/exec",
        {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams(signupData),
        }
      );

      const data = await res.json();

      if (data.status === "success") {
        // ✅ 로컬스토리지 저장 (다음 설문 단계에서 재사용)
        localStorage.setItem(
          "signupData",
          JSON.stringify({ name, gender, age, email })
        );

        alert(`${name}님, 회원가입이 완료되었습니다!`);
        window.location.href = "./survey.html"; // 다음 단계로 이동
      } else if (data.status === "duplicate") {
        alert("이미 가입된 이메일입니다.");
      } else {
        alert("오류 발생: " + (data.message || "등록 실패"));
      }
    } catch (err) {
      console.error("서버 통신 오류:", err);
      alert("서버와의 통신에 실패했습니다. 잠시 후 다시 시도해주세요.");
    }
  });
});
