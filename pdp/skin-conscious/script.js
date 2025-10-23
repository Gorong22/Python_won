document.addEventListener("DOMContentLoaded", () => {
    const quizBox = document.getElementById("quiz-box");
    const progressBar = document.querySelector(".progress");
    if (!quizBox) return;
  
    // ===============================
    // 질문 데이터 (복구)
    // ===============================
    const questions = [
      {
        question: "아침에 일어났을 때 피부 상태는 어떤가요?",
        answers: [
          { text: "맑고 생기 있어요", scores: { glow: 2 } },
          { text: "건조하거나 푸석해요", scores: { detox: 1, condition: 1 } },
          { text: "붓거나 칙칙해요", scores: { slim: 1, condition: 1 } },
        ],
      },
      {
        question: "스트레스를 받을 때 나는?",
        answers: [
          { text: "피부에 트러블이 생겨요", scores: { condition: 2 } },
          { text: "식습관이 불규칙해져요", scores: { detox: 1, slim: 1 } },
          { text: "컨디션이 떨어지고 피로해요", scores: { condition: 2 } },
        ],
      },
      {
        question: "평소 물 섭취량은?",
        answers: [
          { text: "2L 이상 꾸준히 마신다", scores: { glow: 1, detox: 1 } },
          { text: "1L 이하로 마신다", scores: { condition: 2 } },
          { text: "생각날 때만 마신다", scores: { detox: 1, condition: 1 } },
        ],
      },
      {
        question: "하루 식사 패턴은 어떤가요?",
        answers: [
          { text: "규칙적인 식사와 가벼운 간식", scores: { glow: 2, slim: 1 } },
          { text: "하루 한 끼나 불규칙한 식사", scores: { detox: 2 } },
          { text: "단짠·자극적인 음식이 많아요", scores: { condition: 2 } },
        ],
      },
      {
        question: "요즘 가장 필요한 루틴은?",
        answers: [
          { text: "광채·피부 회복", scores: { glow: 2 } },
          { text: "체중·밸런스 관리", scores: { slim: 2 } },
          { text: "순환·피로 회복", scores: { detox: 2, condition: 1 } },
        ],
      },
      {
        question: "자기 전 습관은 어떤가요?",
        answers: [
          { text: "핸드폰보다 일찍 잠든다", scores: { glow: 1, slim: 1 } },
          { text: "늦게까지 스마트폰을 본다", scores: { condition: 2 } },
          { text: "스트레칭이나 차 한잔으로 마무리한다", scores: { detox: 2 } },
        ],
      },
    ];
  
    let currentQuestionIndex = 0;
    let userScores = { glow: 0, slim: 0, detox: 0, condition: 0 };
    let userAnswers = [];
  
    // ===============================
    // 질문 표시
    // ===============================
    function showQuestion(index) {
      const q = questions[index];
      quizBox.innerHTML = `
        <h2>${q.question}</h2>
        <div class="answers">
          ${q.answers
            .map(
              (a, i) =>
                `<button class="answer-btn" data-index="${i}">${a.text}</button>`
            )
            .join("")}
        </div>
      `;
      updateProgress();
    }
  
    function updateProgress() {
      const progress = (currentQuestionIndex / questions.length) * 100;
      progressBar.style.width = `${progress}%`;
    }
  
    // ===============================
    // 선택 처리
    // ===============================
    quizBox.addEventListener("click", (e) => {
      if (e.target.classList.contains("answer-btn")) {
        const idx = parseInt(e.target.dataset.index, 10);
        const chosen = questions[currentQuestionIndex].answers[idx];
        userAnswers.push({
          question: questions[currentQuestionIndex].question,
          answer: chosen.text,
        });
        for (const type in chosen.scores) userScores[type] += chosen.scores[type];
  
        currentQuestionIndex++;
        if (currentQuestionIndex < questions.length)
          showQuestion(currentQuestionIndex);
        else showSubmitForm();
      }
    });
  
    // ===============================
    // 마지막 폼
    // ===============================
    function showSubmitForm() {
      // 퀴즈 박스 내용 비우기 (기존 질문 제거)
      const quizBox = document.getElementById("quiz-box");
      quizBox.innerHTML = "";
    
      // 제출 폼 보여주기
      const submitForm = document.getElementById("submit-form");
      submitForm.style.display = "block";
    
      // 이벤트 리스너 등록
      document.getElementById("submitBtn").addEventListener("click", handleSubmit);
    }
    
  
    // ===============================
    // ✅ 로딩 오버레이
    // ===============================
    function showLoadingOverlay() {
      const overlay = document.createElement("div");
      overlay.id = "loading-overlay";
      overlay.innerHTML = `
        <div class="loader"></div>
        <p>결과를 전송 중입니다...</p>
      `;
      document.body.appendChild(overlay);
    }
  
    function hideLoadingOverlay() {
      const overlay = document.getElementById("loading-overlay");
      if (overlay) overlay.remove();
    }
  
    // ===============================
    // 제출 처리
    // ===============================
    function handleSubmit() {
      const name = document.getElementById("name").value.trim();
      const gender = document.getElementById("gender").value.trim();
      const age = document.getElementById("age").value.trim();
      const email = document.getElementById("email").value.trim();
  
      if (!name || !gender || !age || !email) {
        alert("모든 정보를 입력해주세요.");
        return;
      }
  
      showLoadingOverlay();
  
      let resultType = Object.keys(userScores).reduce((a, b) =>
        userScores[a] > userScores[b] ? a : b
      );
  
      sendResult({ name, gender, age, email, resultType, userAnswers });
    }
  
    // ===============================
    // Google Apps Script 전송
    // ===============================
    function sendResult({ name, gender, age, email, resultType, userAnswers }) {
      const formData = new URLSearchParams();
      formData.append("timestamp", new Date().toLocaleString());
      formData.append("name", name);
      formData.append("gender", gender);
      formData.append("age", age);
      formData.append("email", email);
      formData.append("resultType", resultType);
  
      userAnswers.forEach((a, i) => {
        formData.append(`Q${i + 1}`, `${a.question} → ${a.answer}`);
      });
  
      fetch(
        "https://script.google.com/macros/s/AKfycbwoOz3YvipIlTVTIsWnKw3uUpIpHy2_WtFVkFHKPZbYxaCh7AIQgqjs-oiMsTxXSq5o/exec",
        {
          method: "POST",
          body: formData,
        }
      )
        .then((res) => res.json())
        .then(() => {
          hideLoadingOverlay();
          alert("결과가 이메일로 전송되었습니다! 📩");
          window.location.href = `result-${resultType}.html`;
        })
        .catch((err) => {
          hideLoadingOverlay();
          console.error(err);
          alert("전송 중 오류가 발생했습니다. 다시 시도해주세요.");
        });
    }
  
    showQuestion(currentQuestionIndex);
  });
  