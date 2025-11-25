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
/* 20문항 */
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

  /* 템포/숏폼 선호 */
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

  /* 감성/연출/발견 */
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

  /* 경쟁/참여/무대 */
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
    // A형 — 신선함 사냥꾼
    finalType = "A";
    desc = `
      새로운 포맷, 새로운 작가, 새로운 분위기를<br>
      직접 '발견'하는 걸 가장 즐기는 타입!<br>
      실험작·B급 감성·경쟁 구조에서도 강한 흥미를 보이는 성향이야.
    `;
    recommend = "신선한 아이디어툰, B급 감성, 실험적인 연출 작품";
  } else if (totalScore >= 32) {
    // B형 — 빠른 템포 러버
    finalType = "B";
    desc = `
      짧고 빠른 템포의 숏툰에 강한 매력을 느끼는 스타일!<br>
      스크롤로 탁탁 넘기고, 짧은 에피소드로 즐기는 걸 좋아해.
    `;
    recommend = "짤툰, 숏폼 스토리, 빠른 전개의 개그/액션툰";
  } else if (totalScore >= 22) {
    // C형 — 감성 연출파
    finalType = "C";
    desc = `
      분위기·컷·색감 같은 감성 요소가 중요한 타입!<br>
      독특한 연출, 몽글한 분위기, 독특한 감정선에 끌려.
    `;
    recommend = "감성 연출툰, 분위기 중심 스토리, 감정선·분위기 위주 작품";
  } else {
    // D형 — 서사 몰입형
    finalType = "D";
    desc = `
      짧은 컷보다 탄탄한 스토리와<br>
      감정선이 깊은 장편 작품을 선호하는 타입!<br>
      서사가 쌓이는 맛을 중요하게 여겨.
    `;
    recommend = "드라마·로맨스·장편 판타지·탄탄한 감정선 작품";
  }
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
