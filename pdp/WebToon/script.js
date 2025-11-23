/* ------------------------------
   질문 리스트 (독자)
------------------------------ */
const readerQuestions = [
  "웹툰을 보다가 지루하거나 피곤해지는 순간이 언제예요?",
  "그 지루함/피곤함을 느끼게 만든 요인은 뭐였던 것 같아요?",
  "그 순간, 웹툰 말고는 뭐가 더 보고 싶어졌나요?",
  "왜 그게 더 당겼던 것 같아요?",
  "그 콘텐츠에서만 느꼈던 재미가 무엇이라고 생각하나요?",
  "그 ‘재미’를 웹툰에서는 거의 못 느낀 이유는 뭐라고 생각해요?",
  "SNS(인스타그램)에서 짧은 웹툰을 자주 보시나요?",

  // 선택형
  "최근에는 긴 웹툰을 선호하시나요, 짧은 웹툰을 선호하시나요?",

  // 분기
  "짧은 웹툰을 자주 보는 이유는 어떤 매력이 있다고 생각하시나요?", // index 8
  "긴 웹툰을 자주 보는 이유는 어떤 매력 때문이라고 생각하시나요?", // index 9

  // 공통
  "좋아하는 작가와는 어떤 방식으로 소통하고 싶으신가요?",
  "웹툰을 만들 수 있는 간단한 툴이 있다면, 도전해볼 의향이 있는지, 그리고 웹툰시장에 바라는 점이 있다면?",
];

/* ------------------------------
   질문 리스트 (창작자)
------------------------------ */
const creatorQuestions = [
  "짧은 콘텐츠를 만들 때 진짜 목적이 뭐였어요?",
  "네이버 웹툰 같은 플랫폼에 도전해본 적이 있나요? 왜 어려웠나요?",
  "대형 웹툰 플랫폼의 문제점은 무엇인가요?",
  "SNS 올릴 때 반응이 가장 빨랐던 형식은?",
  "SNS 업로드 시 불편했던 점은?",
  "완성도 낮아도 반응 좋았던 경험이 있었나요?",
  "웹툰 제작 시 가장 힘든 점은?",
  "기존 플랫폼 UI 때문에 연출이 어려웠던 경험은?",

  // 분기 1
  "웹툰 만드는 걸 더 쉽게 도와주는 툴(혹은 플랫폼)이 있다면, 거기서 창작을 시작해볼 의향이 있나요?", // 선택형
  "왜 그렇게 생각하시나요?", // 이유

  // 분기 2
  "조회수 기반 정산 플랫폼이 있다면 옮길 의향이 있나요?", // 선택형
  "왜 그렇게 생각하시나요?", // 이유

  // 마지막
  "수익 정산 방식과 앞으로의 웹툰 시장에 바라는 점은 무엇인가요?",
];

/* ------------------------------
   상태
------------------------------ */
let mode = "";
let questions = [];
let index = 0;
let answers = [];
let readerChoice = "";
let creatorToolChoice = "";
let creatorMoveChoice = "";

/* ------------------------------
   DOM
------------------------------ */
const loadingScreen = document.getElementById("loading-screen");
const startScreen = document.getElementById("start-screen");
const questionBox = document.getElementById("question-box");
const choiceBox = document.getElementById("choice-box");
const answerInput = document.getElementById("answer-input");
const nextBtn = document.getElementById("next-btn");
const prevBtn = document.getElementById("prev-btn");
const progressWrap = document.getElementById("progress-wrap");
const progressText = document.getElementById("progress-text");
const progressFill = document.getElementById("progress-fill");
const metaForm = document.getElementById("meta-form");
const submitLoading = document.getElementById("submit-loading");
const thankYou = document.getElementById("thank-you");

/* ------------------------------
   초기 로딩
------------------------------ */
document.addEventListener("DOMContentLoaded", () => {
  setTimeout(() => {
    loadingScreen.style.display = "none";
    startScreen.style.display = "block";
  }, 700);
});

/* ------------------------------
   역할 선택
------------------------------ */
document.querySelectorAll(".bubble-option").forEach((btn) => {
  btn.addEventListener("click", () => {
    mode = btn.dataset.mode;
    questions = mode === "reader" ? readerQuestions : creatorQuestions;

    index = 0;
    answers = [];
    readerChoice = "";
    creatorToolChoice = "";
    creatorMoveChoice = "";

    startScreen.style.display = "none";
    questionBox.style.display = "block";
    progressWrap.style.display = "block";
    answerInput.style.display = "block";
    nextBtn.style.display = "block";
    prevBtn.style.display = "block";
    prevBtn.disabled = true;

    updateProgress();
    setQuestion();
  });
});

/* ------------------------------
   진행률
------------------------------ */
function updateProgress() {
  progressText.innerText = `${index + 1} / ${questions.length}`;
  progressFill.style.width = ((index + 1) / questions.length) * 100 + "%";
}

/* ------------------------------
   선택 UI
------------------------------ */
function showChoices(list, callback) {
  choiceBox.innerHTML = "";
  choiceBox.style.display = "flex";
  answerInput.style.display = "none";
  nextBtn.style.display = "none";

  list.forEach((txt) => {
    const div = document.createElement("div");
    div.className = "choice-item";
    div.innerText = txt;
    div.addEventListener("click", () => callback(txt));
    choiceBox.appendChild(div);
  });
}

/* ------------------------------
   질문 + 분기
------------------------------ */
function setQuestion() {
  const q = questions[index];
  questionBox.innerText = q;

  choiceBox.style.display = "none";
  answerInput.style.display = "block";
  nextBtn.style.display = "block";

  /* ----- reader 분기 (건들지 않음) ----- */
  if (mode === "reader" && index === 7) {
    showChoices(["짧은 웹툰", "긴 웹툰"], (v) => {
      readerChoice = v;
      answers[7] = v;
      index = v === "짧은 웹툰" ? 8 : 9;
      updateProgress();
      setQuestion();
    });
    return;
  }

  /* ----- creator 분기 1 ----- */
  if (mode === "creator" && index === 8) {
    showChoices(["있다", "없다"], (v) => {
      creatorToolChoice = v;
      answers[8] = v;
      index = 9; // 이유 질문으로 이동
      updateProgress();
      setQuestion();
    });
    return;
  }

  /* ----- creator 분기 2 ----- */
  if (mode === "creator" && index === 10) {
    showChoices(["있다", "없다"], (v) => {
      creatorMoveChoice = v;
      answers[10] = v;
      index = 11; // 이유 질문
      updateProgress();
      setQuestion();
    });
    return;
  }

  answerInput.value = answers[index] || "";
}

/* ------------------------------
   다음 버튼
------------------------------ */
nextBtn.addEventListener("click", () => {
  const val = answerInput.value.trim();
  if (val.length < 10) return alert("10자 이상 입력해주세요!");

  answers[index] = val;

  /* reader 분기 이동 */
  if (mode === "reader") {
    if (readerChoice === "짧은 웹툰" && index === 8) {
      index = 10;
      updateProgress();
      setQuestion();
      return;
    }
    if (readerChoice === "긴 웹툰" && index === 9) {
      index = 10;
      updateProgress();
      setQuestion();
      return;
    }
  }

  /* creator 기본 흐름 */
  if (index < questions.length - 1) {
    index++;
    prevBtn.disabled = index === 0;
    updateProgress();
    setQuestion();
  } else {
    showMetaForm();
  }
});

/* ------------------------------
   이전 버튼
------------------------------ */
prevBtn.addEventListener("click", () => {
  if (index === 0) return;

  answers[index] = answerInput.value.trim();

  /* reader 분기 복원 */
  if (mode === "reader") {
    if (readerChoice === "짧은 웹툰") {
      if (index === 10) {
        index = 8;
        updateProgress();
        setQuestion();
        return;
      }
      if (index === 8) {
        index = 7;
        updateProgress();
        setQuestion();
        return;
      }
    }

    if (readerChoice === "긴 웹툰") {
      if (index === 10) {
        index = 9;
        updateProgress();
        setQuestion();
        return;
      }
      if (index === 9) {
        index = 7;
        updateProgress();
        setQuestion();
        return;
      }
    }
  }

  /* creator 분기 복원 */
  if (mode === "creator") {
    if (index === 9) {
      index = 8;
      updateProgress();
      setQuestion();
      return;
    }
    if (index === 11) {
      index = 10;
      updateProgress();
      setQuestion();
      return;
    }
  }

  index--;
  updateProgress();
  setQuestion();
});

/* ------------------------------
   메타폼
------------------------------ */
function showMetaForm() {
  questionBox.style.display = "none";
  answerInput.style.display = "none";
  choiceBox.style.display = "none";
  nextBtn.style.display = "none";
  prevBtn.style.display = "none";
  progressWrap.style.display = "none";

  metaForm.style.display = "block";
}

/* ------------------------------
   제출
------------------------------ */
document.getElementById("submit-btn").addEventListener("click", () => {
  const payload = {
    mode,
    answers,
    name: document.getElementById("name-input").value.trim(),
    age: document.getElementById("age-select").value,
    gender: document.getElementById("gender-select").value,
    email: document.getElementById("email-input").value.trim(),
  };

  if (!payload.name || !payload.age || !payload.gender || !payload.email) {
    return alert("모든 정보를 입력해주세요!");
  }

  metaForm.style.display = "none";
  submitLoading.style.display = "flex";

  fetch(
    "https://script.google.com/macros/s/AKfycbzGZHGlhUUSb3sO5Frx89DD8gWWKdjQRTmaF2jl7btD2CmwVbVuWPo4fAZRPO2WsNmdfw/exec",
    {
      method: "POST",
      body: JSON.stringify(payload),
    }
  )
    .then(() => {
      submitLoading.style.display = "none";
      thankYou.style.display = "block";
    })
    .catch(() => alert("전송 중 문제가 발생했습니다."));
});

/* ------------------------------
   공유/종료
------------------------------ */
document.getElementById("share-btn").addEventListener("click", () => {
  if (navigator.share) {
    navigator.share({
      title: "웹툰 인터뷰",
      text: "웹툰 독자·창작자 인터뷰에 참여해보세요!",
      url: location.href,
    });
  } else {
    navigator.clipboard.writeText(location.href);
    alert("링크 복사 완료!");
  }
});

document.getElementById("finish-btn").addEventListener("click", () => {
  window.close();
});
