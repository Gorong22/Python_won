// scripts/mypage.js
document.addEventListener("DOMContentLoaded", () => {
  const u = Auth.current(); // common.js의 Auth 객체 사용
  const box = document.getElementById("user-info");

  // 로그인 상태에 따라 표시
  if (u && u.email) {
    box.innerHTML = `
      <h3>내 정보</h3>
      <p><strong>이름:</strong> ${u.name}</p>
      <p><strong>이메일:</strong> ${u.email}</p>
      <p><strong>성별:</strong> ${u.gender || "-"}</p>
      <p><strong>나이:</strong> ${u.age || "-"}</p>
      <button id="btn-logout" class="btn btn--secondary">로그아웃</button>
    `;
  } else {
    box.innerHTML = `
      <h3>내 정보</h3>
      <p>로그인이 필요합니다.</p>
      <a href="login.html" class="btn btn--primary">로그인</a>
    `;
  }

  // 로그아웃 이벤트
  document.addEventListener("click", (e) => {
    if (e.target && e.target.id === "btn-logout") {
      Auth.logout();
      alert("로그아웃 되었습니다.");
      location.href = "./index.html";
    }
  });
});
