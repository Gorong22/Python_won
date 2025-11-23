/* ------------------------------
   질문 리스트 (독자용)
------------------------------ */
const readerQuestions = [
  "웹툰을 보다가 지루하거나 피곤해지는 순간이 언제예요?",
  "그 지루함/피곤함을 느끼게 만든 요인은 뭐였던 것 같아요?",
  "그 순간, 웹툰 말고는 뭐가 더 보고 싶어졌나요?",
  "왜 그게 더 당겼던 것 같아요?",
  "그 콘텐츠에서만 느꼈던 재미가 무엇이라고 생각하나요? 왜 그런가요?",
  "그 ‘재미’를 웹툰에서는 거의 못 느낀 이유는 뭐라고 생각해요?",
  "SNS(인스타그램)에서 짧은 형태의 웹툰을 자주 보시는 편인가요?",
  "최근에는 긴 웹툰을 선호하시나요, 짧은 웹툰을 선호하시나요?",
  "짧은 웹툰을 자주 보는 이유는 어떤 매력이 있다고 생각하시나요?",
  "긴 웹툰을 자주 보신다면 이유가 무엇인가요?",
  "좋아하는 작가와는 어떤 방식으로 소통하고 싶으신가요?",
  "웹툰을 만들 수 있는 간단한 툴이 있다면, 도전해볼 의향이 있나요?",
];

/* ------------------------------
       질문 리스트 (창작 관심자용)
    ------------------------------ */
const creatorQuestions = [
  "짧은 콘텐츠(짤/툰/밈/감정컷 등)를 만들 때 진짜 목적이 뭐였어요?",
  "네이버 웹툰 같은 대형 플랫폼에 도전해본 적이 있나요? 왜 어려웠나요?",
  "지금 생각했을 때, 대형 플랫폼 및 웹툰 플랫폼들의 문제가 뭐라고 생각하세요?",
  "SNS에 올린 콘텐츠 중 반응이 제일 빨랐던 형식은 뭐였나요?",
  "SNS에 올릴 때 불편했던 점은 뭐였어요?",
  "완성도 낮았는데 더 반응 좋았던 경험이 있나요?",
  "기존 웹툰 플랫폼 UI가 연출하는 데 방해된 적이 있었나요?",
  "웹툰을 그릴 때 어떤 점이 가장 힘드셨나요?",
  "그 부분을 도와주는 툴이 있다면 창작 활동을 더 하실 의향이 있나요?",
  "조회수 기반 정산이 가능한 플랫폼이 있다면 옮길 의향이 있나요?",
  "없다면 그 이유는 무엇인가요?",
  "수익 정산에 바라는 점이 있다면 말씀해주세요.",
];

/* ------------------------------
       상태값
    ------------------------------ */
let mode = "";
let questions = [];
let index = 0;
let answers = [];

/* ------------------------------
       DOM 요소
    ------------------------------ */
const loadingScreen = document.getElementById("loading-screen");
const startScreen = document.getElementById("start-screen");
const questionBox = document.getElementById("question-box");
const answerInput = document.getElementById("answer-input");
const nextBtn = document.getElementById("next-btn");
const prevBtn = document.getElementById("prev-btn");
const metaForm = document.getElementById("meta-form");
const thankYou = document.getElementById("thank-you");
const progressWrap = document.getElementById("progress-wrap");
const progressText = document.getElementById("progress-text");
const progressFill = document.getElementById("progress-fill");
const submitLoading = document.getElementById("submit-loading");

/* ------------------------------
       로딩 → 시작 화면
    ------------------------------ */
document.addEventListener("DOMContentLoaded", () => {
  setTimeout(() => {
    loadingScreen.style.display = "none";
    startScreen.style.display = "block";
  }, 800);
});

/* ------------------------------
       역할 선택
    ------------------------------ */
document.querySelectorAll(".bubble-option").forEach((option) => {
  option.addEventListener("click", () => {
    mode = option.dataset.mode;
    questions = mode === "reader" ? readerQuestions : creatorQuestions;

    answers = [];
    index = 0;

    startScreen.style.display = "none";
    questionBox.style.display = "block";
    answerInput.style.display = "block";
    nextBtn.style.display = "block";
    prevBtn.style.display = "block";
    progressWrap.style.display = "block";

    prevBtn.disabled = true;

    updateProgress();
    setQuestion(questions[index]);
  });
});

/* ------------------------------
       진행률 업데이트
    ------------------------------ */
function updateProgress() {
  const total = questions.length;
  progressText.innerText = `${index + 1} / ${total}`;
  const percent = ((index + 1) / total) * 100;
  progressFill.style.width = percent + "%";
}

/* ------------------------------
       질문 페이드 전환
    ------------------------------ */
function setQuestion(text) {
  questionBox.classList.add("fade");
  setTimeout(() => {
    questionBox.innerText = text;
    questionBox.classList.remove("fade");
  }, 200);
}

/* ------------------------------
       다음 버튼
    ------------------------------ */
nextBtn.addEventListener("click", () => {
  const val = answerInput.value.trim();
  if (!val) return alert("답변을 입력해주세요!");
  if (val.length < 10) return alert("10자 이상 작성해주세요!");

  answers[index] = val;

  if (index < questions.length - 1) {
    index++;
    updateProgress();
    setQuestion(questions[index]);
    answerInput.value = answers[index] || "";
    prevBtn.disabled = index === 0;
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
  index--;

  updateProgress();
  setQuestion(questions[index]);
  answerInput.value = answers[index] || "";
  prevBtn.disabled = index === 0;
});

/* ------------------------------
       엔터 → 다음
    ------------------------------ */
answerInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    if (answerInput.value.trim().length < 10) {
      alert("10자 이상 작성해주세요!");
      return;
    }
    nextBtn.click();
  }
});

/* ------------------------------
       메타폼 표시
    ------------------------------ */
function showMetaForm() {
  questionBox.style.display = "none";
  answerInput.style.display = "none";
  nextBtn.style.display = "none";
  prevBtn.style.display = "none";
  progressWrap.style.display = "none";

  metaForm.style.display = "block";
}

/* ------------------------------
       제출하기
    ------------------------------ */
document.getElementById("submit-btn").addEventListener("click", () => {
  const name = document.getElementById("name-input").value.trim();
  const age = document.getElementById("age-select").value;
  const gender = document.getElementById("gender-select").value;
  const email = document.getElementById("email-input").value.trim();

  if (!name || !age || !gender || !email) {
    return alert("모든 항목을 입력해주세요!");
  }

  const payload = {
    mode: mode === "reader" ? "독자" : "창작 관심",
    answers,
    name,
    age,
    gender,
    email,
  };

  metaForm.style.display = "none";
  submitLoading.style.display = "flex";

  fetch(
    "https://script.google.com/macros/s/AKfycbzBRIlBePDVAY2y8qmxKl7MbFEoasqant2h2jmScoBLv-aLUn200IovOe07Hr9Ge5LVYA/exec",
    {
      method: "POST",
      body: JSON.stringify(payload),
    }
  )
    .then((res) => res.text())
    .then(() => {
      submitLoading.style.display = "none";
      thankYou.style.display = "block";
    })
    .catch(() => {
      alert("전송 중 문제가 발생했습니다.");
    });
});

/* ------------------------------
       공유 기능
    ------------------------------ */
document.getElementById("share-btn").addEventListener("click", () => {
  const shareUrl = window.location.href;

  if (navigator.share) {
    navigator
      .share({
        title: "웹툰 인터뷰",
        text: "웹툰 독자·창작 인터뷰에 참여해보세요!",
        url: shareUrl,
      })
      .catch(() => {});
  } else {
    navigator.clipboard.writeText(shareUrl).then(() => {
      alert("링크가 복사되었습니다!");
    });
  }
});

/* ------------------------------
       종료 기능
    ------------------------------ */
document.getElementById("finish-btn").addEventListener("click", () => {
  window.close();
  location.href = "about:blank";
});
