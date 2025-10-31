document.addEventListener("DOMContentLoaded", () => {
  const u = Auth.current();
  const box = document.getElementById("user-info");
  box.textContent = u ? `${u.name} (${u.email})` : "로그인이 필요합니다.";
  document.getElementById("btn-logout").addEventListener("click", () => {
    Auth.logout();
    location.href = "./index.html";
  });
});
// scripts/mypage.js
document.addEventListener("DOMContentLoaded", () => {
  const user = JSON.parse(localStorage.getItem("user"));
  const container = document.querySelector(".mypage-info");

  if (user && user.email) {
    container.innerHTML = `
      <h3>내 정보</h3>
      <p><strong>이름:</strong> ${user.name}</p>
      <p><strong>이메일:</strong> ${user.email}</p>
      <p><strong>성별:</strong> ${user.gender || "-"}</p>
      <p><strong>나이:</strong> ${user.age || "-"}</p>
      <button class="btn btn--secondary" id="logout-btn">로그아웃</button>
    `;

    document.getElementById("logout-btn").addEventListener("click", () => {
      localStorage.removeItem("user");
      alert("로그아웃 되었습니다.");
      window.location.href = "index.html";
    });
  } else {
    container.innerHTML = `
      <h3>내 정보</h3>
      <p>로그인이 필요합니다.</p>
      <a href="login.html" class="btn btn--primary">로그인</a>
    `;
  }
});
