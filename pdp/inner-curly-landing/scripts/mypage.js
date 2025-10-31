// scripts/mypage.js
document.addEventListener("DOMContentLoaded", () => {
  const u = Auth.current(); // common.js의 Auth 객체 사용
  const box = document.getElementById("user-info");
  const surveyBox = document.getElementById("survey-result");
  // ✅ HTML의 id와 일치시킴: plate-recommend
  const plateBox = document.getElementById("plate-recommend");

  if (u && u.email) {
    box.innerHTML = `
      <h3>내 정보</h3>
      <p><strong>이름:</strong> ${u.name || "-"}</p>
      <p><strong>이메일:</strong> ${u.email}</p>
      <p><strong>성별:</strong> ${u.gender || "-"}</p>
      <p><strong>나이:</strong> ${u.age || "-"}</p>
      <button id="btn-logout" class="btn btn--secondary">로그아웃</button>
    `;

    // ✅ 시트 호출 ❌ → 로컬스토리지 ✅
    const surveyData = JSON.parse(localStorage.getItem("surveyResult") || "{}");
    const plate =
      surveyData.plate || (u.plate ? String(u.plate).toLowerCase() : "");

    if (plate) {
      surveyBox.innerHTML = `
        <p>회원님의 서베이 결과는 <strong>${plate}</strong> Plate 입니다 💫</p>
        <a href="plate-${plate}.html" class="btn btn--primary">추천 플레이트 보러가기</a>
      `;
      plateBox.innerHTML = `<p>${getPlateMessage(plate)}</p>`;
    } else {
      surveyBox.innerHTML = `
        <p>아직 설문 결과가 없습니다.</p>
        <a href="survey.html" class="btn btn--primary">설문하러 가기</a>
      `;
      plateBox.innerHTML = `<p>회원님의 서베이 결과에 따라 맞춤 플레이트를 준비 중이에요 🍱</p>`;
    }
  } else {
    box.innerHTML = `
      <h3>내 정보</h3>
      <p>로그인이 필요합니다.</p>
      <a href="login.html" class="btn btn--primary">로그인</a>
    `;
    surveyBox.innerHTML = `<p>서베이 결과를 보려면 로그인 해주세요.</p>`;
    plateBox.innerHTML = `<p>로그인 후 맞춤 플레이트를 확인할 수 있습니다.</p>`;
  }

  // 로그아웃
  document.addEventListener("click", (e) => {
    if (e.target && e.target.id === "btn-logout") {
      Auth.logout();
      alert("로그아웃 되었습니다.");
      location.href = "./index.html";
    }
  });
});

function getPlateMessage(type) {
  const t = String(type).toLowerCase();
  if (t === "glow") return "활력을 되찾고 싶은 분께 Glow Plate를 추천드려요 ✨";
  if (t === "slim") return "꾸준한 라인 관리엔 Slim Plate가 어울려요 🧘‍♀️";
  if (t === "detox") return "몸이 무겁다면 Detox Plate로 리셋하세요 🌿";
  if (t === "balance") return "조화로운 루틴엔 Balance Plate가 완벽해요 ⚖️";
  return "회원님의 결과에 맞는 플레이트를 준비 중이에요 🍽️";
}
