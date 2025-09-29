
document.addEventListener('DOMContentLoaded', () => {
    const trialButton = document.getElementById('trial-cta');

    if (trialButton) {
        trialButton.addEventListener('click', () => {
            alert('트라이얼 패키지를 신청해주셔서 감사합니다!');
        });
    }
});
