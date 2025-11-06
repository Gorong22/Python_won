document.addEventListener("DOMContentLoaded", () => {
  const plate = document.querySelector("main.pdp").dataset.plate;
  // seed demo reviews if empty
  let list = Reviews.list(plate);
  if (list.length === 0) {
    list = [
      {
        star: 5,
        text: "맛+구성+포장 모두 만족! 주 5일 루틴으로 재구매 예정.",
        photo: false,
        date: "오늘",
      },
      {
        star: 4,
        text: "맛이 깔끔하고 부담없어요. 알림 기능 유용.",
        photo: true,
        date: "어제",
      },
      {
        star: 5,
        text: "첫 구독인데 배송/보냉팩 깔끔. 다음엔 Monthly 가봅니다.",
        photo: false,
        date: "이번주",
      },
    ];
    list.forEach((r) => Reviews.add(plate, r));
  }
  render();

  function render() {
    const items = Reviews.list(plate);
    const count = items.length;
    const buckets = { 5: 0, 4: 0, 3: 0 };
    items.forEach((r) => {
      if (r.star >= 5) buckets[5]++;
      else if (r.star >= 4) buckets[4]++;
      else buckets[3]++;
    });
    document.getElementById("rev-count").textContent = count;
    ["5", "4", "3"].forEach((k) => {
      const n = buckets[k];
      document.getElementById("rev-" + k).textContent = n;
      const pct = count ? Math.round((n / count) * 100) : 0;
      document.getElementById("m" + k).style.width = pct + "%";
    });
    const wrap = document.getElementById("rev-list");
    wrap.innerHTML = items
      .slice(-5)
      .reverse()
      .map(
        (r) => `
      <div class="review-card">
        <div class="row" style="justify-content:space-between"><div class="stars">${"★".repeat(
          r.star
        )}${"☆".repeat(5 - r.star)}</div><span class="small">${
          r.date
        }</span></div>
        <p class="text" style="margin:6px 0 8px">${r.text}</p>
        ${
          r.photo
            ? '<div class="review-photos"><img src="./assets/plate-' +
              plate.toLowerCase() +
              '-hero.png"/></div>'
            : ""
        }
      </div>`
      )
      .join("");
  }

  // modal write
  const modal = document.getElementById("review-modal");
  const starWrap = document.getElementById("star-input");
  const stars = [1, 2, 3, 4, 5].map((i) => {
    const b = document.createElement("button");
    b.className = "btn";
    b.textContent = "★";
    b.dataset.v = i;
    b.addEventListener("click", () => select(i));
    return b;
  });
  stars.forEach((s) => starWrap.appendChild(s));
  let star = 5;
  function select(n) {
    star = n;
    stars.forEach((b, i) => {
      b.style.color = i < n ? "#FF7A00" : "#888";
    });
  }
  select(5);

  document.getElementById("btn-write").addEventListener("click", () => {
    if (!Auth.current()) {
      toast("로그인이 필요합니다");
      // setTimeout(() => (location.href = "./login.html"), 400);
      return;
    }
    modal.classList.add("show");
  });
  document
    .getElementById("close-rev")
    .addEventListener("click", () => modal.classList.remove("show"));
  document.getElementById("save-rev").addEventListener("click", () => {
    const txt = (document.getElementById("rev-text").value || "").trim();
    if (!txt) {
      toast("내용을 입력해 주세요");
      return;
    }
    Reviews.add(plate, { star: star, text: txt, photo: false, date: "방금" });
    modal.classList.remove("show");
    document.getElementById("rev-text").value = "";
    render();
    toast("리뷰가 등록되었습니다");
  });
});

// ============================
//  리뷰 작성 버튼 클릭 시 처리
// ============================
document.getElementById("btn-write").addEventListener("click", () => {
  const user = localStorage.getItem("user_email");
  if (user) {
    document.getElementById("review-modal").classList.add("active");
    document.body.style.overflow = "hidden";
  } else {
    showPopup();
  }
});

function showPopup() {
  const popup = document.createElement("div");
  popup.className = "alert-popup";
  popup.innerHTML = `
    <div class="alert-box">
      <h3>회원 전용 기능이에요 💜</h3>
      <p>리뷰를 작성하려면 먼저 회원가입이 필요해요.</p>
      <button class="btn btn--primary" onclick="location.href='./signup.html'">회원가입 하러 가기</button>
      <button class="btn" onclick="this.closest('.alert-popup').remove()">닫기</button>
    </div>`;
  document.body.appendChild(popup);
}
/* ============================
   GLOW PLATE CUSTOM SCRIPT
   ============================ */

document.addEventListener("DOMContentLoaded", () => {
  const openBtn = document.getElementById("openDiet");
  const closeBtn = document.getElementById("closeDiet");
  const popup = document.getElementById("dietPopup");

  if (openBtn && popup && closeBtn) {
    openBtn.addEventListener("click", () => {
      popup.classList.add("active");
      document.body.style.overflow = "hidden";
    });

    closeBtn.addEventListener("click", () => {
      popup.classList.remove("active");
      document.body.style.overflow = "auto";
    });

    // 팝업 외부 클릭 시 닫기
    popup.addEventListener("click", (e) => {
      if (e.target === popup) {
        popup.classList.remove("active");
        document.body.style.overflow = "auto";
      }
    });
  }
});
