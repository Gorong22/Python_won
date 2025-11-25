/* -------------------------------------------------------
    웹툰 취향 테스트 - 완전 최종 script.js (안정 패치 버전)
--------------------------------------------------------- */

/* -------------------------------------------------------
    🔥 전역 상태값
--------------------------------------------------------- */
let selectedAge = "";
let selectedGender = "";

function selectAge(age, el) {
  selectedAge = age;
  userData.age = age;

  document
    .querySelectorAll("#age-group .toggle-btn")
    .forEach((btn) => btn.classList.remove("selected"));

  el.classList.add("selected");
}

function selectGender(gender, el) {
  selectedGender = gender;
  userData.gender = gender;

  document
    .querySelectorAll("#gender-group .toggle-btn")
    .forEach((btn) => btn.classList.remove("selected"));

  el.classList.add("selected");
}

let currentStep = 0;
let currentQuestion = 0;
let totalScore = 0;
let answers = [];

let userData = { name: "", age: "", gender: "", email: "" };

/* -------------------------------------------------------
    🔥 질문 20개 (경쟁·발견 기반)
--------------------------------------------------------- */
const questions = [
  {
    q: "요즘 웹툰이 다 비슷하다고 느낄 때가 있어?",
    opt: ["자주 느낌", "가끔 느낌", "별로", "전혀 아님"],
    score: [3, 2, 1, 0],
  },
  {
    q: "클리셰·뻔한 전개가 지루하다고 느껴?",
    opt: ["매우 지루함", "지루함", "보통", "잘 모르겠음"],
    score: [3, 2, 1, 0],
  },
  {
    q: "긴 호흡의 스토리보다 짧고 신선한 게 더 좋아?",
    opt: ["무조건 짧은 게 좋음", "짧은 편이 좋음", "둘 다", "긴 게 더 좋음"],
    score: [3, 2, 1, 0],
  },
  {
    q: "새로운 시도나 실험적인 연출이 많은 작품 어때?",
    opt: ["완전 좋음", "흥미로움", "보통", "별로"],
    score: [3, 2, 1, 0],
  },
  {
    q: "실험적인 작품이 시장에 더 많아져야 한다고 생각해?",
    opt: ["매우 필요", "필요", "보통", "현재도 충분"],
    score: [3, 2, 1, 0],
  },

  {
    q: "SNS 숏툰처럼 빠르게 넘기는 형식 좋아해?",
    opt: ["최애", "상황따라", "보통", "안좋아함"],
    score: [3, 2, 1, 0],
  },
  {
    q: "스크롤로 탁탁 넘기며 보는 템포가 편해?",
    opt: ["매우 편함", "편함", "보통", "불편함"],
    score: [3, 2, 1, 0],
  },
  {
    q: "짧은 에피소드 여러 개가 부담이 덜하다고 느껴?",
    opt: ["완전 덜함", "덜함", "보통", "오히려 피곤"],
    score: [3, 2, 1, 0],
  },
  {
    q: "‘다음화 보기’ 누르는 게 귀찮을 때 있어?",
    opt: ["항상 귀찮음", "가끔 있음", "별로 없음", "전혀 없음"],
    score: [3, 2, 1, 0],
  },
  {
    q: "짧은 이야기 중심 플랫폼이면 이용 빈도 올라갈까?",
    opt: ["매우 올라감", "올라감", "비슷함", "안 올라감"],
    score: [3, 2, 1, 0],
  },

  {
    q: "감성적인 연출·컷·분위기가 중요하다고 느껴?",
    opt: ["매우 중요", "중요", "있으면 좋음", "별로"],
    score: [3, 2, 1, 0],
  },
  {
    q: "남들이 아직 안 본 신선한 작품을 먼저 발견하는 거 좋아해?",
    opt: ["최애 즐거움", "좋아함", "가끔", "별로"],
    score: [3, 2, 1, 0],
  },
  {
    q: "'새로운 분위기/감성' 작품이면 일단 눌러보는 편이야?",
    opt: ["무조건 봄", "대체로 봄", "상황따라", "아님"],
    score: [3, 2, 1, 0],
  },
  {
    q: "B급 감성·특이한 연출도 매력적이라고 느껴?",
    opt: ["진짜 좋음", "흥미로움", "보통", "별로"],
    score: [3, 2, 1, 0],
  },
  {
    q: "작품을 직접 '발견했다'는 느낌을 좋아하는 편이야?",
    opt: ["매우 좋아함", "좋아함", "보통", "안좋아함"],
    score: [3, 2, 1, 0],
  },

  {
    q: "작품끼리 경쟁하고 랭킹 매겨지는 구조, 흥미 있어?",
    opt: ["완전 있음", "있음", "보통", "없음"],
    score: [3, 2, 1, 0],
  },
  {
    q: "내가 투표한 작품이 올라가는 구조, 참여할 의향 있어?",
    opt: ["당연히 참여", "가끔 참여", "보통", "안할 것 같음"],
    score: [3, 2, 1, 0],
  },
  {
    q: "B급/아마추어 경쟁 무대가 있다면 둘러볼 것 같아?",
    opt: ["매우 그렇다", "그렇다", "가끔", "안봄"],
    score: [3, 2, 1, 0],
  },
  {
    q: "실험적인 작품이 매일 쌓이는 플랫폼이면 재방문할까?",
    opt: ["매일 감", "자주 감", "가끔", "비슷함"],
    score: [3, 2, 1, 0],
  },
  {
    q: "독자가 직접 작품 흐름에 영향 주는 경험(투표/랭킹), 좋아해?",
    opt: ["최고임", "좋아함", "보통", "별로"],
    score: [3, 2, 1, 0],
  },
];

/* -------------------------------------------------------
    🔥 DOM 요소
--------------------------------------------------------- */
const introEl = document.getElementById("intro-screen");
const questionEl = document.getElementById("question-screen");
const userEl = document.getElementById("user-info-screen");
const resultEl = document.getElementById("result-screen");

const progressBox = document.getElementById("progress-container");
const progressText = document.getElementById("progress-text");
const progressBar = document.getElementById("progress-bar");

/* -------------------------------------------------------
    🔥 유틸
--------------------------------------------------------- */
function hideAll() {
  introEl.classList.add("hidden");
  questionEl.classList.add("hidden");
  userEl.classList.add("hidden");
  resultEl.classList.add("hidden");
}

function updateProgress() {
  progressText.innerText = `${currentQuestion + 1} / 20`;
  progressBar.style.width = (currentQuestion / 20) * 100 + "%";
}

/* -------------------------------------------------------
    🔥 인트로
--------------------------------------------------------- */
function renderIntro() {
  hideAll();
  introEl.classList.remove("hidden");

  const pages = [
    `
      <div class="card" style="padding:28px 22px; background:white; border-radius:18px; box-shadow:0 6px 22px rgba(0,0,0,0.06);">

  <!-- 1) 후킹 문구 -->
  <div style="font-size:22px; font-weight:700; color:#111; text-align:center; margin-bottom:12px;">
    웹툰, 왜 어떤 건 ‘바로 꽂히고’<br>어떤 건 지루할까?
  </div>

  <!-- 2) 사용자가 공감할 문제 제기 -->
  <div style="font-size:14px; color:#555; text-align:center; line-height:1.65; margin-bottom:22px;">
    같은 웹툰을 봐도 사람마다 <b>몰입하는 지점</b>과<br>
    <b>지루함을 느끼는 순간</b>이 전부 달라요.<br>
    당신은 어떤 타입일까요?
  </div>

  <!-- 3) 이 테스트의 가치 / 하면 뭐가 좋은지 -->
  <div style="
    background:#f5f4ff;
    padding:16px 18px;
    border-radius:14px;
    border:1px solid #ecebff;
    margin-bottom:24px;">
    <div style="font-size:15px; font-weight:600; color:#5A4BFF; margin-bottom:8px;">
      🧩 이 테스트로 알 수 있는 것
    </div>

    <ul style="font-size:13.5px; color:#444; line-height:1.7; padding-left:16px; margin:0;">
      <li>내가 웹툰에서 무엇에 먼저 반응하는지</li>
      <li>지루하게 느끼는 이유가 무엇인지</li>
      <li>어떤 분위기·템포·구성이 나와 맞는지</li>
      <li>B급·숏툰·장편 중 어떤 포맷이 최적화인지</li>
    </ul>

    <div style="font-size:13px; color:#666; margin-top:10px;">
      → 즉, <b>내 웹툰 소비 성향의 ‘정확한 지문’을 알아보는 과정이에요.</b>
    </div>
  </div>

  <!-- 4) 개인정보 안내 -->
  <div style="
    background:#f7f7ff;
    padding:16px 18px;
    border-radius:14px;
    border:1px solid #e5e6ff;
  ">
    <div style="font-size:15px; font-weight:600; color:#5A4BFF; margin-bottom:8px;">
      🔐 개인정보 안내
    </div>
    <div style="font-size:13.5px; color:#555; line-height:1.7;">
      ✔ 이름은 <b>가명</b> 사용 가능해요.<br>
      ✔ 이메일은 리포트 발송용 외로 사용되지 않아요.<br>
      ✔ 모든 정보는 <b>5일 이내 자동 폐기</b>됩니다.<br>
      ✔ 개인정보는 분석 목적 외 절대 활용되지 않아요.
    </div>
  </div>

</div>

<button class="btn" onclick="nextIntro()">다음 ▶</button>

    `,
    `
      <div class="card"><div class="subtitle">사람마다 웹툰을 보는 방식은 완전히 달라요.</div></div>
      <button class="btn" onclick="nextIntro()">다음 ▶</button>
    `,
    `
      <div class="card"><div class="subtitle">짧은 20문항으로<br>당신의 소비 성향을 찾아볼게요!</div></div>
      <button class="btn" onclick="startQuestion()">시작하기 ▶</button>
    `,
  ];

  introEl.innerHTML = pages[currentStep];
}

function nextIntro() {
  currentStep++;
  renderIntro();
}

/* -------------------------------------------------------
    🔥 질문 렌더링
--------------------------------------------------------- */
function startQuestion() {
  hideAll();
  progressBox.classList.remove("hidden");
  questionEl.classList.remove("hidden");

  currentQuestion = 0;
  totalScore = 0;
  answers = [];

  renderQuestion();
}

function renderQuestion() {
  hideAll();
  progressBox.classList.remove("hidden");
  questionEl.classList.remove("hidden");
  updateProgress();

  const q = questions[currentQuestion];

  questionEl.innerHTML = `
    <div class="card">
      <div class="subtitle">${q.q}</div>
      ${q.opt
        .map(
          (o, i) =>
            `<button class="option-btn" onclick="selectOption(${i})">${o}</button>`
        )
        .join("")}
    </div>
    ${
      currentQuestion > 0
        ? `<button class="btn-gray btn" onclick="goPrev()">← 이전 질문</button>`
        : ""
    }
  `;
}

/* -------------------------------------------------------
    🔥 답변 선택
--------------------------------------------------------- */
function selectOption(i) {
  const q = questions[currentQuestion];
  totalScore += q.score[i];
  answers.push(q.opt[i]);

  currentQuestion++;

  if (currentQuestion >= 20) showUserForm();
  else renderQuestion();
}

/* -------------------------------------------------------
    🔥 이전 질문
--------------------------------------------------------- */
function goPrev() {
  if (currentQuestion === 0) return;
  currentQuestion--;
  totalScore -= questions[currentQuestion].score[answers.pop()];
  renderQuestion();
}

/* -------------------------------------------------------
    🔥 사용자 정보 입력 폼
--------------------------------------------------------- */
function showUserForm() {
  hideAll();
  userEl.classList.remove("hidden");
  progressBox.classList.add("hidden");

  userEl.innerHTML = `
    <div class="card">
      <div class="title">사용자 정보 입력</div>
      <input id="name" class="option-btn" placeholder="이름 입력" />
      <div class="subtitle" style="margin-top:20px;">연령대</div>
      <div class="toggle-group" id="age-group">
        <button class="toggle-btn" onclick="selectAge('10대', this)">10대</button>
        <button class="toggle-btn" onclick="selectAge('20대', this)">20대</button>
        <button class="toggle-btn" onclick="selectAge('30대', this)">30대</button>
        <button class="toggle-btn" onclick="selectAge('40대', this)">40대</button>
        <button class="toggle-btn" onclick="selectAge('50대 이상', this)">50대 이상</button>
      </div>

      <div class="subtitle" style="margin-top:16px;">성별</div>
      <div class="toggle-group" id="gender-group">
        <button class="toggle-btn" onclick="selectGender('남', this)">남</button>
        <button class="toggle-btn" onclick="selectGender('여', this)">여</button>
      </div>

      <input id="email" class="option-btn" placeholder="이메일 입력" />
      <button class="btn" onclick="saveUser()">결과 보기 ▶</button>
    </div>
  `;
}

function saveUser() {
  userData.name = document.getElementById("name").value || "익명";
  userData.email = document.getElementById("email").value || "비공개";
  userData.age = selectedAge || "미기입";
  userData.gender = selectedGender || "미기입";

  showResult();
}

/* -------------------------------------------------------
    🔥 결과 화면
--------------------------------------------------------- */
let finalType = "";

function showResult() {
  hideAll();
  resultEl.classList.remove("hidden");
  progressBox.classList.add("hidden");

  let desc = "";
  let recommend = "";

  if (totalScore >= 45) {
    finalType = "A-신선함 사냥꾼";
    desc = `새로운 포맷·작가·분위기를 발견하는 데서 가장 큰 재미를 느끼는 타입!<br>실험작, B급 감성, 경쟁 구조에서도 흥미가 높아요.`;
    recommend = "실험작, B급 감성툰, 신포맷 작품";
  } else if (totalScore >= 32) {
    finalType = "B-템포,속도형";
    desc = `짧고 빠른 템포·스크롤 기반 콘텐츠에 가장 강하게 반응하는 타입!<br>지루한 전개보다 즉시적 재미를 선호해요.`;
    recommend = "짤툰, 숏폼, 빠른 전개의 개그/액션";
  } else if (totalScore >= 22) {
    finalType = "C-감성, 분위기형";
    desc = `컷 구성·분위기·색감 같은 감성 요소에 민감한 타입!<br>감성 연출과 분위기 기반 작품을 좋아해요.`;
    recommend = "감성 연출툰, 힐링툰, 분위기 중심 스토리";
  } else {
    finalType = "D-서사 몰입형";
    desc = `탄탄한 서사·감정선·장편 흐름에 깊게 몰입하는 타입!<br>세계관형·드라마·로맨스를 선호해요.`;
    recommend = "장편 드라마, 감정선 중심 로맨스, 세계관 기반 작품";
  }

  /* 스프레드시트 제출 */
  sendResultToSheet();

  /* 결과 UI 표시 */
  resultEl.innerHTML = `
    <div class="card">
      <div class="title">분석이 완료됐어요!</div>
      <div class="subtitle" style="color:#666; margin-bottom:16px;">
        데이터가 정상적으로 제출되었고,<br>
        이메일 리포트도 함께 발송되었어요 📩<br><br>
        참여해줘서 정말 고마워요!
      </div>
    </div>

    <div class="card">
      <div class="title">${finalType}형 타입 결과</div>
      <div class="subtitle">${desc}</div>
    </div>

    <div class="card">
      <div class="title">📚 추천 장르</div>
      <div class="subtitle">${recommend}</div>
    </div>

    <button class="btn" onclick="share()">공유하기</button>
    <button class="btn-gray btn" onclick="restart()">종료하기</button>
  `;
}

/* -------------------------------------------------------
    🔥 스프레드시트 저장
--------------------------------------------------------- */
function sendResultToSheet() {
  fetch(
    "https://script.google.com/macros/s/AKfycbyncqN3JwpeDaYU-nhJfqKzAS0Y7psnu1440a8j9_cgkeaE2UrqOYY5dhWdnIgqYhD4/exec",
    {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify({
        name: userData.name,
        age: userData.age,
        gender: userData.gender,
        email: userData.email,
        totalScore,
        type: finalType,
        answersTexts: answers,
      }),
    }
  )
    .then((res) => res.text())
    .then((txt) => console.log("🔥 저장 성공:", txt))
    .catch((err) => console.error("❌ 저장 실패:", err));
}

/* -------------------------------------------------------
    🔥 공유 / 종료
--------------------------------------------------------- */
function share() {
  const msg = `${userData.name}님의 웹툰 취향: ${finalType}형`;
  if (navigator.share) {
    navigator.share({ title: "웹툰 취향 테스트", text: msg });
  } else {
    navigator.clipboard.writeText(msg);
    alert("클립보드에 복사했어요!");
  }
}

function restart() {
  location.reload();
}

/* -------------------------------------------------------
    🔥 첫 실행
--------------------------------------------------------- */
renderIntro();
