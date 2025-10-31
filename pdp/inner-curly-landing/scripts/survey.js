/****************************************************
 * INNER KURLY - 회원 설문 페이지 (survey.html)
 * 결과: localStorage 저장 + Apps Script 업데이트
 ****************************************************/

document.addEventListener("DOMContentLoaded", () => {
  const qwrap = document.getElementById("qwrap");
  const nextBtn = document.getElementById("next");
  const prevBtn = document.getElementById("prev");

  const modal = document.getElementById("result-modal");
  const title = document.getElementById("result-title");
  const reasons = document.getElementById("result-reasons");
  const solution = document.getElementById("result-solution");
  const goPlate = document.getElementById("go-plate");

  // ✅ 회원가입 정보 불러오기
  const signupData = JSON.parse(localStorage.getItem("signupData")) || {};
  const name = signupData.name || "회원님";
  const email =
    signupData.email || prompt("회원가입 시 사용한 이메일을 입력해주세요");

  // 질문 세트
  const questions = [
    {
      q: "하루 식사는 주로 어떤 방식으로 해결하시나요?",
      a: [
        "배달·외식 위주로, 빠르게 해결한다",
        "간단한 도시락·샐러드 등으로 가볍게 먹는다",
        "직접 요리하거나 건강식을 챙겨 먹는다",
        "끼니를 자주 거르거나 불규칙하다",
      ],
    },
    {
      q: "영양제나 이너뷰티 제품을 고를 때 가장 중요하게 보는 기준은?",
      a: [
        "기능성 (피로회복, 피부관리 등)",
        "성분의 안전성과 브랜드 신뢰도",
        "복용의 편의성 (형태, 섭취 시간 등)",
        "가격 대비 효율성",
      ],
    },
    {
      q: "건강 루틴을 유지하는 데 가장 어려운 점은 무엇인가요?",
      a: [
        "시간이 부족하다",
        "효과를 느끼지 못한다",
        "꾸준히 하기 어렵다",
        "정보가 너무 많아 뭘 선택해야 할지 모르겠다",
      ],
    },
    {
      q: "도시락이나 건강식을 선택할 때 가장 중요하게 생각하는 건?",
      a: [
        "맛과 플레이팅 (먹는 즐거움)",
        "영양 밸런스 (단백질, 탄수화물 등)",
        "칼로리 / 다이어트 목적",
        "간편성 (조리·보관·배송 등)",
      ],
    },
    {
      q: "이너컬리에서 어떤 서비스를 가장 기대하시나요?",
      a: [
        "내 컨디션에 맞는 식단 추천 서비스",
        "피로·피부·면역 등 맞춤 영양제 큐레이션",
        "이너뷰티·웰니스 콘텐츠 (루틴·명상·운동)",
        "한 번에 관리 가능한 구독·패키지 서비스",
      ],
    },
    {
      q: "이너컬리가 나를 위해 루틴을 설계한다면 어떤 방향이 가장 끌리나요?",
      a: [
        "피로 회복과 활력 루틴",
        "체중·라인 관리 루틴",
        "피부·이너뷰티 중심 루틴",
        "여유롭고 감각적인 힐링 루틴",
      ],
    },
  ];

  let current = 0;
  const answers = [];

  function renderQuestion() {
    const q = questions[current];
    qwrap.innerHTML = `
      <h3>${q.q}</h3>
      ${q.a
        .map((opt, i) => `<div class="option" data-index="${i}">${opt}</div>`)
        .join("")}
    `;

    const options = qwrap.querySelectorAll(".option");
    options.forEach((opt) => {
      opt.addEventListener("click", () => {
        options.forEach((el) => el.classList.remove("selected"));
        opt.classList.add("selected");

        // ✅ 실제 선택지 텍스트 저장
        answers[current] = q.a[parseInt(opt.dataset.index)];

        // 클릭 후 다음 문항으로 이동
        setTimeout(() => {
          if (current < questions.length - 1) {
            current++;
            renderQuestion();
          } else {
            showResult();
          }
        }, 250);
      });
    });

    prevBtn.style.display = current === 0 ? "none" : "inline-block";
    nextBtn.style.display = "none";
  }

  prevBtn.addEventListener("click", () => {
    if (current > 0) {
      current--;
      renderQuestion();
    }
  });

  function showResult() {
    const sum = answers.reduce((a, _, i) => a + i, 0);
    let plate = "glow";

    if (sum >= 15) plate = "balance";
    else if (sum >= 10) plate = "slim";
    else if (sum >= 6) plate = "detox";
    else plate = "glow";

    const plateResults = {
      glow: {
        title: "Glow Plate",
        reasons: [
          "피로가 쉽게 쌓이지만 건강과 활력을 되찾고 싶어합니다.",
          "아침을 거르거나 끼니를 대충 넘기는 경우가 많습니다.",
          "에너지 루틴과 기본 영양 보충이 필요한 타입입니다.",
        ],
        solution:
          "Glow Plate는 ‘활력 회복 루틴’을 위한 식단입니다. 항산화 과채 도시락과 비타민B·C, 마그네슘 루틴으로 몸의 리듬을 되살리고 하루 에너지를 회복하세요.",
      },
      slim: {
        title: "Slim Plate",
        reasons: [
          "스스로를 잘 관리하지만 식단과 루틴의 균형을 놓치기 쉽습니다.",
          "효율적인 라인관리와 체중 유지에 관심이 많습니다.",
          "단조로운 식단보다 지속 가능한 루틴을 선호합니다.",
        ],
        solution:
          "Slim Plate는 ‘라인 관리와 루틴 효율’을 위한 구성입니다. 고단백 저자극 도시락과 식이섬유 루틴, CLA·L-카르니틴 등으로 꾸준함을 돕습니다.",
      },
      detox: {
        title: "Detox Plate",
        reasons: [
          "몸이 무겁고 붓거나 소화가 더딘 편입니다.",
          "야식이나 자극적인 음식 섭취가 잦습니다.",
          "컨디션 리셋과 정화 중심의 루틴이 필요합니다.",
        ],
        solution:
          "Detox Plate는 ‘정화 루틴’을 위한 구성입니다. 항산화 곡물과 채소 기반 도시락, 유산균·식이섬유 루틴으로 몸의 노폐물을 비워내고 속을 가볍게 만듭니다.",
      },
      balance: {
        title: "Balance Plate",
        reasons: [
          "루틴을 유지하려 노력하지만 일정이 불규칙합니다.",
          "컨디션, 식단, 수면이 고르게 조화되지 않습니다.",
          "꾸준하면서도 유연한 밸런스형 루틴이 필요합니다.",
        ],
        solution:
          "Balance Plate는 ‘지속 가능한 웰니스 루틴’을 설계합니다. 단백질·식이섬유 도시락과 멀티비타민, 오메가3 루틴으로 하루 리듬을 안정시켜 줍니다.",
      },
    };

    const result = plateResults[plate];
    title.textContent = `${name}님께 어울리는 플레이트는 “${result.title}” 입니다.`;
    reasons.innerHTML = result.reasons.map((r) => `<li>${r}</li>`).join("");
    solution.textContent = result.solution;

    modal.style.display = "flex";

    // ✅ localStorage에 결과 저장 (마이페이지용)
    localStorage.setItem("surveyResult", JSON.stringify({ plate, answers }));

    // ✅ Apps Script로 설문 결과 전송 (시트 업데이트)
    if (email) {
      sendSurveyResult(email, plate, answers);
    }

    // ✅ 플레이트 페이지 이동 버튼
    goPlate.onclick = () => {
      window.location.href = `./plate-${plate}.html`;
    };
  }

  renderQuestion();
});

/****************************************************
 * ✅ 설문 결과 전송 → Google Apps Script
 ****************************************************/
async function sendSurveyResult(email, plate, answers) {
  try {
    const payload = {
      action: "surveyUpdate",
      email,
      plate,
      answers: JSON.stringify(answers),
    };

    const res = await fetch(
      "https://script.google.com/macros/s/AKfycby64_DR1ntrW761V-PfEPLV8aG3RmBr088LUMeZ1SSOgcanqSWLTbagePhq4CpkmDWIlw/exec",
      {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams(payload),
      }
    );

    const data = await res.json();
    console.log("✅ 설문 결과 전송 완료:", data);
  } catch (err) {
    console.error("🚨 설문결과 전송 오류:", err);
  }
}
