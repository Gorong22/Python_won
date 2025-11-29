document.getElementById("goStep2").onclick = () => {
  document.getElementById("step1").style.display = "none";
  document.getElementById("step2").style.display = "block";
};

// Step2 → Step3
document.getElementById("goStep3").onclick = () => {
  document.getElementById("step2").style.display = "none";
  document.getElementById("step3").style.display = "block";
};

// 토글 버튼
document.querySelectorAll(".t-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    const group = btn.parentNode.querySelectorAll(".t-btn");
    group.forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
  });
});

// 태그 버튼
document.querySelectorAll(".tag").forEach((tag) => {
  tag.addEventListener("click", () => {
    tag.classList.toggle("active");
  });
});
