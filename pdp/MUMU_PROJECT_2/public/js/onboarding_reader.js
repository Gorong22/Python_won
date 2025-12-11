// 1) "당신은 누구?" 선택 (독자/창작자)
const selectBtns = document.querySelectorAll(".select-btn");
selectBtns.forEach((btn) => {
  btn.addEventListener("click", () => {
    selectBtns.forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
  });
});

// 2) 선호 포맷 선택 (숏툰 / 롱툰)
const formatBtns = document.querySelectorAll(".format-btn");
formatBtns.forEach((btn) => {
  btn.addEventListener("click", () => {
    formatBtns.forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
  });
});

// 3) 장르/취향 태그 선택 (여러 개 가능)
const tagButtons = document.querySelectorAll(".tag-btn");
tagButtons.forEach((btn) => {
  btn.addEventListener("click", () => {
    btn.classList.toggle("active");
  });
});

// 4) 완료 버튼 → 선택값 확인
document.getElementById("finishBtn").addEventListener("click", () => {
  const userType = document.querySelector(".select-btn.active")?.dataset.value;
  const format = document.querySelector(".format-btn.active")?.dataset.value;

  const genres = [...document.querySelectorAll("#genreArea .active")].map(
    (el) => el.textContent
  );

  const tastes = [...document.querySelectorAll("#tasteArea .active")].map(
    (el) => el.textContent
  );

  console.log({
    userType,
    format,
    genres,
    tastes,
  });

  alert("개인화 설정이 완료되었습니다!");
});
