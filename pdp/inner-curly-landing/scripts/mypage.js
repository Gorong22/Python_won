/****************************************************
 * INNER KURLY - 마이페이지
 * 회원 정보 / 설문 결과 / 플레이트 추천 / 루션 체험 연동
 ****************************************************/

document.addEventListener("DOMContentLoaded", () => {
  const u = Auth.current(); // common.js의 Auth 객체 사용
  const box = document.getElementById("user-info");
  const surveyBox = document.getElementById("survey-result");
  const plateBox = document.getElementById("plate-recommend");

  // ✅ 루션 체험 버튼 영역 동적 추가
  const mainContainer = document.querySelector("main.container");
  if (!mainContainer) return;

  const lutionSection = document.createElement("section");
  lutionSection.classList.add("card", "pad", "center");
  lutionSection.id = "lution-section";
  mainContainer.appendChild(lutionSection);

  /* -------------------------------
     ✅ 로그인 상태일 때
  --------------------------------*/
  if (u && u.email) {
    box.innerHTML = `
      <h3>내 정보</h3>
      <p><strong>이름:</strong> ${u.name || "-"}</p>
      <p><strong>이메일:</strong> ${u.email}</p>
      <p><strong>성별:</strong> ${u.gender || "-"}</p>
      <p><strong>나이:</strong> ${u.age || "-"}</p>
      <button id="btn-logout" class="btn btn--secondary">로그아웃</button>
    `;

    // ✅ 로컬 스토리지에서 설문 결과 가져오기
    const surveyData = JSON.parse(localStorage.getItem("surveyResult") || "{}");
    const plate =
      surveyData.plate || (u.plate ? String(u.plate).toLowerCase() : "");

    if (plate) {
      surveyBox.innerHTML = `
        <p>회원님의 서베이 결과는 <strong>${plate}</strong> Plate 입니다 💫</p>
        <a href="plate-${plate}.html" class="btn btn--primary">
          추천 플레이트 보러가기
        </a>
      `;
      plateBox.innerHTML = `<p>${getPlateMessage(plate)}</p>`;

      // ✅ 루션 체험 버튼 활성화
      lutionSection.innerHTML = `
        <h3 class="h3">루션 앱 체험</h3>
        <p class="text small">회원님의 ${plate} 루틴에 맞는 루션 체험을 시작해보세요 🌿</p>
        <button id="btn-lution" class="btn btn--primary">루션 체험하러 가기</button>
      `;

      document.getElementById("btn-lution").addEventListener("click", () => {
        // 로그인 보호 + 세그멘테이션 기반 이동
        localStorage.setItem(
          "lutionAccess",
          JSON.stringify({
            email: u.email,
            plate,
            timestamp: new Date().toISOString(),
          })
        );

        // 로그인 상태 유지한 채 루션 페이지로
        window.location.href = "./lution.html";
      });
    } else {
      // 설문 미완료
      surveyBox.innerHTML = `
        <p>아직 설문 결과가 없습니다.</p>
        <a href="survey.html" class="btn btn--primary">설문하러 가기</a>
      `;
      plateBox.innerHTML = `<p>회원님의 서베이 결과에 따라 맞춤 플레이트를 준비 중이에요 🍱</p>`;
      lutionSection.innerHTML = `
        <h3 class="h3">루션 앱 체험</h3>
        <p class="text small">설문을 완료하시면 루션 체험이 열립니다 ✨</p>
        <button class="btn btn--ghost" disabled>설문 먼저 진행해주세요</button>
      `;
    }
  } else {
    /* -------------------------------
       ❌ 비로그인 상태
    --------------------------------*/
    box.innerHTML = `
      <h3>내 정보</h3>
      <p>로그인이 필요합니다.</p>
      <a href="login.html" class="btn btn--primary">로그인</a>
    `;
    surveyBox.innerHTML = `<p>서베이 결과를 보려면 로그인 해주세요.</p>`;
    plateBox.innerHTML = `<p>로그인 후 맞춤 플레이트를 확인할 수 있습니다.</p>`;
    lutionSection.innerHTML = `
      <h3 class="h3">루션 앱 체험</h3>
      <p class="text small">로그인 후 루션 체험을 이용하실 수 있습니다.</p>
      <a href="login.html" class="btn btn--primary">로그인하러 가기</a>
    `;
  }

  /* -------------------------------
     ✅ 로그아웃 이벤트
  --------------------------------*/
  document.addEventListener("click", (e) => {
    if (e.target && e.target.id === "btn-logout") {
      Auth.logout();
    }
  });
});

/****************************************************
 * ✅ 플레이트별 문구
 ****************************************************/
function getPlateMessage(type) {
  const t = String(type).toLowerCase();
  if (t === "glow") return "활력을 되찾고 싶은 분께 Glow Plate를 추천드려요 ✨";
  if (t === "slim") return "꾸준한 라인 관리엔 Slim Plate가 어울려요 🧘‍♀️";
  if (t === "detox") return "몸이 무겁다면 Detox Plate로 리셋하세요 🌿";
  if (t === "balance") return "조화로운 루틴엔 Balance Plate가 완벽해요 ⚖️";
  return "회원님의 결과에 맞는 플레이트를 준비 중이에요 🍽️";
}
