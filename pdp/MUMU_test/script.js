/* ===========================================
    🔥 iOS 느낌 설문 Script — FULL VERSION
=========================================== */

// -------------------------------
// 로딩 스크린
// -------------------------------
window.onload = () => {
  setTimeout(() => {
    const l = document.getElementById("loading-screen");
    if (!l) return;
    l.style.opacity = "0";
    setTimeout(() => (l.style.display = "none"), 400);
  }, 700);
};

// -------------------------------
// 질문 리스트
// -------------------------------

// A 트랙 — 연재 경험자 (14문항)
const trackA = [
  "처음 연재를 시작한 계기는 무엇인가요?",
  "연재 과정에서 가장 크게 겪었던 플랫폼 구조적 문제는?",
  "독자 반응 패턴 중 아쉬웠던 점이 있었다면?",
  "업로드/관리 툴 사용 시 불편했던 점은?",
  "플랫폼 노출 구조가 작품에 어떤 영향을 미쳤나요?",
  "정해진 규칙(컷/비율/톤) 중 가장 부담되었던 것은?",
  "창작할 때 가장 의욕이 떨어지는 순간은 언제였나요?",
  "지금까지 플랫폼 중 가장 좋았던 점 / 아쉬웠던 점은?",
  "신고·검열·제재 규정이 창작 심리에 준 영향은?",
  "작품 성과가 플랫폼 규칙(노출 방식, 신고/심사, 연출 제한 등)에 좌우된다고 느낀 경험이 있나요?",
  "플랫폼 수익 구조에 대한 만족/불만족 포인트는?",
  "작품이 더 성장하려면 어떤 기능이 필요했다고 느꼈나요?",
  "피드처럼 넘겨보는 방식이면, 작품이 어떤 느낌으로 보일 것 같나요?",
  "기존 플랫폼에서 아쉬웠던 점을 MUMU가 어떻게 채워주면 좋을까요?",
];

// B 트랙 — 지망생 (15문항)
const trackB = [
  "창작을 결심하게 된 계기는 무엇인가요?",
  "연재를 시작하지 못한 가장 큰 이유는?",
  "작품을 올릴 플랫폼을 결정하지 못한 이유는",
  "웹툰 앱 쓰면서 제일 답답한 순간은",
  "창작 및 출품 과정에서 가장 어려운 단계는?",
  "만들고 싶은 콘텐츠의 장르 및 형식은?",
  "SNS에 콘텐츠 업로드 경험이 있다면 어떤 점이 좋았고, 어떤 점이 불편했는지?",
  "공개할 때 가장 걱정되는 점은?",
  "형식 제한이 없다면 어떤 시도를 해보고 싶나요?",
  "피드형 노출 시 어떤 모습으로 보이고 싶나요?",
  "창작에 가장 필요한 환경은 무엇인가요?",
  "독자에게 가장 전달하고 싶은 감정이나 메시지는 무엇인가요?",
  "플랫폼 분위기(댓글·피드백 문화)가 작품 감상에 영향을 준 적이 있나요?",
  "단계형 수익 구조가 동기부여가 되나요?(아직 구상중인 구조이며 좋은 의견 있으시면 부탁드립니다!) (1단계 독자 후원 -> 2단계 광고 + 유료회차 + 후원 -> 3단계 홍보 + 굿즈 + 해외 진출 지원)",
  "기존 플랫폼에서 아쉬웠던 점을 MUMU가 어떻게 채워주면 좋을까요?",
];

// -------------------------------
// 상태값
// -------------------------------
let questions = [];
let current = 0;
let answers = {};
let selectedTrack = "";
let uploadInterest = "";

// -------------------------------
// 설문 시작
// -------------------------------
function startSurvey() {
  const track = document.querySelector("input[name='track']:checked");
  const upload = document.querySelector("input[name='upload']:checked");

  if (!track) return alert("연재 경험 여부를 선택해주세요.");
  if (!upload) return alert("습작 업로드 여부를 선택해주세요.");

  selectedTrack = track.value; // "A" 또는 "B"
  uploadInterest = upload.value; // "yes" / "no"

  questions = selectedTrack === "A" ? trackA : trackB;

  document.getElementById("intro").style.display = "none";
  document.getElementById("gauge").style.display = "block";
  document.getElementById("questionCard").style.display = "block";

  current = 0;
  loadQuestion();
}

// -------------------------------
// 질문 로드
// -------------------------------
function loadQuestion() {
  const title = document.getElementById("questionTitle");
  const text = document.getElementById("questionText");
  const answerBox = document.getElementById("answerBox");
  const charCount = document.getElementById("charCount");

  title.innerText = `Q${current + 1}`;
  text.innerText = questions[current];

  answerBox.value = "";
  charCount.innerText = "0 / 10";

  const progress = ((current + 1) / questions.length) * 100;
  document.getElementById("gaugeFill").style.width = `${progress}%`;

  const card = document.getElementById("questionCard");
  card.style.opacity = "0";
  card.style.transform = "translateY(6px)";
  setTimeout(() => {
    card.style.opacity = "1";
    card.style.transform = "translateY(0)";
  }, 50);

  attachCharCountListener();
}

// -------------------------------
// 글자수 카운트
// -------------------------------
function attachCharCountListener() {
  const answerBox = document.getElementById("answerBox");
  const charCount = document.getElementById("charCount");

  answerBox.oninput = () => {
    const len = answerBox.value.trim().length;
    charCount.innerText = `${len} / 10`;
  };
}

// -------------------------------
// 다음 질문
// -------------------------------
function nextQuestion() {
  const ans = document.getElementById("answerBox").value.trim();
  if (ans.length < 10) {
    alert("최소 10글자 이상 입력해주세요!");
    return;
  }

  answers[`Q${current + 1}`] = ans;

  if (current < questions.length - 1) {
    current++;
    loadQuestion();
  } else {
    document.getElementById("questionCard").style.display = "none";
    document.getElementById("finalCard").style.display = "block";
  }
}

// -------------------------------
// 이전 질문
// -------------------------------
function prevQuestion() {
  if (current > 0) {
    current--;
    loadQuestion();
  }
}

// -------------------------------
// Apps Script URL
// -------------------------------
const APPS_SCRIPT_URL =
  "https://script.google.com/macros/s/AKfycbw-nwA7hquirYlkcNxHOBNmKck9IFt6c30EZOvSYyxfTNFc5iCSH6xqfc95zg0-EHjQ/exec";

// -------------------------------
// 제출 - FormData 방식 (Apps Script 100% 호환)
// -------------------------------
function submitForm() {
  const name = document.getElementById("nameInput").value.trim();
  const email = document.getElementById("emailInput").value.trim();
  const gender = document.getElementById("genderInput").value;
  const age = document.getElementById("ageInput").value;

  const loading = document.getElementById("submitLoading");
  if (loading) loading.style.display = "flex";

  const formData = new FormData();
  formData.append("timestamp", new Date().toISOString());
  formData.append("track", selectedTrack);
  formData.append("upload", uploadInterest);
  formData.append("name", name);
  formData.append("email", email);
  formData.append("gender", gender);
  formData.append("age", age);
  formData.append("answers", JSON.stringify(answers));

  fetch(APPS_SCRIPT_URL, {
    method: "POST",
    mode: "no-cors",
    body: formData,
  })
    .then(() => {
      if (loading) loading.style.display = "none";

      document.getElementById("finalCard").style.display = "none";
      const thank = document.getElementById("thankCard");
      thank.style.display = "block";
      thank.style.opacity = "0";

      setTimeout(() => (thank.style.opacity = "1"), 30);
    })
    .catch((err) => {
      console.error("전송 오류:", err);
      alert("전송 중 문제가 발생했습니다. 다시 시도해주세요!");
    });
}
