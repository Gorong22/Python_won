// 성별 선택 활성화 기능
const genderBtns = document.querySelectorAll(".gender-btn");
genderBtns.forEach((btn) => {
  btn.addEventListener("click", () => {
    genderBtns.forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
  });
});

// 다음 버튼 클릭 이벤트
document.getElementById("nextBtn").addEventListener("click", () => {
  alert("다음 단계로 이동합니다!");
});
