document.addEventListener("DOMContentLoaded", () => {
  const quizBox = document.getElementById("quiz-box");
  const progressBar = document.querySelector(".progress");
  const submitForm = document.getElementById("submit-form");
  const submitBtn = document.getElementById("submitBtn");

  if (!quizBox) return;

  // ===============================
  // 💬 감정 리듬 테스트 문항 (총 16문항)
  // ===============================
  const questions = [
    { question: "아침에 일어날 때 가장 먼저 드는 생각은 무엇인가요?",
      answers: [
        { text: "알람을 여러 번 끄다 겨우 일어난다", scores: { fatigue: 2 } },
        { text: "바로 일어나지만 피곤이 남아 있다", scores: { balance: 1 } },
        { text: "가볍게 일어나 하루 계획을 떠올린다", scores: { void: 2 } },
        { text: "자연스럽게 기상하고 기분이 괜찮다", scores: { void: 1 } },
      ] },
    { question: "일 시작 전, 당신의 마음 상태에 가장 가까운 건",
      answers: [
        { text: "오늘은 괜찮게 해낼 수 있을 것 같다", scores: { recovery: 2 } },
        { text: "의무감에 해야 한다는 생각이 먼저 든다", scores: { fatigue: 1, void: 1 } },
        { text: "이미 피곤하거나 집중이 안 된다", scores: { fatigue: 2 } },
        { text: "아무 감정 없이 그냥 일과를 시작한다", scores: { void: 1 } },
      ] },
    { question: "퇴근 후 가장 먼저 하는 일은 무엇인가요?",
      answers: [
        { text: "바로 쉬거나 눕기", scores: { fatigue: 2 } },
        { text: "간단히 운동·샤워하기", scores: { recovery: 2 } },
        { text: "맛있는 걸 먹으며 힐링", scores: { balance: 1 } },
        { text: "해야 할 일을 끝내고 쉬기", scores: { fatigue: 1 } },
      ] },
    { question: "하루를 마칠 때 가장 자주 드는 감정은 무엇인가요?",
      answers: [
        { text: "뿌듯함", scores: { recovery: 2 } },
        { text: "피곤함", scores: { fatigue: 2 } },
        { text: "허무함", scores: { void: 2 } },
        { text: "아무 감정이 없다", scores: { void: 2 } },
      ] },
    { question: "‘나를 위해 뭔가 해야지’라는 생각이 들 때 어떤 느낌이 드시나요?",
      answers: [
        { text: "설렌다, 해보고 싶다", scores: { recovery: 2 } },
        { text: "귀찮지만 해야 할 것 같다", scores: { fatigue: 1 } },
        { text: "부담스럽고 피곤하다", scores: { fatigue: 2 } },
        { text: "죄책감이 든다", scores: { void: 2 } },
      ] },
    { question: "운동·식단·영양제 등 자기관리를 미루는 가장 큰 이유는 무엇인가요?",
      answers: [
        { text: "시간 여유가 없어서", scores: { fatigue: 2 } },
        { text: "체력이나 의욕이 부족해서", scores: { fatigue: 2 } },
        { text: "해야 할 게 너무 많아서", scores: { fatigue: 1 } },
        { text: "그냥 지금은 쉬고 싶어서", scores: { void: 1 } },
      ] },
    { question: "자기관리를 꾸준히 하는 사람을 보면 어떤 생각이 드나요?",
      answers: [
        { text: "대단하고 부럽다", scores: { balance: 1 } },
        { text: "나도 해야 하는데라는 압박감", scores: { fatigue: 1 } },
        { text: "바쁜 현실에 회의감이 든다", scores: { recovery: 1 } },
        { text: "딱히 아무 감정 없다", scores: { void: 2 } },
      ] },
    { question: "‘관리해야 한다’는 생각이 들 때 떠오르는 단어는?",
      answers: [
        { text: "건강", scores: { recovery: 2 } },
        { text: "부담", scores: { fatigue: 2 } },
        { text: "귀찮음", scores: { void: 1 } },
        { text: "의무", scores: { fatigue: 1, void: 1 } },
      ] },
    { question: "하루 중 ‘여유’를 느끼는 순간이 있나요?",
      answers: [
        { text: "출퇴근길 음악 들을 때", scores: { balance: 1 } },
        { text: "식사나 커피 마실 때", scores: { recovery: 1 } },
        { text: "잠시 멍 때릴 때", scores: { balance: 1 } },
        { text: "여유를 느낀 적이 거의 없다", scores: { fatigue: 2 } },
      ] },
    { question: "‘여유’라는 단어를 들으면 떠오르는 생각은?",
      answers: [
        { text: "하고 싶은 일을 스스로 선택할 수 있는 순간이다", scores: { recovery: 2 } },
        { text: "꼭 필요하지만 쉽게 가지지 못한다", scores: { balance: 1 } },
        { text: "주어지면 뭘 해야 할지 모르겠다", scores: { fatigue: 2 } },
        { text: "나는 충분히 여유가 있다고 생각한다", scores: { void: 2 } },
      ] },
    { question: "여유가 생기면 가장 먼저 하고 싶은 일은 무엇인가요?",
      answers: [
        { text: "아무것도 안 하기", scores: { void: 1 } },
        { text: "맛있는 음식 먹기", scores: { balance: 1 } },
        { text: "운동·명상 등 나를 위한 일", scores: { recovery: 2 } },
        { text: "밀린 일을 끝내기", scores: { fatigue: 2 } },
      ] },
    { question: "요즘 ‘나를 잘 챙기고 있다’고 느끼나요?",
      answers: [
        { text: "그렇다 — 예전보다 나에게 신경을 쓴다", scores: { recovery: 2 } },
        { text: "어느 정도 그렇다 — 가끔은 신경을 쓰려 한다", scores: { balance: 1 } },
        { text: "잘 모르겠다 — 그냥 하루하루 지나간다", scores: { fatigue: 2 } },
        { text: "아니다 — 나를 챙길 여유가 없다", scores: { void: 2 } },
      ] },
    { question: "요즘 내 하루는 어떤가요?",
      answers: [
        { text: "안정적이고 균형 있다", scores: { balance: 2 } },
        { text: "반복되고 지루하다", scores: { void: 1 } },
        { text: "항상 쫓기듯 흘러간다", scores: { fatigue: 2 } },
        { text: "이유는 모르겠지만 피곤하다", scores: { fatigue: 1, void: 1 } },
      ] },
    { question: "몸이 피곤하면 마음도 함께 지치는 편인가요?",
      answers: [
        { text: "그렇다", scores: { fatigue: 2 } },
        { text: "어느 정도 그렇다", scores: { balance: 1 } },
        { text: "잘 모르겠다", scores: { void: 1 } },
        { text: "아니다", scores: { recovery: 2 } },
      ] },
    { question: "‘나를 챙기는 일’이 힘들게 느껴질 때, 가장 가까운 이유는?",
      answers: [
        { text: "나보다 일이 우선이어서", scores: { fatigue: 2 } },
        { text: "다른 사람 챙기느라 내 순서가 뒤로 가서", scores: { fatigue: 1, void: 1 } },
        { text: "나를 위해 쓰는 게 낯설어서", scores: { void: 2 } },
        { text: "그냥 너무 피곤해서", scores: { fatigue: 2 } },
      ] },
    { question: "요즘 ‘나를 챙겨야 하는데 못 챙긴다’고 느낀 순간이 있다면, 언제였나요?",
      answers: [
        { text: "주관식 입력", isOpen: true }
      ]
    },
  ];

  let currentQuestionIndex = 0;
  let userScores = { recovery: 0, fatigue: 0, void: 0, balance: 0 };
  let userAnswers = [];

  // ===============================
  // 질문 표시
  // ===============================
  function showQuestion(index) {
    const q = questions[index];
    if (q.answers[0].isOpen) {
      quizBox.innerHTML = `
        <h2>${q.question}</h2>
        <textarea id="openAnswer" rows="5"
          placeholder="예: 퇴근 후 아무것도 할 힘이 없을 때\n예: 식사를 미루고 커피로 버틸 때"
          style="width:100%; padding:12px; border-radius:10px; border:1.5px solid #ccc; resize:none; font-size:0.95rem; line-height:1.5;"></textarea>
        <button class="answer-btn next-btn">제출하기</button>`;
    } else {
      quizBox.innerHTML = `
        <h2>${q.question}</h2>
        <div class="answers">
          ${q.answers.map((a, i) => `<button class="answer-btn" data-index="${i}">${a.text}</button>`).join("")}
        </div>`;
    }
    updateProgress();
  }

  function updateProgress() {
    const progress = ((currentQuestionIndex + 1) / questions.length) * 100;
    progressBar.style.width = `${progress}%`;
  }

  // ===============================
  // 응답 처리
  // ===============================
  quizBox.addEventListener("click", (e) => {
    if (!e.target.classList.contains("answer-btn")) return;
    const q = questions[currentQuestionIndex];

    if (q.answers[0].isOpen) {
      const answer = document.getElementById("openAnswer").value.trim();
      if (answer.length < 5) {
        showPopup();
        return;
      }
      userAnswers.push({ question: q.question, answer });
      goNext();
    } else {
      const idx = parseInt(e.target.dataset.index, 10);
      const chosen = q.answers[idx];
      userAnswers.push({ question: q.question, answer: chosen.text });
      for (const type in chosen.scores) userScores[type] += chosen.scores[type];
      goNext();
    }
  });

  function goNext() {
    currentQuestionIndex++;
    if (currentQuestionIndex < questions.length) showQuestion(currentQuestionIndex);
    else showSubmitForm();
  }

  function showSubmitForm() {
    quizBox.style.display = "none";
    submitForm.style.display = "block";
    progressBar.style.width = "100%";
  }

  // ===============================
  // 팝업
  // ===============================
  function showPopup() {
    const popupHTML = `
      <div class="popup-overlay">
        <div class="popup-box">
          <h3>조금만 더 자세히 적어주실 수 있을까요? 💭</h3>
          <p>여러분의 진심 어린 답변은 연구에 큰 도움이 됩니다.<br>
          추첨을 통해 <strong>커피 쿠폰</strong>을 보내드려요 ☕</p>
          <div class="popup-buttons">
            <button id="keepWriting" class="popup-btn outline">더 적을래요</button>
            <button id="submitAnyway" class="popup-btn filled">그냥 제출할게요</button>
          </div>
        </div>
      </div>`;
    document.body.insertAdjacentHTML("beforeend", popupHTML);
  
    document.getElementById("keepWriting").addEventListener("click", () => {
      document.querySelector(".popup-overlay").remove();
    });
  
    document.getElementById("submitAnyway").addEventListener("click", () => {
      const answer = document.getElementById("openAnswer").value.trim();
      userAnswers.push({ question: questions[currentQuestionIndex].question, answer });
      document.querySelector(".popup-overlay").remove();
      goNext();
    });
  }

  // ===============================
  // 로딩
  // ===============================
  function showLoading() {
    const loader = document.createElement("div");
    loader.className = "loading-overlay";
    loader.innerHTML = `<div class="loader"></div><p>당신의 리듬을 정리하고 있어요...</p>`;
    document.body.appendChild(loader);
  }
  function hideLoading() {
    const loader = document.querySelector(".loading-overlay");
    if (loader) loader.remove();
  }

  // ===============================
  // 제출
  // ===============================
  submitBtn.addEventListener("click", () => {
    const name = document.getElementById("name").value.trim();
    const gender = document.getElementById("gender").value.trim();
    const age = document.getElementById("age").value.trim();
    const email = document.getElementById("email").value.trim();

    if (!name || !gender || !age || !email) {
      alert("모든 정보를 입력해주세요 🙂");
      return;
    }

    let maxScore = -Infinity;
    let resultType = "balance";
    for (const type in userScores) {
      if (userScores[type] > maxScore) {
        maxScore = userScores[type];
        resultType = type;
      }
    }

    showLoading();

    const formData = new URLSearchParams();
    formData.append("timestamp", new Date().toLocaleString());
    formData.append("name", name);
    formData.append("gender", gender);
    formData.append("age", age);
    formData.append("email", email);
    formData.append("resultType", resultType);

    userAnswers.forEach((item, i) => {
      formData.append(`Q${i + 1}`, `${item.question} → ${item.answer}`);
    });

    fetch("https://script.google.com/macros/s/AKfycbyDpWzGrZngzCXTuviAcNb4QE2uIzelKp3OCgluG5w4BLYXVsCTcvwVhDhMprFAO7Op0g/exec", {
      method: "POST",
      body: formData,
    })
      .then(async (res) => {
        const text = await res.text();
        let data;
        try {
          data = JSON.parse(text);
        } catch (err) {
          console.error("⚠️ JSON 파싱 실패:", text);
          alert("서버 응답을 해석할 수 없습니다. 다시 시도해주세요.");
          hideLoading();
          return;
        }

        hideLoading();

        if (data.status === "success") {
          alert("결과가 이메일로 전송되었습니다!\n잠시 후 결과 요약 페이지로 이동합니다.");
          const resultPage = {
            fatigue: "Routine Burnout.html",
            void: "Emotional Numbness.html",
            balance: "Routine Balance.html",
            recovery: "Ritual Recovery.html",
          }[resultType];
          window.location.href = resultPage;
        } else if (data.status === "duplicate") {
          hideLoading();
          alert("☕ 이미 참여 완료된 이메일이에요!\n다른 주소로 참여해보세요 :)");
        } else {
          alert("예상치 못한 응답이 반환되었습니다. 다시 시도해주세요.");
        }
      })
      .catch((err) => {
        hideLoading();
        console.error("❌ Fetch Error:", err);
        alert("제출 중 오류가 발생했습니다. 다시 시도해주세요.");
      });
  });

  // 시작
  showQuestion(currentQuestionIndex);
});
