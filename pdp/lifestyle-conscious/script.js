document.addEventListener('DOMContentLoaded', () => {
    const quizBox = document.getElementById('quiz-box');
    const progressBar = document.querySelector('.progress');

    if (!quizBox) return; // Not on the quiz page

    const questions = [
        {
            question: "운동을 얼마나 자주 하시나요?",
            answers: [
                { text: "주 3회 이상 꾸준히 한다", scores: { healthy: 2 } },
                { text: "주 1~2회 정도 한다", scores: { busy: 1, basic: 1 } },
                { text: "거의 하지 않는다", scores: { stress: 1, busy: 1 } },
            ]
        },
        {
            question: "하루 평균 수면 시간은?",
            answers: [
                { text: "7시간 이상 충분히 잔다", scores: { healthy: 2, stress: -1 } },
                { text: "5~6시간 정도 잔다", scores: { busy: 2, stress: 1 } },
                { text: "5시간 미만으로 잔다", scores: { stress: 2, basic: 1 } },
            ]
        },
        {
            question: "스트레스를 풀기 위해 무엇을 하시나요?",
            answers: [
                { text: "운동, 명상 등 건강한 활동", scores: { healthy: 2 } },
                { text: "음주, 흡연, 자극적인 음식 섭취", scores: { stress: 2 } },
                { text: "주로 혼자 쉰다 (유튜브, 게임 등)", scores: { busy: 1, basic: 1 } },
                { text: "특별히 하는 것이 없다", scores: { stress: 1, basic: 1 } },
            ]
        },
        {
            question: "아침 식사는 얼마나 자주 하시나요?",
            answers: [
                { text: "거의 매일 챙겨 먹는다", scores: { healthy: 2 } },
                { text: "주 2~3회 정도 먹는다", scores: { basic: 1 } },
                { text: "거의 먹지 않는다", scores: { busy: 2, stress: 1 } },
            ]
        },
        {
            question: "주말 패턴은 평일과 비교해 어떤가요?",
            answers: [
                { text: "규칙적이고, 주로 휴식한다", scores: { healthy: 1, stress: -1 } },
                { text: "불규칙하고, 약속이 많다", scores: { busy: 2, stress: 1 } },
                { text: "평일과 거의 비슷하다", scores: { basic: 1 } },
            ]
        },
        {
            question: "최근 가장 고민되는 것은?",
            answers: [
                { text: "업무/학업 스트레스", scores: { stress: 2 } },
                { text: "체력 저하 및 피로감", scores: { busy: 1, condition: 2 } },
                { text: "불규칙한 생활 패턴", scores: { basic: 2 } },
                { text: "특별한 고민 없음", scores: { healthy: 1 } },
            ]
        }
    ];

    let currentQuestionIndex = 0;
    let userScores = { healthy: 0, busy: 0, stress: 0, basic: 0, condition: 0 };

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
        
        // The user mentioned result-condition.html, but the result types are healthy, busy, stress, basic.
        // I will map the 'condition' score to the 'stress' or 'busy' type for simplicity.
        userScores.stress += userScores.condition;

        let highestScore = -Infinity;
        let resultType = 'basic'; // Default result

        // Only check for the 4 valid result types
        const validResultTypes = ['healthy', 'busy', 'stress', 'basic'];
        for (const type of validResultTypes) {
            if (userScores[type] > highestScore) {
                highestScore = userScores[type];
                resultType = type;
            }
        }

        window.location.href = `result-${resultType}.html`;
    }

    showQuestion(currentQuestionIndex);
});