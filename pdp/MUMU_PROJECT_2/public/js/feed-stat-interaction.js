document.addEventListener('DOMContentLoaded', () => {
    const statButtons = document.querySelectorAll('.feed-card-stat, .post-detail-stat, .episode-stat-btn');

    statButtons.forEach((button) => {
        const icon = button.querySelector('.stat-icon');
        const ariaLabel = button.getAttribute('aria-label');

        button.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();

            if (ariaLabel === '댓글') {
                // 댓글 모달 열기
                openCommentModal();
            } else if (ariaLabel === '저장') {
                // 저장 확인 모달 열기
                openSaveModal();
                // active 클래스 토글
                button.classList.toggle('active');
            } else {
                // 하트 아이콘 - active 클래스 토글
                button.classList.toggle('active');
            }
        });
    });
});

// 댓글 모달 열기
function openCommentModal() {
    const modal = document.getElementById('comment-modal');
    if (modal) {
        modal.style.display = 'flex';
        document.body.style.overflow = 'hidden';
    }
}

// 댓글 모달 닫기 (전역 함수)
window.closeCommentModal = function () {
    const modal = document.getElementById('comment-modal');
    if (modal) {
        modal.style.display = 'none';
        document.body.style.overflow = '';
    }
}

// 저장 확인 모달 열기
function openSaveModal() {
    const modal = document.getElementById('save-modal');
    if (modal) {
        modal.style.display = 'flex';
        document.body.style.overflow = 'hidden';
    }
}

// 저장 확인 모달 닫기 (전역 함수)
window.closeSaveModal = function () {
    const modal = document.getElementById('save-modal');
    if (modal) {
        modal.style.display = 'none';
        document.body.style.overflow = '';
    }
}

// 저장 모달 확인 (무드보드 바로가기 버튼)
window.confirmSaveModal = function () {
    window.closeSaveModal();
    // 마이페이지로 이동
    window.location.href = 'mypage_reader.html';
}

// 댓글 신고 모달 열기 (전역 함수)
window.openReportModal = function () {
    const modal = document.getElementById('report-modal');
    if (modal) {
        modal.style.display = 'flex';
        document.body.style.overflow = 'hidden';
    }
}

// 댓글 신고 모달 닫기 (전역 함수)
window.closeReportModal = function () {
    const modal = document.getElementById('report-modal');
    if (modal) {
        modal.style.display = 'none';
        document.body.style.overflow = '';
    }
}

// 팔로우 모달 열기
function openFollowModal() {
    const modal = document.getElementById('follow-modal');
    if (modal) {
        modal.style.display = 'flex';
        document.body.style.overflow = 'hidden';
    }
}

// 팔로우 모달 닫기 (전역 함수)
window.closeFollowModal = function () {
    const modal = document.getElementById('follow-modal');
    if (modal) {
        modal.style.display = 'none';
        document.body.style.overflow = '';
    }
}

// 모달 배경 클릭 시 닫기
document.addEventListener('DOMContentLoaded', () => {
    // 댓글 모달
    const commentModal = document.getElementById('comment-modal');
    if (commentModal) {
        commentModal.addEventListener('click', (e) => {
            if (e.target === commentModal) {
                window.closeCommentModal();
            }
        });
    }

    // 저장 모달
    const saveModal = document.getElementById('save-modal');
    if (saveModal) {
        saveModal.addEventListener('click', (e) => {
            if (e.target === saveModal) {
                window.closeSaveModal();
            }
        });
    }

    // 신고 모달
    const reportModal = document.getElementById('report-modal');
    if (reportModal) {
        reportModal.addEventListener('click', (e) => {
            if (e.target === reportModal) {
                window.closeReportModal();
            }
        });
    }

    // 댓글 모달 내 하트 아이콘 버튼 클릭 이벤트 (이벤트 위임)
    document.addEventListener('click', (e) => {
        const button = e.target.closest('.comment-action-btn');
        if (button) {
            const icon = button.querySelector('.comment-action-icon');
            if (icon) {
                const path = icon.querySelector('path');
                // 하트 아이콘인지 확인 (path의 d 속성으로 판단)
                if (path && path.getAttribute('d') && path.getAttribute('d').includes('15.8434')) {
                    e.preventDefault();
                    e.stopPropagation();
                    // active 클래스 토글
                    button.classList.toggle('active');
                }
            }
        }
    });

    // 팔로우 모달
    const followModal = document.getElementById('follow-modal');
    if (followModal) {
        followModal.addEventListener('click', (e) => {
            if (e.target === followModal) {
                window.closeFollowModal();
            }
        });
    }

    // avatar-circle 클릭 이벤트 (마이페이지로 이동)
    const avatarCircles = document.querySelectorAll('.avatar-circle');
    avatarCircles.forEach((circle) => {
        circle.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            window.location.href = 'mypage_creator.html';
        });
    });

    // avatar-plus 버튼 클릭 이벤트
    const avatarPlusButtons = document.querySelectorAll('.avatar-plus');
    avatarPlusButtons.forEach((button) => {
        button.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();

            // 팔로우 모달 표시
            openFollowModal();

            // avatar-plus 숨기기
            button.style.display = 'none';

            // 부모 요소에 팔로우 완료 상태 표시
            const avatarCircle = button.parentElement?.querySelector('.avatar-circle');
            if (avatarCircle) {
                avatarCircle.classList.add('followed');
                // SVG 아이콘 추가
                avatarCircle.innerHTML = `
                    <svg xmlns="http://www.w3.org/2000/svg" width="23" height="23" viewBox="0 0 23 23" fill="none">
                        <path d="M11.498 0C13.0228 0 14.4851 0.605699 15.5632 1.68385C16.6414 2.762 17.2471 4.22429 17.2471 5.74902C17.2471 7.27376 16.6414 8.73605 15.5632 9.8142C14.4851 10.8923 13.0228 11.498 11.498 11.498C9.97331 11.498 8.51102 10.8923 7.43287 9.8142C6.35472 8.73605 5.74902 7.27376 5.74902 5.74902C5.74902 4.22429 6.35472 2.762 7.43287 1.68385C8.51102 0.605699 9.97331 0 11.498 0ZM11.498 22.9961C11.498 22.9961 22.9961 22.9961 22.9961 20.1216C22.9961 16.6722 17.3908 12.9353 11.498 12.9353C5.6053 12.9353 0 16.6722 0 20.1216C0 22.9961 11.498 22.9961 11.498 22.9961Z" fill="#FF5E00"/>
                    </svg>
                `;
            }
        });
    });
});

