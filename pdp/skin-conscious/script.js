document.addEventListener("DOMContentLoaded", () => {
    const quizBox = document.getElementById("quiz-box");
    const progressBar = document.querySelector(".progress");
    if (!quizBox) return;
  
    // ===============================
    // 질문 데이터
    // ===============================
    const questions = [/* ... 기존 질문 그대로 ... */];
  
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
          ${q.answers.map(
            (a, i) =>
              `<button class="answer-btn" data-index="${i}">${a.text}</button>`
          ).join("")}
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
          answer: chosen.text
        });
        for (const type in chosen.scores) userScores[type] += chosen.scores[type];
  
        currentQuestionIndex++;
        if (currentQuestionIndex < questions.length) showQuestion(currentQuestionIndex);
        else showSubmitForm();
      }
    });
  
    // ===============================
    // 마지막 폼
    // ===============================
    function showSubmitForm() {
      quizBox.innerHTML = `
        <h2>결과를 이메일로 받아보세요 📩</h2>
        <p class="privacy-note">
          입력하신 정보는 결과 안내 및 통계 분석 목적으로만 사용되며,<br />
          <strong>5일 이내 자동 폐기됩니다.</strong><br />
          제출 시, 입력하신 메일로 나의 결과와 루틴 리포트를 보내드립니다.
        </p>
  
        <input type="text" id="name" placeholder="이름 (가명 가능)" required />
  
        <label for="gender" class="input-label">성별</label>
        <select id="gender" required>
          <option value="">선택해주세요</option>
          <option value="남성">남성</option>
          <option value="여성">여성</option>
        </select>
  
        <input type="number" id="age" placeholder="나이" required />
        <input type="email" id="email" placeholder="이메일" required />
  
        <button id="submitBtn" class="btn-start">결과 확인하기</button>
      `;
  
      document.getElementById("submitBtn").addEventListener("click", handleSubmit);
    }
  
    // ===============================
    // ✅ 로딩 오버레이 (추가)
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
  
      showLoadingOverlay(); // ✅ 로딩 오버레이 표시
  
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
        "https://script.google.com/macros/s/AKfycbwaVK_znQ32CTyMFEEP0ZZoiby8YEAsg1KzWRem6cIcUphbHEA8x6JKo0nM-rH46pEc/exec",
        {
          method: "POST",
          body: formData,
        }
      )
        .then((res) => res.json())
        .then(() => {
          hideLoadingOverlay(); // ✅ 로딩 오버레이 제거
          alert("결과가 이메일로 전송되었습니다! 📩");
          window.location.href = `result-${resultType}.html`;
        })
        .catch((err) => {
          hideLoadingOverlay(); // ✅ 실패 시 제거
          console.error(err);
          alert("전송 중 오류가 발생했습니다. 다시 시도해주세요.");
        });
    }
  
    showQuestion(currentQuestionIndex);
  });
  