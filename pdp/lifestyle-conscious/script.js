document.addEventListener("DOMContentLoaded", () => {
    const quizBox = document.getElementById("quiz-box");
    const progressBar = document.querySelector(".progress");
    const submitForm = document.getElementById("submit-form");
    const submitBtn = document.getElementById("submitBtn");
    const loadingOverlay = document.getElementById("loading-overlay");
  
    if (!quizBox) return;
  
    const questions = [
      {
        question: "운동을 얼마나 자주 하시나요?",
        answers: [
          { text: "주 3회 이상 꾸준히 한다", scores: { healthy: 2 } },
          { text: "주 1~2회 정도 한다", scores: { busy: 1, basic: 1 } },
          { text: "거의 하지 않는다", scores: { stress: 1, busy: 1 } },
        ],
      },
      {
        question: "하루 평균 수면 시간은?",
        answers: [
          { text: "7시간 이상 충분히 잔다", scores: { healthy: 2, stress: -1 } },
          { text: "5~6시간 정도 잔다", scores: { busy: 2, stress: 1 } },
          { text: "5시간 미만으로 잔다", scores: { stress: 2, basic: 1 } },
        ],
      },
      {
        question: "스트레스를 풀기 위해 무엇을 하시나요?",
        answers: [
          { text: "운동, 명상 등 건강한 활동", scores: { healthy: 2 } },
          { text: "음주, 흡연, 자극적인 음식 섭취", scores: { stress: 2 } },
          { text: "유튜브·게임 등 혼자 쉰다", scores: { busy: 1, basic: 1 } },
          { text: "특별히 하는 것이 없다", scores: { stress: 1, basic: 1 } },
        ],
      },
      {
        question: "아침 식사는 얼마나 자주 하시나요?",
        answers: [
          { text: "거의 매일 챙겨 먹는다", scores: { healthy: 2 } },
          { text: "주 2~3회 정도 먹는다", scores: { basic: 1 } },
          { text: "거의 먹지 않는다", scores: { busy: 2, stress: 1 } },
        ],
      },
      {
        question: "주말 패턴은 평일과 비교해 어떤가요?",
        answers: [
          { text: "규칙적이고, 주로 휴식한다", scores: { healthy: 1, stress: -1 } },
          { text: "불규칙하고, 약속이 많다", scores: { busy: 2, stress: 1 } },
          { text: "평일과 거의 비슷하다", scores: { basic: 1 } },
        ],
      },
    ];
  
    let currentQuestionIndex = 0;
    let userScores = { healthy: 0, busy: 0, stress: 0, basic: 0 };
    let userAnswers = [];
  
    function showQuestion(index) {
      const q = questions[index];
      quizBox.innerHTML = `
        <h2>${q.question}</h2>
        <div class="answers">
          ${q.answers
            .map(
              (a, i) => `<button class="answer-btn" data-index="${i}">${a.text}</button>`
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
  
    quizBox.addEventListener("click", (e) => {
      if (e.target.classList.contains("answer-btn")) {
        const idx = parseInt(e.target.dataset.index, 10);
        const chosen = questions[currentQuestionIndex].answers[idx];
  
        userAnswers.push({
          question: questions[currentQuestionIndex].question,
          answer: chosen.text,
        });
  
        for (const type in chosen.scores) {
          userScores[type] += chosen.scores[type];
        }
  
        currentQuestionIndex++;
        if (currentQuestionIndex < questions.length) {
          showQuestion(currentQuestionIndex);
        } else {
          showSubmitForm();
        }
      }
    });
  
    function showSubmitForm() {
      quizBox.style.display = "none";
      submitForm.style.display = "block";
      progressBar.style.width = "100%";
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  
    submitBtn.addEventListener("click", () => {
      const name = document.getElementById("name").value.trim();
      const gender = document.getElementById("gender").value.trim();
      const age = document.getElementById("age").value.trim();
      const email = document.getElementById("email").value.trim();
  
      if (!name || !gender || !age || !email) {
        alert("모든 정보를 입력해주세요.");
        return;
      }
  
      let maxScore = -Infinity;
      let resultType = "basic";
      for (const type in userScores) {
        if (userScores[type] > maxScore) {
          maxScore = userScores[type];
          resultType = type;
        }
      }
  
      sendResult({ name, gender, age, email, resultType, userAnswers });
    });
  
    function sendResult({ name, gender, age, email, resultType, userAnswers }) {
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
  
      // 로딩 활성화
      loadingOverlay.classList.add("active");
  
      fetch("https://script.google.com/macros/s/AKfycbxZScNptUwcBi3ts1no4YOpkvIbz_MIcCUzvRCAK0PSNbtk7h9DikAqcbws-I3hVuKZ3Q/exec", {
        method: "POST",
        body: formData,
      })
        .then((res) => res.json())
        .then(() => {
          setTimeout(() => {
            loadingOverlay.classList.remove("active");
            window.location.href = `result-${resultType}.html`;
          }, 2500); // 2.5초 후 결과 페이지 이동
        })
        .catch((err) => {
          console.error(err);
          loadingOverlay.classList.remove("active");
          alert("제출 중 오류가 발생했습니다. 다시 시도해주세요.");
        });
    }
  
    showQuestion(currentQuestionIndex);
  });
  