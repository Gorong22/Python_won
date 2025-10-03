document.addEventListener('DOMContentLoaded', () => {
    const quizBox = document.getElementById('quiz-box');
    const progressBar = document.querySelector('.progress');

    if (!quizBox) return; // Not on the quiz page

    const questions = [
        {
            question: "점심은 주로 어떻게 해결하시나요?",
            answers: [
                { text: "편의점 또는 배달 음식", scores: { detox: 2, condition: 1 } },
                { text: "구내식당 또는 백반", scores: { slim: 1, condition: 1 } },
                { text: "직접 만든 도시락", scores: { glow: 2 } },
                { text: "거르거나 간단히 때운다", scores: { detox: 2, slim: 1 } },
            ]
        },
        {
            question: "피부에 신경을 쓰는 편인가요?",
            answers: [
                { text: "전혀 신경 쓰지 않는다", scores: { condition: 2, detox: 1 } },
                { text: "기본 스킨케어만 한다", scores: { slim: 1 } },
                { text: "기능성 제품도 사용한다", scores: { glow: 2 } },
            ]
        },
        {
            question: "최근 피부 톤은 어떤가요?",
            answers: [
                { text: "밝고 생기있다", scores: { glow: 2 } },
                { text: "푸석하고 칙칙하다", scores: { detox: 2, condition: 1 } },
                { text: "잘 모르겠다", scores: { condition: 2 } },
            ]
        },
        {
            question: "하루 수면 시간은?",
            answers: [
                { text: "7시간 이상", scores: { glow: 2 } },
                { text: "5~6시간", scores: { slim: 2, detox: 1 } },
                { text: "5시간 미만", scores: { detox: 2, condition: 1 } },
            ]
        },
        {
            question: "평소 가장 많이 하는 습관은?",
            answers: [
                { text: "틈틈이 스트레칭하기", scores: { glow: 1 } },
                { text: "커피나 에너지 드링크 마시기", scores: { slim: 2, detox: 1 } },
                { text: "다리 꼬고 앉기", scores: { condition: 1 } },
                { text: "SNS나 유튜브 보기", scores: { condition: 1 } },
            ]
        },
        {
            question: "피부를 위해 특별히 해본 관리가 있나요?",
            answers: [
                { text: "주기적으로 피부과를 다닌다", scores: { glow: 1 } },
                { text: "마스크팩이나 홈케어를 한다", scores: { condition: 1 } },
                { text: "특별히 해본 적 없다", scores: { slim: 1, detox: 1, condition: 1 } },
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
        
        let highestScore = -Infinity;
        let resultType = 'condition'; // Default result

        for (const type in userScores) {
            if (userScores[type] > highestScore) {
                highestScore = userScores[type];
                resultType = type;
            }
        }

        console.log("Final User Scores:", userScores);
        console.log("Determined Result Type:", resultType);

        // Construct absolute path for redirection
        const currentPath = window.location.pathname;
        const basePath = currentPath.substring(0, currentPath.lastIndexOf('/') + 1);
        window.location.href = `${basePath}result-${resultType}.html`;
    }

    showQuestion(currentQuestionIndex);
});