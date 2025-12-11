/* ========================== 
   Header 커스터마이징
========================== */
fetch("/public/components/header.html")
  .then((r) => r.text())
  .then((html) => {
    document.getElementById("header").innerHTML = html;
    // 헤더 내용 변경
    const headerTitle = document.querySelector("#header .header-title");
    if (headerTitle) {
      headerTitle.remove();
    }
    const headerLeft = document.querySelector("#header .header-left");
    if (headerLeft) {
      headerLeft.innerHTML = '<a href="/index.html" style="display: flex; width: 100%; height: 100%; align-items: center; justify-content: center;"><img loading="lazy" src="/public/assets/logos/mumu-logo.webp" alt="MUMU Logo" style="max-width: 100%; max-height: 100%; object-fit: contain;"></a>';
    }
    const headerLink = document.querySelector("#header .header-link");
    if (headerLink) {
      headerLink.textContent = "업로드";
      headerLink.href = "/public/upload.html";
    }
  })
  .catch((error) => console.error("Error fetching header.html:", error));

/* ========================== 
   Tabbar 로드
========================== */
fetch("/public/components/tabbar.html")
  .then((r) => r.text())
  .then((html) => (document.getElementById("tabbar").innerHTML = html))
  .catch((error) => console.error("Error fetching tabbar.html:", error));

// ============================
// CreatorMoreModal 기능
// ============================

// CreatorMoreModal 열기
function openCreatorMoreModal(button) {
  const modal = document.getElementById('CreatorMoreModal');
  if (modal && button) {
    const rect = button.getBoundingClientRect();
    modal.style.display = 'flex';
    const modalContent = modal.querySelector('.CreatorMoreModal-content');
    if (modalContent) {
      const top = rect.top;
      const right = window.innerWidth - rect.right;
      modalContent.style.top = top + 'px';
      modalContent.style.right = right + 'px';

      // 스크롤 이벤트 리스너 추가
      if (!modal.hasAttribute('data-scroll-listener')) {
        modal.setAttribute('data-scroll-listener', 'true');
        window.addEventListener('scroll', handleCreatorMoreModalScroll, { passive: true });
      }
    }
  }
}

// CreatorMoreModal 닫기
function closeCreatorMoreModal() {
  const modal = document.getElementById('CreatorMoreModal');
  if (modal) {
    modal.style.animation = 'fadeOut 0.2s ease forwards';
    setTimeout(() => {
      modal.style.display = 'none';
      modal.style.animation = 'fadeIn 0.2s ease';
      window.removeEventListener('scroll', handleCreatorMoreModalScroll);
      modal.removeAttribute('data-scroll-listener');
    }, 200);
  }
}

// CreatorMoreModal 스크롤 핸들러
function handleCreatorMoreModalScroll() {
  const modal = document.getElementById('CreatorMoreModal');
  if (modal && modal.style.display === 'flex') {
    closeCreatorMoreModal();
  }
}

// 준비중인 기능 팝업 모달 표시
function showComingSoonModal() {
  const modal = document.getElementById('comingSoonModal');
  if (modal) {
    modal.style.display = 'flex';
    modal.style.animation = 'fadeIn 0.2s ease';
  }
}

// 준비중인 기능 팝업 모달 닫기
function closeComingSoonModal() {
  const modal = document.getElementById('comingSoonModal');
  if (modal) {
    modal.style.display = 'none';
  }
}

// 댓글 모달 열기
function openCommentModal() {
  const modal = document.getElementById('commentModal');
  if (modal) {
    modal.style.display = 'flex';
  }
}

// 댓글 모달 닫기 (전역 함수로 선언)
window.closeCommentModal = function () {
  const modal = document.getElementById('commentModal');
  if (modal) {
    const commentSection = modal.querySelector('.comment-section');
    if (commentSection) {
      commentSection.style.animation = 'slideDown 0.3s ease forwards';
    }
    modal.style.animation = 'fadeOut 0.3s ease forwards';
    setTimeout(() => {
      modal.style.display = 'none';
      modal.style.animation = 'fadeIn 0.3s ease';
      if (commentSection) {
        commentSection.style.animation = 'slideUp 0.3s ease';
      }
    }, 300);
  }
};

// 댓글 더보기 모달 열기
function openCommentMoreModal(button, commentItem) {
  const modal = document.getElementById('commentMoreModal');
  if (modal && button) {
    const rect = button.getBoundingClientRect();
    modal.style.display = 'flex';
    const modalContent = modal.querySelector('.comment-more-modal-content');
    if (modalContent) {
      const top = rect.top;
      const right = window.innerWidth - rect.right;
      modalContent.style.top = top + 'px';
      modalContent.style.right = right + 'px';

      if (!modal.hasAttribute('data-scroll-listener')) {
        modal.setAttribute('data-scroll-listener', 'true');
        window.addEventListener('scroll', handleCommentMoreModalScroll, { passive: true });
      }
    }
  }
}

// 댓글 더보기 모달 닫기
function closeCommentMoreModal() {
  const modal = document.getElementById('commentMoreModal');
  if (modal) {
    modal.style.animation = 'fadeOut 0.2s ease forwards';
    setTimeout(() => {
      modal.style.display = 'none';
      modal.style.animation = 'fadeIn 0.2s ease';
      window.removeEventListener('scroll', handleCommentMoreModalScroll);
      modal.removeAttribute('data-scroll-listener');
    }, 200);
  }
}

// 댓글 더보기 모달 스크롤 핸들러
function handleCommentMoreModalScroll() {
  const modal = document.getElementById('commentMoreModal');
  if (modal && modal.style.display === 'flex') {
    closeCommentMoreModal();
  }
}

// ESC 키로 모달 닫기
document.addEventListener('keydown', function (e) {
  if (e.key === 'Escape') {
    const commentModal = document.getElementById('commentModal');
    if (commentModal && commentModal.style.display === 'flex') {
      closeCommentModal();
    }
    const creatorMoreModal = document.getElementById('CreatorMoreModal');
    if (creatorMoreModal && creatorMoreModal.style.display === 'flex') {
      closeCreatorMoreModal();
    }
    const comingSoonModal = document.getElementById('comingSoonModal');
    if (comingSoonModal && comingSoonModal.style.display === 'flex') {
      closeComingSoonModal();
    }
  }
});

// ============================
// 이벤트 위임 및 버튼 활성화
// ============================

document.addEventListener('DOMContentLoaded', () => {
  // creator_feed.html 진입 시 준비중 팝업 표시
  showComingSoonModal();

  // top-tab 클릭 시 (작가 피드 탭) 준비중 팝업 표시
  document.addEventListener('click', function (e) {
    if (e.target.closest('.top-tab.active')) {
      const activeTab = e.target.closest('.top-tab.active');
      e.preventDefault();
      e.stopPropagation();
      showComingSoonModal();
      return;
    }
  });

  // 동적으로 생성된 요소를 위해 이벤트 위임 사용
  document.addEventListener('click', function (e) {
    // creator-follow-btn 및 follow-btn 클릭
    if (e.target.closest('.creator-follow-btn') || e.target.closest('.follow-btn')) {
      const followBtn = e.target.closest('.creator-follow-btn') || e.target.closest('.follow-btn');
      e.preventDefault();
      e.stopPropagation();
      followBtn.classList.toggle('following');
      if (followBtn.classList.contains('following')) {
        followBtn.textContent = '팔로잉';
      } else {
        followBtn.textContent = '팔로우';
      }
      return;
    }

    // creator-more-btn 클릭
    if (e.target.closest('.creator-more-btn')) {
      const btn = e.target.closest('.creator-more-btn');
      e.preventDefault();
      e.stopPropagation();
      const modal = document.getElementById('CreatorMoreModal');
      if (modal && modal.style.display === 'flex') {
        closeCreatorMoreModal();
      } else {
        openCreatorMoreModal(btn);
      }
      return;
    }

    // CreatorMoreModal-option 클릭 시 팝업 표시
    if (e.target.closest('.CreatorMoreModal-option')) {
      const optionBtn = e.target.closest('.CreatorMoreModal-option');
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
      closeCreatorMoreModal();
      setTimeout(() => {
        showComingSoonModal();
      }, 200);
      return;
    }

    // stat-icon-heart 클릭
    if (e.target.closest('.stat-icon-heart')) {
      const icon = e.target.closest('.stat-icon-heart');
      e.preventDefault();
      e.stopPropagation();
      icon.classList.toggle('active');

      const statItem = icon.parentElement.querySelector('.stat-item');
      if (statItem) {
        let currentCount = parseInt(statItem.textContent) || 0;
        if (icon.classList.contains('active')) {
          statItem.textContent = currentCount + 1;
        } else {
          statItem.textContent = Math.max(0, currentCount - 1);
        }
      }
      return;
    }

    // stat-icon-comment 클릭 시 댓글 모달 열기
    if (e.target.closest('.stat-icon-comment')) {
      e.preventDefault();
      openCommentModal();
      return;
    }

    // comment-stat-icon-heart 클릭 (댓글 모달 내부)
    if (e.target.closest('.comment-stat-icon-heart')) {
      const icon = e.target.closest('.comment-stat-icon-heart');
      e.preventDefault();
      e.stopPropagation();
      icon.classList.toggle('active');

      const statItem = icon.parentElement.querySelector('span');
      if (statItem) {
        let currentCount = parseInt(statItem.textContent) || 0;
        if (icon.classList.contains('active')) {
          statItem.textContent = currentCount + 1;
        } else {
          statItem.textContent = Math.max(0, currentCount - 1);
        }
      }
      return;
    }

    // comment-more-btn 클릭
    if (e.target.closest('.comment-more-btn')) {
      const btn = e.target.closest('.comment-more-btn');
      e.preventDefault();
      e.stopPropagation();
      const commentItem = btn.closest('.comment-item');
      if (commentItem) {
        const modal = document.getElementById('commentMoreModal');
        if (modal && modal.style.display === 'flex') {
          closeCommentMoreModal();
        } else {
          openCommentMoreModal(btn, commentItem);
        }
      }
      return;
    }

    // comment-more-option 클릭 시 팝업 표시
    if (e.target.closest('.comment-more-option')) {
      const optionBtn = e.target.closest('.comment-more-option');
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
      closeCommentMoreModal();
      setTimeout(() => {
        showComingSoonModal();
      }, 200);
      return;
    }
  });

  // CreatorMoreModal 배경 클릭 시 닫기
  document.addEventListener('click', function (e) {
    const creatorMoreModal = document.getElementById('CreatorMoreModal');
    if (creatorMoreModal && creatorMoreModal.style.display === 'flex') {
      // CreatorMoreModal-option 클릭은 제외 (위의 핸들러에서 처리)
      if (e.target.closest('.CreatorMoreModal-option')) {
        return;
      }
      // 모달 내용이나 버튼이 아닌 곳을 클릭하면 닫기
      if (!e.target.closest('.CreatorMoreModal-content') && !e.target.closest('.creator-more-btn')) {
        closeCreatorMoreModal();
      }
    }

    // 준비중인 기능 팝업 배경 클릭 시 닫기
    const comingSoonModal = document.getElementById('comingSoonModal');
    if (comingSoonModal && comingSoonModal.style.display === 'flex') {
      if (e.target === comingSoonModal || e.target.closest('.coming-soon-modal-close')) {
        closeComingSoonModal();
      }
    }

    // 댓글 모달 배경 클릭 시 닫기
    const commentModal = document.getElementById('commentModal');
    if (commentModal && commentModal.style.display === 'flex') {
      if (e.target === commentModal) {
        closeCommentModal();
      }
    }

    // 댓글 더보기 모달 배경 클릭 시 닫기
    const commentMoreModal = document.getElementById('commentMoreModal');
    if (commentMoreModal && commentMoreModal.style.display === 'flex') {
      // comment-more-option 클릭은 제외 (위의 핸들러에서 처리)
      if (e.target.closest('.comment-more-option')) {
        return;
      }
      if (!e.target.closest('.comment-more-modal-content') && !e.target.closest('.comment-more-btn')) {
        closeCommentMoreModal();
      }
    }
  });

});
