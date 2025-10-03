document.addEventListener('DOMContentLoaded', () => {
    const quizBox = document.getElementById('quiz-box');
    const progressBar = document.querySelector('.progress');

    if (!quizBox) return; // Not on the quiz page

    const questions = [
        {
            question: "평소 영양제를 얼마나 챙겨드시나요?",
            answers: [
                { text: "매일 꾸준히 챙겨 먹는다", scores: { glow: 2, condition: 1 } },
                { text: "생각날 때 가끔 먹는다", scores: { slim: 1, detox: 1 } },
                { text: "거의 먹지 않는다", scores: { detox: 2, condition: 1 } },
            ]
        },
        {
            question: "가장 신경 쓰이는 피부 고민은 무엇인가요?",
            answers: [
                { text: "칙칙함, 광채 부족", scores: { glow: 2 } },
                { text: "건조하고 당기는 느낌", scores: { detox: 1, glow: 1 } },
                { text: "탄력 저하, 잔주름", scores: { slim: 2 } },
                { text: "잦은 트러블, 예민함", scores: { condition: 2 } },
            ]
        },
        {
            question: "하루에 물을 얼마나 마시나요?",
            answers: [
                { text: "2L 이상 충분히 마신다", scores: { glow: 1, detox: 2 } },
                { text: "1L 내외로 마신다", scores: { slim: 1, condition: 1 } },
                { text: "거의 마시지 않는다", scores: { condition: 2 } },
            ]
        },
        {
            question: "자기 전 루틴은 어떤가요?",
            answers: [
                { text: "가벼운 스트레칭과 명상을 한다", scores: { glow: 1, slim: 1 } },
                { text: "스마트폰을 보거나 바로 잠든다", scores: { condition: 2, stress: 1 } },
                { text: "따뜻한 차를 마시며 쉰다", scores: { detox: 2 } },
            ]
        },
        {
            question: "점심 식단은 주로 어떻게 선택하시나요?",
            answers: [
                { text: "샐러드나 건강식 위주로 선택한다", scores: { slim: 2, glow: 1 } },
                { text: "구내식당이나 일반 식당을 이용한다", scores: { basic: 1, condition: 1 } },
                { text: "간편한 패스트푸드나 편의점 음식을 선호한다", scores: { detox: 2, stress: 1 } },
            ]
        },
        {
            question: "최근 피부 컨디션은 어떤가요?",
            answers: [
                { text: "대체로 만족스럽다", scores: { glow: 2 } },
                { text: "푸석하고 지쳐 보인다", scores: { condition: 2, detox: 1 } },
                { text: "트러블이 자주 올라온다", scores: { stress: 2 } },
            ]
        }
    ];

    let currentQuestionIndex = 0;
    let userScores = { glow: 0, slim: 0, detox: 0, condition: 0 };

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
        let highestScore = -1;
        let resultType = 'condition'; // Default result

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