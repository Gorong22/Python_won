/* =======================
   INTRO RANDOM IMAGES
======================= */
const collageImages = document.querySelectorAll(".c-img");

const webtoonImages = [
  "assets/webtoon1.png",
  "assets/webtoon2.png",
  "assets/webtoon3.png",
  "assets/webtoon4.png",
  "assets/webtoon5.png",
];

function loadIntroImages() {
  const shuffled = [...webtoonImages].sort(() => Math.random() - 0.5);
  const selected = shuffled.slice(0, collageImages.length);
  collageImages.forEach((img, i) => (img.src = selected[i]));
}

document.addEventListener("DOMContentLoaded", loadIntroImages);

/* =======================
   질문 리스트
======================= */
const questions = [
  {
    type: "radio",
    key: "q1",
    title: "Q1. 홈 피드를 보고 어떤 느낌이 들었나요?",
    options: ["매력적이다", "약간 매력적이다", "보통이다", "아쉽다"],
    required: true,
  },
  {
    type: "radio",
    key: "q2",
    title: "Q2. 이 감성이 ‘새로운 웹툰 경험’과 잘 맞는다고 느껴졌나요?",
    options: [
      "매우 그렇다",
      "그렇다",
      "보통이다",
      "그렇지 않다",
      "전혀 아니다",
    ],
    required: true,
  },
  {
    type: "radio",
    key: "q3",
    title: "Q3. 무드보드/톤앤매너가 마음에 들었나요? (1~7점)",
    options: ["1", "2", "3", "4", "5", "6", "7"],
    required: true,
  },
  {
    type: "radio",
    key: "q4",
    title: "Q4. 슬라이드 컷 방식이 좋았던 이유는 무엇인가요?",
    options: [
      "핵심을 빠르게 볼 수 있다",
      "장면이 감각적으로 보인다",
      "부담 없이 짧게 볼 수 있다",
      "특별히 좋았던 점은 없다",
    ],
    required: true,
  },
  {
    type: "textarea",
    key: "q5",
    title: "Q5. 넘기면서 불편했던 점이 있었다면 적어주세요.",
    required: true,
    min: 1,
  },
  {
    type: "radio",
    key: "q6",
    title: "Q6. 슬라이드 컷 방식이 기존 웹툰보다 편했나요?",
    options: ["1", "2", "3", "4", "5", "6", "7"],
    required: true,
  },
  {
    type: "radio",
    key: "q7",
    title:
      "Q7. 마음에 드는 컷을 피드에 저장하고 취향 추천에 도움이 된다면 매력적으로 느껴지시나요?",
    options: ["매우 매력적이다", "매력적이다", "보통이다", "필요하지 않다"],
    required: true,
  },
  {
    type: "radio",
    key: "q8",
    title: "Q8. 만든 무드보드를 개시판에서 사용자와 함께 공유할 의향이 있나요?",
    options: [
      "자주 사용할 것 같다",
      "가끔 사용할 것 같다",
      "상황에 따라 다르다",
      "사용하지 않을 것 같다",
    ],
    required: true,
  },
  {
    type: "radio",
    key: "q9",
    title: "Q9. 무드보드를 외부 지인들에게 공유할 의향이 있으신가요?",
    options: [
      "자주 공유한다",
      "가끔 공유한다",
      "특정 장면만 공유한다",
      "공유하지 않는다",
    ],
    required: true,
  },
  {
    type: "radio",
    key: "q10",
    title: "Q10. MUMU가 출시되면 사용할 의향이 있나요?",
    options: ["매일", "주3~4회", "주1회", "가끔"],
    required: true,
  },
  {
    type: "radio",
    key: "q11",
    title: "Q11. 기획 단계이지만 메뉴 중 기대가 되는 기능은?",
    options: [
      "스토어 기능",
      "사용자와 소통할 게시판",
      "나만의 무드보드",
      "작가와 소통이 가능한 피드",
    ],
    required: true,
  },
  {
    type: "textarea",
    key: "q12",
    title: "Q12. 계속 사용할 이유가 되려면 어떤 요소가 필요할까요?",
    required: true,
    min: 1,
  },
  {
    type: "textarea",
    key: "q13",
    title: "Q13. 어색하거나 불편했던 점을 적어주세요.",
    required: true,
    min: 1,
  },
  {
    type: "radio",
    key: "q14",
    title: "Q14. 무무의 감성을 더 잘 보여주려면 무엇이 강화되면 좋을까요?",
    options: ["무무만의 감성", "콘텐츠 형식", "추천 방식", "무드보드 경험"],
    required: true,
  },
  {
    type: "radio",
    key: "q15",
    title: "Q15. 전체적으로 매력적이라고 느껴졌나요?",
    options: ["매우 그렇다", "어느 정도 그렇다", "보통이다", "그렇지 않다"],
    required: true,
  },
  {
    type: "radio",
    key: "q16",
    title: "Q16. 웹툰을 볼 때 가장 좋아하는 순간은?",
    options: ["반전", "감정/표정", "공감 포인트", "기타"],
    required: true,
    hasEtc: true,
  },
  {
    type: "radio",
    key: "q17",
    title: "Q17. 선호하는 웹툰 분량은?",
    options: ["짧고 핵심만", "적당한 길이", "중간 템포", "상황마다 다름"],
    required: true,
  },
  {
    type: "radio",
    key: "q18",
    title: "Q18. 어떤 전개 방식이 끌리나요?",
    options: ["빠른 전개", "감정/분위기", "상황마다 다름", "모르겠다"],
    required: true,
  },
  {
    type: "radio",
    key: "q19",
    title: "Q19. 한 컷에서 가장 먼저 보는 요소는?",
    options: [
      "텍스트",
      "표정/포즈",
      "상황/연출",
      "그림체/색감",
      "공감 요소",
      "기타",
    ],
    required: true,
    hasEtc: true,
  },
  {
    type: "radio",
    key: "q20",
    title: "Q20. 컷 기반 가벼운 소비 방식이 맞는가요?",
    options: ["매우 그렇다", "어느정도", "모르겠다", "다르다"],
    required: true,
  },
  {
    type: "text",
    key: "name",
    title: "이름을 알려주세요.",
    required: true,
    min: 1,
  },
  {
    type: "radio",
    key: "age",
    title: "연령대를 선택해주세요.",
    options: ["10대", "20대", "30대", "40대", "50대 이상"],
    required: true,
  },
  {
    type: "textarea",
    key: "message",
    title: "MUMU에게 남기고 싶은 한마디 (10자 이상)",
    required: true,
    min: 10,
  },
];

let currentIndex = 0;
const answers = {};

const surveyScreen = document.getElementById("surveyScreen");
const surveyContainerEl = document.getElementById("surveyContainer");
const progressBar = document.getElementById("progressBar");

const prevBtn = document.getElementById("prevBtn");
const nextBtn = document.getElementById("nextBtn");
const submitBtn = document.getElementById("submitBtn");

/* =======================
   설문 시작
======================= */
function startSurvey() {
  document.getElementById("introScreen").classList.remove("active");
  surveyScreen.classList.add("active");
  renderQuestion();
  updateProgress();
}

/* =======================
   답변 추출
======================= */
function getCurrentAnswer() {
  const q = questions[currentIndex];
  let main = "";
  let etc = "";

  if (q.type === "radio") {
    const sel = document.querySelector(
      `input[name="q${currentIndex}"]:checked`
    );
    main = sel ? sel.value : "";
    if (q.hasEtc && main === "기타") {
      const etcInput = document.getElementById("etcInput");
      etc = etcInput ? etcInput.value.trim() : "";
    }
  }

  if (q.type === "checkbox") {
    const checked = [
      ...document.querySelectorAll(`input[name="q${currentIndex}"]:checked`),
    ];
    main = checked.map((c) => c.value).join(", ");
  }

  if (q.type === "text") {
    const inp = document.getElementById("textInput");
    main = inp ? inp.value.trim() : "";
  }

  if (q.type === "textarea") {
    const ta = document.getElementById("textArea");
    main = ta ? ta.value.trim() : "";
  }

  return { main, etc };
}

/* =======================
   validation
======================= */
function validateCurrent() {
  const q = questions[currentIndex];
  const { main, etc } = getCurrentAnswer();

  if (!q.required) return true;

  if (q.type === "radio") {
    if (!main) return false;
    if (q.hasEtc && main === "기타") return etc.length >= 1;
    return true;
  }

  if (q.type === "checkbox") return !!main;

  if (q.type === "text" || q.type === "textarea") {
    return main.length >= (q.min || 1);
  }

  return true;
}

/* =======================
   save answer
======================= */
function saveCurrentAnswer() {
  const q = questions[currentIndex];
  const { main, etc } = getCurrentAnswer();

  answers[q.key] = main;
  if (q.hasEtc) answers[`${q.key}_etc`] = etc || "";
}

/* =======================
   Render
======================= */
function renderQuestion() {
  const q = questions[currentIndex];
  let html = `<div class="question-title">${q.title}</div>`;

  if (q.type === "radio") {
    q.options.forEach((opt) => {
      html += `
        <label class="option">
          <input type="radio" name="q${currentIndex}" value="${opt}">
          ${opt}
        </label>`;
    });
    if (q.hasEtc) {
      html += `<input id="etcInput" class="text-field" placeholder="기타 이유 입력" style="display:none;">`;
    }
  }

  if (q.type === "checkbox") {
    q.options.forEach((opt) => {
      html += `
        <label class="option">
          <input type="checkbox" name="q${currentIndex}" value="${opt}">
          ${opt}
        </label>`;
    });
  }

  if (q.type === "text") {
    html += `<input id="textInput" class="text-field" type="text">`;
  }

  if (q.type === "textarea") {
    html += `<textarea id="textArea" class="text-area" rows="4"></textarea>`;
  }

  surveyContainerEl.innerHTML = html;

  if (q.hasEtc) {
    document.querySelectorAll(`input[name="q${currentIndex}"]`).forEach((r) => {
      r.addEventListener("change", () => {
        const etcBox = document.getElementById("etcInput");
        etcBox.style.display = r.value === "기타" ? "block" : "none";
      });
    });
  }

  restorePreviousAnswer();

  prevBtn.style.display = currentIndex === 0 ? "none" : "block";
  nextBtn.style.display =
    currentIndex === questions.length - 1 ? "none" : "block";
  submitBtn.style.display =
    currentIndex === questions.length - 1 ? "block" : "none";
}

/* =======================
   Restore
======================= */
function restorePreviousAnswer() {
  const q = questions[currentIndex];
  const saved = answers[q.key];
  const savedEtc = answers[`${q.key}_etc`];

  if (q.type === "radio") {
    const radios = document.querySelectorAll(`input[name="q${currentIndex}"]`);
    radios.forEach((r) => {
      if (r.value === saved) r.checked = true;
    });

    if (q.hasEtc && saved === "기타") {
      const etcInput = document.getElementById("etcInput");
      etcInput.style.display = "block";
      etcInput.value = savedEtc || "";
    }
  }

  if (q.type === "checkbox") {
    if (!saved) return;
    const list = saved.split(",").map((v) => v.trim());
    const boxes = document.querySelectorAll(`input[name="q${currentIndex}"]`);
    boxes.forEach((b) => {
      if (list.includes(b.value)) b.checked = true;
    });
  }

  if (q.type === "text") {
    const inp = document.getElementById("textInput");
    if (saved) inp.value = saved;
  }

  if (q.type === "textarea") {
    const ta = document.getElementById("textArea");
    if (saved) ta.value = saved;
  }
}

/* =======================
   Navigation
======================= */
nextBtn.onclick = () => {
  if (!validateCurrent()) return alert("필수 항목을 입력해주세요.");
  saveCurrentAnswer();
  currentIndex++;
  renderQuestion();
  updateProgress();
};

prevBtn.onclick = () => {
  saveCurrentAnswer();
  currentIndex--;
  renderQuestion();
  updateProgress();
};

function updateProgress() {
  const percent = ((currentIndex + 1) / questions.length) * 100;
  progressBar.style.width = percent + "%";
}

/* =======================
   build payload
======================= */
function buildPayload() {
  const payload = {};

  payload.name = answers.name || "";
  payload.age = answers.age || "";

  for (let i = 1; i <= 20; i++) {
    payload[`q${i}`] = answers[`q${i}`] || "";
  }

  payload.q16_etc = answers.q16_etc || "";
  payload.q19_etc = answers.q19_etc || "";

  payload.message = answers.message || "";

  return payload;
}

/* =======================
   SUBMIT → Google Apps Script
======================= */
submitBtn.onclick = () => {
  if (!validateCurrent()) {
    alert("필수 항목을 입력해주세요.");
    return;
  }

  saveCurrentAnswer();
  const data = buildPayload();

  surveyScreen.classList.remove("active");
  document.getElementById("loadingScreen").classList.add("active");

  // 전달해 주신 새로운 URL 적용
  const GAS_URL =
    "https://script.google.com/macros/s/AKfycby_qExn20VhZv3XjikYWCtp8bdaQkhEBT1EUFSJ5g69WVaorgmXDd_tHk8igKkoy1PHzg/exec";

  fetch(GAS_URL, {
    method: "POST",
    // [중요] headers 라인을 삭제하여 Simple POST 요청으로 보냅니다 (CORS 회피)
    body: JSON.stringify(data),
  })
    .then((res) => res.json())
    .then((r) => {
      console.log("GAS 응답:", r);

      // 성공 여부와 관계없이 JSON 응답이 오면 성공 화면으로 이동
      // (만약 GAS에서 에러 메시지를 보냈을 때 처리를 원하시면 if(r.result === 'success') 조건을 추가하세요)
      setTimeout(() => {
        document.getElementById("loadingScreen").classList.remove("active");
        document.getElementById("endingScreen").classList.add("active");
      }, 500);
    })
    .catch((err) => {
      console.error(err);
      alert("저장 실패. 다시 시도해주세요.");
      document.getElementById("loadingScreen").classList.remove("active");
      surveyScreen.classList.add("active");
    });
};

/* =======================
   ENDING CLOSE
======================= */
function closeEnding() {
  document.getElementById("endingScreen").classList.remove("active");
}

window.startSurvey = startSurvey;
window.closeEnding = closeEnding;
