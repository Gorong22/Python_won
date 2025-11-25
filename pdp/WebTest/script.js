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

let currentStep = 0; // 0~2 인트로 컷
let currentQuestion = 0; // 0~19 (20문항)
let totalScore = 0; // 점수 합산
let answers = []; // 사용자 답변 저장

let userData = {
  name: "",
  age: "",
  gender: "",
  email: "",
};

/* -------------------------------------------------------
    🔥 질문 20개 (경쟁·발견 기반)
--------------------------------------------------------- */
const questions = [
  {
    q: "웹툰을 볼 때 가장 중요한 건 뭐야?",
    opt: [
      "템포 빠른 전개",
      "재미있는 아이디어",
      "익숙한 안정감",
      "그림체 퀄리티",
    ],
    score: [3, 2, 1, 0],
  },
  {
    q: "짧은 숏툰을 보면 보통?",
    opt: ["계속 이어서 몰아봄", "몇 개 정도만", "한두 개만", "거의 안봄"],
    score: [3, 2, 1, 0],
  },
  {
    q: "SNS 숏툰/짤툰에서 재밌는 걸 보면?",
    opt: [
      "바로 작가/작품 찾아봄",
      "비슷한 것 더 찾아봄",
      "몇 개만 보고 나감",
      "그냥 지나침",
    ],
    score: [3, 2, 1, 0],
  },
  {
    q: "웹툰 제목이나 표지에서 어떤 게 끌려?",
    opt: ["병맛/센스 폭발", "짧은 느낌", "섬세한 감정선", "탄탄한 세계관"],
    score: [3, 2, 1, 0],
  },
  {
    q: "랭킹 시스템이 있다면?",
    opt: ["자주 확인함", "가끔 확인", "있으면 좋고 없어도 OK", "안 봄"],
    score: [3, 2, 1, 0],
  },
  {
    q: "좋아하는 작품이 급상승 1위 하면?",
    opt: [
      "개뿌듯, 친구한테 공유함",
      "기분 좋아짐",
      "오 그렇구나~",
      "신경 안 씀",
    ],
    score: [3, 2, 1, 0],
  },
  {
    q: "작품 승격/강등 같은 경쟁 요소는?",
    opt: ["너무 재밌음", "있으면 더 봄", "크게 상관없음", "부담됨"],
    score: [3, 2, 1, 0],
  },
  {
    q: "짧은 컷툰이 좋은 이유는?",
    opt: [
      "빨리 보고 넘길 수 있음",
      "몰아서 보기 좋음",
      "부담 없어서",
      "잘 모르겠음",
    ],
    score: [3, 2, 1, 0],
  },
  {
    q: "웹툰 볼 때 주로?",
    opt: [
      "발견 → 여러 작품 탐색",
      "하나 골라서 집중",
      "추천 위주",
      "아무거나 보는 편",
    ],
    score: [3, 2, 1, 0],
  },
  {
    q: "새로운 작품을 발견하면?",
    opt: [
      "바로 여러 화 읽어봄",
      "일단 저장",
      "평점 보고 결정",
      "거의 안 눌러봄",
    ],
    score: [3, 2, 1, 0],
  },
  {
    q: "평소 웹툰 저장/스크랩은?",
    opt: ["많이 함", "가끔 함", "거의 안 함", "안 함"],
    score: [3, 2, 1, 0],
  },
  {
    q: "짧아도 잘 만든 웹툰은?",
    opt: ["최애 취향임", "좋아하는 편", "가끔 좋음", "짧은 건 별로"],
    score: [3, 2, 1, 0],
  },
  {
    q: "완결보다 중요한 건?",
    opt: ["한 컷의 임팩트", "빠른 전개", "감정 몰입", "세계관 깊이"],
    score: [3, 2, 1, 0],
  },
  {
    q: "주간 연재 기달리는 건?",
    opt: ["못 기다림", "조금 기다림", "기다릴 수 있음", "오히려 기다림"],
    score: [3, 2, 1, 0],
  },
  {
    q: "좋아하는 장르는?",
    opt: ["병맛/개그", "로맨스/힐링", "서스펜스", "판타지/액션"],
    score: [3, 2, 1, 0],
  },
  {
    q: "웹툰 볼 때 몰입 포인트는?",
    opt: ["한 컷의 빵 터짐", "감정선", "스토리 구성", "세계관"],
    score: [3, 2, 1, 0],
  },
  {
    q: "신작이 많다면?",
    opt: ["바로 탐색함", "평점 먼저 봄", "추천만 봄", "기존 것만 봄"],
    score: [3, 2, 1, 0],
  },
  {
    q: "짧은 웹툰 플랫폼이라면?",
    opt: ["매일 들어감", "자주 들어옴", "가끔 들어옴", "변화 없음"],
    score: [3, 2, 1, 0],
  },
  {
    q: "웹툰 볼 때 가장 싫은 것은?",
    opt: ["루즈한 전개", "감정 과몰입", "복잡한 세계관", "짧아도 감정 부족"],
    score: [3, 2, 1, 0],
  },
  {
    q: "좋아하는 웹툰을 친구에게 소개한다면?",
    opt: ["짤/컷부터 보여줌", "재미 부분 강조", "감정선 강조", "스토리 설명"],
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
  const percent = (currentQuestion / 20) * 100;
  progressBar.style.width = percent + "%";
}

/* -------------------------------------------------------
    🔥 1) 인트로 3컷 렌더링
--------------------------------------------------------- */
function renderIntro() {
  hideAll();
  introEl.classList.remove("hidden");

  const pages = [
    `
      <div class="card" style="
  padding:28px 22px;
  background:white;
  border-radius:18px;
  box-shadow:0 6px 22px rgba(0,0,0,0.06);
  font-family:'Noto Sans KR', sans-serif;
">

  <!-- 제목 -->
  <div style="font-size:24px; font-weight:700; color:#111; text-align:center; margin-bottom:22px;">
    웹툰 취향 테스트
  </div>

  <!-- 섹션 1 : 어떤 테스트인지 -->
  <div style="margin-bottom:22px;">
    <div style="font-size:15px; font-weight:600; color:#5A4BFF; margin-bottom:8px;">
      📘 어떤 테스트인가요?
    </div>
    <div style="font-size:14px; line-height:1.65; color:#444;">
      사람마다 웹툰을 볼 때 <b>끌리는 포인트</b>는 모두 달라요.<br>
      이 테스트는 인지심리 기반으로  
      <b>당신만의 감정 리듬과 몰입 패턴</b>을 간단히 분석해 드립니다.
    </div>
  </div>

  <!-- 섹션 2 : 구성 & 소요 시간 -->
  <div style="margin-bottom:22px;">
    <div style="font-size:15px; font-weight:600; color:#5A4BFF; margin-bottom:8px;">
      ⏱ 구성 & 소요 시간
    </div>
    <div style="font-size:14px; line-height:1.7; color:#444;">
      ✔ 총 <b>20문항</b>  
      ✔ 약 <b>2~3분</b> 소요  
      ✔ 어떤 연출·감정선에서 몰입하는지 파악 가능
    </div>
  </div>

  <!-- 섹션 3 : 분석되는 내용 -->
  <div style="margin-bottom:24px;">
    <div style="font-size:15px; font-weight:600; color:#5A4BFF; margin-bottom:8px;">
      🔍 어떤 내용이 분석되나요?
    </div>

    <ul style="font-size:14px; color:#444; line-height:1.7; padding-left:18px; margin:0;">
      <li>어떤 순간에 웹툰을 찾는지</li>
      <li>어떤 포인트에서 흥미를 느끼는지</li>
      <li>어떤 감정선·연출 방식과 잘 맞는지</li>
      <li>어떤 포맷(컷툰·숏툰·장편)에 적합한지</li>
    </ul>
  </div>

  <!-- 섹션 4 : 개인정보 안내 -->
  <div style="
    background:#f7f7ff;
    padding:16px 18px;
    border-radius:14px;
    border:1px solid #eee;
  ">
    <div style="font-size:15px; font-weight:600; color:#5A4BFF; margin-bottom:6px;">
      🔐 개인정보 안내
    </div>

    <div style="font-size:13.5px; color:#555; line-height:1.7;">
      ✔ 이름은 <b>가명</b> 사용 가능해요.<br>
      ✔ 심층 리포트를 받고 싶으시면 이메일을 입력해 주세요.<br>
      ✔ 리포트가 필요 없으면 <b>임의의 이메일</b>을 적어도 괜찮습니다.<br>
      ✔ 입력하신 정보는 분석 외 용도로 사용되지 않으며<br>
      <b>5일 이내 자동 폐기</b>됩니다.
    </div>
  </div>

</div>


      <button class="btn" onclick="nextIntro()">다음 ▶</button>
    `,
    `
      <div class="card">
        <div class="subtitle">
          웹툰은 사람마다<br>  
          재미를 느끼는 포인트가 완전히 달라요!  
        </div>
      </div>
      <button class="btn" onclick="nextIntro()">다음 ▶</button>
    `,
    `
      <div class="card">
        <div class="subtitle">
          이제부터 20개의 짧은 질문으로<br>
          당신의 웹툰 소비 스타일을<br>
          정확하게 찾아볼게요!
        </div>
      </div>
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
    🔥 2) 질문 화면 렌더링
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

  // ✔ 숫자가 아니라 선택한 "텍스트"를 저장
  answers.push(q.opt[i]);

  currentQuestion++;
  if (currentQuestion >= 20) {
    showUserForm();
  } else {
    renderQuestion();
  }
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
    🔥 3) 사용자 정보 입력
--------------------------------------------------------- */
function showUserForm() {
  hideAll();
  userEl.classList.remove("hidden");
  progressBox.classList.add("hidden");

  userEl.innerHTML = `
    <div class="card">
      <div class="title">사용자 정보 입력</div>

      <input id="name" class="option-btn" placeholder="이름 입력" />

      <!-- 연령대 -->
      <div class="subtitle" style="margin-top:20px;">연령대 선택</div>
      <div class="toggle-group" id="age-group">
        <button class="toggle-btn" onclick="selectAge('10대', this)">10대</button>
        <button class="toggle-btn" onclick="selectAge('20대', this)">20대</button>
        <button class="toggle-btn" onclick="selectAge('30대', this)">30대</button>
        <button class="toggle-btn" onclick="selectAge('40대', this)">40대</button>
        <button class="toggle-btn" onclick="selectAge('50대 이상', this)">50대 이상</button>
      </div>

      <!-- 성별 -->
      <div class="subtitle" style="margin-top:16px;">성별 선택</div>
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
    🔥 4) 결과 화면
--------------------------------------------------------- */

let finalType = ""; // 저장용

function showResult() {
  hideAll();
  resultEl.classList.remove("hidden");
  progressBox.classList.add("hidden");

  let desc = "";
  let recommend = "";

  if (totalScore >= 45) {
    finalType = "A";
    desc = `
      짧고 빠른 전개, 빵 터지는 포인트를 사랑하는 타입!<br>
      짤툰·숏툰에서 강한 몰입을 보이는 사람이야.
    `;
    recommend = "병맛 개그, 짧은 포맷, 센스 폭발 웹툰";
  } else if (totalScore >= 32) {
    finalType = "B";
    desc = `
      새로운 웹툰을 찾는 걸 좋아하고,<br>
      여러 작품을 스크롤하며 취향을 찾는 스타일!
    `;
    recommend = "트렌딩 숏툰, 실험적 아이디어 웹툰";
  } else if (totalScore >= 22) {
    finalType = "C";
    desc = `
      부담 없이 보는 가벼운 유머와<br>
      편안한 분위기의 작품을 좋아하는 유형!
    `;
    recommend = "힐링 개그, 일상툰, 간단 스토리";
  } else {
    finalType = "D";
    desc = `
      짧은 컷보다 탄탄한 감정선과<br>
      이야기가 있는 작품을 선호하는 타입!
    `;
    recommend = "로맨스/드라마 장르, 감성적 스토리";
  }

  /* 🔥 스프레드시트 제출 */
  sendResultToSheet();

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
    🔥 스프레드시트 저장 (Apps Script 연동)
--------------------------------------------------------- */

function sendResultToSheet() {
  fetch(
    "https://script.google.com/macros/s/AKfycbyjmmm7C9Z79DKz0a0KblMdK9c6xaNbf74tHB8OpTVth9ydG11sx7AL6ONPXmGNGO9t/exec",
    {
      method: "POST",
      headers: {
        "Content-Type": "text/plain;charset=utf-8", // ★ preflight 방지 핵심
      },
      body: JSON.stringify({
        name: userData.name,
        age: userData.age,
        gender: userData.gender,
        email: userData.email,
        totalScore: totalScore,
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
  const msg = `${userData.name}님의 웹툰 취향: ${totalScore}`;
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
