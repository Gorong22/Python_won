document.addEventListener('DOMContentLoaded', () => {
    const quizBox = document.getElementById('quiz-box');
    const progressBar = document.querySelector('.progress');

    if (!quizBox) return; // Not on the quiz page

    const questions = [
        {
            question: "최근 일주일 동안 몇 번 배달 음식을 드셨나요?",
            answers: [
                { text: "거의 먹지 않았다", scores: { healthy: 2 } },
                { text: "1~2번", scores: { basic: 1, busy: 1 } },
                { text: "3~4번", scores: { busy: 2, stress: 1 } },
                { text: "5번 이상", scores: { stress: 2 } },
            ]
        },
        {
            question: "하루 커피 섭취량은?",
            answers: [
                { text: "마시지 않는다", scores: { healthy: 1 } },
                { text: "1잔", scores: { basic: 1 } },
                { text: "2~3잔", scores: { busy: 2, stress: 1 } },
                { text: "4잔 이상", scores: { stress: 2 } },
            ]
        },
        {
            question: "스트레스 때문에 식습관이 무너진 적이 있나요?",
            answers: [
                { text: "거의 없다", scores: { healthy: 2 } },
                { text: "가끔 있다", scores: { basic: 1, stress: 1 } },
                { text: "자주 있다", scores: { stress: 2 } },
            ]
        },
        {
            question: "평소 자주 먹는 간식은?",
            answers: [
                { text: "과일, 견과류 등 건강 간식", scores: { healthy: 2 } },
                { text: "과자, 빵, 초콜릿 등", scores: { stress: 1, basic: 1 } },
                { text: "간식은 거의 먹지 않는다", scores: { busy: 1 } },
            ]
        },
        {
            question: "퇴근 후 생활은 어떤가요?",
            answers: [
                { text: "운동이나 취미 생활을 한다", scores: { healthy: 2 } },
                { text: "주로 집에서 휴식한다", scores: { basic: 1, busy: 1 } },
                { text: "친구들과 약속이 잦다", scores: { stress: 1 } },
                { text: "피곤해서 바로 잠든다", scores: { busy: 2, stress: 1 } },
            ]
        },
        {
            question: "최근 체력 상태는 어떤가요?",
            answers: [
                { text: "활기차고 개운하다", scores: { healthy: 2 } },
                { text: "쉽게 지치고 피곤하다", scores: { stress: 2, busy: 1 } },
                { text: "기운이 없지만, 버틸만 하다", scores: { basic: 1 } },
            ]
        }
    ];

    let currentQuestionIndex = 0;
    let userScores = { healthy: 0, busy: 0, stress: 0, basic: 0 };

    function showQuestion(index) {
        const questionData = questions[index];
        quizBox.innerHTML = `
            <h2>${questionData.question}</h2>
            <div class="answers">
                ${questionData.answers.map((answer, i) => `
                    <button class="answer-btn" data-index="${i}">${answer.text}</button>
                `).join('')}
            </div>
        `;
        updateProgressBar();
    }

    function updateProgressBar() {
        const progress = ((currentQuestionIndex) / questions.length) * 100;
        progressBar.style.width = `${progress}%`;
    }

    quizBox.addEventListener('click', (e) => {
        if (e.target.classList.contains('answer-btn')) {
            const answerIndex = parseInt(e.target.dataset.index, 10);
            const chosenAnswer = questions[currentQuestionIndex].answers[answerIndex];

            for (const type in chosenAnswer.scores) {
                if (userScores.hasOwnProperty(type)) {
                    userScores[type] += chosenAnswer.scores[type];
                }
            }

            currentQuestionIndex++;

            if (currentQuestionIndex < questions.length) {
                showQuestion(currentQuestionIndex);
            } else {
                showResult();
            }
        }
    });

    function showResult() {
        progressBar.style.width = '100%';
        let highestScore = -Infinity;
        let resultType = 'basic'; // Default result

        for (const type in userScores) {
            if (userScores[type] > highestScore) {
                highestScore = userScores[type];
                resultType = type;
            }
        }

        window.location.href = `result-${resultType}.html`;
    }

    showQuestion(currentQuestionIndex);
});